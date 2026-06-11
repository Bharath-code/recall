/**
 * Error→Fix Matcher
 *
 * Hashes error signatures (stripping variable parts like paths/timestamps)
 * and links errors to their subsequent fixes.
 */

import { createHash } from 'node:crypto';
import { insertError, recordFix, findFix, findSimilarErrors, type ErrorRecord } from '../db/errors.ts';
import { getCommandById, getRecentFailedBySession, type Command } from '../db/commands.ts';

/**
 * Hash a command + exit code into a stable error signature for cases
 * where stderr output is not captured by the shell hooks.
 *
 * Strips variable arguments (file paths, port numbers, package names)
 * to match similar failures across invocations.
 */
export function hashCommandSignature(normalizedCommand: string, exitCode: number): string {
  let normalized = normalizedCommand.trim();

  // Strip absolute paths
  normalized = normalized.replace(/\/[\w\-./]+/g, '<PATH>');

  // Strip flags with values (e.g., --port 3000, -p 8080)
  normalized = normalized.replace(/--?[\w-]+\s+\S+/g, '<FLAG>');

  // Strip specific package names from npm/pip/cargo commands
  normalized = normalized.replace(/(npm\s+(install|i|add|remove)\s+)\S+/g, '$1<PACKAGE>');
  normalized = normalized.replace(/(pip\s+(install|uninstall)\s+)\S+/g, '$1<PACKAGE>');
  normalized = normalized.replace(/(cargo\s+(add|install|remove)\s+)\S+/g, '$1<PACKAGE>');

  // Strip version numbers
  normalized = normalized.replace(/@\d+\.\d+\.\d+/g, '@<VER>');

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Take first 300 chars
  normalized = normalized.slice(0, 300);

  return createHash('sha256').update(`${normalized}:exit=${exitCode}`).digest('hex').slice(0, 32);
}

/**
 * Derive an error signature for a failed command.
 * Uses stderr if available, otherwise falls back to command-based hashing.
 */
export function deriveErrorSignature(
  stderr: string | null | undefined,
  normalizedCommand: string,
  exitCode: number,
): string {
  if (stderr) {
    return hashErrorSignature(stderr);
  }
  return hashCommandSignature(normalizedCommand, exitCode);
}

/**
 * Auto-record an error for a failed command in the background.
 * Uses stderr if available, otherwise falls back to command-based hashing.
 * Safe to call from hook update — always succeeds silently.
 */
export function autoRecordError(
  commandId: number,
  stderr: string | null | undefined,
  normalizedCommand: string,
  exitCode: number,
): void {
  try {
    if (stderr) {
      recordCommandError(commandId, stderr);
    } else {
      const signature = hashCommandSignature(normalizedCommand, exitCode);
      insertError({
        error_signature: signature,
        error_message: `Failed: ${normalizedCommand} (exit ${exitCode})`,
        command_id: commandId,
      });
    }
  } catch {
    // Auto-learning is best-effort — never fail the hook
  }
}

/**
 * Auto-detect a fix: when a command succeeds, check if it follows a recent failure
 * in the same session. If so, record it as a potential fix.
 * Safe to call from hook update — always succeeds silently.
 */
export function autoDetectFix(
  sessionId: string,
  fixCommandId: number,
  fixNormalizedCommand: string,
): void {
  try {
    // Find the last failed command in this session (excluding this command)
    const failedCommand = getRecentFailedBySession(sessionId, fixCommandId);
    if (!failedCommand) return;

    const errorSignature = deriveErrorSignature(
      failedCommand.stderr_output,
      failedCommand.normalized_command,
      failedCommand.exit_code ?? 1,
    );

    // Check if this error already has a recorded fix
    const existingFix = findFix(errorSignature);

    if (existingFix) {
      // Error already has a fix — boost confidence if the same fix is repeated
      if (existingFix.fix_command_id) {
        const fixCmd = getCommandById(existingFix.fix_command_id);
        if (fixCmd && fixCmd.normalized_command === fixNormalizedCommand) {
          recordFix({
            error_signature: errorSignature,
            fix_command_id: fixCommandId,
            fix_summary: `auto: ${fixNormalizedCommand}`,
          });
        }
      }
      return;
    }

    // Ensure the error record exists before recording a fix
    if (failedCommand.stderr_output) {
      recordCommandError(failedCommand.id, failedCommand.stderr_output);
    } else {
      insertError({
        error_signature: errorSignature,
        error_message: `Failed: ${failedCommand.normalized_command} (exit ${failedCommand.exit_code ?? 1})`,
        command_id: failedCommand.id,
      });
    }

    recordFix({
      error_signature: errorSignature,
      fix_command_id: fixCommandId,
      fix_summary: `auto: ${fixNormalizedCommand} (${failedCommand.stderr_output ? 'stderr' : 'command'})`,
    });
  } catch {
    // Auto-learning is best-effort — never fail the hook
  }
}

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
