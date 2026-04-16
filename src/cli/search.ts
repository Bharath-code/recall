/**
 * recall search <query> — Search past commands using FTS5
 */

import { searchCommands, searchCommandsKeyword } from '../db/commands.ts';
import { colors, formatCommandLine, formatHeader, formatCount, getIcons } from '../ui/index.ts';

export interface SearchFlags {
  repo?: string;
  since?: string;
  limit?: number;
  failedOnly?: boolean;
}

export function handleSearch(query: string, flags: SearchFlags): void {
  if (!query || !query.trim()) {
    console.log(colors.error('Usage: recall search <query>'));
    console.log(colors.dim('  Example: recall search "docker prune"'));
    process.exit(1);
  }

  const icons = getIcons();
  const limit = flags.limit ?? 20;

  let results;
  try {
    // Try FTS5 first
    results = searchCommands({
      query: query.trim(),
      repo_path_hash: flags.repo,
      limit,
      since: flags.since,
      failedOnly: flags.failedOnly,
    });
  } catch {
    // Fallback to LIKE search if FTS5 query syntax fails
    results = searchCommandsKeyword(query.trim(), limit);
  }

  if (results.length === 0) {
    console.log(formatHeader(`${icons.search} recall search "${query}"`));
    console.log('');
    console.log(colors.dim('  No matching commands found.'));
    console.log('');
    console.log(colors.dim('  Tips:'));
    console.log(colors.dim('  • Check spelling'));
    console.log(colors.dim('  • Try partial words (e.g., "dock" instead of "docker")'));
    console.log(colors.dim('  • Use \'recall recent\' to see all recent commands'));
    return;
  }

  console.log(formatHeader(`${icons.search} recall search "${query}"`));
  console.log('');
  console.log(colors.dim(`  Found ${formatCount(results.length, 'match', 'matches')}:`));
  console.log('');

  for (let i = 0; i < results.length; i++) {
    const cmd = results[i];
    const num = colors.dim(`  ${String(i + 1).padStart(2)}.`);
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
