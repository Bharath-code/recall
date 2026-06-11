/**
 * CD Tracker — Prevents showing repo context too frequently
 *
 * Uses timestamp files in ~/.recall/cd-hints/ to track when we last
 * showed project context for each repo. Minimum interval: 5 minutes.
 *
 * This avoids spamming the user when they cd back and forth between repos.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getRecallDir } from '../db/index.ts';

const HINTS_DIR = 'cd-hints';
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getHintsDir(): string {
  const dir = join(getRecallDir(), HINTS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Check if we've shown context for this repo recently.
 * Returns true if shown within the last 5 minutes.
 */
export function hasShownRecently(repoHash: string): boolean {
  try {
    const file = join(getHintsDir(), repoHash);
    if (!existsSync(file)) return false;

    const ts = parseInt(readFileSync(file, 'utf-8').trim(), 10);
    if (isNaN(ts)) return false;

    return (Date.now() - ts) < MIN_INTERVAL_MS;
  } catch {
    return false;
  }
}

/**
 * Mark this repo as shown now.
 */
export function markShown(repoHash: string): void {
  try {
    const file = join(getHintsDir(), repoHash);
    writeFileSync(file, String(Date.now()), 'utf-8');
  } catch {
    // Best-effort — never fail the shell hook
  }
}
