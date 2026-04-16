/**
 * recall ask "<natural language query>" — AI-powered semantic search
 *
 * Fallback chain:
 * 1. Local embeddings (ONNX, no API key) — privacy-first
 * 2. Cloud embeddings (OpenAI/Anthropic, needs key) — for teams
 * 3. Fuzzy keyword search — always works, no AI needed
 */

import { createAIAdapter, NoopAIAdapter, resolveAIConfig, type AIAdapter } from '../ai/adapter.ts';
import { searchSimilar } from '../ai/embeddings.ts';
import { getDb } from '../db/index.ts';
import { searchCommandsKeyword, getCommandById, type Command } from '../db/commands.ts';
import { colors, formatCommandLine, formatHeader, getIcons, createSpinner } from '../ui/index.ts';

export async function handleAsk(query: string): Promise<void> {
  const icons = getIcons();

  if (!query || !query.trim()) {
    console.log(colors.error('Usage: recall ask "<question>"'));
    console.log(colors.dim('  Example: recall ask "how do I clean docker images"'));
    console.log(colors.dim('  Example: recall ask "what port does my server run on"'));
    process.exit(1);
  }

  console.log(formatHeader(`${icons.brain} recall ask`));
  console.log('');
  console.log(`  ${colors.dim('Query:')} ${query}`);
  console.log('');

  // Try semantic search first
  let results: Command[] = [];
  let searchMethod = '';

  const config = resolveAIConfig();
  const spinner = createSpinner('Searching your memory...', 'ai');
  spinner.start();

  try {
    const adapter = await createAIAdapter(config);

    if (!(adapter instanceof NoopAIAdapter)) {
      // We have a working AI adapter — do semantic search
      searchMethod = `AI (${adapter.name})`;
      results = await semanticSearch(adapter, query);
    }
  } catch {
    // AI failed — fall through to keyword search
  }

  // Fallback to keyword search
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
    console.log(colors.dim('  • Try rephrasing your question'));
    console.log(colors.dim('  • Use "recall search" for exact keyword matching'));
    console.log(colors.dim('  • Run more commands — Recall learns over time'));
    return;
  }

  console.log(colors.dim(`  Found via ${searchMethod}:`));
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

  // Show provider info
  if (searchMethod === 'keyword') {
    console.log(colors.dim('  💡 For smarter results, enable AI:'));
    console.log(colors.dim('     Local:  bun add @xenova/transformers'));
    console.log(colors.dim('     Cloud:  export RECALL_OPENAI_API_KEY=sk-...'));
  }
  console.log('');
}

async function semanticSearch(adapter: AIAdapter, query: string): Promise<Command[]> {
  const db = getDb();

  // Embed the query
  const queryVector = await adapter.embed(query);
  if (queryVector.length === 0) return [];

  // Get stored embeddings
  const rows = db.prepare(`
    SELECT e.command_id, e.vector FROM embeddings e
    ORDER BY e.created_at DESC
    LIMIT 1000
  `).all() as { command_id: number; vector: Buffer }[];

  if (rows.length === 0) return [];

  // Convert stored vectors and search
  const storedVectors = rows.map(r => ({
    id: r.command_id,
    vector: new Float32Array(r.vector.buffer, r.vector.byteOffset, r.vector.byteLength / 4),
  }));

  const topResults = await searchSimilar(queryVector, storedVectors, 10);

  // Fetch actual commands
  const commands: Command[] = [];
  for (const result of topResults) {
    if (result.score < 0.3) continue; // Skip low-confidence results
    const cmd = getCommandById(result.id);
    if (cmd) commands.push(cmd);
  }

  return commands;
}
