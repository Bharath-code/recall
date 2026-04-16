/**
 * Workflow Detector — Detect repeated command sequences per project
 */

import { getDb } from '../db/index.ts';

export interface DetectedWorkflow {
  commands: string[];
  frequency: number;
  confidence: number;
  repo_path_hash: string | null;
}

/**
 * Detect startup sequences for a given repo.
 * Looks at the first N commands per session in a repo and finds repeating patterns.
 */
export function detectStartupSequence(
  repoPathHash: string,
  minFrequency: number = 2,
  maxSequenceLength: number = 6,
): DetectedWorkflow | null {
  const db = getDb();

  // Get commands grouped by session, ordered chronologically
  const sessions = db.prepare(`
    SELECT session_id, normalized_command
    FROM commands
    WHERE repo_path_hash = ? AND session_id IS NOT NULL
    ORDER BY session_id, created_at ASC
  `).all(repoPathHash) as { session_id: string; normalized_command: string }[];

  if (sessions.length === 0) return null;

  // Group by session, take first N commands per session
  const sessionGroups = new Map<string, string[]>();
  for (const row of sessions) {
    const existing = sessionGroups.get(row.session_id) ?? [];
    if (existing.length < maxSequenceLength) {
      existing.push(row.normalized_command);
      sessionGroups.set(row.session_id, existing);
    }
  }

  if (sessionGroups.size < minFrequency) return null;

  // Find the longest common prefix across sessions
  const sessionArrays = Array.from(sessionGroups.values()).filter(s => s.length >= 2);
  if (sessionArrays.length < minFrequency) return null;

  const commonPrefix = findLongestCommonPrefix(sessionArrays);
  if (commonPrefix.length < 2) {
    // Try finding common subsequences instead
    const frequent = findFrequentSubsequence(sessionArrays, minFrequency);
    if (frequent && frequent.length >= 2) {
      return {
        commands: frequent,
        frequency: countMatches(sessionArrays, frequent),
        confidence: countMatches(sessionArrays, frequent) / sessionArrays.length,
        repo_path_hash: repoPathHash,
      };
    }
    return null;
  }

  return {
    commands: commonPrefix,
    frequency: sessionArrays.length,
    confidence: sessionArrays.length / sessionGroups.size,
    repo_path_hash: repoPathHash,
  };
}

function findLongestCommonPrefix(arrays: string[][]): string[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0];

  const first = arrays[0];
  const prefix: string[] = [];

  for (let i = 0; i < first.length; i++) {
    const cmd = first[i];
    const allMatch = arrays.every(arr => i < arr.length && arr[i] === cmd);
    if (!allMatch) break;
    prefix.push(cmd);
  }

  return prefix;
}

function findFrequentSubsequence(
  arrays: string[][],
  minFrequency: number,
): string[] | null {
  // Count 2-command pairs
  const pairs = new Map<string, { commands: string[]; count: number }>();

  for (const arr of arrays) {
    for (let i = 0; i < arr.length - 1; i++) {
      const key = `${arr[i]}|${arr[i + 1]}`;
      const existing = pairs.get(key);
      if (existing) {
        existing.count++;
      } else {
        pairs.set(key, { commands: [arr[i], arr[i + 1]], count: 1 });
      }
    }
  }

  // Find most frequent pair
  let best: { commands: string[]; count: number } | null = null;
  for (const pair of pairs.values()) {
    if (pair.count >= minFrequency && (!best || pair.count > best.count)) {
      best = pair;
    }
  }

  return best ? best.commands : null;
}

function countMatches(arrays: string[][], sequence: string[]): number {
  return arrays.filter(arr => {
    let seqIdx = 0;
    for (const cmd of arr) {
      if (cmd === sequence[seqIdx]) seqIdx++;
      if (seqIdx === sequence.length) return true;
    }
    return false;
  }).length;
}
