/**
 * recall digest — Weekly summary of your terminal activity
 */

import { getTopCommandsSince } from '../db/commands.ts';
import { getDormantTools } from '../db/tools.ts';
import { getRecentErrorsSince } from '../db/errors.ts';
import { updateConfig, getConfig } from '../config/index.ts';
import { colors, formatHeader, getIcons, SPACING, formatSection } from '../ui/index.ts';

export function handleDigest(): void {
  const icons = getIcons();

  console.log(formatHeader(`${icons.brain} recall digest`));
  console.log('');

  // ─── Most-used commands (last 7 days) ───────────────────────────────────────
  const topCommands = getTopCommandsSince(7, 5);
  console.log(formatSection('Most-used commands (last 7 days)'));
  if (topCommands.length === 0) {
    console.log(`${SPACING.indent}${colors.dim('No commands captured this week.')}`);
  } else {
    for (const cmd of topCommands) {
      const bar = '█'.repeat(Math.min(cmd.count, 10));
      console.log(`${SPACING.indent}${colors.bold(cmd.normalized_command.padEnd(30))} ${colors.success(bar)} ${colors.dim(String(cmd.count))}`);
    }
  }
  console.log('');

  // ─── Forgotten tools ────────────────────────────────────────────────────────
  const dormant = getDormantTools(30);
  console.log(formatSection('Forgotten tools'));
  if (dormant.length === 0) {
    console.log(`${SPACING.indent}${colors.dim('All installed tools are being used.')}`);
  } else {
    const showCount = Math.min(dormant.length, 5);
    for (let i = 0; i < showCount; i++) {
      const tool = dormant[i];
      console.log(`${SPACING.indent}${icons.tool} ${colors.bold(tool.tool_name)} ${colors.dim(`(${tool.source})`)}`);
    }
    if (dormant.length > showCount) {
      console.log(`${SPACING.indent}${colors.dim(`... and ${dormant.length - showCount} more`)}`);
    }
  }
  console.log('');

  // ─── Repeated pain points ───────────────────────────────────────────────────
  const recentErrors = getRecentErrorsSince(7, 5);
  const painPoints = recentErrors.filter(e => e.occurrences > 1);
  console.log(formatSection('Repeated pain points'));
  if (painPoints.length === 0) {
    console.log(`${SPACING.indent}${colors.dim('No repeated errors this week. Smooth sailing!')}`);
  } else {
    for (const err of painPoints) {
      const status = err.fix_summary
        ? `${colors.success('fixed')} — ${err.fix_summary}`
        : colors.warning('no fix recorded');
      console.log(`${SPACING.indent}${icons.warn} ${colors.bold(err.error_signature.slice(0, 40))} ${colors.dim(`(${err.occurrences}x)`)}`);
      console.log(`${SPACING.indent}${SPACING.indent}${colors.dim(status)}`);
    }
  }
  console.log('');

  // ─── Update last digest timestamp ───────────────────────────────────────────
  const lastDigest = getConfig('last_digest_at');
  updateConfig({ last_digest_at: new Date().toISOString() });

  if (lastDigest) {
    const daysSince = Math.floor((Date.now() - new Date(lastDigest).getTime()) / (1000 * 60 * 60 * 24));
    console.log(`${SPACING.indent}${colors.dim(`Previous digest: ${daysSince} days ago`)}`);
    console.log('');
  }
}
