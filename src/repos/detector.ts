/**
 * Git Root Detector
 *
 * Detects git repository root from any working directory.
 * Uses `git rev-parse --show-toplevel` — no Bun.Glob.
 */

import { createHash } from 'node:crypto';
import { basename } from 'node:path';

/**
 * Detect the git repository root from a given directory.
 * Returns null if not inside a git repo.
 */
export async function detectGitRoot(cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', '--show-toplevel'], {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) return null;

    const root = output.trim();
    return root || null;
  } catch {
    return null;
  }
}

/**
 * Generate a consistent hash for a repo path.
 * Used as a foreign key across tables.
 */
export function hashRepoPath(repoRoot: string): string {
  return createHash('sha256').update(repoRoot).digest('hex').slice(0, 16);
}

/**
 * Extract repo name from the full path.
 */
export function getRepoName(repoRoot: string): string {
  return basename(repoRoot);
}

/**
 * Get full repo context from a working directory.
 * Returns null if not in a git repo.
 */
export async function getRepoContext(cwd: string): Promise<{
  root: string;
  hash: string;
  name: string;
} | null> {
  const root = await detectGitRoot(cwd);
  if (!root) return null;

  return {
    root,
    hash: hashRepoPath(root),
    name: getRepoName(root),
  };
}
