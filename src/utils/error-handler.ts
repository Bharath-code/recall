/**
 * Standardized error handling for CLI commands
 */

import { colors } from '../ui/colors.ts';

export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public shouldExit: boolean = true
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * Format and display an error message consistently
 */
export function displayError(message: string, context?: string): void {
  console.error(colors.error('Error: ') + message);
  if (context) {
    console.error(colors.dim(context));
  }
}

/**
 * Format and display a warning message consistently
 */
export function displayWarning(message: string, context?: string): void {
  console.warn(colors.warning('Warning: ') + message);
  if (context) {
    console.warn(colors.dim(context));
  }
}

/**
 * Handle errors consistently across CLI commands
 */
export function handleError(err: unknown, exit: boolean = true): never {
  if (err instanceof CLIError) {
    displayError(err.message);
    if (err.shouldExit || exit) {
      process.exit(err.exitCode);
    }
    throw err;
  }

  if (err instanceof Error) {
    displayError(err.message);
    if (exit) {
      process.exit(1);
    }
    throw err;
  }

  displayError('An unknown error occurred');
  if (exit) {
    process.exit(1);
  }
  throw new Error('Unknown error');
}

/**
 * Validate required flags and throw CLIError if missing
 */
export function requireFlag<T>(
  value: T | undefined,
  flagName: string,
  errorMessage?: string
): T {
  if (value === undefined || value === null || value === '') {
    const message = errorMessage || `Missing required flag: --${flagName}`;
    throw new CLIError(message, 1, true);
  }
  return value;
}
