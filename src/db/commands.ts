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
  source: 'hook' | 'import';
  created_at: string;
}

function isCommand(obj: unknown): obj is Command {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'raw_command' in obj &&
    'normalized_command' in obj &&
    'cwd' in obj &&
    typeof (obj as Command).id === 'number' &&
    typeof (obj as Command).raw_command === 'string'
  );
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

export function insertCommand(input: InsertCommandInput): number {
  try {
    const stmt = db().prepare(`
      INSERT INTO commands (raw_command, normalized_command, cwd, repo_path_hash, exit_code, duration_ms, shell, stderr_output, session_id, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.source ?? 'hook',
    );

    return Number(result.lastInsertRowid);
  } catch (err) {
    console.error('Failed to insert command:', err instanceof Error ? err.message : 'Unknown error');
    return 0; // Return 0 to indicate failure without breaking shell hook
  }
}

export function updateCommand(
  id: number,
  update: Partial<Pick<Command, 'exit_code' | 'duration_ms' | 'stderr_output'>>
): void {
  try {
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
  } catch (err) {
    console.error('Failed to update command:', err instanceof Error ? err.message : 'Unknown error');
  }
}

export function searchCommands(opts: SearchOptions): Command[] {
  try {
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
  } catch (err) {
    console.error('Failed to search commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function searchCommandsKeyword(query: string, limit: number = 20): Command[] {
  try {
    // Fallback keyword search using LIKE (for when FTS fails or simple queries)
    const pattern = `%${query}%`;
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE source = 'hook' AND (normalized_command LIKE ? OR raw_command LIKE ? OR cwd LIKE ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(pattern, pattern, pattern, limit);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to search commands by keyword:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function deleteCommandById(id: number): boolean {
  try {
    const result = db().prepare('DELETE FROM commands WHERE id = ?').run(id);
    return result.changes > 0;
  } catch (err) {
    console.error('Failed to delete command:', err instanceof Error ? err.message : 'Unknown error');
    return false;
  }
}

export function deleteAllCommands(): number {
  try {
    const result = db().prepare('DELETE FROM commands').run();
    return result.changes;
  } catch (err) {
    console.error('Failed to delete all commands:', err instanceof Error ? err.message : 'Unknown error');
    return 0;
  }
}

export function getRecentCommands(opts: {
  limit?: number;
  repo_path_hash?: string;
  includeImported?: boolean;
} = {}): Command[] {
  try {
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
  } catch (err) {
    console.error('Failed to get recent commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getRecentNormalizedCommands(limit: number = 100): string[] {
  try {
    const rows = db().prepare(`
      SELECT normalized_command FROM commands
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as { normalized_command: string }[];

    return rows.map(row => row.normalized_command);
  } catch (err) {
    console.error('Failed to get recent normalized commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getCommandById(id: number): Command | null {
  try {
    return db().prepare('SELECT * FROM commands WHERE id = ?').get(id) as Command | null;
  } catch (err) {
    console.error('Failed to get command by id:', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export function getCommandCount(): number {
  try {
    const row = db().prepare('SELECT COUNT(*) as count FROM commands').get() as { count: number };
    return row.count;
  } catch (err) {
    console.error('Failed to get command count:', err instanceof Error ? err.message : 'Unknown error');
    return 0;
  }
}

export function getFailedCommands(limit: number = 20): Command[] {
  try {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE exit_code != 0 AND exit_code IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get failed commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getCommandsBySession(sessionId: string): Command[] {
  try {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get commands by session:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getLastCommand(): Command | null {
  try {
    const result = db().prepare('SELECT * FROM commands ORDER BY created_at DESC LIMIT 1').get();
    return result && isCommand(result) ? result : null;
  } catch (err) {
    console.error('Failed to get last command:', err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export function getTopCommands(limit: number = 10): { normalized_command: string; count: number }[] {
  try {
    return db().prepare(`
      SELECT normalized_command, COUNT(*) as count
      FROM commands
      GROUP BY normalized_command
      ORDER BY count DESC
      LIMIT ?
    `).all(limit) as { normalized_command: string; count: number }[];
  } catch (err) {
    console.error('Failed to get top commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getAllCommands(): Command[] {
  try {
    const results = db().prepare('SELECT * FROM commands ORDER BY created_at DESC').all();
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get all commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getCommandsByRepo(repoPathHash: string, limit: number = 100): Command[] {
  try {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get commands by repo:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getSessionsByRepo(repoPathHash: string): { session_id: string; created_at: string }[] {
  try {
    return db().prepare(`
      SELECT DISTINCT session_id, MIN(created_at) as created_at
      FROM commands
      WHERE repo_path_hash = ? AND session_id IS NOT NULL
      GROUP BY session_id
      ORDER BY created_at DESC
    `).all(repoPathHash) as { session_id: string; created_at: string }[];
  } catch (err) {
    console.error('Failed to get sessions by repo:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getStartupCommands(repoPathHash: string, limit: number = 5): Command[] {
  try {
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
  } catch (err) {
    console.error('Failed to get startup commands:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getSuccessfulCommandsByRepo(repoPathHash: string, limit: number = 20): Command[] {
  try {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND exit_code = 0 AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get successful commands by repo:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}

export function getFailedCommandsByRepo(repoPathHash: string, limit: number = 10): Command[] {
  try {
    const results = db().prepare(`
      SELECT * FROM commands
      WHERE repo_path_hash = ? AND exit_code != 0 AND exit_code IS NOT NULL AND source = 'hook'
      ORDER BY created_at DESC
      LIMIT ?
    `).all(repoPathHash, limit);
    return results.filter(isCommand) as Command[];
  } catch (err) {
    console.error('Failed to get failed commands by repo:', err instanceof Error ? err.message : 'Unknown error');
    return [];
  }
}
