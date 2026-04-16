/**
 * AI Adapter — Provider abstraction layer
 *
 * Supports:
 * - Local embeddings (ONNX runtime via @xenova/transformers) — privacy-first
 * - Cloud AI (OpenAI/Anthropic) — for teams/enterprise who want speed
 * - Noop fallback — when AI is disabled, falls back to keyword search
 */

export interface AIAdapter {
  readonly name: string;
  readonly isAvailable: boolean;
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}

export type AIProvider = 'local' | 'openai' | 'anthropic' | 'none';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Noop adapter — always available, returns empty vectors.
 * Used as fallback when AI is not configured.
 */
export class NoopAIAdapter implements AIAdapter {
  readonly name = 'none';
  readonly isAvailable = true;

  async embed(_text: string): Promise<Float32Array> {
    return new Float32Array(0);
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return texts.map(() => new Float32Array(0));
  }
}

/**
 * Cloud AI adapter — uses OpenAI-compatible embeddings API.
 * Works with OpenAI, Azure OpenAI, and any compatible endpoint.
 */
export class CloudAIAdapter implements AIAdapter {
  readonly name: string;
  readonly isAvailable: boolean;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: AIConfig) {
    this.name = config.provider;
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? 'text-embedding-3-small';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.isAvailable = !!this.apiKey;
  }

  async embed(text: string): Promise<Float32Array> {
    const result = await this.embedBatch([text]);
    return result[0];
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    if (!this.apiKey) throw new Error('No API key configured for cloud AI');

    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloud AI error (${response.status}): ${error}`);
    }

    const data = await response.json() as {
      data: { embedding: number[]; index: number }[];
    };

    // Sort by index to maintain order
    const sorted = data.data.sort((a, b) => a.index - b.index);
    return sorted.map(d => new Float32Array(d.embedding));
  }
}

/**
 * Resolve the AI config from environment/config.
 */
export function resolveAIConfig(): AIConfig {
  // Check for cloud config first
  const openaiKey = process.env.RECALL_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: 'openai',
      apiKey: openaiKey,
      model: process.env.RECALL_EMBEDDING_MODEL ?? 'text-embedding-3-small',
      baseUrl: process.env.RECALL_OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    };
  }

  const anthropicKey = process.env.RECALL_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return {
      provider: 'anthropic',
      apiKey: anthropicKey,
    };
  }

  // Check if user explicitly wants local
  const preferLocal = process.env.RECALL_AI_PROVIDER === 'local';
  if (preferLocal) {
    return { provider: 'local' };
  }

  // Default: try local, fall back to none
  return { provider: 'local' };
}

/**
 * Create an AI adapter instance based on config.
 */
export async function createAIAdapter(config?: AIConfig): Promise<AIAdapter> {
  const resolved = config ?? resolveAIConfig();

  switch (resolved.provider) {
    case 'openai':
    case 'anthropic':
      return new CloudAIAdapter(resolved);

    case 'local': {
      // Lazy import to avoid loading ONNX when not needed
      try {
        const { LocalAIAdapter } = await import('./embeddings.ts');
        const adapter = new LocalAIAdapter();
        return adapter;
      } catch {
        // Local model not available, fall back to noop
        return new NoopAIAdapter();
      }
    }

    case 'none':
    default:
      return new NoopAIAdapter();
  }
}
