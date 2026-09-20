/**
 * Snapshot format specification for R2 durable storage.
 *
 * Each snapshot is a compressed tar archive containing:
 * - manifest.json (completion marker with checksums)
 * - All session files (auth keys, app state, etc.)
 *
 * R2 object key structure:
 *   {prefix}/{environment}/{sessionId}/snapshots/{snapshotId}.tar.gz
 *   {prefix}/{environment}/{sessionId}/manifest/latest.json
 */

export interface SnapshotManifest {
  /** Unique snapshot identifier */
  snapshotId: string;
  /** Deployment environment (e.g., 'production', 'staging') */
  environment: string;
  /** Session identifier */
  sessionId: string;
  /** Format version for future compatibility */
  formatVersion: number;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** List of files included in the snapshot */
  files: SnapshotFile[];
  /** Total uncompressed size in bytes */
  totalSizeBytes: number;
  /** SHA-256 checksum of the compressed archive */
  archiveChecksum: string;
  /** Whether this snapshot passed validation */
  valid: boolean;
}

export interface SnapshotFile {
  /** Relative path within the session directory */
  path: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 checksum of the individual file */
  checksum: string;
}

export interface SnapshotPointer {
  /** The latest valid snapshot ID */
  latestSnapshotId: string;
  /** When this pointer was last updated */
  updatedAt: string;
  /** Environment this pointer belongs to */
  environment: string;
  /** Session this pointer belongs to */
  sessionId: string;
}

export const SNAPSHOT_FORMAT_VERSION = 1;

/** R2 object key builder */
export function buildSnapshotKey(prefix: string, environment: string, sessionId: string, snapshotId: string): string {
  return `${prefix}/${environment}/${sessionId}/snapshots/${snapshotId}.tar.gz`;
}

export function buildManifestKey(prefix: string, environment: string, sessionId: string): string {
  return `${prefix}/${environment}/${sessionId}/manifest/latest.json`;
}

export function buildPointerKey(prefix: string, environment: string, sessionId: string): string {
  return `${prefix}/${environment}/${sessionId}/manifest/latest.json`;
}
