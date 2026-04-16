/**
 * Local AI Embeddings — ONNX runtime via @xenova/transformers
 *
 * Lazy-loads the model on first use (~22MB download).
 * Runs entirely local — no network calls after model download.
 * Model: all-MiniLM-L6-v2 (384-dimensional embeddings)
 */

import { type AIAdapter } from './adapter.ts';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const VECTOR_DIM = 384;

let pipeline: any = null;
let loadPromise: Promise<any> | null = null;

async function loadModel(): Promise<any> {
  if (pipeline) return pipeline;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const { pipeline: createPipeline } = await import('@xenova/transformers');
      pipeline = await createPipeline('feature-extraction', MODEL_NAME, {
        quantized: true, // Use quantized model for smaller download
      });
      return pipeline;
    } catch (err) {
      loadPromise = null;
      throw new Error(
        'Local AI model not available. Install with: bun add @xenova/transformers\n' +
        'Or set RECALL_OPENAI_API_KEY for cloud AI.'
      );
    }
  })();

  return loadPromise;
}

export class LocalAIAdapter implements AIAdapter {
  readonly name = 'local';
  get isAvailable(): boolean {
    return true; // Optimistically true — will fail gracefully
  }

  async embed(text: string): Promise<Float32Array> {
    const model = await loadModel();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return new Float32Array(output.data);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const model = await loadModel();
    const results: Float32Array[] = [];

    // Process in small batches to manage memory
    const batchSize = 32;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      for (const text of batch) {
        const output = await model(text, { pooling: 'mean', normalize: true });
        results.push(new Float32Array(output.data));
      }
    }

    return results;
  }
}

/**
 * Cosine similarity between two vectors.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Semantic search — find most similar commands to a query.
 */
export async function searchSimilar(
  queryVector: Float32Array,
  storedVectors: { id: number; vector: Float32Array }[],
  topK: number = 10,
): Promise<{ id: number; score: number }[]> {
  const scored = storedVectors.map(sv => ({
    id: sv.id,
    score: cosineSimilarity(queryVector, sv.vector),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export { VECTOR_DIM, MODEL_NAME };
