/**
 * Local ONNX Embedder — via @xenova/transformers
 *
 * Runs entirely local. No network calls after first download (~22MB).
 * Model: all-MiniLM-L6-v2 (384-dimensional)
 */

import { type RecallEmbedder } from './adapter.ts';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let pipelineInstance: any = null;
let loadPromise: Promise<any> | null = null;

async function getModel(): Promise<any> {
  if (pipelineInstance) return pipelineInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { pipeline } = await import('@xenova/transformers');
    pipelineInstance = await pipeline('feature-extraction', MODEL_NAME, { quantized: true });
    return pipelineInstance;
  })();

  return loadPromise;
}

export class LocalEmbedder implements RecallEmbedder {
  readonly name = 'local';
  readonly isAvailable = true;

  async embed(text: string): Promise<number[]> {
    const model = await getModel();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const model = await getModel();
    const results: number[][] = [];
    for (const text of texts) {
      const output = await model(text, { pooling: 'mean', normalize: true });
      results.push(Array.from(output.data as Float32Array));
    }
    return results;
  }
}
