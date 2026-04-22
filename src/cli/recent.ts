/**
 * recall recent — Show recent commands
 */

import { getRecentCommands } from '../db/commands.ts';
import { 
  colors, 
  formatCommandLine, 
  formatHeader, 
  getIcons, 
  formatNoCommandsFound,
  SPACING,
} from '../ui/index.ts';

export interface RecentFlags {
  limit?: number;
  repo?: string;
  all?: boolean;
}

export function handleRecent(flags: RecentFlags): void {
  const icons = getIcons();
  const limit = flags.limit ?? 20;

  const commands = getRecentCommands({
    limit,
    repo_path_hash: flags.repo,
    includeImported: flags.all,
  });

  if (commands.length === 0) {
    const emptyState = formatNoCommandsFound();
    console.log(emptyState.join('\n'));
    return;
  }

  console.log(formatHeader(`${icons.recent} recall recent`));
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Last ${commands.length} commands:`));
  console.log('');

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const num = colors.textDim(`${SPACING.indent}${String(i + 1).padStart(2)}.`);
    console.log(`${num} ${formatCommandLine({
      command: cmd.raw_command,
      cwd: cmd.cwd,
      timestamp: cmd.created_at,
      exitCode: cmd.exit_code,
      duration: cmd.duration_ms,
    })}`);
  }

  console.log('');
}
