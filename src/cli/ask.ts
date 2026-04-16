/**
 * recall ask "<natural language query>" — AI-powered semantic search
 *
 * Fallback chain:
 * 1. Local ONNX (no API key, privacy-first)
 * 2. Any AI SDK provider — OpenAI, Google, Cohere, Ollama, Azure, etc.
 * 3. Keyword search — always works
 */

import { createEmbedder, NoopEmbedder, resolveAIConfig } from '../ai/adapter.ts';
import { searchSimilar, deserializeVector } from '../ai/embeddings.ts';
import { getDb } from '../db/index.ts';
import { searchCommandsKeyword, getCommandById, type Command } from '../db/commands.ts';
import { colors, formatCommandLine, formatHeader, getIcons, createSpinner } from '../ui/index.ts';

export async function handleAsk(query: string): Promise<void> {
  const icons = getIcons();

  if (!query?.trim()) {
    console.log(colors.error('Usage: recall ask "<question>"'));
    console.log(colors.dim('  Example: recall ask "how do I clean docker images"'));
    console.log(colors.dim('  Example: recall ask "what was that kubectl command"'));
    process.exit(1);
  }

  console.log(formatHeader(`${icons.brain} recall ask`));
  console.log('');
  console.log(`  ${colors.dim('Query:')} ${query}`);
  console.log('');

  let results: Command[] = [];
  let searchMethod = '';

  const config = resolveAIConfig();
  const spinner = createSpinner(`Searching with ${config.provider}...`, 'ai');
  spinner.start();

  try {
    const embedder = await createEmbedder(config);

    if (!(embedder instanceof NoopEmbedder)) {
      searchMethod = embedder.name;
      results = await semanticSearch(embedder, query.trim());
    }
  } catch (err) {
    // AI failed — fall through to keyword
  }

  // Keyword search fallback
  if (results.length === 0) {
    searchMethod = 'keyword';
    try {
      results = searchCommandsKeyword(query.trim(), 15);
    } catch {
      results = [];
    }
  }

  spinner.stop();

  if (results.length === 0) {
    console.log(colors.dim('  No matching commands found.'));
    console.log('');
    console.log(colors.dim('  Tips:'));
    console.log(colors.dim('  • Try rephrasing — natural language works best'));
    console.log(colors.dim('  • Use \'recall search\' for exact keyword matching'));
    console.log(colors.dim('  • Run more commands — Recall learns over time'));
    return;
  }

  console.log(colors.dim(`  Found via ${colors.bold(searchMethod)} search:`));
  console.log('');

  for (let i = 0; i < results.length; i++) {
    const cmd = results[i];
    const num = colors.dim(`  ${String(i + 1).padStart(2)}.`);
    console.log(`${num} ${formatCommandLine({
      command: cmd.raw_command,
      cwd: cmd.cwd,
      timestamp: cmd.created_at,
      exitCode: cmd.exit_code,
    })}`);
  }

  console.log('');

  // Show setup hints only for keyword fallback
  if (searchMethod === 'keyword') {
    console.log(colors.dim(`  ${icons.brain} Enable AI for smarter results:`));
    console.log(colors.dim(''));
    console.log(colors.dim('    Local (no API key):'));
    console.log(colors.dim('      bun add @xenova/transformers'));
    console.log(colors.dim(''));
    console.log(colors.dim('    Cloud providers:'));
    console.log(colors.dim('      export OPENAI_API_KEY=sk-...'));
    console.log(colors.dim('      export GOOGLE_GENERATIVE_AI_API_KEY=AIz...'));
    console.log(colors.dim('      export COHERE_API_KEY=co-...'));
    console.log(colors.dim(''));
    console.log(colors.dim('    Ollama (fully local):'));
    console.log(colors.dim('      ollama pull nomic-embed-text'));
    console.log(colors.dim('      export RECALL_AI_PROVIDER=ollama'));
  }

  console.log('');
}

async function semanticSearch(
  embedder: { embed(text: string): Promise<number[]> },
  query: string
): Promise<Command[]> {
  const db = getDb();

  // Embed the query
  const queryVector = await embedder.embed(query);
  if (queryVector.length === 0) return [];

  // Fetch stored embeddings from DB
  const rows = db.prepare(`
    SELECT e.command_id, e.vector
    FROM embeddings e
    ORDER BY e.created_at DESC
    LIMIT 2000
  `).all() as { command_id: number; vector: Buffer }[];

  if (rows.length === 0) return [];

  // Deserialize and rank
  const storedVectors = rows.map(r => ({
    id: r.command_id,
    vector: deserializeVector(r.vector),
  }));

  const topResults = searchSimilar(queryVector, storedVectors, 10);

  const commands: Command[] = [];
  for (const result of topResults) {
    if (result.score < 0.25) continue; // Minimum relevance threshold
    const cmd = getCommandById(result.id);
    if (cmd) commands.push(cmd);
  }

  return commands;
}
