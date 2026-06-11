/**
 * Session timeline tests
 *
 * DB-level tests: getRecentSessions grouping, filtering, metadata accuracy
 * CLI-level tests: recall session text/JSON output, --repo filter, empty state
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { insertCommand } from '../../src/db/commands.ts';
import { getRecentSessions } from '../../src/db/commands.ts';
import { setDb, closeDb, createTestDb } from '../../src/db/index.ts';

// ─── CLI test helpers ──────────────────────────────────────────────────

const repoRoot = process.cwd();
const entry = join(repoRoot, 'src', 'index.ts');

async function runRecall(args: string[], opts: { cwd?: string; env?: Record<string, string> } = {}) {
  const proc = Bun.spawn(['bun', entry, ...args], {
    cwd: opts.cwd ?? repoRoot,
    env: {
      ...process.env,
      HOME: home,
      ZDOTDIR: home,
      RECALL_AI_PROVIDER: 'none',
      NO_COLOR: '1',
      ...opts.env,
    },
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { stdout, stderr, exitCode };
}

let home: string;

// ───────────────────────────────────────────────────────────────────────────
// DB-level: getRecentSessions
// ───────────────────────────────────────────────────────────────────────────

describe('getRecentSessions (DB function)', () => {
  beforeEach(() => {
    setDb(createTestDb());
  });

  afterEach(() => {
    closeDb();
  });

  test('returns empty array when no commands exist', () => {
    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(0);
  });

  test('ignores commands without a session_id', () => {
    insertCommand({
      raw_command: 'echo hi',
      normalized_command: 'echo hi',
      cwd: '/tmp',
      shell: 'zsh',
      // no session_id
    });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(0);
  });

  test('ignores imported commands (source = import)', () => {
    insertCommand({
      raw_command: 'ls',
      normalized_command: 'ls',
      cwd: '/tmp',
      shell: 'zsh',
      session_id: 's1',
      source: 'import',
    });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(0);
  });

  test('groups commands by session_id', () => {
    // Session 1: 3 commands
    insertCommand({ raw_command: 'a', normalized_command: 'a', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-01T10:00:00.000Z', source: 'hook' });
    insertCommand({ raw_command: 'b', normalized_command: 'b', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-01T10:01:00.000Z', source: 'hook' });
    insertCommand({ raw_command: 'c', normalized_command: 'c', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-01T10:02:00.000Z', source: 'hook' });

    // Session 2: 2 commands
    insertCommand({ raw_command: 'd', normalized_command: 'd', cwd: '/', shell: 'zsh', session_id: 's2', created_at: '2024-01-02T10:00:00.000Z', source: 'hook' });
    insertCommand({ raw_command: 'e', normalized_command: 'e', cwd: '/', shell: 'zsh', session_id: 's2', created_at: '2024-01-02T10:05:00.000Z', source: 'hook' });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(2);

    // Most recent session first (ORDER BY started_at DESC)
    expect(sessions[0].session_id).toBe('s2');
    expect(sessions[0].command_count).toBe(2);

    expect(sessions[1].session_id).toBe('s1');
    expect(sessions[1].command_count).toBe(3);
  });

  test('returns correct started_at, ended_at, and duration_seconds', () => {
    // Session spanning 5 minutes (300 seconds)
    insertCommand({ raw_command: 'npm install', normalized_command: 'npm install', cwd: '/proj', shell: 'zsh', session_id: 's1', created_at: '2024-06-01T10:00:00.000Z', source: 'hook' });
    insertCommand({ raw_command: 'npm test', normalized_command: 'npm test', cwd: '/proj', shell: 'zsh', session_id: 's1', created_at: '2024-06-01T10:05:00.000Z', source: 'hook' });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].started_at).toBe('2024-06-01T10:00:00.000Z');
    expect(sessions[0].ended_at).toBe('2024-06-01T10:05:00.000Z');
    expect(sessions[0].duration_seconds).toBe(300);
  });

  test('filters by repo_path_hash', () => {
    insertCommand({ raw_command: 'git push', normalized_command: 'git push', cwd: '/p1', shell: 'zsh', session_id: 's1', repo_path_hash: 'repo1', created_at: '2024-01-01T10:00:00.000Z', source: 'hook' });
    insertCommand({ raw_command: 'npm start', normalized_command: 'npm start', cwd: '/p2', shell: 'zsh', session_id: 's2', repo_path_hash: 'repo2', created_at: '2024-01-02T10:00:00.000Z', source: 'hook' });

    const repo1 = getRecentSessions({ repo_path_hash: 'repo1' });
    expect(repo1).toHaveLength(1);
    expect(repo1[0].session_id).toBe('s1');
  });

  test('respects limit', () => {
    for (let i = 0; i < 5; i++) {
      insertCommand({ raw_command: `cmd${i}`, normalized_command: `cmd${i}`, cwd: '/', shell: 'zsh', session_id: `s${i}`, created_at: `2024-01-0${i + 1}T10:00:00.000Z`, source: 'hook' });
    }

    const sessions = getRecentSessions({ limit: 2 });
    expect(sessions).toHaveLength(2);
  });

  test('defaults limit to 20', () => {
    for (let i = 0; i < 25; i++) {
      insertCommand({ raw_command: `cmd${i}`, normalized_command: `cmd${i}`, cwd: '/', shell: 'zsh', session_id: `s${i}`, created_at: `2024-01-01T10:${String(i).padStart(2, '0')}:00.000Z`, source: 'hook' });
    }

    const sessions = getRecentSessions(); // no limit arg, should default to 20
    expect(sessions).toHaveLength(20);
  });

  test('handles single-command session (0 duration)', () => {
    insertCommand({ raw_command: 'ls', normalized_command: 'ls', cwd: '/', shell: 'zsh', session_id: 's1', created_at: '2024-01-01T10:00:00.000Z', source: 'hook' });

    const sessions = getRecentSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].command_count).toBe(1);
    expect(sessions[0].started_at).toBe(sessions[0].ended_at);
    expect(sessions[0].duration_seconds).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// CLI-level: recall session command
// ───────────────────────────────────────────────────────────────────────────

describe('recall session (CLI command)', () => {
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'recall-test-session-'));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  test('shows empty state when no data exists', async () => {
    const result = await runRecall(['session', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No commands found');
  }, 15000);

  test('shows captured commands grouped by session', async () => {
    // Capture two sessions worth of commands
    // Session 1: git init + git add
    const id1 = (await runRecall(['hook', 'capture', '--raw-command', 'git init', '--cwd', '/tmp', '--shell', 'zsh', '--session-id', 'test-sess-1'])).stdout.trim();
    await runRecall(['hook', 'update', '--command-id', id1, '--exit-code', '0', '--duration-ms', '50']);

    const id2 = (await runRecall(['hook', 'capture', '--raw-command', 'git add .', '--cwd', '/tmp', '--shell', 'zsh', '--session-id', 'test-sess-1'])).stdout.trim();
    await runRecall(['hook', 'update', '--command-id', id2, '--exit-code', '0', '--duration-ms', '100']);

    // Session 2: npm test
    const id3 = (await runRecall(['hook', 'capture', '--raw-command', 'npm test', '--cwd', '/tmp', '--shell', 'zsh', '--session-id', 'test-sess-2'])).stdout.trim();
    await runRecall(['hook', 'update', '--command-id', id3, '--exit-code', '1', '--duration-ms', '200']);

    const result = await runRecall(['session', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Session Timeline');
    expect(result.stdout).toContain('git init');
    expect(result.stdout).toContain('git add');
    expect(result.stdout).toContain('npm test');
    expect(result.stdout).toContain('Session #1');
  }, 20000);

  test('--json returns session array with commands', async () => {
    // Capture one command with a session
    const id = (await runRecall(['hook', 'capture', '--raw-command', 'pnpm build', '--cwd', '/tmp', '--shell', 'zsh', '--session-id', 'json-sess'])).stdout.trim();
    await runRecall(['hook', 'update', '--command-id', id, '--exit-code', '0', '--duration-ms', '500']);

    const result = await runRecall(['session', '--json', '--no-icons']);

    expect(result.exitCode).toBe(0);

    // Parse JSON from output (text is also printed, so find the JSON array)
    const jsonStart = result.stdout.indexOf('[');
    const jsonEnd = result.stdout.lastIndexOf(']') + 1;
    const jsonStr = result.stdout.slice(jsonStart, jsonEnd);

    const parsed = JSON.parse(jsonStr);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(1);

    const session = parsed[0];
    expect(session).toHaveProperty('session_id', 'json-sess');
    expect(session).toHaveProperty('command_count', 1);
    expect(session).toHaveProperty('started_at');
    expect(session).toHaveProperty('ended_at');
    expect(session).toHaveProperty('duration_seconds');
    expect(session).toHaveProperty('commands');
    expect(Array.isArray(session.commands)).toBe(true);
    expect(session.commands[0].raw_command).toBe('pnpm build');
  }, 20000);

  test('--repo filter (non-git cwd → no-op fallback)', async () => {
    // Commands captured outside a git repo have repo_path_hash = null.
    // The DB-level tests above verify the actual filtering logic.
    // This test just ensures the --repo flag doesn't crash the command.
    const id = (await runRecall(['hook', 'capture', '--raw-command', 'echo test', '--cwd', '/tmp', '--shell', 'zsh', '--session-id', 'norepo-sess'])).stdout.trim();
    await runRecall(['hook', 'update', '--command-id', id, '--exit-code', '0', '--duration-ms', '10']);

    const result = await runRecall(['session', '--repo', 'some-hash', '--no-icons']);
    expect(result.exitCode).toBe(0);
  }, 15000);

  test('--repo with no matches shows empty state', async () => {
    const result = await runRecall(['session', '--repo', 'nonexistent-hash', '--no-icons']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No commands found');
  }, 15000);
});
