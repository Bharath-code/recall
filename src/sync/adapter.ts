/**
 * Sync Adapter Interface — Future use
 *
 * Defines the contract for syncing recall data across machines.
 * Phase 2+ feature — not implemented in MVP.
 */

export interface SyncAdapter {
  readonly provider: string;
  readonly isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  push(data: SyncPayload): Promise<void>;
  pull(): Promise<SyncPayload | null>;

  getLastSyncTime(): Promise<Date | null>;
}

export interface SyncPayload {
  commands: unknown[];
  repos: unknown[];
  timestamp: string;
}

/**
 * Noop sync adapter — used when sync is not configured.
 */
export class NoopSyncAdapter implements SyncAdapter {
  readonly provider = 'none';
  readonly isConnected = false;

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async push(_data: SyncPayload): Promise<void> {}
  async pull(): Promise<SyncPayload | null> { return null; }
  async getLastSyncTime(): Promise<Date | null> { return null; }
}
