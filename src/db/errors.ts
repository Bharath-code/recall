import { type Database } from 'bun:sqlite';
import { getDb } from './index.ts';

export interface ErrorRecord {
  id: number;
  error_signature: string;
  error_message: string | null;
  command_id: number | null;
  fix_command_id: number | null;
  fix_summary: string | null;
  confidence: number;
  occurrences: number;
  created_at: string;
  last_seen_at: string;
}

function db(): Database {
  return getDb();
}

export function insertError(input: {
  error_signature: string;
  error_message?: string;
  command_id: number;
}): number {
  // Check if we've seen this error signature before
  const existing = db().prepare(
    'SELECT id, occurrences FROM errors WHERE error_signature = ?'
  ).get(input.error_signature) as { id: number; occurrences: number } | null;

  if (existing) {
    db().prepare(`
      UPDATE errors SET
        occurrences = occurrences + 1,
        last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        command_id = ?
      WHERE id = ?
    `).run(input.command_id, existing.id);
    return existing.id;
  }

  const result = db().prepare(`
    INSERT INTO errors (error_signature, error_message, command_id)
    VALUES (?, ?, ?)
  `).run(input.error_signature, input.error_message ?? null, input.command_id);

  return Number(result.lastInsertRowid);
}

export function recordFix(input: {
  error_signature: string;
  fix_command_id: number;
  fix_summary?: string;
}): void {
  db().prepare(`
    UPDATE errors SET
      fix_command_id = ?,
      fix_summary = ?,
      confidence = MIN(1.0, confidence + 0.2)
    WHERE error_signature = ?
  `).run(input.fix_command_id, input.fix_summary ?? null, input.error_signature);
}

export function findFix(errorSignature: string): ErrorRecord | null {
  return db().prepare(`
    SELECT * FROM errors
    WHERE error_signature = ? AND fix_command_id IS NOT NULL
    ORDER BY confidence DESC, last_seen_at DESC
    LIMIT 1
  `).get(errorSignature) as ErrorRecord | null;
}

export function findSimilarErrors(signature: string, limit: number = 5): ErrorRecord[] {
  // Prefix match for similar error signatures
  const prefix = signature.slice(0, Math.min(signature.length, 32));
  return db().prepare(`
    SELECT * FROM errors
    WHERE error_signature LIKE ? AND fix_command_id IS NOT NULL
    ORDER BY confidence DESC, occurrences DESC
    LIMIT ?
  `).all(`${prefix}%`, limit) as ErrorRecord[];
}

export function getRecentErrors(limit: number = 10): ErrorRecord[] {
  return db().prepare(`
    SELECT * FROM errors
    ORDER BY last_seen_at DESC
    LIMIT ?
  `).all(limit) as ErrorRecord[];
}

export function getErrorCount(): number {
  const row = db().prepare('SELECT COUNT(*) as count FROM errors').get() as { count: number };
  return row.count;
}

export function getFixedErrorCount(): number {
  const row = db().prepare(
    'SELECT COUNT(*) as count FROM errors WHERE fix_command_id IS NOT NULL'
  ).get() as { count: number };
  return row.count;
}
