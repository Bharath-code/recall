import { colors } from './colors.ts';
import { getIcons } from './icons.ts';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatRelativeTime(date: Date | string | number): string {
  const then = typeof date === 'number' ? date : new Date(date).getTime();
  const diff = Date.now() - then;

  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < 365 * DAY) return `${Math.floor(diff / (30 * DAY))}mo ago`;
  return `${Math.floor(diff / (365 * DAY))}y ago`;
}

export function formatDuration(ms: number): string {
  if (ms < SECOND) return `${ms}ms`;
  if (ms < MINUTE) return `${(ms / SECOND).toFixed(1)}s`;
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)}m ${Math.floor((ms % MINUTE) / SECOND)}s`;
  return `${Math.floor(ms / HOUR)}h ${Math.floor((ms % HOUR) / MINUTE)}m`;
}

export function formatCommand(cmd: string, maxWidth: number = 60): string {
  if (cmd.length <= maxWidth) return cmd;
  return cmd.slice(0, maxWidth - 1) + '…';
}

export function formatExitCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return colors.dim('—');
  return code === 0 ? colors.success('✓') : colors.error(`✗ ${code}`);
}

export function formatPath(path: string): string {
  const home = process.env.HOME ?? '';
  const display = home && path.startsWith(home)
    ? '~' + path.slice(home.length)
    : path;
  return colors.path(display);
}

export function formatCommandLine(opts: {
  command: string;
  cwd?: string;
  timestamp?: Date | string | number;
  exitCode?: number | null;
  duration?: number | null;
  maxWidth?: number;
}): string {
  const icons = getIcons();
  const cmd = formatCommand(opts.command, opts.maxWidth ?? 45);
  const parts: string[] = [
    `${icons.cmd} ${cmd}`,
  ];

  if (opts.cwd) {
    parts.push(`${icons.dir} ${formatPath(opts.cwd)}`);
  }
  if (opts.timestamp) {
    parts.push(`${icons.recent} ${colors.dim(formatRelativeTime(opts.timestamp))}`);
  }
  if (opts.exitCode !== undefined && opts.exitCode !== null) {
    parts.push(formatExitCode(opts.exitCode));
  }
  if (opts.duration) {
    parts.push(colors.dim(formatDuration(opts.duration)));
  }

  return parts.join('  ');
}

export function formatHeader(title: string): string {
  return `${colors.bold(title)}\n${'─'.repeat(50)}`;
}

export function formatCount(n: number, singular: string, plural?: string): string {
  const p = plural ?? singular + 's';
  return `${n} ${n === 1 ? singular : p}`;
}
