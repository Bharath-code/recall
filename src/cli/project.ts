/**
 * recall project — Show project context for current repo
 */

import { getRepoContext } from '../repos/detector.ts';
import {
  getRecentCommands,
  getStartupCommands,
  getSuccessfulCommandsByRepo,
  getFailedCommandsByRepo,
} from '../db/commands.ts';
import { detectCommonWorkflows } from '../workflows/detector.ts';
import { 
  colors, 
  formatHeader, 
  formatPath, 
  formatRelativeTime, 
  getIcons, 
  createSpinner,
  formatNoProjectContext,
  SPACING,
  formatSection,
} from '../ui/index.ts';

export async function handleProject(): Promise<void> {
  const icons = getIcons();
  const cwd = process.cwd();
  const repoCtx = await getRepoContext(cwd);

  if (!repoCtx) {
    const emptyState = formatNoProjectContext();
    console.log(emptyState.join('\n'));
    return;
  }

  const recentCmds = getRecentCommands({ limit: 10, repo_path_hash: repoCtx.hash });
  const startupCmds = getStartupCommands(repoCtx.hash, 5);

  const spinner = createSpinner('Detecting workflows...', 'analyze');
  spinner.start();
  const workflows = detectCommonWorkflows(repoCtx.hash, 3);
  spinner.succeed('Workflows detected');

  const successfulCmds = getSuccessfulCommandsByRepo(repoCtx.hash, 10);
  const failedCmds = getFailedCommandsByRepo(repoCtx.hash, 5);

  console.log(formatHeader(`${icons.dir} recall project`));
  console.log('');
  console.log(`${SPACING.indent}${icons.dir} ${formatPath(repoCtx.root)} ${colors.textDim('(git repo)')}`);
  console.log('');

  if (recentCmds.length === 0) {
    console.log(colors.textDim(`${SPACING.indent}No commands captured for this project yet.`));
    console.log(colors.textDim(`${SPACING.indent}Commands run in this directory will be tracked.`));
    console.log('');
    console.log(colors.textDim(`${SPACING.indent}To get started:`));
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${icons.cmd} Run some commands in this directory`));
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${icons.cmd} Then run ${colors.success('recall recent')} to see them`));
    return;
  }

  // Show startup commands
  if (startupCmds.length === 0) {
    console.log(colors.textDim(`${SPACING.indent}Not enough session data for startup commands yet.`));
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Run more commands in this repo to detect startup patterns.`));
    console.log('');
  }

  if (startupCmds.length > 0) {
    console.log(formatSection('Startup commands'));
    for (let i = 0; i < startupCmds.length; i++) {
      const cmd = startupCmds[i];
      const prefix = i === startupCmds.length - 1 ? icons.treeLast : icons.tree;
      console.log(`${SPACING.indent}${prefix} ${cmd.raw_command}  ${colors.textDim(formatRelativeTime(cmd.created_at))}`);
    }
    console.log('');
  }

  // Show common workflows
  if (workflows.length > 0) {
    console.log(formatSection('Common workflows'));
    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const prefix = i === workflows.length - 1 ? icons.treeLast : icons.tree;
      console.log(`${SPACING.indent}${prefix} ${workflow.commands.join(' → ')}  ${colors.textDim(`(${workflow.frequency}x)`)} ${colors.textDim(formatRelativeTime(workflow.last_used || ''))}`);
    }
    console.log('');
  }

  // Show last known good vs recent failures
  if (failedCmds.length > 0) {
    console.log(formatSection('Recent failures'));
    for (let i = 0; i < Math.min(failedCmds.length, 3); i++) {
      const cmd = failedCmds[i];
      const prefix = i === Math.min(failedCmds.length, 3) - 1 ? icons.treeLast : icons.tree;
      console.log(`${SPACING.indent}${prefix} ${colors.error(cmd.raw_command)}  ${colors.textDim(`exit ${cmd.exit_code}`)} ${colors.textDim(formatRelativeTime(cmd.created_at))}`);
    }

    if (successfulCmds.length > 0) {
      console.log('');
      console.log(colors.textDim(`${SPACING.indent}Last known good:`));
      const lastGood = successfulCmds[0];
      console.log(`${SPACING.indent}${icons.check} ${colors.success(lastGood.raw_command)}  ${colors.textDim(formatRelativeTime(lastGood.created_at))}`);
    }
    console.log('');
  }

  // Show recent commands
  console.log(formatSection('Recent commands'));
  for (let i = 0; i < Math.min(recentCmds.length, 5); i++) {
    const cmd = recentCmds[i];
    const prefix = i === Math.min(recentCmds.length, 5) - 1 ? icons.treeLast : icons.tree;
    console.log(`${SPACING.indent}${prefix} ${cmd.raw_command}  ${colors.textDim(formatRelativeTime(cmd.created_at))}`);
  }

  // Generate copyable runbook snippet
  if (startupCmds.length > 0 || workflows.length > 0) {
    console.log('');
    console.log(colors.textDim(`${SPACING.indent}Runbook snippet:`));
    const runbookCommands: string[] = [];

    for (const cmd of startupCmds.slice(0, 3)) {
      runbookCommands.push(cmd.raw_command);
    }

    if (workflows.length > 0) {
      runbookCommands.push(...workflows[0].commands);
    }

    const runbook = runbookCommands.join(' && ');
    console.log(`${SPACING.indent}${icons.cmd} ${colors.textDim(runbook)}`);
  }

  console.log('');
}
