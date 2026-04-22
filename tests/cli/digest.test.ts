import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const entry = join(repoRoot, 'src', 'index.ts');

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'recall-test-digest-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

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

describe('digest command', () => {
  test('digest shows empty state when no data exists', async () => {
    const result = await runRecall(['digest', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Most-used commands (last 7 days)');
    expect(result.stdout).toContain('No commands captured this week');
    expect(result.stdout).toContain('Forgotten tools');
    expect(result.stdout).toContain('All installed tools are being used');
    expect(result.stdout).toContain('Repeated pain points');
    expect(result.stdout).toContain('No repeated errors this week');
  }, 15000);

  test('digest surfaces captured commands in most-used section', async () => {
    // Capture the same command multiple times
    for (let i = 0; i < 3; i++) {
      await runRecall([
        'hook',
        'capture',
        '--raw-command',
        'git status',
        '--cwd',
        '/tmp',
        '--shell',
        'zsh',
      ]);
    }

    const result = await runRecall(['digest', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Most-used commands (last 7 days)');
    expect(result.stdout).toContain('git status');
  }, 15000);
});
