/**
 * recall config — View and update Recall settings
 */

import { loadConfig, updateConfig, saveConfig, type RecallConfig } from '../config/index.ts';
import { colors, getIcons } from '../ui/index.ts';
import { z } from 'zod';

const CONFIG_KEYS: (keyof RecallConfig)[] = [
  'capture_stderr',
  'redact_secrets',
  'embed_interval_ms',
  'auto_embed',
  'show_icons',
  'preferred_shell',
  'last_digest_at',
  'version',
];

export interface ConfigFlags {
  get?: string;
  set?: string;
  list?: boolean;
  reset?: boolean;
}

export function handleConfig(flags: ConfigFlags): void {
  const cfg = loadConfig();
  const icons = getIcons();

  // --reset
  if (flags.reset) {
    const defaults = saveConfig({} as RecallConfig);
    console.log(`  ${icons.check} ${colors.success('Config reset to defaults')}`);
    console.log('');
    listAllConfig(loadConfig());
    return;
  }

  // --get <key>
  if (flags.get) {
    const key = flags.get as keyof RecallConfig;
    if (!CONFIG_KEYS.includes(key)) {
      console.log(colors.error(`Unknown config key: ${key}`));
      console.log(colors.dim(`  Valid keys: ${CONFIG_KEYS.join(', ')}`));
      process.exit(1);
    }
    const value = cfg[key];
    console.log(`${key}: ${formatValue(value)}`);
    return;
  }

  // --set <key=value>
  if (flags.set) {
    const [key, rawValue] = flags.set.split('=');
    if (!key || rawValue === undefined) {
      console.log(colors.error('Usage: recall config --set <key>=<value>'));
      process.exit(1);
    }

    const configKey = key as keyof RecallConfig;
    if (!CONFIG_KEYS.includes(configKey)) {
      console.log(colors.error(`Unknown config key: ${key}`));
      console.log(colors.dim(`  Valid keys: ${CONFIG_KEYS.join(', ')}`));
      process.exit(1);
    }

    // Parse value type based on key
    const parsed = parseValue(configKey, rawValue);
    if (parsed.error) {
      console.log(colors.error(`Invalid value for ${key}: ${parsed.error}`));
      process.exit(1);
    }

    updateConfig({ [configKey]: parsed.value });
    console.log(`  ${icons.check} ${colors.success(`${key} updated`)}`);
    console.log('');
    console.log(`  ${key}: ${colors.bold(formatValue(parsed.value))}`);
    return;
  }

  // --list (default)
  listAllConfig(cfg);
}

function listAllConfig(cfg: RecallConfig): void {
  console.log(colors.bold('  Recall Settings'));
  console.log('');

  for (const key of CONFIG_KEYS) {
    const value = cfg[key];
    const isDefault = isDefaultValue(key, value);
    const valueStr = formatValue(value);
    const defaultStr = isDefault ? '' : ` ${colors.dim('(default: ' + getDefaultString(key) + ')')}`;

    if (key === 'capture_stderr' && value === false) {
      console.log(`  ${colors.path(key)}  ${colors.success(valueStr)}${defaultStr}`);
      console.log(colors.dim('    Capturing stderr is disabled for privacy.'));
    } else if (key === 'redact_secrets' && value === true) {
      console.log(`  ${colors.path(key)}  ${colors.success(valueStr)}${defaultStr}`);
      console.log(colors.dim('    Known secret patterns are automatically redacted.'));
    } else if (key === 'auto_embed' && value === true) {
      console.log(`  ${colors.path(key)}  ${colors.success(valueStr)}${defaultStr}`);
      console.log(colors.dim('    Embeddings are generated in the background.'));
    } else {
      console.log(`  ${colors.path(key)}  ${valueStr}${defaultStr}`);
    }
  }

  console.log('');
  console.log(colors.dim('  Update with:'));
  console.log(colors.dim('    recall config --set <key>=<value>'));
  console.log(colors.dim('    recall config --reset'));
  console.log('');
}

function parseValue(
  key: keyof RecallConfig,
  raw: string,
): { value: unknown; error?: string } {
  switch (key) {
    case 'capture_stderr':
    case 'redact_secrets':
    case 'auto_embed':
    case 'show_icons':
      if (raw === 'true') return { value: true };
      if (raw === 'false') return { value: false };
      return { value: null, error: 'must be true or false' };

    case 'embed_interval_ms':
    case 'version': {
      const n = Number(raw);
      if (isNaN(n) || n < 0) return { value: null, error: 'must be a positive number' };
      return { value: n };
    }

    case 'preferred_shell':
      if (raw === 'zsh' || raw === 'bash' || raw === 'auto') {
        return { value: raw };
      }
      return { value: null, error: 'must be zsh, bash, or auto' };

    case 'last_digest_at':
      return { value: raw || null };

    default:
      return { value: raw };
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? colors.success('true') : colors.warning('false');
  if (value === null || value === undefined) return colors.dim('null');
  if (typeof value === 'number') return colors.bold(String(value));
  return String(value);
}

function isDefaultValue(key: keyof RecallConfig, value: unknown): boolean {
  const defaults: Record<string, unknown> = {
    capture_stderr: false,
    redact_secrets: true,
    embed_interval_ms: 300_000,
    auto_embed: true,
    show_icons: true,
    preferred_shell: 'auto',
    last_digest_at: null,
    version: 1,
  };
  return defaults[key] === value;
}

function getDefaultString(key: keyof RecallConfig): string {
  const defaults: Record<string, string> = {
    capture_stderr: 'false',
    redact_secrets: 'true',
    embed_interval_ms: '300000',
    auto_embed: 'true',
    show_icons: 'true',
    preferred_shell: 'auto',
    last_digest_at: 'null',
    version: '1',
  };
  return defaults[key] ?? '';
}
