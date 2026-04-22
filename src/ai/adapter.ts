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

// ─── Rate Limiter ─────────────────────────────────────────────────────────

interface RateLimiter {
  lastRequest: number;
  requestCount: number;
  windowStart: number;
}

const rateLimiters = new Map<string, RateLimiter>();

const DEFAULT_RATE_LIMIT = {
  requestsPerMinute: 60,
  requestsPerHour: 1000,
};

function checkRateLimit(provider: string): boolean {
  const now = Date.now();
  const limiter = rateLimiters.get(provider) || {
    lastRequest: 0,
    requestCount: 0,
    windowStart: now,
  };

  // Reset counters if window has expired (1 minute)
  if (now - limiter.windowStart > 60000) {
    limiter.requestCount = 0;
    limiter.windowStart = now;
  }

  // Check rate limit
  if (limiter.requestCount >= DEFAULT_RATE_LIMIT.requestsPerMinute) {
    return false; // Rate limit exceeded
  }

  limiter.requestCount++;
  limiter.lastRequest = now;
  rateLimiters.set(provider, limiter);
  return true;
}

async function withRateLimit<T>(
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    if (checkRateLimit(provider)) {
      try {
        return await fn();
      } catch (err) {
        attempt++;
        if (attempt >= maxRetries) throw err;

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } else {
      // Rate limit exceeded, wait and retry
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }

  throw new Error('Rate limit exceeded after retries');
}

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
    return withRateLimit(this.name, async () => {
      const { embedding } = await embed({ model: this.model, value: text });
      return embedding;
    });
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return withRateLimit(this.name, async () => {
      const { embeddings } = await embedMany({ model: this.model, values: texts });
      return embeddings;
    });
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

// ─── Provider-specific factories ──────────────────────────────────────────────

async function createCustomEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  return openAICompatEmbedder(
    'custom',
    config.embeddingModel ?? 'text-embedding-3-small',
    config.baseUrl!,
    config.apiKey ?? 'no-key',
  );
}

async function createOpenRouterEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  return openAICompatEmbedder(
    'openrouter',
    config.embeddingModel ?? 'openai/text-embedding-3-small',
    'https://openrouter.ai/api/v1',
    config.apiKey ?? '',
    { 'HTTP-Referer': 'https://github.com/recall-cli', 'X-Title': 'Recall CLI' },
  );
}

async function createOpenAIEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  return openAICompatEmbedder(
    'openai',
    config.embeddingModel ?? 'text-embedding-3-small',
    config.baseUrl ?? 'https://api.openai.com/v1',
    config.apiKey ?? '',
  );
}

async function createOllamaEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  return openAICompatEmbedder(
    'ollama',
    config.embeddingModel ?? 'nomic-embed-text',
    `${config.baseUrl ?? 'http://localhost:11434'}/v1`,
    'ollama',
  );
}

async function createGoogleEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  const { google, createGoogleGenerativeAI } = await import('@ai-sdk/google');
  const client = config.apiKey ? createGoogleGenerativeAI({ apiKey: config.apiKey }) : google;
  return new SDKEmbedder('google', client.textEmbeddingModel(config.embeddingModel ?? 'text-embedding-004'));
}

async function createCohereEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  const { cohere, createCohere } = await import('@ai-sdk/cohere');
  const client = config.apiKey ? createCohere({ apiKey: config.apiKey }) : cohere;
  return new SDKEmbedder('cohere', client.embedding(config.embeddingModel ?? 'embed-english-v3.0'));
}

interface AzureModule {
  createAzure: (opts: { resourceName: string }) => {
    embedding: (model: string) => EmbeddingModel;
  };
}

async function createAzureEmbedder(config: AIConfig): Promise<SDKEmbedder> {
  try {
    const mod = '@ai-sdk/azure';
    // @ts-ignore — optional peer dependency
    const azureMod = await import(mod) as AzureModule;
    const client = azureMod.createAzure({ resourceName: process.env.RECALL_AZURE_RESOURCE_NAME! });
    return new SDKEmbedder('azure', client.embedding(config.embeddingModel ?? 'text-embedding-3-small'));
  } catch {
    throw new Error('Run: bun add @ai-sdk/azure');
  }
}

async function createLocalEmbedder(): Promise<RecallEmbedder> {
  const { LocalEmbedder } = await import('./local-embedder');
  return new LocalEmbedder();
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
      case 'custom':   return createCustomEmbedder(c);
      case 'openrouter': return createOpenRouterEmbedder(c);
      case 'openai':   return createOpenAIEmbedder(c);
      case 'ollama':   return createOllamaEmbedder(c);
      case 'google':   return createGoogleEmbedder(c);
      case 'cohere':   return createCohereEmbedder(c);
      case 'azure':    return createAzureEmbedder(c);
      case 'local':    return createLocalEmbedder();
      case 'none':
      default:         return new NoopEmbedder();
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
