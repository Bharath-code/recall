/**
 * Shell History Parser
 *
 * Parses zsh and bash history files into structured commands.
 * Supports both extended (timestamped) and plain formats.
 */

export interface ParsedCommand {
  command: string;
  timestamp: number | null;
}

/**
 * Parse zsh history file content.
 *
 * Zsh extended format: `: timestamp:duration;command`
 * Plain format: one command per line
 */
export function parseZshHistory(content: string): ParsedCommand[] {
  if (!content.trim()) return [];

  const results: ParsedCommand[] = [];
  const lines = content.split('\n');
  const extendedPattern = /^:\s*(\d+):\d+;(.+)$/;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i++;

    if (!line.trim()) continue;

    // Try extended format first
    const match = extendedPattern.exec(line);
    if (match) {
      let command = match[2];
      const timestamp = parseInt(match[1], 10);

      // Handle backslash continuation lines
      while (command.endsWith('\\') && i < lines.length) {
        command = command.slice(0, -1) + '\n' + lines[i];
        i++;
      }

      results.push({
        command: command.trim(),
        timestamp,
      });
      continue;
    }

    // Plain format — just a command per line
    const trimmed = line.trim();
    if (trimmed) {
      results.push({
        command: trimmed,
        timestamp: null,
      });
    }
  }

  return results;
}

/**
 * Parse bash history file content.
 *
 * Timestamped format: `#timestamp` followed by command on next line
 * Plain format: one command per line
 */
export function parseBashHistory(content: string): ParsedCommand[] {
  if (!content.trim()) return [];

  const results: ParsedCommand[] = [];
  const lines = content.split('\n');
  const timestampPattern = /^#(\d{10,})$/;

  let pendingTimestamp: number | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Check for timestamp line
    const tsMatch = timestampPattern.exec(line);
    if (tsMatch) {
      pendingTimestamp = parseInt(tsMatch[1], 10);
      continue;
    }

    // It's a command line
    results.push({
      command: line.trim(),
      timestamp: pendingTimestamp,
    });
    pendingTimestamp = null;
  }

  return results;
}

/**
 * Get the history file path for a given shell.
 */
export function getHistoryFilePaths(shell: 'zsh' | 'bash'): string[] {
  const home = process.env.HOME ?? '';

  if (shell === 'bash') {
    const histfile = process.env.HISTFILE;
    if (histfile) return [histfile];
    return [`${home}/.bash_history`];
  }

  // zsh: check ZDOTDIR, then HOME
  const zdotdir = process.env.ZDOTDIR ?? home;
  const histfile = process.env.HISTFILE;
  if (histfile) return [histfile];

  return [
    `${zdotdir}/.zsh_history`,
    `${zdotdir}/.zhistory`,
    `${zdotdir}/.histfile`,
  ];
}

/**
 * Estimate number of commands from file content (fast, no parsing).
 */
export function estimateCommandCount(content: string, shell: 'zsh' | 'bash'): number {
  const lines = content.split('\n').filter(l => l.trim());

  if (shell === 'bash') {
    // Timestamped bash: every other line is a timestamp
    const hasTimestamps = lines.some(l => /^#\d{10,}$/.test(l));
    if (hasTimestamps) return Math.floor(lines.length / 2);
    return lines.length;
  }

  // Zsh extended: each `: timestamp:0;command` is one command
  const extended = lines.filter(l => /^:\s*\d+:\d+;/.test(l));
  return extended.length || lines.length;
}
