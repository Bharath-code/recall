/**
 * recall hook capture — Internal command called by shell hooks
 * recall hook update — Updates command with exit code/duration
 * recall hook zsh — Output zsh hook snippet
 * recall hook bash — Output bash hook snippet
 */

import { z } from 'zod';
import { join } from 'node:path';
import { normalize, shouldSkipCommand } from '../import/normalizer.ts';
import { insertCommand, updateCommand } from '../db/commands.ts';
import { upsertRepo } from '../db/repos.ts';
import { getRepoContext } from '../repos/detector.ts';
import { generateZshSnippet } from '../hooks/zsh-snippet.ts';
import { generateBashSnippet } from '../hooks/bash-snippet.ts';

const CaptureSchema = z.object({
  rawCommand: z.string().min(1),
  cwd: z.string().min(1),
  shell: z.enum(['zsh', 'bash', 'unknown']).default('unknown'),
  startTime: z.string().optional(),
  sessionId: z.string().optional(),
  exitCode: z.string().optional(),
  durationMs: z.string().optional(),
});

const UpdateSchema = z.object({
  commandId: z.string().min(1),
  exitCode: z.string(),
  durationMs: z.string().optional(),
});

export async function handleHookCapture(args: Record<string, string | undefined>): Promise<void> {
  try {
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

    const normalized = normalize(parsed.rawCommand);
    if (!normalized) return;

    // Detect git repo context
    const repoCtx = await getRepoContext(parsed.cwd);
    if (repoCtx) {
      upsertRepo({
        repo_path_hash: repoCtx.hash,
        repo_name: repoCtx.name,
        repo_root: repoCtx.root,
      });
    }

    const id = insertCommand({
      raw_command: parsed.rawCommand,
      normalized_command: normalized,
      cwd: parsed.cwd,
      repo_path_hash: repoCtx?.hash ?? null,
      shell: parsed.shell,
      session_id: parsed.sessionId ?? null,
      exit_code: parsed.exitCode ? parseInt(parsed.exitCode, 10) : null,
      duration_ms: parsed.durationMs ? parseInt(parsed.durationMs, 10) : null,
    });

    // Spawn background embedding generator — fire-and-forget, zero shell latency
    spawnEmbedder();

    // Output the command ID for the shell hook to use in update
    process.stdout.write(String(id));
  } catch {
    // Silent failure — never break the user's shell
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
  } catch {
    // Silent failure
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
        spawnOptions: { cwd: process.cwd() },
      },
    );

    proc.unref();
  } catch {
    // Embedding is best-effort — never fail the hook
  }
}
