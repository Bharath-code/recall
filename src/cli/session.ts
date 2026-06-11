/**
 * recall session — Session timeline view
 *
 * Groups commands by session_id and shows each session's start/end time,
 * duration, command count, and the commands within each session.
 */

import { getRecentSessions, getCommandsBySession } from '../db/commands.ts';
import {
  colors,
  formatCommandLine,
  formatHeader,
  formatRelativeTime,
  getIcons,
  formatCount,
  formatNoCommandsFound,
  SPACING,
} from '../ui/index.ts';
import { outputJson } from '../ui/json-output.ts';

export interface SessionFlags {
  limit?: number;
  repo?: string;
  json?: boolean;
}

export function handleSession(flags: SessionFlags): void {
  const icons = getIcons();
  const limit = flags.limit ?? 10;

  const sessions = getRecentSessions({ limit, repo_path_hash: flags.repo });

  if (flags.json) {
    // For JSON, enrich each session with its commands
    const enriched = sessions.map(session => {
      const commands = getCommandsBySession(session.session_id);
      return {
        session_id: session.session_id,
        command_count: session.command_count,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_seconds: session.duration_seconds,
        commands: commands.map(cmd => ({
          id: cmd.id,
          raw_command: cmd.raw_command,
          normalized_command: cmd.normalized_command,
          cwd: cmd.cwd,
          exit_code: cmd.exit_code,
          duration_ms: cmd.duration_ms,
          created_at: cmd.created_at,
        })),
      };
    });
    outputJson(enriched);
    return;
  }

  if (sessions.length === 0) {
    const emptyState = formatNoCommandsFound();
    console.log(emptyState.join('\n'));
    return;
  }

  const subtitle = flags.repo ? `repo: ${flags.repo}` : undefined;
  console.log(formatHeader(`${icons.recent} Session Timeline`, subtitle));
  console.log('');

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    const commands = getCommandsBySession(session.session_id);

    // Session header
    const durationStr = formatSeconds(session.duration_seconds);
    const timeAgo = formatRelativeTime(session.started_at);
    const header = `${colors.bold(`Session #${i + 1}`)}  ${colors.textDim('·')}  ${colors.textDim(`${formatCount(commands.length, 'command')}`)}  ${colors.textDim('·')}  ${colors.textDim(durationStr)}  ${colors.textDim('·')}  ${colors.textDim(timeAgo)}`;
    console.log(`${SPACING.indent}${header}`);

    // Session divider
    console.log(`${SPACING.indent}${colors.dim('─'.repeat(46))}`);

    // Commands within the session
    for (let j = 0; j < commands.length; j++) {
      const cmd = commands[j];
      const num = colors.textDim(`${SPACING.indent}${SPACING.indent}${String(j + 1).padStart(2)}.`);
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
}

function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
