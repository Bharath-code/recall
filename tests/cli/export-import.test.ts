import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const entry = join(repoRoot, 'src', 'index.ts');

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'recall-test-export-'));
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

describe('export and import commands', () => {
  test('export command creates JSON file with captured data', async () => {
    // Capture some commands first
    await runRecall([
      'hook',
      'capture',
      '--raw-command',
      'echo test',
      '--cwd',
      '/tmp',
      '--shell',
      'zsh',
    ]);

    const exportResult = await runRecall(['export', '--output', join(home, 'test-export.json')]);

    expect(exportResult.exitCode).toBe(0);
    expect(exportResult.stdout).toContain('Export complete');
  }, 15000);

  test('export command validates format parameter', async () => {
    const exportResult = await runRecall(['export', '--format', 'invalid']);

    expect(exportResult.exitCode).not.toBe(0);
    expect(exportResult.stdout).toContain('Invalid export options');
  }, 15000);

  test('import command requires file parameter', async () => {
    const importResult = await runRecall(['import']);

    expect(importResult.exitCode).not.toBe(0);
    expect(importResult.stdout).toContain('Invalid import options');
  }, 15000);

  test('import command handles non-existent file', async () => {
    const importResult = await runRecall(['import', '--file', '/nonexistent/file.json']);

    expect(importResult.exitCode).not.toBe(0);
    expect(importResult.stdout).toContain('File not found');
  }, 15000);
});

describe('pause and resume commands', () => {
  test('pause command disables capture', async () => {
    const pauseResult = await runRecall(['pause']);

    expect(pauseResult.exitCode).toBe(0);
    expect(pauseResult.stdout).toContain('Capture paused');
  }, 15000);

  test('resume command enables capture', async () => {
    await runRecall(['pause']);
    const resumeResult = await runRecall(['resume']);

    expect(resumeResult.exitCode).toBe(0);
    expect(resumeResult.stdout).toContain('Capture resumed');
  }, 15000);

  test('pause command shows message if already paused', async () => {
    await runRecall(['pause']);
    const pauseAgain = await runRecall(['pause']);

    expect(pauseAgain.exitCode).toBe(0);
    expect(pauseAgain.stdout).toContain('already paused');
  }, 15000);

  test('resume command shows message if already enabled', async () => {
    await runRecall(['resume']);
    const resumeAgain = await runRecall(['resume']);

    expect(resumeAgain.exitCode).toBe(0);
    expect(resumeAgain.stdout).toContain('already enabled');
  }, 15000);
});
