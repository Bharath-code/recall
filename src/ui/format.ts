import { colors } from './colors.ts';
import { getIcons } from './icons.ts';

// Time constants
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// Spacing constants for consistent UI
export const SPACING = {
  indent: '  ',
  sectionGap: '\n',
  itemGap: '\n',
  separator: '─',
  separatorLength: 50,
  columnGap: '  ',
} as const;

// Layout widths
export const WIDTH = {
  command: 60,
  path: 40,
  timestamp: 12,
  meta: 20,
} as const;

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

export function formatCommand(cmd: string, maxWidth: number = WIDTH.command): string {
  if (cmd.length <= maxWidth) return cmd;
  return cmd.slice(0, maxWidth - 1) + '…';
}

export function formatExitCode(code: number | null | undefined): string {
  if (code === null || code === undefined) return colors.dim('—');
  return code === 0 ? colors.success('✓') : colors.error(`✗ ${code}`);
}

export function formatPath(path: string, maxWidth: number = WIDTH.path): string {
  const home = process.env.HOME ?? '';
  const display = home && path.startsWith(home)
    ? '~' + path.slice(home.length)
    : path;
  
  if (display.length <= maxWidth) {
    return colors.path(display);
  }
  
  // Truncate path intelligently
  if (display.startsWith('~')) {
    return colors.path('~' + display.slice(1, maxWidth - 3) + '…');
  }
  return colors.path(display.slice(0, maxWidth - 3) + '…');
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
  const cmd = formatCommand(opts.command, opts.maxWidth ?? WIDTH.command);
  const parts: string[] = [
    `${icons.cmd} ${colors.command(cmd)}`,
  ];

  if (opts.cwd) {
    parts.push(`${icons.dir} ${formatPath(opts.cwd)}`);
  }
  if (opts.timestamp) {
    parts.push(`${icons.recent} ${colors.textDim(formatRelativeTime(opts.timestamp))}`);
  }
  if (opts.exitCode !== undefined && opts.exitCode !== null) {
    parts.push(formatExitCode(opts.exitCode));
  }
  if (opts.duration) {
    parts.push(colors.textDim(formatDuration(opts.duration)));
  }

  return parts.join(SPACING.columnGap);
}

export function formatHeader(title: string, subtitle?: string): string {
  const lines = [colors.bold(title)];
  if (subtitle) {
    lines.push(colors.textDim(subtitle));
  }
  lines.push(SPACING.separator.repeat(SPACING.separatorLength));
  return lines.join('\n');
}

export function formatSection(title: string): string {
  return `\n${colors.bold(title)}\n${SPACING.separator.repeat(SPACING.separatorLength)}`;
}

export function formatCount(n: number, singular: string, plural?: string): string {
  const p = plural ?? singular + 's';
  return `${n} ${n === 1 ? singular : p}`;
}

export function formatKeyValue(key: string, value: string, indent: number = 2): string {
  const prefix = SPACING.indent.repeat(indent);
  return `${prefix}${colors.textDim(key)}: ${value}`;
}

export function formatList(items: string[], indent: number = 2): string[] {
  const prefix = SPACING.indent.repeat(indent);
  return items.map((item, i) => `${prefix}${colors.dim(`${String(i + 1).padStart(2)}.`)} ${item}`);
}

export function formatBullet(items: string[], indent: number = 2, bullet: string = '•'): string[] {
  const prefix = SPACING.indent.repeat(indent);
  return items.map(item => `${prefix}${colors.dim(bullet)} ${item}`);
}
