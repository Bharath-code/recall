/**
 * Embeddings utilities — provider-agnostic
 *
 * Vector math and semantic search helpers used by `recall ask`.
 */

import { getDb } from '../db/index.ts';

// ─── Pure math utilities ────────────────────────────────────────────────────

export const VECTOR_DIM = 384;
export const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Find top-K most similar stored vectors to a query vector.
 * Improved with minimum score threshold and confidence scoring.
 */
export function searchSimilar(
  queryVector: number[],
  storedVectors: { id: number; vector: number[] }[],
  topK: number = 10,
  minScore: number = 0.3,
): { id: number; score: number; confidence: 'high' | 'medium' | 'low' }[] {
  const results = storedVectors
    .map(sv => ({ id: sv.id, score: cosineSimilarity(queryVector, sv.vector) }))
    .filter(r => r.score >= minScore) // Filter out low-quality matches
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  // Add confidence levels based on score
  return results.map(r => ({
    ...r,
    confidence: r.score >= 0.7 ? 'high' : r.score >= 0.5 ? 'medium' : 'low',
  }));
}

/**
 * Serialize a number[] vector to a Buffer for SQLite BLOB storage.
 */
export function serializeVector(vector: number[]): Buffer {
  const arr = new Float32Array(vector);
  return Buffer.from(arr.buffer);
}

/**
 * Deserialize a Buffer from SQLite BLOB back to number[].
 */
export function deserializeVector(buf: Buffer): number[] {
  const arr = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  return Array.from(arr);
}

// ─── Database-backed utilities ─────────────────────────────────────────────

/**
 * Insert an embedding for a command.
 */
export function insertEmbedding(commandId: number, vector: number[]): void {
  const db = getDb();
  const blob = serializeVector(vector);

  db.prepare(`
    INSERT OR REPLACE INTO embeddings (command_id, vector, model)
    VALUES (?, ?, ?)
  `).run(commandId, blob, MODEL_NAME);
}

/**
 * Get command IDs that don't have embeddings yet.
 */
export function getUnembeddedCommandIds(limit: number = 100): number[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT c.id FROM commands c
    LEFT JOIN embeddings e ON c.id = e.command_id
    WHERE e.id IS NULL
    ORDER BY c.created_at DESC
    LIMIT ?
  `).all(limit) as { id: number }[];

  return rows.map(r => r.id);
}

/**
 * Batch-generate embeddings for un-embedded commands.
 * Returns the number of embeddings generated.
 */
export async function generateMissingEmbeddings(
  embedder: { embed(text: string): Promise<number[]> },
  batchSize: number = 200,
): Promise<number> {
  const db = getDb();
  const ids = getUnembeddedCommandIds(batchSize);
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => '?').join(',');
  const commands = db.prepare(`
    SELECT id, normalized_command FROM commands
    WHERE id IN (${placeholders})
  `).all(...ids) as { id: number; normalized_command: string }[];

  let generated = 0;
  for (const cmd of commands) {
    try {
      const vector = await embedder.embed(cmd.normalized_command);
      insertEmbedding(cmd.id, vector);
      generated++;
    } catch {
      // Skip failures, retry next batch cycle
    }
  }
  return generated;
}
