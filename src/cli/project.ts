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
import { colors, formatHeader, formatPath, formatRelativeTime, getIcons } from '../ui/index.ts';

export async function handleProject(): Promise<void> {
  const icons = getIcons();
  const cwd = process.cwd();
  const repoCtx = await getRepoContext(cwd);

  if (!repoCtx) {
    console.log(formatHeader(`${icons.dir} recall project`));
    console.log('');
    console.log(colors.dim('  Not in a git repository.'));
    console.log('');
    console.log(colors.dim('  cd into a project to see:'));
    console.log(colors.dim('  • Recent commands in this project'));
    console.log(colors.dim('  • Startup patterns'));
    console.log(colors.dim('  • Common workflows'));
    console.log(colors.dim('  • Repo-specific memory'));
    return;
  }

  const recentCmds = getRecentCommands({ limit: 10, repo_path_hash: repoCtx.hash });
  const startupCmds = getStartupCommands(repoCtx.hash, 5);
  const workflows = detectCommonWorkflows(repoCtx.hash, 3);
  const successfulCmds = getSuccessfulCommandsByRepo(repoCtx.hash, 10);
  const failedCmds = getFailedCommandsByRepo(repoCtx.hash, 5);

  console.log(formatHeader(`${icons.dir} recall project`));
  console.log('');
  console.log(`  ${icons.dir} ${formatPath(repoCtx.root)} ${colors.dim('(git repo)')}`);
  console.log('');

  if (recentCmds.length === 0) {
    console.log(colors.dim('  No commands captured for this project yet.'));
    console.log(colors.dim('  Commands run in this directory will be tracked.'));
    return;
  }

  // Show startup commands
  if (startupCmds.length > 0) {
    console.log(colors.dim('  Startup commands (first commands per session):'));
    for (let i = 0; i < startupCmds.length; i++) {
      const cmd = startupCmds[i];
      const prefix = i === startupCmds.length - 1 ? icons.treeLast : icons.tree;
      console.log(`  ${prefix} ${cmd.raw_command}  ${colors.dim(formatRelativeTime(cmd.created_at))}`);
    }
    console.log('');
  }

  // Show common workflows
  if (workflows.length > 0) {
    console.log(colors.dim('  Common workflows:'));
    for (let i = 0; i < workflows.length; i++) {
      const workflow = workflows[i];
      const prefix = i === workflows.length - 1 ? icons.treeLast : icons.tree;
      console.log(`  ${prefix} ${workflow.commands.join(' → ')}  ${colors.dim(`(${workflow.frequency}x)`)} ${colors.dim(formatRelativeTime(workflow.last_used || ''))}`);
    }
    console.log('');
  }

  // Show last known good vs recent failures
  if (failedCmds.length > 0) {
    console.log(colors.dim('  Recent failures:'));
    for (let i = 0; i < Math.min(failedCmds.length, 3); i++) {
      const cmd = failedCmds[i];
      const prefix = i === Math.min(failedCmds.length, 3) - 1 ? icons.treeLast : icons.tree;
      console.log(`  ${prefix} ${colors.error(cmd.raw_command)}  ${colors.dim(`exit ${cmd.exit_code}`)} ${colors.dim(formatRelativeTime(cmd.created_at))}`);
    }

    // Show successful alternatives
    if (successfulCmds.length > 0) {
      console.log('');
      console.log(colors.dim('  Last known good:'));
      const lastGood = successfulCmds[0];
      console.log(`  ${icons.check} ${colors.success(lastGood.raw_command)}  ${colors.dim(formatRelativeTime(lastGood.created_at))}`);
    }
    console.log('');
  }

  // Show recent commands
  console.log(colors.dim('  Recent commands in this repo:'));
  for (let i = 0; i < Math.min(recentCmds.length, 5); i++) {
    const cmd = recentCmds[i];
    const prefix = i === Math.min(recentCmds.length, 5) - 1 ? icons.treeLast : icons.tree;
    console.log(`  ${prefix} ${cmd.raw_command}  ${colors.dim(formatRelativeTime(cmd.created_at))}`);
  }

  // Generate copyable runbook snippet
  if (startupCmds.length > 0 || workflows.length > 0) {
    console.log('');
    console.log(colors.dim('  Runbook snippet:'));
    const runbookCommands: string[] = [];

    // Add startup commands
    for (const cmd of startupCmds.slice(0, 3)) {
      runbookCommands.push(cmd.raw_command);
    }

    // Add most common workflow
    if (workflows.length > 0) {
      runbookCommands.push(...workflows[0].commands);
    }

    const runbook = runbookCommands.join(' && ');
    console.log(`  ${icons.cmd} ${colors.dim(runbook)}`);
  }

  console.log('');
}
