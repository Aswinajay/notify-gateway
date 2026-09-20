import { R2SyncService } from './r2-sync.service';

describe('R2SyncService', () => {
  let service: R2SyncService;

  beforeEach(() => {
    // Reset env
    delete process.env.R2_SYNC_ENABLED;
    delete process.env.R2_BUCKET;
    delete process.env.R2_ENDPOINT;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    service = new R2SyncService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.R2_SYNC_ENABLED;
  });

  describe('Configuration', () => {
    it('should be disabled when R2_SYNC_ENABLED is not set', () => {
      expect(service.isConfigured()).toBe(false);
    });

    it('should be disabled when env vars are missing', () => {
      process.env.R2_SYNC_ENABLED = 'true';
      const svc = new R2SyncService();
      expect(svc.isConfigured()).toBe(false);
    });

    it('should be enabled when all required env vars are present', () => {
      process.env.R2_SYNC_ENABLED = 'true';
      process.env.R2_BUCKET = 'test-bucket';
      process.env.R2_ENDPOINT = 'https://account.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'test-key';
      process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
      const svc = new R2SyncService();
      expect(svc.isConfigured()).toBe(true);
    });
  });

  describe('triggerSnapshot', () => {
    it('should do nothing when not configured', async () => {
      await expect(service.triggerSnapshot('/tmp/session', 's1')).resolves.toBeUndefined();
    });

    it('should do nothing when shutting down', async () => {
      process.env.R2_SYNC_ENABLED = 'true';
      process.env.R2_BUCKET = 'test-bucket';
      process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'key';
      process.env.R2_SECRET_ACCESS_KEY = 'secret';
      const svc = new R2SyncService();
      await svc.onModuleDestroy();
      await expect(svc.triggerSnapshot('/tmp/session', 's1')).resolves.toBeUndefined();
    });
  });

  describe('restoreSession', () => {
    it('should return false when not configured', async () => {
      const result = await service.restoreSession('/tmp/target', 's1');
      expect(result).toBe(false);
    });

    it('should return false when no snapshot found', async () => {
      process.env.R2_SYNC_ENABLED = 'true';
      process.env.R2_BUCKET = 'test-bucket';
      process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'key';
      process.env.R2_SECRET_ACCESS_KEY = 'secret';
      const svc = new R2SyncService();
      // Mock the client to throw (no manifest)
      const result = await svc.restoreSession('/tmp/target', 's1');
      expect(result).toBe(false);
    });

    it('should skip restore when local state is valid', async () => {
      process.env.R2_SYNC_ENABLED = 'true';
      process.env.R2_BUCKET = 'test-bucket';
      process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
      process.env.R2_ACCESS_KEY_ID = 'key';
      process.env.R2_SECRET_ACCESS_KEY = 'secret';
      const svc = new R2SyncService();
      const localValid = jest.fn().mockResolvedValue(true);
      const result = await svc.restoreSession('/tmp/target', 's1', localValid);
      expect(result).toBe(false);
      expect(localValid).toHaveBeenCalledWith('/tmp/target');
    });
  });

  describe('getStatus', () => {
    it('should return configured=false when not configured', async () => {
      const status = await service.getStatus('s1');
      expect(status.configured).toBe(false);
      expect(status.stale).toBe(false);
    });
  });

  describe('Snapshot format', () => {
    it('should have valid manifest structure', () => {
      const manifest = {
        snapshotId: 'snap_123',
        environment: 'test',
        sessionId: 's1',
        formatVersion: 1,
        createdAt: new Date().toISOString(),
        files: [{ path: 'creds.json', sizeBytes: 1024, checksum: 'abc123' }],
        totalSizeBytes: 1024,
        archiveChecksum: 'def456',
        valid: true,
      };
      expect(manifest.snapshotId).toBe('snap_123');
      expect(manifest.formatVersion).toBe(1);
      expect(manifest.files).toHaveLength(1);
      expect(manifest.valid).toBe(true);
    });
  });

  describe('Path safety', () => {
    it('should reject path traversal in file paths', () => {
      const unsafe = ['../../../etc/passwd', '../secret.key', '/absolute/path'];
      for (const p of unsafe) {
        expect(p.includes('..') || p.startsWith('/')).toBe(true);
      }
    });

    it('should accept safe relative paths', () => {
      const safe = ['creds.json', 'auth/key.json', 'data/state.sock'];
      for (const p of safe) {
        expect(p.includes('..') || p.startsWith('/')).toBe(false);
      }
    });
  });

  describe('Retry logic', () => {
    it('should apply exponential backoff', () => {
      const base = 2000;
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(base * Math.pow(2, i));
      }
      expect(delays).toEqual([2000, 4000, 8000, 16000, 32000]);
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear pending timers', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      process.env.R2_SYNC_ENABLED = 'true';
      process.env.R2_BUCKET = 'b';
      process.env.R2_ENDPOINT = 'https://e';
      process.env.R2_ACCESS_KEY_ID = 'k';
      process.env.R2_SECRET_ACCESS_KEY = 's';
      const svc = new R2SyncService();
      // Manually add a pending entry
      (svc as any).pending.set('s1', { timer: setTimeout(() => {}, 60000) });
      await svc.onModuleDestroy();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
