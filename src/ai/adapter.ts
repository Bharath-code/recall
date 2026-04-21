/**
 * AI Adapter — Universal plug-and-play model support
 *
 * Recall uses ONE embedding model (for semantic search) and will support ONE
 * chat model (for future AI reasoning features).
 *
 * All modern providers speak the OpenAI protocol. So the universal pattern is:
 *
 *   RECALL_API_KEY=your-key
 *   RECALL_BASE_URL=https://provider.com/v1
 *   RECALL_EMBEDDING_MODEL=provider/model-name
 *
 * Named provider shortcuts (auto-detected from well-known API key env vars):
 *   openrouter → https://openrouter.ai/api/v1
 *   ollama     → http://localhost:11434/v1
 *   openai     → https://api.openai.com/v1
 *   google     → uses @ai-sdk/google (separate protocol)
 *   cohere     → uses @ai-sdk/cohere (separate protocol)
 *
 * Config resolution order:
 *   1. RECALL_BASE_URL + RECALL_API_KEY (universal, highest priority)
 *   2. Named provider via RECALL_AI_PROVIDER
 *   3. Auto-detect from well-known API key env vars
 *   4. Local ONNX (fallback, no key needed)
 *   5. Keyword search noop (always works)
 */

import { embed, embedMany } from 'ai';
import type { EmbeddingModel } from 'ai';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProvider =
  | 'openai'
  | 'openrouter'
  | 'ollama'
  | 'google'
  | 'cohere'
  | 'azure'
  | 'custom'   // Any OpenAI-compat endpoint via RECALL_BASE_URL
  | 'local'    // In-process ONNX, no server
  | 'none';    // Keyword search fallback

export interface AIConfig {
  provider: AIProvider;
  embeddingModel?: string;
  apiKey?: string;
  baseUrl?: string;
}

// ─── Embedder Interface ────────────────────────────────────────────────────────

export interface RecallEmbedder {
  readonly name: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// ─── SDK Embedder — wraps any AI SDK EmbeddingModel ───────────────────────────

export class SDKEmbedder implements RecallEmbedder {
  readonly name: string;
  private model: EmbeddingModel;

  constructor(name: string, model: EmbeddingModel) {
    this.name = name;
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const { embedding } = await embed({ model: this.model, value: text });
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const { embeddings } = await embedMany({ model: this.model, values: texts });
    return embeddings;
  }
}

// ─── Noop — keyword search fallback ───────────────────────────────────────────

export class NoopEmbedder implements RecallEmbedder {
  readonly name = 'none';
  async embed(_text: string): Promise<number[]> { return []; }
  async embedBatch(texts: string[]): Promise<number[][]> { return texts.map(() => []); }
}

// ─── OpenAI-compat client builder ─────────────────────────────────────────────
// Used for: openai, openrouter, ollama, azure, and any custom baseUrl

async function openAICompatEmbedder(
  name: string,
  model: string,
  baseURL: string,
  apiKey: string,
  extraHeaders?: Record<string, string>,
): Promise<SDKEmbedder> {
  const { createOpenAI } = await import('@ai-sdk/openai');
  const client = createOpenAI({ apiKey, baseURL, headers: extraHeaders });
  return new SDKEmbedder(name, client.embedding(model));
}

// ─── Configuration Validation ──────────────────────────────────────────────────

export function validateAIConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate provider
  const validProviders: AIProvider[] = ['openai', 'openrouter', 'ollama', 'google', 'cohere', 'azure', 'custom', 'local', 'none'];
  if (!validProviders.includes(config.provider)) {
    errors.push(`Invalid provider: ${config.provider}`);
  }

  // For non-local providers, require API key or baseUrl
  if (config.provider !== 'local' && config.provider !== 'none') {
    if (!config.apiKey && !config.baseUrl) {
      errors.push(`Provider ${config.provider} requires either API key or base URL`);
    }

    // Validate baseUrl format if provided
    if (config.baseUrl) {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push(`Invalid base URL: ${config.baseUrl}`);
      }
    }

