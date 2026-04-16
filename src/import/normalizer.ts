/**
 * Command Normalizer
 *
 * Layered normalization pipeline:
 * 1. Trim whitespace
 * 2. Collapse multiple spaces (outside quotes)
 * 3. Expand ~ to $HOME
 * 4. Case-sensitive (preserve original)
 * 5. Skip space-prefixed commands (HISTCONTROL=ignorespace)
 */

const HOME = process.env.HOME ?? '';

/**
 * Normalize a raw command string through the standard pipeline.
 */
export function normalize(raw: string): string {
  if (!raw) return '';

  let result = raw;

  // Stage 1: Trim leading/trailing whitespace
  result = result.trim();

  if (!result) return '';

  // Stage 2: Collapse multiple whitespace to single space (preserve quoted strings)
  result = collapseWhitespace(result);

  // Stage 3: Expand ~ to $HOME (only when preceded by space or at start, followed by / or end)
  if (HOME) {
    result = expandTilde(result);
  }

  return result;
}

/**
 * Collapse runs of whitespace to a single space, preserving content inside quotes.
 */
function collapseWhitespace(input: string): string {
  const parts: string[] = [];
  let current = '';
  let inQuote: string | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuote) {
      current += ch;
      if (ch === inQuote && input[i - 1] !== '\\') {
        inQuote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inQuote = ch;
      current += ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        parts.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current) {
    parts.push(current);
  }

  return parts.join(' ');
}

/**
 * Expand ~ to HOME, only at word boundaries (start of string or after space)
 * and followed by / or end of string.
 */
function expandTilde(input: string): string {
  // Replace ~ at the start followed by /
  let result = input;

  if (result.startsWith('~/')) {
    result = HOME + result.slice(1);
  } else if (result === '~') {
    result = HOME;
  }

  // Replace ~ after a space followed by /
  result = result.replace(/ ~\//g, ` ${HOME}/`);
  result = result.replace(/ ~$/g, ` ${HOME}`);

  return result;
}

/**
 * Check if a command should be skipped from recording.
 */
export function shouldSkipCommand(raw: string): boolean {
  // Empty or whitespace-only
  if (!raw || !raw.trim()) return true;

  // Starts with space (HISTCONTROL=ignorespace)
  if (raw.startsWith(' ')) return true;

  // Single character commands (too trivial)
  if (raw.trim().length < 2) return true;

  return false;
}

/**
 * Deduplicate against a sliding window of recent commands.
 * Returns true if the command is a duplicate.
 */
export function isDuplicate(
  normalized: string,
  recentCommands: string[],
  windowSize: number = 100
): boolean {
  const window = recentCommands.slice(-windowSize);
  return window.includes(normalized);
}
