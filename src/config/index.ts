/**
 * Config — Recall user settings
 *
 * Settings are stored in ~/.recall/config.json and validated with Zod.
 * All privacy-related settings default to SAFE values (opt-in, not opt-out).
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { getRecallDir } from '../db/index.ts';

// ─── Schema ───────────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  // Privacy: allow shell hooks to capture commands (default: on, user can pause)
  capture_enabled: z.boolean().default(true),

  // Privacy: capture stderr output from commands (default: off — security risk)
  capture_stderr: z.boolean().default(false),

  // Privacy: redact known secret patterns from commands before storage (default: on)
  redact_secrets: z.boolean().default(true),

  // Privacy: plain substring patterns, with optional "*" wildcards, that skip capture
  ignored_patterns: z.array(z.string()).default([]),

  // Privacy: minimum time between embedding generation batches (ms) (default: 5min)
  embed_interval_ms: z.number().default(300_000),

  // AI: auto-generate embeddings on capture (default: off for strict local MVP)
  auto_embed: z.boolean().default(false),

  // UI: show icons (default: true)
  show_icons: z.boolean().default(true),

  // Hook: shell to use for auto-install (default: detect automatically)
  preferred_shell: z.enum(['zsh', 'bash', 'auto']).default('auto'),

  // Stats: last time we showed a digest/tip
  last_digest_at: z.string().nullable().default(null),

  // Version: config format version (for migrations)
  version: z.number().default(1),
});

export type RecallConfig = z.infer<typeof ConfigSchema>;

// ─── Singleton state ──────────────────────────────────────────────────────────

let _config: RecallConfig | null = null;

function getConfigPath(): string {
  return join(getRecallDir(), 'config.json');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load config from ~/.recall/config.json.
 * Creates with defaults if missing or corrupt.
 */
export function loadConfig(): RecallConfig {
  if (_config) return _config;

  const path = getConfigPath();

  if (existsSync(path)) {
    try {
      const raw = readFileSync(path, 'utf-8');
      const parsed = JSON.parse(raw);
      _config = ConfigSchema.parse(parsed);
      return _config;
    } catch {
      // Corrupt config — reset to defaults
    }
  }

  _config = ConfigSchema.parse({});
  saveConfig(_config);
  return _config;
}

export function defaultConfig(): RecallConfig {
  return ConfigSchema.parse({});
}

/**
 * Save config to ~/.recall/config.json.
 */
export function saveConfig(cfg: RecallConfig): void {
  const dir = getRecallDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  const parsed = ConfigSchema.parse(cfg);
  writeFileSync(getConfigPath(), JSON.stringify(parsed, null, 2), 'utf-8');
  _config = parsed;
}

export function resetConfig(): RecallConfig {
  const defaults = defaultConfig();
  saveConfig(defaults);
  return defaults;
}

/**
 * Get a specific config value.
 */
export function getConfig<K extends keyof RecallConfig>(key: K): RecallConfig[K] {
  return loadConfig()[key];
}

/**
 * Update config values (partial update).
 */
export function updateConfig(updates: Partial<RecallConfig>): RecallConfig {
  const current = loadConfig();
  const next = ConfigSchema.parse({ ...current, ...updates });
  saveConfig(next);
  return next;
}

/**
 * Check if redaction is enabled (for use in normalizer/hooks).
 */
export function shouldRedactSecrets(): boolean {
  return getConfig('redact_secrets');
}

export function isCaptureEnabled(): boolean {
  return getConfig('capture_enabled');
}

export function shouldAutoEmbed(): boolean {
  return getConfig('auto_embed');
}

export function getIgnoredPatterns(): string[] {
  return getConfig('ignored_patterns');
}

export function addIgnoredPattern(pattern: string): RecallConfig {
  const trimmed = pattern.trim();
  if (!trimmed) return loadConfig();

  const current = loadConfig();
  if (current.ignored_patterns.includes(trimmed)) return current;

  return updateConfig({
    ignored_patterns: [...current.ignored_patterns, trimmed],
  });
}

export function removeIgnoredPattern(pattern: string): RecallConfig {
  const current = loadConfig();
  return updateConfig({
    ignored_patterns: current.ignored_patterns.filter(p => p !== pattern),
  });
}

export function commandMatchesIgnoredPattern(command: string): boolean {
  return getIgnoredPatterns().some(pattern => patternMatchesCommand(pattern, command));
}

export function patternMatchesCommand(pattern: string, command: string): boolean {
  const trimmed = pattern.trim();
  if (!trimmed) return false;

  if (!trimmed.includes('*')) {
    return command.includes(trimmed);
  }

  const escaped = trimmed
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(escaped).test(command);
}

// ─── Secret redaction patterns ────────────────────────────────────────────────

/**
 * Known secret patterns to redact from commands.
 * Extend this list as needed — false positives are better than leaks.
 */
const SECRET_PATTERNS: RegExp[] = [
  // Generic bearer tokens
  /(?<![a-zA-Z0-9])[Aa]pi[Kk]ey[:\s]*[a-zA-Z0-9_\-]{8,}/g,
  // AWS keys
  /\b(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}\b/g,
  // GitHub tokens
  /(?<![a-zA-Z0-9])gh[pousr]_[a-zA-Z0-9_]{36,}/g,
  // OpenAI keys
  /(?<![a-zA-Z0-9])sk-[a-zA-Z0-9]{48,}/g,
  // Generic secret=xxx patterns
  /(?<![a-zA-Z0-9])[Ss]ecret[:\s]*[a-zA-Z0-9_\-]{8,}/g,
  // Password in URL patterns
  /:\/\/[^:]+:[^@]+@/g,
  // Private key blocks
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/g,
  // Auth headers
  /(?<![a-zA-Z0-9])([Aa]uthorization|[Tt]oken|[Bb]earer)[:\s]+[a-zA-Z0-9_\-]{6,}/g,
];

/**
 * Redact known secret patterns from a command string.
 * Returns redacted string (does not mutate original).
 */
export function redactSecretsFromCommand(command: string): string {
  if (!shouldRedactSecrets()) return command;

  let redacted = command;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, '[REDACTED]');
  }
  return redacted;
}

/**
 * Check if a command likely contains a secret (heuristic).
 * Used to warn users when capture_stderr is enabled.
 */
export function commandLikelyHasSecret(command: string): boolean {
  return SECRET_PATTERNS.some(p => p.test(command));
}
