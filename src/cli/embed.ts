/**
 * recall embed — Background embedding generator
 *
 * Designed to run as a fire-and-forget process after `recall hook capture`:
 *   bun run src/index.ts embed --batch-size 200 &
 *
 * Or in daemon mode for continuous embedding:
 *   recall embed --daemon
 */

import { resolveAIConfig, createEmbedder, NoopEmbedder } from '../ai/adapter.ts';
import { generateMissingEmbeddings, getUnembeddedCommandIds } from '../ai/embeddings.ts';

export interface EmbedFlags {
  batchSize?: number;
  daemon?: boolean;
  noIcons?: boolean;
}

export async function handleEmbed(flags: EmbedFlags): Promise<void> {
  const config = resolveAIConfig();
  const embedder = await createEmbedder(config);

  if (embedder instanceof NoopEmbedder) {
    // No embedder available — silent exit, don't pollute output
    return;
  }

  const batchSize = flags.batchSize ?? 200;

  if (flags.daemon) {
    await runDaemon(embedder, batchSize);
  } else {
    const generated = await generateMissingEmbeddings(embedder, batchSize);
    // Silent unless we actually generated something
    if (generated > 0) {
      process.stdout.write(`[recall] Generated ${generated} embeddings\n`);
    }
  }
}

async function runDaemon(
  embedder: NonNoopEmbedder,
  batchSize: number,
): Promise<void> {
  // Generate embeddings once, then watch for new commands every 30s
  while (true) {
    const generated = await generateMissingEmbeddings(embedder, batchSize);
    if (generated > 0) {
      process.stderr.write(`[recall] Generated ${generated} embeddings\n`);
    }

    // Check for ungenerated every 30s
    await sleep(30_000);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NonNoopEmbedder = any; // RecallEmbedder without NoopEmbedder

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
