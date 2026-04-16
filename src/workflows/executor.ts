/**
 * Workflow Executor — Safe command execution with confirmation
 */

import { colors, getIcons, createSpinner } from '../ui/index.ts';

// Commands that are NEVER auto-executed
const DANGEROUS_PATTERNS = [
  /\brm\s+-r/i,
  /\brm\s+-f/i,
  /\brm\s+-rf/i,
  /\bdrop\s+(table|database)/i,
  /\bdelete\s+from/i,
  /\btruncate\s/i,
  /\bformat\s/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bkubectl\s+delete/i,
  /\bgit\s+push\s+.*--force(?!-with-lease)/i,
  /\bgit\s+reset\s+--hard/i,
  /\bshutdown\b/i,
  /\breboot\b/i,
];

export function isDangerous(command: string): boolean {
  return DANGEROUS_PATTERNS.some(p => p.test(command));
}

export async function executeSequence(
  commands: string[],
  opts: { dryRun?: boolean; cwd?: string } = {}
): Promise<{ success: boolean; results: { command: string; exitCode: number; skipped: boolean }[] }> {
  const icons = getIcons();
  const results: { command: string; exitCode: number; skipped: boolean }[] = [];

  console.log('');
  console.log(`${icons.replay} ${colors.bold('Replaying workflow:')}`);
  console.log('');

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const label = `  ${i + 1}/${commands.length}  ${cmd}`;

    if (opts.dryRun) {
      console.log(`  ${colors.dim(`${i + 1}/${commands.length}`)}  ${cmd}  ${colors.dim('[dry-run]')}`);
      results.push({ command: cmd, exitCode: 0, skipped: false });
      continue;
    }

    if (isDangerous(cmd)) {
      console.log(`  ${colors.warning(`${i + 1}/${commands.length}`)}  ${cmd}  ${colors.error('[SKIPPED — destructive]')}`);
      results.push({ command: cmd, exitCode: -1, skipped: true });
      continue;
    }

    const spinner = createSpinner(label, 'default');
    spinner.start();

    try {
      const proc = Bun.spawn(['sh', '-c', cmd], {
        cwd: opts.cwd ?? process.cwd(),
        stdout: 'pipe',
        stderr: 'pipe',
      });

      const exitCode = await proc.exited;

      if (exitCode === 0) {
        spinner.succeed(`${colors.dim(`${i + 1}/${commands.length}`)}  ${cmd}  ${colors.success('done')}`);
      } else {
        spinner.fail(`${colors.dim(`${i + 1}/${commands.length}`)}  ${cmd}  ${colors.error(`exit ${exitCode}`)}`);
      }

      results.push({ command: cmd, exitCode, skipped: false });

      // Stop on failure
      if (exitCode !== 0) {
        console.log('');
        console.log(colors.error('  Workflow stopped due to error.'));
        return { success: false, results };
      }
    } catch (err) {
      spinner.fail(`${colors.dim(`${i + 1}/${commands.length}`)}  ${cmd}  ${colors.error('failed')}`);
      results.push({ command: cmd, exitCode: 1, skipped: false });
      return { success: false, results };
    }
  }

  console.log('');
  const completedCount = results.filter(r => !r.skipped && r.exitCode === 0).length;
  console.log(`${icons.check} ${colors.success(`Workflow complete. ${completedCount} commands executed.`)}`);

  return { success: true, results };
}
