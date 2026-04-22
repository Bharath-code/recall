import { type Database } from 'bun:sqlite';
import { getDb } from './index.ts';

export interface Tool {
  id: number;
  tool_name: string;
  source: 'brew' | 'npm' | 'cargo' | 'pip' | 'gem' | 'go' | 'pnpm' | 'yarn' | 'manual';
  installed_at: string;
  last_used_at: string | null;
  usage_count: number;
}

function db(): Database {
  return getDb();
}

export function upsertTool(input: {
  tool_name: string;
  source: Tool['source'];
}): void {
  db().prepare(`
    INSERT INTO tools (tool_name, source)
    VALUES (?, ?)
    ON CONFLICT (tool_name) DO UPDATE SET
      source = excluded.source
  `).run(input.tool_name, input.source);
}

export function batchUpsertTools(tools: { tool_name: string; source: Tool['source'] }[]): void {
  const stmt = db().prepare(`
    INSERT INTO tools (tool_name, source)
    VALUES (?, ?)
    ON CONFLICT (tool_name) DO UPDATE SET
      source = excluded.source
  `);

  const transaction = db().transaction(() => {
    for (const tool of tools) {
      stmt.run(tool.tool_name, tool.source);
    }
  });

  transaction();
}

export function recordToolUsage(toolName: string): void {
  db().prepare(`
    UPDATE tools SET
      last_used_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      usage_count = usage_count + 1
    WHERE tool_name = ?
  `).run(toolName);
}

export function getDormantTools(minDaysSinceUse: number = 30): Tool[] {
  return db().prepare(`
    SELECT * FROM tools
    WHERE (
      last_used_at IS NULL
      OR julianday('now') - julianday(last_used_at) > ?
    )
    AND usage_count < 5
    ORDER BY installed_at ASC
  `).all(minDaysSinceUse) as Tool[];
}

export function getAllTools(): Tool[] {
  return db().prepare('SELECT * FROM tools ORDER BY tool_name ASC').all() as Tool[];
}

export function getToolCount(): number {
  const row = db().prepare('SELECT COUNT(*) as count FROM tools').get() as { count: number };
  return row.count;
}

export function getToolByName(name: string): Tool | null {
  return db().prepare('SELECT * FROM tools WHERE tool_name = ?').get(name) as Tool | null;
}