    // Validate embedding model if provided
    if (config.embeddingModel && config.embeddingModel.trim().length === 0) {
      errors.push('Embedding model cannot be empty');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Config Resolution ────────────────────────────────────────────────────────

export function resolveAIConfig(): AIConfig {
  const provider = process.env.RECALL_AI_PROVIDER as AIProvider | undefined;
  const embeddingModel = process.env.RECALL_EMBEDDING_MODEL;
  const apiKey = process.env.RECALL_API_KEY;
  const baseUrl = process.env.RECALL_BASE_URL;

  // ── Universal: explicit baseUrl wins over everything ──────────────────────
  if (baseUrl) {
    return {
      provider: 'custom',
      embeddingModel: embeddingModel ?? 'text-embedding-3-small',
      apiKey: apiKey ?? 'no-key',
      baseUrl,
    };
  }

  // ── Explicit provider set ─────────────────────────────────────────────────
  if (provider && provider !== 'local' && provider !== 'none') {
    return {
      provider,
      embeddingModel,
      apiKey: apiKey ?? resolveKeyForProvider(provider),
      baseUrl,
    };
  }

  // ── Auto-detect from well-known env vars ──────────────────────────────────

  // OpenRouter (auto-detect)
  const orKey = process.env.OPENROUTER_API_KEY ?? process.env.RECALL_OPENROUTER_API_KEY;
  if (orKey) {
    return {
      provider: 'openrouter',
      embeddingModel: embeddingModel ?? 'openai/text-embedding-3-small',
      apiKey: orKey,
    };
  }

  // OpenAI (auto-detect)
  const oaiKey = process.env.OPENAI_API_KEY ?? process.env.RECALL_OPENAI_API_KEY;
  if (oaiKey) {
    return {
      provider: 'openai',
      embeddingModel: embeddingModel ?? 'text-embedding-3-small',
      apiKey: oaiKey,
      baseUrl: process.env.RECALL_OPENAI_BASE_URL,
    };
  }

  // Google (auto-detect)
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.RECALL_GOOGLE_API_KEY;
  if (googleKey) {
    return {
      provider: 'google',
      embeddingModel: embeddingModel ?? 'text-embedding-004',
      apiKey: googleKey,
    };
  }

  // Cohere (auto-detect)
  const cohereKey = process.env.COHERE_API_KEY ?? process.env.RECALL_COHERE_API_KEY;
  if (cohereKey) {
    return {
      provider: 'cohere',
      embeddingModel: embeddingModel ?? 'embed-english-v3.0',
      apiKey: cohereKey,
    };
  }

  // Ollama: auto-detect from OLLAMA_HOST, or explicit provider=ollama
  const isOllama = (provider as string) === 'ollama' || !!process.env.OLLAMA_HOST;
  if (isOllama) {
    return {
      provider: 'ollama',
      embeddingModel: embeddingModel ?? 'nomic-embed-text',
      baseUrl: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
    };
  }

  // ── Defaults ──────────────────────────────────────────────────────────────
  if (provider === 'none') return { provider: 'none' };
  return { provider: 'local' }; // ONNX in-process, no network
}

function resolveKeyForProvider(provider: AIProvider): string | undefined {
  switch (provider) {
    case 'openrouter': return process.env.OPENROUTER_API_KEY ?? process.env.RECALL_OPENROUTER_API_KEY;
    case 'openai':     return process.env.OPENAI_API_KEY ?? process.env.RECALL_OPENAI_API_KEY;
    case 'google':     return process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.RECALL_GOOGLE_API_KEY;
    case 'cohere':     return process.env.COHERE_API_KEY ?? process.env.RECALL_COHERE_API_KEY;
    default:           return process.env.RECALL_API_KEY;
  }
}

// ─── Factory — build the right embedder ───────────────────────────────────────

export async function createEmbedder(config?: AIConfig): Promise<RecallEmbedder> {
  const c = config ?? resolveAIConfig();

  // Validate configuration
  const validation = validateAIConfig(c);
  if (!validation.valid) {
    process.stderr.write(`[recall] Invalid AI configuration:\n`);
    for (const error of validation.errors) {
      process.stderr.write(`[recall]   - ${error}\n`);
    }
    process.stderr.write(`[recall] Falling back to keyword search.\n`);
    return new NoopEmbedder();
  }

  try {
    switch (c.provider) {
      // ── Universal OpenAI-compat (custom baseUrl) ──────────────────────────
      case 'custom':
        return openAICompatEmbedder(
          'custom',
          c.embeddingModel ?? 'text-embedding-3-small',
          c.baseUrl!,
          c.apiKey ?? 'no-key',
        );

      // ── OpenRouter ────────────────────────────────────────────────────────
      // Routes to underlying provider. Use openai/* models for embeddings.
      case 'openrouter':
        return openAICompatEmbedder(
          'openrouter',
          c.embeddingModel ?? 'openai/text-embedding-3-small',
          'https://openrouter.ai/api/v1',
          c.apiKey ?? '',
          { 'HTTP-Referer': 'https://github.com/recall-cli', 'X-Title': 'Recall CLI' },
        );

      // ── OpenAI direct ─────────────────────────────────────────────────────
      case 'openai':
        return openAICompatEmbedder(
          'openai',
          c.embeddingModel ?? 'text-embedding-3-small',
          c.baseUrl ?? 'https://api.openai.com/v1',
          c.apiKey ?? '',
        );

      // ── Ollama (local server) ─────────────────────────────────────────────
      // For Gemma/Llama on Ollama: use nomic-embed-text or mxbai-embed-large
      // (chat models don't expose embeddings endpoints)
      case 'ollama':
        return openAICompatEmbedder(
          'ollama',
          c.embeddingModel ?? 'nomic-embed-text',
          `${c.baseUrl ?? 'http://localhost:11434'}/v1`,
          'ollama',
        );

      // ── Google (own SDK — not OpenAI-compat) ──────────────────────────────
      case 'google': {
        const { google, createGoogleGenerativeAI } = await import('@ai-sdk/google');
        const client = c.apiKey ? createGoogleGenerativeAI({ apiKey: c.apiKey }) : google;
        return new SDKEmbedder('google', client.textEmbeddingModel(c.embeddingModel ?? 'text-embedding-004'));
      }

      // ── Cohere (own SDK) ──────────────────────────────────────────────────
      case 'cohere': {
        const { cohere, createCohere } = await import('@ai-sdk/cohere');
        const client = c.apiKey ? createCohere({ apiKey: c.apiKey }) : cohere;
        return new SDKEmbedder('cohere', client.embedding(c.embeddingModel ?? 'embed-english-v3.0'));
      }

      // ── Azure OpenAI ──────────────────────────────────────────────────────
      case 'azure': {
        let azureMod: any = null;
        try {
          const mod = '@ai-sdk/azure';
          // @ts-ignore — optional peer dependency
          azureMod = await import(mod);
        } catch {
          throw new Error('Run: bun add @ai-sdk/azure');
        }
        const client = azureMod.createAzure({ resourceName: process.env.RECALL_AZURE_RESOURCE_NAME! });
        return new SDKEmbedder('azure', client.embedding(c.embeddingModel ?? 'text-embedding-3-small'));
      }

      // ── Local ONNX (in-process, no server) ───────────────────────────────
      case 'local': {
        const { LocalEmbedder } = await import('./local-embedder');
        return new LocalEmbedder();
      }

      case 'none':
      default:
        return new NoopEmbedder();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[recall] AI provider '${c.provider}' unavailable: ${msg}\n`);
    process.stderr.write(`[recall] Falling back to keyword search.\n`);
    return new NoopEmbedder();
  }
}

// Re-exports for backwards compat
export type { RecallEmbedder as AIAdapter };
export { createEmbedder as createAIAdapter };
export { NoopEmbedder as NoopAIAdapter };
