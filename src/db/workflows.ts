import { type Database } from 'bun:sqlite';
import { getDb } from './index.ts';

export interface Workflow {
  id: number;
  name: string | null;
  sequence_json: string;
  repo_path_hash: string | null;
  frequency: number;
  confidence: number;
  last_used_at: string;
  created_at: string;
}

function db(): Database {
  return getDb();
}

export function insertWorkflow(
  input: Omit<Workflow, 'id' | 'created_at' | 'last_used_at'>
): number {
  const result = db().prepare(`
    INSERT INTO workflows (name, sequence_json, repo_path_hash, frequency, confidence)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    input.name ?? null,
    input.sequence_json,
    input.repo_path_hash ?? null,
    input.frequency,
    input.confidence
  );
  return Number(result.lastInsertRowid);
}

export function getAllWorkflows(): Workflow[] {
  return db().prepare(`
    SELECT * FROM workflows ORDER BY frequency DESC, last_used_at DESC
  `).all() as Workflow[];
}

export function getWorkflowById(id: number): Workflow | null {
  return db().prepare('SELECT * FROM workflows WHERE id = ?').get(id) as Workflow | null;
}

export function clearWorkflows(): void {
  db().prepare('DELETE FROM workflows').run();
}

export function detectAndStoreWorkflows(): Workflow[] {
  const rows = db().prepare(`
    SELECT normalized_command, session_id
    FROM commands
    WHERE session_id IS NOT NULL AND source = 'hook'
    ORDER BY session_id, created_at ASC
  `).all() as { normalized_command: string; session_id: string }[];

  const sessions = new Map<string, string[]>();
  for (const row of rows) {
    if (!sessions.has(row.session_id)) {
      sessions.set(row.session_id, []);
    }
    sessions.get(row.session_id)!.push(row.normalized_command);
  }

  const sequenceMap = new Map<string, { sequence: string[]; sessions: Set<string>; count: number }>();

  for (const [sessionId, cmds] of sessions) {
    for (let len = 2; len <= 3; len++) {
      for (let i = 0; i <= cmds.length - len; i++) {
        const seq = cmds.slice(i, i + len);
        const key = JSON.stringify(seq);
        if (!sequenceMap.has(key)) {
          sequenceMap.set(key, { sequence: seq, sessions: new Set(), count: 0 });
        }
        const entry = sequenceMap.get(key)!;
        entry.sessions.add(sessionId);
        entry.count++;
      }
    }
  }

  const detected: Workflow[] = [];
  clearWorkflows();

  for (const [, data] of sequenceMap) {
    if (data.sessions.size >= 2 && data.count >= 3) {
      const workflow: Workflow = {
        id: 0,
        name: null,
        sequence_json: JSON.stringify(data.sequence),
        repo_path_hash: null,
        frequency: data.count,
        confidence: Math.min(1.0, data.sessions.size * 0.25),
        last_used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      workflow.id = insertWorkflow(workflow);
      detected.push(workflow);
    }
  }

  return detected.sort((a, b) => b.frequency - a.frequency);
}
