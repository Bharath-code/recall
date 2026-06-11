/**
 * Recall Binary Resolver
 *
 * The MCP server calls `recall <command> --json` as a subprocess. This
 * module resolves the path to the recall binary, handling both development
 * (run via `bun`) and production (compiled binary) modes.
 */

let cachedBinary: string | null = null;

export function resolveRecallBinary(): string {
  if (cachedBinary) return cachedBinary;

  // 1. RECALL_BINARY env var takes highest precedence (for testing / custom installs)
  const envOverride = process.env.RECALL_BINARY;
  if (envOverride) {
    cachedBinary = envOverride;
    return cachedBinary;
  }

  // 2. Running as compiled binary (argv[0] is the binary path)
  //    Check if we're the recall binary itself by looking for the mcp subcommand
  const selfPath = process.argv[0];
  if (selfPath && !selfPath.includes('bun') && !selfPath.includes('node')) {
    // We're the compiled binary — call ourselves with different args
    cachedBinary = selfPath;
    return cachedBinary;
  }

  // 3. Running via `bun run src/index.ts` — look for recall in PATH
  const inPath = Bun.which('recall');
  if (inPath) {
    cachedBinary = inPath;
    return cachedBinary;
  }

  // 4. DEV mode: run via `bun` with the source entrypoint
  const entrypoint = import.meta.dirname + '/../index.ts';
  cachedBinary = `bun run ${entrypoint}`;
  return cachedBinary;
}

/**
 * Reset the cached binary path (useful for testing).
 */
export function resetBinaryCache(): void {
  cachedBinary = null;
}
