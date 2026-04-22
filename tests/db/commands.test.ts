import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  insertCommand,
  updateCommand,
  getCommandById,
  getAllCommands,
  getRecentCommands,
  getCommandsByRepo,
  getFailedCommands,
  getSuccessfulCommandsByRepo,
  getFailedCommandsByRepo,
  getCommandCount,
  deleteCommandById,
  deleteAllCommands,
  getTopCommands,
  getCommandsBySession,
  getSessionsByRepo,
  getStartupCommands,
  getLastCommand,
} from '../../src/db/commands.ts';
import { setDb, closeDb, createTestDb } from '../../src/db/index.ts';
import { upsertRepo } from '../../src/db/repos.ts';

describe('database commands', () => {
  beforeEach(() => {
    setDb(createTestDb());
  });

  afterEach(() => {
    closeDb();
  });

  // ─── insertCommand ───────────────────────────────────────────────────────
  test('insertCommand returns a positive id', () => {
    const id = insertCommand({
      raw_command: 'git status',
      normalized_command: 'git status',
      cwd: '/home/user/project',
      shell: 'zsh',
    });
    expect(id).toBeGreaterThan(0);
  });

  test('insertCommand stores all fields', () => {
    const id = insertCommand({
      raw_command: 'npm test',
      normalized_command: 'npm test',
      cwd: '/home/user/app',
      repo_path_hash: 'abc123',
      exit_code: 0,
      duration_ms: 1200,
      shell: 'bash',
      session_id: 'session-1',
      source: 'hook',
    });

    const cmd = getCommandById(id);
    expect(cmd).not.toBeNull();
    expect(cmd!.raw_command).toBe('npm test');
    expect(cmd!.normalized_command).toBe('npm test');
    expect(cmd!.cwd).toBe('/home/user/app');
    expect(cmd!.repo_path_hash).toBe('abc123');
    expect(cmd!.exit_code).toBe(0);
    expect(cmd!.duration_ms).toBe(1200);
    expect(cmd!.shell).toBe('bash');
    expect(cmd!.session_id).toBe('session-1');
    expect(cmd!.source).toBe('hook');
  });

  // ─── updateCommand ───────────────────────────────────────────────────────
  test('updateCommand modifies exit_code and duration_ms', () => {
    const id = insertCommand({
      raw_command: 'cargo build',
      normalized_command: 'cargo build',
      cwd: '/home/user/rust',
      shell: 'zsh',
    });

    updateCommand(id, { exit_code: 1, duration_ms: 5000 });

    const cmd = getCommandById(id);
    expect(cmd!.exit_code).toBe(1);
    expect(cmd!.duration_ms).toBe(5000);
  });

  test('updateCommand with empty update is a no-op', () => {
    const id = insertCommand({
      raw_command: 'ls',
      normalized_command: 'ls',
      cwd: '/tmp',
      shell: 'bash',
    });

    updateCommand(id, {});

    const cmd = getCommandById(id);
    expect(cmd!.exit_code).toBeNull();
  });

  // ─── getCommandById ──────────────────────────────────────────────────────
  test('getCommandById returns null for non-existent id', () => {
    expect(getCommandById(999999)).toBeNull();
  });

  test('getCommandById returns command for existing id', () => {
    const id = insertCommand({
      raw_command: 'docker ps',
      normalized_command: 'docker ps',
      cwd: '/',
      shell: 'zsh',
    });
    const cmd = getCommandById(id);
    expect(cmd).not.toBeNull();
    expect(cmd!.id).toBe(id);
  });

  // ─── getAllCommands ──────────────────────────────────────────────────────
  test('getAllCommands returns all inserted commands ordered by created_at DESC', () => {
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh', created_at: '2024-01-01T10:00:00.000Z' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh', created_at: '2024-01-02T10:00:00.000Z' });

    const all = getAllCommands();
    expect(all.length).toBe(2);
    expect(all[0].raw_command).toBe('b');
    expect(all[1].raw_command).toBe('a');
  });

  // ─── getRecentCommands ───────────────────────────────────────────────────
  test('getRecentCommands respects limit', () => {
    for (let i = 0; i < 5; i++) {
      insertCommand({ raw_command: `cmd${i}`, normalized_command: `cmd${i}`, cwd: '/', shell: 'zsh', created_at: `2024-01-0${i + 1}T10:00:00.000Z` });
    }

    const recent = getRecentCommands({ limit: 3 });
    expect(recent.length).toBe(3);
    expect(recent[0].raw_command).toBe('cmd4');
  });

  test('getRecentCommands filters by repo_path_hash', () => {
    insertCommand({ raw_command: 'git push', normalized_command: 'git push', cwd: '/p1', shell: 'zsh', repo_path_hash: 'repo1' });
    insertCommand({ raw_command: 'npm start', normalized_command: 'npm start', cwd: '/p2', shell: 'zsh', repo_path_hash: 'repo2' });

    const repo1 = getRecentCommands({ repo_path_hash: 'repo1' });
    expect(repo1.length).toBe(1);
    expect(repo1[0].raw_command).toBe('git push');
  });

  test('getRecentCommands excludes imported by default', () => {
    insertCommand({ raw_command: 'hook-cmd', normalized_command: 'hook-cmd', cwd: '/', shell: 'zsh', source: 'hook' });
    insertCommand({ raw_command: 'import-cmd', normalized_command: 'import-cmd', cwd: '/', shell: 'zsh', source: 'import' });

    const recent = getRecentCommands({ limit: 10 });
    expect(recent.length).toBe(1);
    expect(recent[0].source).toBe('hook');
  });

  test('getRecentCommands includes imported when requested', () => {
    insertCommand({ raw_command: 'hook-cmd', normalized_command: 'hook-cmd', cwd: '/', shell: 'zsh', source: 'hook' });
    insertCommand({ raw_command: 'import-cmd', normalized_command: 'import-cmd', cwd: '/', shell: 'zsh', source: 'import' });

    const recent = getRecentCommands({ limit: 10, includeImported: true });
    expect(recent.length).toBe(2);
  });

  // ─── getCommandsByRepo ───────────────────────────────────────────────────
  test('getCommandsByRepo filters by repo and source', () => {
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', source: 'hook' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', source: 'import' });
    insertCommand({ raw_command: 'c', normalized_command: 'c', cwd: '/', shell: 'zsh', repo_path_hash: 'r2', source: 'hook' });

    const result = getCommandsByRepo('r1', 10);
    expect(result.length).toBe(1);
    expect(result[0].raw_command).toBe('a');
  });

  // ─── getFailedCommands ───────────────────────────────────────────────────
  test('getFailedCommands returns only non-zero exit codes', () => {
    insertCommand({ raw_command: 'ok', normalized_command: 'ok', cwd: '/', shell: 'zsh', exit_code: 0 });
    insertCommand({ raw_command: 'bad', normalized_command: 'bad', cwd: '/', shell: 'zsh', exit_code: 1 });
    insertCommand({ raw_command: 'null', normalized_command: 'null', cwd: '/', shell: 'zsh', exit_code: null });

    const failed = getFailedCommands(10);
    expect(failed.length).toBe(1);
    expect(failed[0].raw_command).toBe('bad');
  });

  // ─── getSuccessfulCommandsByRepo ─────────────────────────────────────────
  test('getSuccessfulCommandsByRepo returns exit_code=0 only', () => {
    insertCommand({ raw_command: 'ok', normalized_command: 'ok', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', exit_code: 0 });
    insertCommand({ raw_command: 'bad', normalized_command: 'bad', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', exit_code: 1 });

    const success = getSuccessfulCommandsByRepo('r1', 10);
    expect(success.length).toBe(1);
    expect(success[0].raw_command).toBe('ok');
  });

  // ─── getFailedCommandsByRepo ─────────────────────────────────────────────
  test('getFailedCommandsByRepo returns non-zero exit_code only', () => {
    insertCommand({ raw_command: 'ok', normalized_command: 'ok', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', exit_code: 0 });
    insertCommand({ raw_command: 'bad', normalized_command: 'bad', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', exit_code: 2 });

    const failed = getFailedCommandsByRepo('r1', 10);
    expect(failed.length).toBe(1);
    expect(failed[0].raw_command).toBe('bad');
  });

  // ─── getCommandCount ─────────────────────────────────────────────────────
  test('getCommandCount returns total number of commands', () => {
    expect(getCommandCount()).toBe(0);
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh' });
    expect(getCommandCount()).toBe(2);
  });

  // ─── deleteCommandById ───────────────────────────────────────────────────
  test('deleteCommandById removes command', () => {
    const id = insertCommand({ raw_command: 'del', normalized_command: 'del', cwd: '/', shell: 'zsh' });
    expect(getCommandById(id)).not.toBeNull();

    const deleted = deleteCommandById(id);
    expect(deleted).toBe(true);
    expect(getCommandById(id)).toBeNull();
  });

  test('deleteCommandById returns false for non-existent id', () => {
    expect(deleteCommandById(999999)).toBe(false);
  });

  // ─── deleteAllCommands ───────────────────────────────────────────────────
  test('deleteAllCommands removes all commands', () => {
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh' });

    deleteAllCommands();
    expect(getCommandCount()).toBe(0);
  });

  // ─── getTopCommands ──────────────────────────────────────────────────────
  test('getTopCommands groups by normalized_command and sorts by count', () => {
    for (let i = 0; i < 3; i++) {
      insertCommand({ raw_command: 'git status', normalized_command: 'git status', cwd: '/', shell: 'zsh' });
    }
    for (let i = 0; i < 1; i++) {
      insertCommand({ raw_command: 'ls', normalized_command: 'ls', cwd: '/', shell: 'zsh' });
    }

    const top = getTopCommands(10);
    expect(top.length).toBe(2);
    expect(top[0].normalized_command).toBe('git status');
    expect(top[0].count).toBe(3);
    expect(top[1].normalized_command).toBe('ls');
    expect(top[1].count).toBe(1);
  });

  // ─── getCommandsBySession ────────────────────────────────────────────────
  test('getCommandsBySession filters by session_id and sorts ascending', () => {
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-01T10:00:00.000Z' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-02T10:00:00.000Z' });
    insertCommand({ raw_command: 'c', normalized_command: 'c', cwd: '/', shell: 'zsh', session_id: 's2' });

    const s1 = getCommandsBySession('s1');
    expect(s1.length).toBe(2);
    expect(s1[0].raw_command).toBe('a');
    expect(s1[1].raw_command).toBe('b');
  });

  // ─── getSessionsByRepo ───────────────────────────────────────────────────
  test('getSessionsByRepo returns distinct sessions for a repo', () => {
    upsertRepo({ repo_path_hash: 'r1', repo_name: 'proj', repo_root: '/proj' });
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's1' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's2' });
    insertCommand({ raw_command: 'c', normalized_command: 'c', cwd: '/', shell: 'zsh', repo_path_hash: 'r2', session_id: 's3' });

    const sessions = getSessionsByRepo('r1');
    expect(sessions.length).toBe(2);
    const ids = sessions.map(s => s.session_id).sort();
    expect(ids).toEqual(['s1', 's2']);
  });

  // ─── getStartupCommands ──────────────────────────────────────────────────
  test('getStartupCommands returns most common first commands per session', () => {
    upsertRepo({ repo_path_hash: 'r1', repo_name: 'proj', repo_root: '/proj' });
    // session 1: first command is "git status"
    insertCommand({ raw_command: 'git status', normalized_command: 'git status', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's1' });
    insertCommand({ raw_command: 'git log', normalized_command: 'git log', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's1' });
    // session 2: first command is "git status" again
    insertCommand({ raw_command: 'git status', normalized_command: 'git status', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's2' });
    insertCommand({ raw_command: 'npm test', normalized_command: 'npm test', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's2' });
    // session 3: first command is "docker ps"
    insertCommand({ raw_command: 'docker ps', normalized_command: 'docker ps', cwd: '/', shell: 'zsh', repo_path_hash: 'r1', session_id: 's3' });

    const startups = getStartupCommands('r1', 5);
    expect(startups.length).toBeGreaterThan(0);
    // git status appears twice as first command, so it should be first
    expect(startups[0].normalized_command).toBe('git status');
  });

  // ─── getLastCommand ──────────────────────────────────────────────────────
  test('getLastCommand returns most recently inserted command', () => {
    insertCommand({ raw_command: 'first', normalized_command: 'first', cwd: '/', shell: 'zsh', created_at: '2024-01-01T10:00:00.000Z' });
    insertCommand({ raw_command: 'second', normalized_command: 'second', cwd: '/', shell: 'zsh', created_at: '2024-01-02T10:00:00.000Z' });

    const last = getLastCommand();
    expect(last).not.toBeNull();
    expect(last!.raw_command).toBe('second');
  });

  test('getLastCommand returns null when empty', () => {
    expect(getLastCommand()).toBeNull();
  });
});
