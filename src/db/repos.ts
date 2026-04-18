import { type Database } from 'bun:sqlite';
import { getDb } from './index.ts';

export interface Repo {
  id: number;
  repo_path_hash: string;
  repo_name: string;
  repo_root: string;
  last_opened_at: string;
  startup_commands_json: string | null;
}

function db(): Database {
  return getDb();
}

export function upsertRepo(input: {
  repo_path_hash: string;
  repo_name: string;
  repo_root: string;
}): number {
  const existing = db().prepare(
    'SELECT id FROM repos WHERE repo_path_hash = ?'
  ).get(input.repo_path_hash) as { id: number } | null;

  if (existing) {
    db().prepare(`
      UPDATE repos SET last_opened_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `).run(existing.id);
    return existing.id;
  }

  const result = db().prepare(`
    INSERT INTO repos (repo_path_hash, repo_name, repo_root)
    VALUES (?, ?, ?)
  `).run(input.repo_path_hash, input.repo_name, input.repo_root);

  return Number(result.lastInsertRowid);
}

export function getRepo(repoPathHash: string): Repo | null {
  return db().prepare(
    'SELECT * FROM repos WHERE repo_path_hash = ?'
  ).get(repoPathHash) as Repo | null;
}

export function getRecentRepos(limit: number = 10): Repo[] {
  return db().prepare(
    'SELECT * FROM repos ORDER BY last_opened_at DESC LIMIT ?'
  ).all(limit) as Repo[];
}

export function getRepoCount(): number {
  const row = db().prepare('SELECT COUNT(*) as count FROM repos').get() as { count: number };
  return row.count;
}

export function updateStartupCommands(repoPathHash: string, commands: string[]): void {
  db().prepare(`
    UPDATE repos SET startup_commands_json = ?
    WHERE repo_path_hash = ?
  `).run(JSON.stringify(commands), repoPathHash);
}

export function getAllRepos(): Repo[] {
  return db().prepare('SELECT * FROM repos ORDER BY last_opened_at DESC').all() as Repo[];
}
