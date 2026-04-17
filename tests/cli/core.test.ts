import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const entry = join(repoRoot, 'src', 'index.ts');

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'recall-test-home-'));
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

describe('core CLI dogfood flows', () => {
  test('no args prints help instead of blank output', async () => {
    const result = await runRecall([]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('Commands:');
    expect(result.stdout).toContain('search <query>');
  }, 15000);

  test('hook zsh prints the recall shell snippet', async () => {
    const result = await runRecall(['hook', 'zsh']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('# ─── Recall Shell Hook');
    expect(result.stdout).toContain('add-zsh-hook preexec _recall_preexec');
  }, 15000);

  test('hook capture inserts command and hook update writes exit metadata', async () => {
    const capture = await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo hello',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);

    expect(capture.exitCode).toBe(0);
    expect(capture.stdout.trim()).toMatch(/^\d+$/);

    const update = await runRecall([
      'hook',
      'update',
      '--command-id',
      capture.stdout.trim(),
      '--exit-code',
      '7',
      '--duration-ms',
      '42',
    ]);
    expect(update.exitCode).toBe(0);

    const recent = await runRecall(['recent', '--no-icons']);
    expect(recent.stdout).toContain('echo hello');
    expect(recent.stdout).toContain('✗ 7');
    expect(recent.stdout).toContain('42ms');
  }, 15000);

  test('search and project read captured repo data', async () => {
    const projectDir = join(home, 'sample-project');
    mkdirSync(projectDir);
    await Bun.spawn(['git', 'init'], { cwd: projectDir, stdout: 'ignore', stderr: 'ignore' }).exited;

    await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'bun test',
      '--cwd',
      projectDir,
      '--shell',
      'zsh',
      '--exit-code',
      '0',
    ]);

    const search = await runRecall(['search', 'bun', '--no-icons']);
    expect(search.stdout).toContain('bun test');

    const project = await runRecall(['project', '--no-icons'], { cwd: projectDir });
    expect(project.stdout).toContain('sample-project');
    expect(project.stdout).toContain('bun test');
  }, 15000);

  test('config reset restores strict local defaults', async () => {
    await runRecall(['config', '--set', 'auto_embed=true', '--no-icons']);
    const reset = await runRecall(['config', '--reset', '--no-icons']);

    expect(reset.stdout).toContain('capture_enabled  true');
    expect(reset.stdout).toContain('redact_secrets  true');
    expect(reset.stdout).toContain('auto_embed  false');
  }, 15000);

  test('ignore patterns and capture_enabled prevent inserts', async () => {
    await runRecall(['ignore', 'add', 'secret', '--no-icons']);
    await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo secret',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);

    let recent = await runRecall(['recent', '--no-icons']);
    expect(recent.stdout).not.toContain('echo secret');

    await runRecall(['config', '--set', 'capture_enabled=false', '--no-icons']);
    await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo visible',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);

    recent = await runRecall(['recent', '--no-icons']);
    expect(recent.stdout).not.toContain('echo visible');
  }, 15000);

  test('delete removes requested command data', async () => {
    const first = await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo one',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);
    await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo two',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);

    await runRecall(['delete', '--id', first.stdout.trim(), '--no-icons']);
    let recent = await runRecall(['recent', '--no-icons']);
    expect(recent.stdout).not.toContain('echo one');
    expect(recent.stdout).toContain('echo two');

    await runRecall(['delete', '--all', '--yes', '--no-icons']);
    recent = await runRecall(['recent', '--no-icons']);
    expect(recent.stdout).toContain('No live captured commands yet');
  }, 15000);

  test('search remains fast with ten thousand commands', async () => {
    const script = `
      import { insertCommand, searchCommandsKeyword } from '${join(repoRoot, 'src/db/commands.ts')}';
      const startSeed = performance.now();
      for (let i = 0; i < 10000; i++) {
        insertCommand({
          raw_command: 'echo perf-' + i,
          normalized_command: 'echo perf-' + i,
          cwd: '/tmp',
          shell: 'zsh',
          exit_code: 0,
        });
      }
      const start = performance.now();
      const results = searchCommandsKeyword('perf-9999', 20);
      const elapsed = performance.now() - start;
      console.log(JSON.stringify({ elapsed, count: results.length, seededMs: performance.now() - startSeed }));
    `;

    const proc = Bun.spawn(['bun', '--eval', script], {
      cwd: repoRoot,
      env: {
        ...process.env,
        HOME: home,
        NO_COLOR: '1',
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout) as { elapsed: number; count: number };
    expect(parsed.count).toBeGreaterThan(0);
    expect(parsed.elapsed).toBeLessThan(100);
  }, 15000);
});
