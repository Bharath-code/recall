import { type Database } from 'bun:sqlite';
import { z } from 'zod';
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
  source: 'hook' | 'import';
  created_at: string;
}

const CommandSchema = z.object({
  id: z.number(),
  raw_command: z.string(),
  normalized_command: z.string(),
  cwd: z.string(),
  repo_path_hash: z.string().nullable(),
  exit_code: z.number().nullable(),
  duration_ms: z.number().nullable(),
  shell: z.string(),
  stderr_output: z.string().nullable(),
  session_id: z.string().nullable(),
  source: z.enum(['hook', 'import']),
  created_at: z.string(),
});

function isCommand(obj: unknown): obj is Command {
  return CommandSchema.safeParse(obj).success;
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
  source?: 'hook' | 'import';
  created_at?: string;
}

export interface SearchOptions {
  query: string;
  repo_path_hash?: string;
  limit?: number;
  offset?: number;
  since?: string;
  failedOnly?: boolean;
  includeImported?: boolean;
}

function db(): Database {
  return getDb();
}

function withDbCatch<T>(operation: string, fallback: T, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    console.error(`Failed to ${operation}:`, err instanceof Error ? err.message : 'Unknown error');
    return fallback;
  }
}

export function insertCommand(input: InsertCommandInput): number {
  return withDbCatch('insert command', 0, () => {
    const columns = [
      'raw_command', 'normalized_command', 'cwd', 'repo_path_hash',
      'exit_code', 'duration_ms', 'shell', 'stderr_output', 'session_id', 'source',
    ];
    const values: (string | number | null)[] = [
      input.raw_command,
      input.normalized_command,
      input.cwd,
      input.repo_path_hash ?? null,
      input.exit_code ?? null,
      input.duration_ms ?? null,
      input.shell,
      input.stderr_output ?? null,
      input.session_id ?? null,
      input.source ?? 'hook',
    ];

    if (input.created_at) {
      columns.push('created_at');
      values.push(input.created_at);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const stmt = db().prepare(`
      INSERT INTO commands (${columns.join(', ')}) VALUES (${placeholders})
    `);

    const result = stmt.run(...values);
    return Number(result.lastInsertRowid);
  });
}

export function updateCommand(
  id: number,
  update: Partial<Pick<Command, 'exit_code' | 'duration_ms' | 'stderr_output'>>
): void {
  return withDbCatch('update command', undefined, () => {
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
  });
}

export function searchCommands(opts: SearchOptions): Command[] {
  return withDbCatch('search commands', [], () => {
    const { query, repo_path_hash, limit = 20, offset = 0, since, failedOnly, includeImported } = opts;

    // Use FTS5 for fast full-text search
    let sql = `
      SELECT c.* FROM commands c
      JOIN commands_fts fts ON c.id = fts.rowid
      WHERE commands_fts MATCH ?
    `;
    const params: (string | number)[] = [query];

    if (!includeImported) {
      sql += " AND c.source = 'hook'";
    }

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

    const results = db().prepare(sql).all(...params);
    return results.filter(isCommand) as Command[];
  });
}

export function searchCommandsKeyword(query: string, limit: number = 20): Command[] {
  return withDbCatch('search commands by keyword', [], () => {
    // Fallback keyword search using LIKE (for when FTS fails or simple queries)
    const pattern = `%${query}%`;
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE source = 'hook' AND (normalized_command LIKE ? OR raw_command LIKE ? OR cwd LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit);
    return results.filter(isCommand) as Command[];
  });
}

export function deleteCommandById(id: number): boolean {
  return withDbCatch('delete command', false, () => {
    const result = db().prepare('DELETE FROM commands WHERE id = ?').run(id);
    return result.changes > 0;
  });
}

export function deleteAllCommands(): number {
  return withDbCatch('delete all commands', 0, () => {
    const result = db().prepare('DELETE FROM commands').run();
    return result.changes;
  });
}

export function getRecentCommands(opts: {
  limit?: number;
  repo_path_hash?: string;
  includeImported?: boolean;
} = {}): Command[] {
  return withDbCatch('get recent commands', [], () => {
    const { limit = 20, repo_path_hash, includeImported } = opts;
    const sourceFilter = includeImported ? '' : "AND source = 'hook'";

    if (repo_path_hash) {
      const results = db().prepare(`
        SELECT * FROM commands
        WHERE repo_path_hash = ? ${sourceFilter}
        ORDER BY created_at DESC
        LIMIT ?
      `).all(repo_path_hash, limit);
      return results.filter(isCommand) as Command[];
    }

    const results = db().prepare(`
      SELECT * FROM commands
      WHERE 1 = 1 ${sourceFilter}
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
    return results.filter(isCommand) as Command[];
  });
}

export function getRecentNormalizedCommands(limit: number = 100): string[] {
  return withDbCatch('get recent normalized commands', [], () => {
    const rows = db().prepare(`
      SELECT normalized_command FROM commands
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as { normalized_command: string }[];

    return rows.map(row => row.normalized_command);
  });
}

export function getCommandById(id: number): Command | null {
  return withDbCatch('get command by id', null, () => {
    const result = db().prepare('SELECT * FROM commands WHERE id = ?').get(id);
    return result && isCommand(result) ? result : null;
  });
}

export function getCommandCount(): number {
  return withDbCatch('get command count', 0, () => {
    const row = db().prepare('SELECT COUNT(*) as count FROM commands').get() as { count: number };
    return row.count;
  });
}

export function getFailedCommands(limit: number = 20): Command[] {
  return withDbCatch('get failed commands', [], () => {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE exit_code != 0 AND exit_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
    return results.filter(isCommand) as Command[];
  });
}

export function getCommandsBySession(sessionId: string): Command[] {
  return withDbCatch('get commands by session', [], () => {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);
    return results.filter(isCommand) as Command[];
  });
}

export function getLastCommand(): Command | null {
  return withDbCatch('get last command', null, () => {
    const result = db().prepare('SELECT * FROM commands ORDER BY created_at DESC LIMIT 1').get();
    return result && isCommand(result) ? result : null;
  });
}

export function getTopCommands(limit: number = 10): { normalized_command: string; count: number }[] {
  return withDbCatch('get top commands', [], () => {
    return db().prepare(`
      SELECT normalized_command, COUNT(*) as count
      FROM commands
      GROUP BY normalized_command
      ORDER BY count DESC
      LIMIT ?
    `).all(limit) as { normalized_command: string; count: number }[];
  });
}

export function getAllCommands(): Command[] {
  return withDbCatch('get all commands', [], () => {
    const results = db().prepare('SELECT * FROM commands ORDER BY created_at DESC').all();
    return results.filter(isCommand) as Command[];
  });
}

export function getCommandsByRepo(repoPathHash: string, limit: number = 100): Command[] {
  return withDbCatch('get commands by repo', [], () => {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  });
}

export function getSessionsByRepo(repoPathHash: string): { session_id: string; created_at: string }[] {
  return withDbCatch('get sessions by repo', [], () => {
    return db().prepare(`
      SELECT DISTINCT session_id, MIN(created_at) as created_at
      FROM commands
      WHERE repo_path_hash = ? AND session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY created_at DESC
    `).all(repoPathHash) as { session_id: string; created_at: string }[];
  });
}

export function getStartupCommands(repoPathHash: string, limit: number = 5): Command[] {
  return withDbCatch('get startup commands', [], () => {
    // Single query to get first N commands from each session using ROW_NUMBER
    const commands = db().prepare(`
      WITH ranked_commands AS (
        SELECT
          *,
          ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) as rn
        FROM commands
        WHERE repo_path_hash = ? AND session_id IS NOT NULL AND source = 'hook'
      )
      SELECT * FROM ranked_commands
      WHERE rn <= ?
      ORDER BY created_at DESC
    `).all(repoPathHash, limit);
    const validCommands = commands.filter(isCommand) as Command[];

    if (validCommands.length === 0) return [];

    // Sort by frequency and return most common
    const commandCounts = new Map<string, { command: Command; count: number }>();
    for (const cmd of validCommands) {
      const normalized = cmd.normalized_command;
      const existing = commandCounts.get(normalized);
      if (existing) {
        existing.count++;
      } else {
        commandCounts.set(normalized, { command: cmd, count: 1 });
      }
    }

    return Array.from(commandCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(item => item.command);
  });
}

export function getSuccessfulCommandsByRepo(repoPathHash: string, limit: number = 20): Command[] {
  return withDbCatch('get successful commands by repo', [], () => {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND exit_code = 0 AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  });
}

export function getFailedCommandsByRepo(repoPathHash: string, limit: number = 10): Command[] {
  return withDbCatch('get failed commands by repo', [], () => {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND exit_code != 0 AND exit_code IS NOT NULL AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  });
}
