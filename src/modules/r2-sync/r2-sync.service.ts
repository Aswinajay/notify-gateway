import { Injectable, Logger, Optional, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { SnapshotManifest, SnapshotFile } from './r2-snapshot.interface';
import { SNAPSHOT_FORMAT_VERSION, buildSnapshotKey, buildManifestKey } from './r2-snapshot.interface';

const execFileAsync = promisify(execFile);

let S3: any, Put: any, Get: any, Head: any, List: any, Del: any;
async function loadS3() {
  if (!S3) {
    const m = await import('@aws-sdk/client-s3');
    S3 = m.S3Client; Put = m.PutObjectCommand; Get = m.GetObjectCommand;
    Head = m.HeadObjectCommand; List = m.ListObjectsV2Command; Del = m.DeleteObjectCommand;
  }
}

interface Cfg {
  enabled: boolean; bucket: string; endpoint: string; accessKeyId: string; secretAccessKey: string;
  prefix: string; environment: string; debounceMs: number; maxRetained: number;
  retryMax: number; retryBaseMs: number;
}

@Injectable()
export class R2SyncService implements OnModuleDestroy {
  private readonly log = new Logger(R2SyncService.name);
  private cfg: Cfg | null = null;
  private client: any = null;
  private pending = new Map<string, { timer: NodeJS.Timeout }>();
  private active = new Map<string, Promise<void>>();
  private inflight = 0;
  private readonly MAX_INFLIGHT = 3;
  private shuttingDown = false;

  constructor(@Optional() private readonly cs?: ConfigService) { this.resolve(); }

  async onModuleDestroy() {
    this.shuttingDown = true;
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    if (this.active.size) await Promise.allSettled([...this.active.values()]);
  }

  private env(k: string, d = ''): string { return this.cs?.get<string>(k) ?? process.env[k] ?? d; }

  private resolve() {
    const on = this.env('R2_SYNC_ENABLED') === 'true' || this.env('R2_ENABLED') === 'true';
    if (!on) { this.log.log('R2 sync disabled'); return; }
    const bucket = this.env('R2_BUCKET'), endpoint = this.env('R2_ENDPOINT');
    const ak = this.env('R2_ACCESS_KEY_ID'), sk = this.env('R2_SECRET_ACCESS_KEY');
    if (!bucket || !endpoint || !ak || !sk) { this.log.error('R2 enabled but missing env vars'); return; }
    this.cfg = { enabled: true, bucket, endpoint, accessKeyId: ak, secretAccessKey: sk,
      prefix: this.env('R2_PREFIX', 'openwa'), environment: this.env('NODE_ENV', 'production'),
      debounceMs: parseInt(this.env('R2_DEBOUNCE_MS', '45000')) || 45000,
      maxRetained: parseInt(this.env('R2_MAX_RETAINED', '2')) || 2,
      retryMax: parseInt(this.env('R2_RETRY_MAX', '5')) || 5,
      retryBaseMs: parseInt(this.env('R2_RETRY_BASE_MS', '2000')) || 2000 };
    this.log.log(`R2 configured: ${this.cfg.bucket}/${this.cfg.prefix}`);
  }

  isConfigured(): boolean { return this.cfg?.enabled === true; }

  private async getClient(): Promise<any> {
    if (this.client) return this.client;
    if (!this.cfg) throw new Error('R2 not configured');
    await loadS3();
    this.client = new S3({ endpoint: this.cfg.endpoint, region: 'auto',
      credentials: { accessKeyId: this.cfg.accessKeyId, secretAccessKey: this.cfg.secretAccessKey } });
    return this.client;
  }

  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.cfg) throw new Error('R2 not configured');
    let last: any;
    for (let i = 0; i <= this.cfg.retryMax; i++) {
      try { return await fn(); } catch (e) { last = e; if (i < this.cfg.retryMax) {
        const d = this.cfg.retryBaseMs * Math.pow(2, i) + Math.random() * 1000;
        await new Promise(r => setTimeout(r, d));
      }}
    }
    throw last;
  }

  async triggerSnapshot(sessionDir: string, sessionId: string): Promise<void> {
    if (!this.cfg?.enabled || this.shuttingDown) return;
    const e = this.pending.get(sessionId);
    if (e?.timer) clearTimeout(e.timer);
    const timer = setTimeout(async () => {
      this.pending.delete(sessionId);
      try { await this.doSnapshot(sessionDir, sessionId); } catch (err: any) {
        this.log.error(`Snapshot failed [${sessionId}]: ${err.message}`);
      }
    }, this.cfg.debounceMs);
    this.pending.set(sessionId, { timer });
  }

  async forceSnapshot(sessionDir: string, sessionId: string): Promise<void> {
    if (!this.cfg?.enabled) return;
    const e = this.pending.get(sessionId);
    if (e?.timer) clearTimeout(e.timer);
    this.pending.delete(sessionId);
    try { await this.doSnapshot(sessionDir, sessionId); } catch (err: any) {
      this.log.error(`Force snapshot failed [${sessionId}]: ${err.message}`);
    }
  }

  async restoreSession(targetDir: string, sessionId: string,
    localValid?: (d: string) => Promise<boolean>): Promise<boolean> {
    if (!this.cfg?.enabled) return false;
    this.log.log(`R2 restore attempt for ${sessionId}`);
    if (localValid) { try { if (await localValid(targetDir)) { this.log.log('Local valid, skip restore'); return false; } } catch {} }
    const manifest = await this.getManifest(sessionId);
    if (!manifest) { this.log.warn('No R2 snapshot found'); return false; }
    const tmpDir = `${targetDir}.r2_tmp_${Date.now()}`;
    try {
      await fs.mkdir(tmpDir, { recursive: true });
      await this.downloadExtract(manifest, sessionId, tmpDir);
      await this.validateFiles(manifest, tmpDir);
      const bk = `${targetDir}.r2_bk_${Date.now()}`;
      try { await fs.access(targetDir); await fs.rename(targetDir, bk); } catch {}
      await fs.rename(tmpDir, targetDir);
      this.log.log(`Restore complete: ${manifest.snapshotId}`);
      setTimeout(async () => { try { await fs.rm(bk, { recursive: true, force: true }); } catch {} }, 60_000);
      return true;
    } catch (err: any) {
      this.log.error(`Restore failed [${sessionId}]: ${err.message}`);
      try { await fs.rm(tmpDir, { recursive: true, force: true }); } catch {}
      return false;
    }
  }

  async getStatus(sessionId: string) {
    if (!this.cfg?.enabled) return { configured: false, stale: false };
    try {
      const m = await this.getManifest(sessionId);
      if (!m) return { configured: true, stale: true, error: 'No snapshot' };
      const age = Date.now() - new Date(m.createdAt).getTime();
      return { configured: true, lastSnapshot: m.createdAt, latestSnapshotId: m.snapshotId, stale: age > this.cfg.debounceMs * 3 };
    } catch (e: any) { return { configured: true, stale: true, error: e.message }; }
  }

  private async doSnapshot(sessionDir: string, sessionId: string): Promise<void> {
    if (this.active.has(sessionId)) return;
    if (this.inflight >= this.MAX_INFLIGHT) { this.log.warn('Max inflight reached'); return; }
    const p = this._snapshot(sessionDir, sessionId);
    this.active.set(sessionId, p); this.inflight++;
    try { await p; } finally { this.active.delete(sessionId); this.inflight--; }
  }

  private async _snapshot(sessionDir: string, sessionId: string): Promise<void> {
    if (!this.cfg) return;
    const snapId = `snap_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    const client = await this.getClient();
    const files = await this.collect(sessionDir);
    if (!files.length) return;
    const archive = `${sessionDir}.r2_${snapId}.tar.gz`;
    try {
      const fileNames = files.map(f => f.path);
      await execFileAsync('tar', ['-czf', archive, '-C', sessionDir, ...fileNames]);
      const st = await fs.stat(archive);
      const cksum = await this.checksum(archive);
      const manifest: SnapshotManifest = {
        snapshotId: snapId, environment: this.cfg.environment, sessionId,
        formatVersion: SNAPSHOT_FORMAT_VERSION, createdAt: new Date().toISOString(),
        files, totalSizeBytes: files.reduce((s, f) => s + f.sizeBytes, 0),
        archiveChecksum: cksum, valid: true };
      const aKey = buildSnapshotKey(this.cfg.prefix, this.cfg.environment, sessionId, snapId);
      const buf = await fs.readFile(archive);
      await this.retry(() => client.send(new Put({ Bucket: this.cfg!.bucket, Key: aKey, Body: buf, ContentType: 'application/gzip',
        Metadata: { 'snapshot-id': snapId, 'session-id': sessionId } })));
      await this.retry(async () => {
        const h: any = await client.send(new Head({ Bucket: this.cfg!.bucket, Key: aKey }));
        if (h.ContentLength !== st.size) throw new Error(`Size mismatch: ${h.ContentLength} != ${st.size}`);
      });
      const mKey = buildManifestKey(this.cfg.prefix, this.cfg.environment, sessionId);
      await this.retry(() => client.send(new Put({ Bucket: this.cfg!.bucket, Key: mKey, Body: JSON.stringify(manifest), ContentType: 'application/json' })));
      this.log.log(`Snapshot ${snapId}: ${st.size}B, ${files.length} files`);
      await this.retention(sessionId);
    } finally { try { await fs.unlink(archive); } catch {} }
  }

  private async collect(dir: string): Promise<SnapshotFile[]> {
    const out: SnapshotFile[] = [];
    const walk = async (d: string, base: string) => {
      let ents: any[]; try { ents = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
      for (const e of ents) {
        const fp = path.join(d, e.name), rp = path.join(base, e.name);
        if (e.isDirectory()) await walk(fp, rp);
        else if (e.isFile() && !rp.includes('..') && !rp.startsWith('/')) {
          try { const s = await fs.stat(fp); out.push({ path: rp, sizeBytes: s.size, checksum: await this.checksum(fp) }); } catch {}
        }
      }
    };
    await walk(dir, ''); return out;
  }

  private async checksum(file: string): Promise<string> {
    const buf = await fs.readFile(file); return crypto.createHash('sha256').update(buf).digest('hex');
  }

  private async getManifest(sessionId: string): Promise<SnapshotManifest | null> {
    if (!this.cfg) return null;
    try {
      const client = await this.getClient();
      const key = buildManifestKey(this.cfg.prefix, this.cfg.environment, sessionId);
      const res: any = await this.retry(() => client.send(new Get({ Bucket: this.cfg!.bucket, Key: key })));
      const body = await streamToString(res.Body);
      const m: SnapshotManifest = JSON.parse(body);
      if (!m.valid || m.formatVersion > SNAPSHOT_FORMAT_VERSION) return null;
      return m;
    } catch { return null; }
  }

  private async downloadExtract(manifest: SnapshotManifest, sessionId: string, targetDir: string): Promise<void> {
    if (!this.cfg) return;
    const client = await this.getClient();
    const key = buildSnapshotKey(this.cfg.prefix, this.cfg.environment, sessionId, manifest.snapshotId);
    const res: any = await this.retry(() => client.send(new Get({ Bucket: this.cfg!.bucket, Key: key })));
    const archivePath = `${targetDir}.download.tar.gz`;
    const body = await streamToBuffer(res.Body);
    await fs.writeFile(archivePath, body);
    try { await execFileAsync('tar', ['-xzf', archivePath, '-C', targetDir]); }
    finally { try { await fs.unlink(archivePath); } catch {} }
  }

  private async validateFiles(manifest: SnapshotManifest, dir: string): Promise<void> {
    for (const f of manifest.files) {
      if (f.path.includes('..')) throw new Error(`Path traversal: ${f.path}`);
      const fp = path.join(dir, f.path);
      const st = await fs.stat(fp);
      if (st.size !== f.sizeBytes) throw new Error(`Size mismatch: ${f.path}`);
      const ck = await this.checksum(fp);
      if (ck !== f.checksum) throw new Error(`Checksum mismatch: ${f.path}`);
    }
  }

  private async retention(sessionId: string): Promise<void> {
    if (!this.cfg) return;
    try {
      const client = await this.getClient();
      const prefix = `${this.cfg.prefix}/${this.cfg.environment}/${sessionId}/snapshots/`;
      const res: any = await this.retry(() => client.send(new List({ Bucket: this.cfg!.bucket, Prefix: prefix })));
      const objs = (res.Contents || []).sort((a: any, b: any) => new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime());
      for (const obj of objs.slice(this.cfg.maxRetained)) {
        await this.retry(() => client.send(new Del({ Bucket: this.cfg!.bucket, Key: obj.Key })));
      }
    } catch (err: any) { this.log.warn(`Retention cleanup failed: ${err.message}`); }
  }
}

async function streamToString(stream: any): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}
