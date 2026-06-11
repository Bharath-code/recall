/**
 * JSON Output Utility
 *
 * Standard JSON output for commands with --json flag.
 * When --json is set, ONLY JSON goes to stdout — no headers, spacing, or status.
 * All other output (errors, progress) must go to stderr.
 */

/**
 * Output data as JSON to stdout.
 * When --json is set on a command, all human-readable output is suppressed
 * and only this JSON is written to stdout.
 */
export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}
