/**
 * recall hook capture — Internal command called by shell hooks
 * recall hook update — Updates command with exit code/duration
 * recall hook zsh — Output zsh hook snippet
 * recall hook bash — Output bash hook snippet
 */

import { z } from 'zod';
import { join } from 'node:path';
import { normalize, shouldSkipCommand, isDuplicate } from '../import/normalizer.ts';
import { insertCommand, updateCommand, getRecentNormalizedCommands } from '../db/commands.ts';
import { upsertRepo } from '../db/repos.ts';
import { getDb } from '../db/index.ts';
import { getRepoContext } from '../repos/detector.ts';
import { generateZshSnippet } from '../hooks/zsh-snippet.ts';
import { generateBashSnippet } from '../hooks/bash-snippet.ts';
import { detectShell, getShellRcPath, appendHookToRc } from '../hooks/detect.ts';
import {
  commandMatchesIgnoredPattern,
  isCaptureEnabled,
  redactSecretsFromCommand,
  shouldAutoEmbed,
} from '../config/index.ts';

const CaptureSchema = z.object({
  rawCommand: z.string().min(1),
  cwd: z.string().min(1),
  shell: z.enum(['zsh', 'bash', 'unknown']).default('unknown'),
  startTime: z.coerce.string().optional(),
  sessionId: z.string().optional(),
  exitCode: z.coerce.string().optional(),
  durationMs: z.coerce.string().optional(),
});

const UpdateSchema = z.object({
  commandId: z.coerce.string().min(1),
  exitCode: z.coerce.string(),
  durationMs: z.coerce.string().optional(),
});

export async function handleHookAction(
  action: string,
  args: Record<string, string | undefined>,
): Promise<void> {
  switch (action) {
    case 'capture':
      await handleHookCapture(args);
      return;
    case 'update':
      await handleHookUpdate(args);
      return;
    case 'zsh':
    case 'bash':
      handleHookSnippet(action);
      return;
    case 'bind-ctrl-r':
      await handleBindCtrlR();
      return;
    case 'unbind-ctrl-r':
      await handleUnbindCtrlR();
      return;
    default:
      console.error(`Unsupported hook action: ${action}. Supported: capture, update, zsh, bash, bind-ctrl-r, unbind-ctrl-r`);
      process.exit(1);
  }
}

export async function handleHookCapture(args: Record<string, string | undefined>): Promise<void> {
  try {
    if (!isCaptureEnabled()) return;

    const parsed = CaptureSchema.parse({
      rawCommand: args['raw-command'] ?? args.rawCommand,
      cwd: args.cwd,
      shell: args.shell,
      startTime: args['start-time'] ?? args.startTime,
      sessionId: args['session-id'] ?? args.sessionId,
      exitCode: args['exit-code'] ?? args.exitCode,
      durationMs: args['duration-ms'] ?? args.durationMs,
    });

    if (shouldSkipCommand(parsed.rawCommand)) return;
    if (commandMatchesIgnoredPattern(parsed.rawCommand)) return;

    const normalized = normalize(parsed.rawCommand);
    if (!normalized) return;
    if (isDuplicate(normalized, getRecentNormalizedCommands(100))) return;

    // Detect git repo context
    const repoCtx = await getRepoContext(parsed.cwd);
    
    // Wrap in transaction for atomicity
    const db = getDb();
    const transaction = db.transaction(() => {
      if (repoCtx) {
        upsertRepo({
          repo_path_hash: repoCtx.hash,
          repo_name: repoCtx.name,
          repo_root: repoCtx.root,
        });
      }

      const id = insertCommand({
        raw_command: redactSecretsFromCommand(parsed.rawCommand),
        normalized_command: redactSecretsFromCommand(normalized),
        cwd: parsed.cwd,
        repo_path_hash: repoCtx?.hash ?? null,
        shell: parsed.shell,
        session_id: parsed.sessionId ?? null,
        exit_code: parsed.exitCode ? parseInt(parsed.exitCode, 10) : null,
        duration_ms: parsed.durationMs ? parseInt(parsed.durationMs, 10) : null,
      });

      return id;
    });

    const id = transaction();

    // Spawn background embedding generator only when explicitly enabled.
    if (shouldAutoEmbed()) spawnEmbedder();

    // Output the command ID for the shell hook to use in update
    process.stdout.write(String(id));
  } catch (err) {
    // Log to stderr for debugging while maintaining shell stability
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    process.stderr.write(`[recall] Hook capture failed: ${errorMsg}\n`);
  }
}

export async function handleHookUpdate(args: Record<string, string | undefined>): Promise<void> {
  try {
    const parsed = UpdateSchema.parse({
      commandId: args['command-id'] ?? args.commandId,
      exitCode: args['exit-code'] ?? args.exitCode,
      durationMs: args['duration-ms'] ?? args.durationMs,
    });

    const id = parseInt(parsed.commandId, 10);
    if (isNaN(id)) return;

    updateCommand(id, {
      exit_code: parseInt(parsed.exitCode, 10),
      duration_ms: parsed.durationMs ? parseInt(parsed.durationMs, 10) : undefined,
    });
  } catch (err) {
    // Log to stderr for debugging while maintaining shell stability
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    process.stderr.write(`[recall] Hook update failed: ${errorMsg}\n`);
  }
}

