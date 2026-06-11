/**
 * spinner — Spinner utilities wrapping @clack/prompts spinner
 *
 * Provides the same createSpinner() / withSpinner() API as before,
 * but powered by @clack/prompts for visual consistency with other
 * interactive elements.
 *
 * Falls back to a no-op spinner in non-TTY/CI environments.
 */

import * as clack from '@clack/prompts';

const isInteractive = process.stdout.isTTY && !process.env.NO_COLOR;

// ─── Adapter: wraps @clack/prompts spinner to match ora's API surface ──────

interface SpinnerAdapter {
  start(msg?: string): void;
  stop(msg?: string): void;
  succeed(msg?: string): void;
  fail(msg?: string): void;
}

function createClackSpinner(text: string, _preset?: string): SpinnerAdapter {
  const s = clack.spinner();
  // Auto-start on creation, matching ora() behavior
  s.start(text);

  return {
    start(msg?: string) {
      // @clack/prompts spin is already running — update the message in-place
      s.message(msg ?? text);
    },
    stop(msg?: string) {
      s.stop(msg);
    },
    succeed(msg?: string) {
      // Consumers add color to the message for visual distinction
      s.stop(msg);
    },
    fail(msg?: string) {
      s.stop(msg);
    },
  };
}

// ─── No-op spinner for non-TTY ──────────────────────────────────────────────

function createNoopSpinner(): SpinnerAdapter {
  return {
    start() {},
    stop() {},
    succeed() {},
    fail() {},
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function createSpinner(
  text: string,
  _preset?: string,
): SpinnerAdapter {
  if (!isInteractive) return createNoopSpinner();
  return createClackSpinner(text, _preset);
}

export async function withSpinner<T>(
  text: string,
  preset: string,
  fn: () => Promise<T>,
): Promise<T> {
  const spinner = createSpinner(text, preset);
  spinner.start();

  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
