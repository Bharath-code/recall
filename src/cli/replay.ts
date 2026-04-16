/**
 * recall replay — Replay startup workflow for current project
 */

import { getRepoContext } from '../repos/detector.ts';
import { detectStartupSequence } from '../workflows/detector.ts';
import { executeSequence, isDangerous } from '../workflows/executor.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export interface ReplayFlags {
  dryRun?: boolean;
  skip?: number;
}

export async function handleReplay(flags: ReplayFlags): Promise<void> {
  const icons = getIcons();
  const cwd = process.cwd();
  const repoCtx = await getRepoContext(cwd);

  console.log(formatHeader(`${icons.replay} recall replay`));
  console.log('');

  if (!repoCtx) {
    console.log(colors.dim('  Not in a git repository.'));
    console.log(colors.dim('  cd into a project to replay its startup workflow.'));
    return;
  }

  // Detect startup sequence
  const workflow = detectStartupSequence(repoCtx.hash);

  if (!workflow || workflow.commands.length === 0) {
    console.log(colors.dim('  No startup workflow detected for this project yet.'));
    console.log(colors.dim('  Recall learns your patterns over time.'));
    console.log(colors.dim('  Keep using your terminal and check back later.'));
    return;
  }

  // Apply skip
  const commands = flags.skip ? workflow.commands.slice(flags.skip) : workflow.commands;

  console.log(`  ${icons.dir} ${colors.path(repoCtx.name)} startup workflow:`);
  console.log(`  ${colors.dim(`Confidence: ${(workflow.confidence * 100).toFixed(0)}% | Seen: ${workflow.frequency} times`)}`);
  console.log('');

  // Preview commands
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const dangerous = isDangerous(cmd);
    const marker = dangerous ? colors.error('⚠ SKIP') : colors.dim('run');
    console.log(`  ${colors.dim(String(i + 1).padStart(2))}) ${cmd}  ${marker}`);
  }

  console.log('');

  if (flags.dryRun) {
    console.log(colors.dim('  [dry-run mode — no commands executed]'));
    return;
  }

  // Execute
  await executeSequence(commands, { cwd });
}
