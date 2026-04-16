/**
 * Error→Fix Matcher
 *
 * Hashes error signatures (stripping variable parts like paths/timestamps)
 * and links errors to their subsequent fixes.
 */

import { createHash } from 'node:crypto';
import { insertError, recordFix, findFix, findSimilarErrors, type ErrorRecord } from '../db/errors.ts';
import { getCommandById, type Command } from '../db/commands.ts';

/**
 * Normalize stderr output into a stable error signature.
 * Strips variable content (paths, timestamps, line numbers) to match similar errors.
 */
export function hashErrorSignature(stderr: string): string {
  let normalized = stderr.trim();

  // Strip absolute paths
  normalized = normalized.replace(/\/[\w\-./]+/g, '<PATH>');

  // Strip line numbers (e.g., "line 42", ":42:", "(42)")
  normalized = normalized.replace(/(?:line\s+)\d+/gi, 'line <N>');
  normalized = normalized.replace(/:\d+(?::\d+)?/g, ':<N>');

  // Strip timestamps (ISO, Unix, etc.)
  normalized = normalized.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[.\d]*/g, '<TIMESTAMP>');
  normalized = normalized.replace(/\d{10,13}/g, '<TIMESTAMP>');

  // Strip hex addresses
  normalized = normalized.replace(/0x[0-9a-fA-F]+/g, '<ADDR>');

  // Strip PIDs and port numbers in common patterns
  normalized = normalized.replace(/pid\s*[:=]\s*\d+/gi, 'pid=<N>');
  normalized = normalized.replace(/port\s*[:=]\s*\d+/gi, 'port=<N>');

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Take first 500 chars to keep signatures manageable
  normalized = normalized.slice(0, 500);

  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

/**
 * Extract the most meaningful error line from stderr.
 * Usually the first line containing "error", "Error", "ERROR", "fatal", etc.
 */
export function extractErrorMessage(stderr: string): string {
  const lines = stderr.split('\n').filter(l => l.trim());

  // Find the most relevant error line
  const errorLine = lines.find(l =>
    /\b(error|Error|ERROR|fatal|FATAL|failed|FAILED|exception|Exception|panic)\b/.test(l)
  );

  return (errorLine ?? lines[0] ?? '').trim().slice(0, 200);
}

/**
 * Record a failed command's error for future matching.
 */
export function recordCommandError(commandId: number, stderr: string): string {
  const signature = hashErrorSignature(stderr);
  const message = extractErrorMessage(stderr);

  insertError({
    error_signature: signature,
    error_message: message,
    command_id: commandId,
  });

  return signature;
}

/**
 * Record that a successful command fixed a previous error.
 */
export function recordCommandFix(errorSignature: string, fixCommandId: number, fixSummary?: string): void {
  recordFix({
    error_signature: errorSignature,
    fix_command_id: fixCommandId,
    fix_summary: fixSummary,
  });
}

/**
 * Look up a known fix for an error.
 */
export function lookupFix(stderr: string): {
  error: ErrorRecord;
  fixCommand: Command | null;
} | null {
  const signature = hashErrorSignature(stderr);

  // Try exact match first
  const exactMatch = findFix(signature);
  if (exactMatch?.fix_command_id) {
    const fixCmd = getCommandById(exactMatch.fix_command_id);
    return { error: exactMatch, fixCommand: fixCmd };
  }

  // Try similar errors (prefix match)
  const similar = findSimilarErrors(signature, 1);
  if (similar.length > 0 && similar[0].fix_command_id) {
    const fixCmd = getCommandById(similar[0].fix_command_id);
    return { error: similar[0], fixCommand: fixCmd };
  }

  return null;
}
