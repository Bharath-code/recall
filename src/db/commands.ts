import { type Database } from 'bun:sqlite';
import { getDb } from './index.ts';

export interface Command {
  id: number;
  raw_command: string;
  normalized_command: string;
  cwd: string;
  repo_path_hash: string | null;
  exit_code: number | null;
  duration_ms: number | null;
  shell: string;
  stderr_output: string | null;
  session_id: string | null;
  created_at: string;
}

export interface InsertCommandInput {
  raw_command: string;
  normalized_command: string;
  cwd: string;
  repo_path_hash?: string | null;
  exit_code?: number | null;
  duration_ms?: number | null;
  shell: string;
  stderr_output?: string | null;
  session_id?: string | null;
}

export interface SearchOptions {
  query: string;
  repo_path_hash?: string;
  limit?: number;
  offset?: number;
  since?: string;
  failedOnly?: boolean;
}

function db(): Database {
  return getDb();
}

export function insertCommand(input: InsertCommandInput): number {
  const stmt = db().prepare(`
    INSERT INTO commands (raw_command, normalized_command, cwd, repo_path_hash, exit_code, duration_ms, shell, stderr_output, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    input.raw_command,
    input.normalized_command,
    input.cwd,
    input.repo_path_hash ?? null,
    input.exit_code ?? null,
    input.duration_ms ?? null,
    input.shell,
    input.stderr_output ?? null,
    input.session_id ?? null,
  );

  return Number(result.lastInsertRowid);
}

export function updateCommand(
  id: number,
  update: Partial<Pick<Command, 'exit_code' | 'duration_ms' | 'stderr_output'>>
): void {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (update.exit_code !== undefined) {
    sets.push('exit_code = ?');
    values.push(update.exit_code);
  }
  if (update.duration_ms !== undefined) {
    sets.push('duration_ms = ?');
    values.push(update.duration_ms);
  }
  if (update.stderr_output !== undefined) {
    sets.push('stderr_output = ?');
    values.push(update.stderr_output);
  }

  if (sets.length === 0) return;

  values.push(id);
  db().prepare(`UPDATE commands SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

export function searchCommands(opts: SearchOptions): Command[] {
  const { query, repo_path_hash, limit = 20, offset = 0, since, failedOnly } = opts;

  // Use FTS5 for fast full-text search
  let sql = `
    SELECT c.* FROM commands c
    JOIN commands_fts fts ON c.id = fts.rowid
    WHERE commands_fts MATCH ?
  `;
  const params: (string | number)[] = [query];

  if (repo_path_hash) {
    sql += ' AND c.repo_path_hash = ?';
    params.push(repo_path_hash);
  }
  if (since) {
    sql += ' AND c.created_at >= ?';
    params.push(since);
  }
  if (failedOnly) {
    sql += ' AND c.exit_code != 0 AND c.exit_code IS NOT NULL';
  }

  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  return db().prepare(sql).all(...params) as Command[];
}

export function searchCommandsKeyword(query: string, limit: number = 20): Command[] {
  // Fallback keyword search using LIKE (for when FTS fails or simple queries)
  const pattern = `%${query}%`;
  return db().prepare(`
    SELECT * FROM commands
    WHERE normalized_command LIKE ? OR raw_command LIKE ? OR cwd LIKE ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(pattern, pattern, pattern, limit) as Command[];
}

export function getRecentCommands(opts: {
  limit?: number;
  repo_path_hash?: string;
} = {}): Command[] {
  const { limit = 20, repo_path_hash } = opts;

  if (repo_path_hash) {
    return db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repo_path_hash, limit) as Command[];
  }

  return db().prepare(`
    SELECT * FROM commands
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as Command[];
}

export function getCommandById(id: number): Command | null {
  return db().prepare('SELECT * FROM commands WHERE id = ?').get(id) as Command | null;
}

export function getCommandCount(): number {
  const row = db().prepare('SELECT COUNT(*) as count FROM commands').get() as { count: number };
  return row.count;
}

export function getFailedCommands(limit: number = 20): Command[] {
  return db().prepare(`
    SELECT * FROM commands
    WHERE exit_code != 0 AND exit_code IS NOT NULL
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit) as Command[];
}

export function getCommandsBySession(sessionId: string): Command[] {
  return db().prepare(`
    SELECT * FROM commands
    WHERE session_id = ?
    ORDER BY created_at ASC
  `).all(sessionId) as Command[];
}

export function getLastCommand(): Command | null {
  return db().prepare('SELECT * FROM commands ORDER BY created_at DESC LIMIT 1').get() as Command | null;
}

export function getTopCommands(limit: number = 10): { normalized_command: string; count: number }[] {
  return db().prepare(`
    SELECT normalized_command, COUNT(*) as count
    FROM commands
    GROUP BY normalized_command
    ORDER BY count DESC
    LIMIT ?
  `).all(limit) as { normalized_command: string; count: number }[];
}
