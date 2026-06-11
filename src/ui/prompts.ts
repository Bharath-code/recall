/**
 * prompts — Interactive prompt utilities (wrapper around @clack/prompts)
 *
 * Integrates @clack/prompts with Recall's UI conventions:
 * - Cancellation handling (Ctrl+C / Escape → graceful exit)
 * - NO_COLOR / --no-icons respect
 * - Brand-compliant intro/outro
 */

import * as clack from '@clack/prompts';

// ─── Re-exports ──────────────────────────────────────────────────────────────

export { isCancel } from '@clack/prompts';
export const intro = clack.intro;
export const outro = clack.outro;
export const log = clack.log;
export const note = clack.note;
export const confirm = clack.confirm;
export const select = clack.select;
export const multiselect = clack.multiselect;
export const text = clack.text;
export const password = clack.password;
export const spinner = clack.spinner;
export const cancel = clack.cancel;
export const group = clack.group;
export const tasks = clack.tasks;

/**
 * Unwrap a prompt result — if the user cancelled, exit gracefully.
 * Returns the raw value otherwise.
 */
export function unwrap<T>(value: T | symbol): T {
  if (clack.isCancel(value)) {
    clack.cancel('Cancelled.');
    process.exit(0);
  }
  return value;
}

/**
 * Check if we're in an interactive terminal (TTY, not CI) where prompts make sense.
 */
export function isInteractive(): boolean {
  return process.stdout.isTTY && !clack.isCI;
}
