/**
 * recall project — Show project context for current repo
 */

import { getRepoContext } from '../repos/detector.ts';
import { getRecentCommands } from '../db/commands.ts';
import { getRepo } from '../db/repos.ts';
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
    console.log(colors.dim('  • Repo-specific memory'));
    return;
  }

  const repo = getRepo(repoCtx.hash);
  const recentCmds = getRecentCommands({ limit: 10, repo_path_hash: repoCtx.hash });

  console.log(formatHeader(`${icons.dir} recall project`));
  console.log('');
  console.log(`  ${icons.dir} ${formatPath(repoCtx.root)} ${colors.dim('(git repo)')}`);
  console.log('');

  if (recentCmds.length === 0) {
    console.log(colors.dim('  No commands captured for this project yet.'));
    console.log(colors.dim('  Commands run in this directory will be tracked.'));
    return;
  }

  console.log(colors.dim('  Recent commands in this repo:'));
  for (let i = 0; i < Math.min(recentCmds.length, 5); i++) {
    const cmd = recentCmds[i];
    const prefix = i === Math.min(recentCmds.length, 5) - 1 ? icons.treeLast : icons.tree;
    console.log(`  ${prefix} ${cmd.raw_command}  ${colors.dim(formatRelativeTime(cmd.created_at))}`);
  }

  // Show startup patterns if detected
  if (repo?.startup_commands_json) {
    try {
      const startup = JSON.parse(repo.startup_commands_json) as string[];
      if (startup.length > 0) {
        console.log('');
        console.log(colors.dim('  Startup patterns detected:'));
        for (const cmd of startup) {
          console.log(`  ${icons.tree} ${cmd}`);
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  console.log('');
}
