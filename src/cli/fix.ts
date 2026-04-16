/**
 * recall fix — Error memory: show past fixes for errors
 */

import { lookupFix, extractErrorMessage } from '../errors/matcher.ts';
import { getFailedCommands } from '../db/commands.ts';
import { colors, formatHeader, formatRelativeTime, getIcons } from '../ui/index.ts';

export function handleFix(): void {
  const icons = getIcons();

  console.log(formatHeader(`${icons.fix} recall fix`));
  console.log('');

  // Get recent failed commands
  const failed = getFailedCommands(5);

  if (failed.length === 0) {
    console.log(colors.dim('  No recent failed commands found.'));
    console.log(colors.dim('  When you hit an error, run \'recall fix\' to check for known fixes.'));
    return;
  }

  let foundFixes = false;

  for (const cmd of failed) {
    if (!cmd.stderr_output) continue;

    const fix = lookupFix(cmd.stderr_output);
    if (!fix || !fix.fixCommand) continue;

    foundFixes = true;
    const errorMsg = extractErrorMessage(cmd.stderr_output);

    console.log(`  ${icons.cross} ${colors.error('Error:')} ${colors.dim(errorMsg.slice(0, 60))}`);
    console.log(`    ${colors.dim('Command:')} ${cmd.raw_command}`);
    console.log(`    ${colors.dim('When:')} ${formatRelativeTime(cmd.created_at)}`);
    console.log('');
    console.log(`  ${icons.fix} ${colors.success('Known fix:')} ${colors.bold(fix.fixCommand.raw_command)}`);
    console.log(`    ${colors.dim('Confidence:')} ${(fix.error.confidence * 100).toFixed(0)}%`);
    console.log(`    ${colors.dim('Seen:')} ${fix.error.occurrences} time(s)`);

    if (fix.error.fix_summary) {
      console.log(`    ${colors.dim('Note:')} ${fix.error.fix_summary}`);
    }

    console.log('');
    console.log(`  ${colors.dim('Run the fix:')} ${colors.path(fix.fixCommand.raw_command)}`);
    console.log('');
    console.log(`  ${'─'.repeat(50)}`);
    console.log('');
  }

  if (!foundFixes) {
    console.log(colors.dim('  Recent errors found but no known fixes yet.'));
    console.log(colors.dim('  As you fix errors, Recall learns what works.'));
    console.log('');

    // Show the errors anyway
    for (const cmd of failed.slice(0, 3)) {
      const msg = cmd.stderr_output ? extractErrorMessage(cmd.stderr_output) : 'Unknown error';
      console.log(`  ${icons.cross} ${cmd.raw_command}`);
      console.log(`    ${colors.dim(msg.slice(0, 70))}`);
      console.log(`    ${colors.dim(formatRelativeTime(cmd.created_at))}`);
      console.log('');
    }
  }
}
