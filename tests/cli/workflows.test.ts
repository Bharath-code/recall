import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const repoRoot = process.cwd();
const entry = join(repoRoot, 'src', 'index.ts');

let home: string;

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'recall-test-workflows-'));
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

async function seedWorkflowCommands(): Promise<void> {
  const seedScript = `
    import { insertCommand } from '${join(repoRoot, 'src/db/commands.ts')}';
    import { getDb } from '${join(repoRoot, 'src/db/index.ts')}';
    getDb();
    for (let session = 0; session < 3; session++) {
      for (const cmd of ['echo alpha', 'echo beta', 'echo gamma']) {
        insertCommand({
          raw_command: cmd,
          normalized_command: cmd,
          cwd: '/tmp',
          shell: 'zsh',
          session_id: 'session-' + session,
          source: 'hook',
        });
      }
    }
    console.log('seeded');
  `;

  const proc = Bun.spawn(['bun', '--eval', seedScript], {
    cwd: repoRoot,
    env: { ...process.env, HOME: home, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

describe('workflows and restore commands', () => {
  test('workflows shows empty state when no sequences exist', async () => {
    const result = await runRecall(['workflows', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No repeated command sequences detected yet');
  }, 15000);

  test('workflows detects repeated sequences across sessions', async () => {
    await seedWorkflowCommands();

    const result = await runRecall(['workflows', '--no-icons']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('workflow(s) detected');
    expect(result.stdout).toContain('echo alpha');
    expect(result.stdout).toContain('echo beta');
  }, 15000);

  test('restore shows workflow by id', async () => {
    await seedWorkflowCommands();

    const workflowsResult = await runRecall(['workflows', '--no-icons']);
    expect(workflowsResult.exitCode).toBe(0);

    const idMatch = workflowsResult.stdout.match(/Workflow #(\d+)/);
    expect(idMatch).not.toBeNull();
    const workflowId = idMatch![1];

    const restoreResult = await runRecall(['restore', '--id', workflowId, '--no-icons']);
    expect(restoreResult.exitCode).toBe(0);
    expect(restoreResult.stdout).toContain(`Workflow #${workflowId}`);
    expect(restoreResult.stdout).toContain('echo alpha');
  }, 15000);

  test('restore fails with missing id', async () => {
    const result = await runRecall(['restore', '--no-icons']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('Workflow ID required');
  }, 15000);

  test('restore fails with non-existent id', async () => {
    const result = await runRecall(['restore', '--id', '99999', '--no-icons']);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('not found');
  }, 15000);
});
