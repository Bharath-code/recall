#!/usr/bin/env bun
/**
 * Recall — Your terminal remembers what you forget.
 *
 * Entry point: registers all CLI commands via CAC.
 */

import cac from 'cac';
import { setIconsEnabled } from './ui/icons.ts';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const pkg = JSON.parse(
  readFileSync(join(dirname(import.meta.dir), 'package.json'), 'utf-8')
) as { version: string };
const version = pkg.version;

const cli = cac('recall');

// ─── Global Options ──────────────────────────────────
cli.option('--no-icons', 'Disable icons in output');

// ─── recall init ─────────────────────────────────────
cli
  .command('init', 'Set up Recall on your system')
  .option('--auto', 'Auto-install shell hooks without prompting')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleInit } = await import('./cli/init.ts');
    await handleInit(flags);
  });

// ─── recall search <query> ───────────────────────────
cli
  .command('search <query>', 'Search command history')
  .option('--repo <hash>', 'Filter by repo path hash')
  .option('--since <date>', 'Filter commands since date (ISO)')
  .option('--limit <n>', 'Max results', { default: 20 })
  .option('--failed-only', 'Show only failed commands')
  .action(async (query, flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleSearch } = await import('./cli/search.ts');
    handleSearch(query, flags);
  });

// ─── recall ask "<question>" ─────────────────────────
cli
  .command('ask <query>', 'AI-powered semantic search')
  .action(async (query, flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleAsk } = await import('./cli/ask.ts');
    await handleAsk(query);
  });

// ─── recall recent ───────────────────────────────────
cli
  .command('recent', 'Show recent commands')
  .option('--limit <n>', 'Number of commands to show', { default: 20 })
  .option('--repo <hash>', 'Filter by repo')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleRecent } = await import('./cli/recent.ts');
    handleRecent(flags);
  });

// ─── recall project ──────────────────────────────────
cli
  .command('project', 'Show current project context')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleProject } = await import('./cli/project.ts');
    await handleProject();
  });

// ─── recall fix ──────────────────────────────────────
cli
  .command('fix', 'Show known fixes for recent errors')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleFix } = await import('./cli/fix.ts');
    handleFix();
  });

// ─── recall replay ───────────────────────────────────
cli
  .command('replay', 'Replay startup workflow for current project')
  .option('--dry-run', 'Preview without executing')
  .option('--skip <n>', 'Skip first N commands')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleReplay } = await import('./cli/replay.ts');
    await handleReplay(flags);
  });

// ─── recall forgotten-tools ──────────────────────────
cli
  .command('forgotten-tools', 'Show installed but unused tools')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleForgottenTools } = await import('./cli/forgotten-tools.ts');
    handleForgottenTools();
  });

// ─── recall doctor ───────────────────────────────────
cli
  .command('doctor', 'Diagnose installation health')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleDoctor } = await import('./cli/doctor.ts');
    await handleDoctor();
  });

// ─── recall uninstall ────────────────────────────────
cli
  .command('uninstall', 'Remove Recall from your system')
  .option('--keep-data', 'Keep your command history data')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleUninstall } = await import('./cli/uninstall.ts');
    await handleUninstall(flags);
  });

// ─── recall hook (internal) ──────────────────────────
cli
  .command('hook capture', 'Internal: capture a command from shell hook')
  .option('--raw-command <cmd>', 'Raw command string')
  .option('--cwd <dir>', 'Working directory')
  .option('--shell <shell>', 'Shell type')
  .option('--start-time <ms>', 'Command start time')
  .option('--session-id <id>', 'Shell session ID')
  .option('--exit-code <code>', 'Command exit code')
  .option('--duration-ms <ms>', 'Command duration')
  .action(async (flags) => {
    const { handleHookCapture } = await import('./cli/hook.ts');
    await handleHookCapture(flags);
  });

cli
  .command('hook update', 'Internal: update command with exit info')
  .option('--command-id <id>', 'Command ID to update')
  .option('--exit-code <code>', 'Exit code')
  .option('--duration-ms <ms>', 'Duration in milliseconds')
  .action(async (flags) => {
    const { handleHookUpdate } = await import('./cli/hook.ts');
    await handleHookUpdate(flags);
  });

cli
  .command('hook zsh', 'Output zsh hook snippet')
  .action(async () => {
    const { handleHookSnippet } = await import('./cli/hook.ts');
    handleHookSnippet('zsh');
  });

cli
  .command('hook bash', 'Output bash hook snippet')
  .action(async () => {
    const { handleHookSnippet } = await import('./cli/hook.ts');
    handleHookSnippet('bash');
  });

// ─── Help & Version ──────────────────────────────────
cli.help();
cli.version(version);

// ─── Parse ───────────────────────────────────────────
cli.parse();