export function handleHookSnippet(shell: string): void {
  switch (shell) {
    case 'zsh':
      process.stdout.write(generateZshSnippet());
      break;
    case 'bash':
      process.stdout.write(generateBashSnippet());
      break;
    default:
      console.error(`Unsupported shell: ${shell}. Supported: zsh, bash`);
      process.exit(1);
  }
}

export async function handleBindCtrlR(): Promise<void> {
  const shell = detectShell();

  if (shell === 'unknown') {
    console.error('Could not detect shell. Supported: zsh, bash');
    process.exit(1);
  }

  const rcPath = getShellRcPath(shell);
  if (!rcPath) {
    console.error(`Could not find ${shell} config file`);
    process.exit(1);
  }

  const widgetSnippet = shell === 'zsh' ? generateZshCtrlRWidget() : generateBashCtrlRWidget();
  const marker = '# RECALL_CTRL_R_WIDGET';

  // Check if already installed
  const content = await Bun.file(rcPath).text();
  if (content.includes(marker)) {
    console.log('Ctrl-R widget already installed');
    return;
  }

  await appendHookToRc(rcPath, widgetSnippet);
  console.log(`Ctrl-R widget installed to ${rcPath}`);
  console.log('Run `source ' + rcPath + '` or restart your shell to apply');
}

export async function handleUnbindCtrlR(): Promise<void> {
  const shell = detectShell();

  if (shell === 'unknown') {
    console.error('Could not detect shell. Supported: zsh, bash');
    process.exit(1);
  }

  const rcPath = getShellRcPath(shell);
  if (!rcPath) {
    console.error(`Could not find ${shell} config file`);
    process.exit(1);
  }

  const marker = '# RECALL_CTRL_R_WIDGET';
  const content = await Bun.file(rcPath).text();
  const lines = content.split('\n');

  // Find and remove the widget section
  const startIndex = lines.findIndex(line => line.includes(marker));
  if (startIndex === -1) {
    console.log('Ctrl-R widget not installed');
    return;
  }

  const endIndex = lines.findIndex((line, idx) => idx > startIndex && line.includes('# END RECALL_CTRL_R_WIDGET'));
  if (endIndex === -1) {
    console.log('Could not find end marker for Ctrl-R widget');
    return;
  }

  const newContent = lines.slice(0, startIndex).concat(lines.slice(endIndex + 1)).join('\n');
  await Bun.write(rcPath, newContent);
  console.log(`Ctrl-R widget removed from ${rcPath}`);
  console.log('Run `source ' + rcPath + '` or restart your shell to apply');
}

function generateZshCtrlRWidget(): string {
  return `
# RECALL_CTRL_R_WIDGET
# Recall interactive search widget for Ctrl-R
_recall_ctrlr_widget() {
  local selected=$(recall pick 2>/dev/null)
  if [[ -n "$selected" ]]; then
    LBUFFER="$selected"
    zle reset-prompt
  fi
  zle -K kill-line
}
zle -N _recall_ctrlr_widget
bindkey '^R' _recall_ctrlr_widget
# END RECALL_CTRL_R_WIDGET
`;
}

function generateBashCtrlRWidget(): string {
  const lines = [
    '# RECALL_CTRL_R_WIDGET',
    '# Recall interactive search widget for Ctrl-R',
    '_recall_ctrlr_widget() {',
    '  local selected=$(recall pick 2>/dev/null)',
    '  if [[ -n "$selected" ]]; then',
    '    READLINE_LINE="$selected"',
    '    READLINE_POINT=${#READLINE_LINE}',
    '  fi',
    '}',
    'bind -x \'\"\\x12\": _recall_ctrlr_widget\'',
    '# END RECALL_CTRL_R_WIDGET',
  ];
  return '\n' + lines.join('\n') + '\n';
}

// ─── Background embedding ─────────────────────────────────────────────────────

let embedderPath: string | null = null;

function spawnEmbedder(): void {
  try {
    if (!embedderPath) {
      // In dev mode (src/index.ts), use bun run; in prod use binary path
      embedderPath = import.meta.filename.includes('src/index.ts')
        ? join(process.cwd(), 'src', 'index.ts')
        : process.argv[0];
    }

    const entry = embedderPath;
    const batchSize = '50';

    const proc = Bun.spawn(
      ['bun', entry, 'embed', '--batch-size', batchSize],
      {
        stdout: 'ignore',
        stderr: 'ignore',
        detached: true,
        cwd: process.cwd(),
      },
    );

    proc.unref();
  } catch {
    // Embedding is best-effort — never fail the hook
  }
}
