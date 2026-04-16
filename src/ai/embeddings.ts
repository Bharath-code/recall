/**
 * Embeddings utilities — provider-agnostic
 *
 * Vector math and semantic search helpers used by `recall ask`.
 */



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
 */
export function searchSimilar(
  queryVector: number[],
  storedVectors: { id: number; vector: number[] }[],
  topK: number = 10,
): { id: number; score: number }[] {
  return storedVectors
    .map(sv => ({ id: sv.id, score: cosineSimilarity(queryVector, sv.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
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

export const VECTOR_DIM = 384;
export const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
