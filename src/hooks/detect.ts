/**
 * Shell Hook Detection
 *
 * Detects current shell, checks if hooks are installed,
 * resolves RC file paths.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ZSH_HOOK_MARKER } from './zsh-snippet.ts';
import { BASH_HOOK_MARKER } from './bash-snippet.ts';

export type ShellType = 'zsh' | 'bash' | 'unknown';

/**
 * Detect the current shell from $SHELL env var.
 */
export function detectShell(): ShellType {
  const shell = process.env.SHELL ?? '';
  if (shell.endsWith('/zsh') || shell.endsWith('/zsh5')) return 'zsh';
  if (shell.endsWith('/bash')) return 'bash';
  return 'unknown';
}

/**
 * Get the RC file path for a given shell.
 */
export function getShellRcPath(shell: ShellType): string | null {
  const home = process.env.HOME ?? '';
  if (!home) return null;

  switch (shell) {
    case 'zsh': {
      const zdotdir = process.env.ZDOTDIR ?? home;
      return join(zdotdir, '.zshrc');
    }
    case 'bash': {
      // Prefer .bashrc, fall back to .bash_profile
      const bashrc = join(home, '.bashrc');
      if (existsSync(bashrc)) return bashrc;
      return join(home, '.bash_profile');
    }
    default:
      return null;
  }
}

/**
 * Check if the Recall hook is already installed in the RC file.
 */
export function isHookInstalled(rcPath: string): boolean {
  if (!existsSync(rcPath)) return false;

  try {
    const text = readFileSync(rcPath, 'utf-8');
    return text.includes(ZSH_HOOK_MARKER) || text.includes(BASH_HOOK_MARKER);
  } catch {
    return false;
  }
}

/**
 * Check if hook is installed — async version.
 */
export async function isHookInstalledAsync(rcPath: string): Promise<boolean> {
  if (!existsSync(rcPath)) return false;

  try {
    const text = await Bun.file(rcPath).text();
    return text.includes(ZSH_HOOK_MARKER) || text.includes(BASH_HOOK_MARKER);
  } catch {
    return false;
  }
}

/**
 * Append hook to RC file (idempotent — checks first).
 */
export async function appendHookToRc(rcPath: string, snippet: string): Promise<boolean> {
  if (await isHookInstalledAsync(rcPath)) return false; // already installed

  const existing = existsSync(rcPath) ? await Bun.file(rcPath).text() : '';
  const newContent = existing.trimEnd() + '\n\n' + snippet + '\n';
  await Bun.write(rcPath, newContent);
  return true;
}

/**
 * Remove hook from RC file.
 */
export async function removeHookFromRc(rcPath: string): Promise<boolean> {
  if (!existsSync(rcPath)) return false;

  const content = await Bun.file(rcPath).text();
  const startMarker = '# ─── Recall Shell Hook';
  const endMarker = '# ─── End Recall Hook';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) return false;

  const endLineEnd = content.indexOf('\n', endIdx);
  const before = content.slice(0, startIdx);
  const after = endLineEnd !== -1 ? content.slice(endLineEnd + 1) : '';

  const cleaned = (before.trimEnd() + '\n' + after.trimStart()).trim() + '\n';
  await Bun.write(rcPath, cleaned);
  return true;
}
