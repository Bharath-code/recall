#!/usr/bin/env bun
/**
 * Recall — Your terminal remembers what you forget.
 *
 * Entry point: registers all CLI commands via CAC.
 */

import cac from 'cac';
import { setIconsEnabled } from './ui/icons.ts';
import pkg from '../package.json';

const version = pkg.version;

const cli = cac('recall');
const experimentalEnabled = process.env.RECALL_EXPERIMENTAL === '1';

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

// ─── recall recent ───────────────────────────────────
cli
  .command('recent', 'Show recent commands')
  .option('--limit <n>', 'Number of commands to show', { default: 20 })
  .option('--repo <hash>', 'Filter by repo')
  .option('--all', 'Include imported shell history')
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

// ─── recall doctor ───────────────────────────────────
cli
  .command('doctor', 'Diagnose installation health')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleDoctor } = await import('./cli/doctor.ts');
    await handleDoctor();
  });

// ─── recall config ───────────────────────────────────
cli
  .command('config', 'View and update Recall settings')
  .option('--get <key>', 'Get a specific config value')
  .option('--set <key=value>', 'Set a config value')
  .option('--list', 'List all config values')
  .option('--reset', 'Reset config to defaults')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleConfig } = await import('./cli/config.ts');
    handleConfig(flags);
  });

// ─── recall ignore ───────────────────────────────────
cli
  .command('ignore <action> [pattern]', 'Manage command capture ignore patterns')
  .action(async (action, pattern, flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleIgnore } = await import('./cli/ignore.ts');
    handleIgnore(action, pattern);
  });

// ─── recall delete ───────────────────────────────────
cli
  .command('delete', 'Delete captured command data')
  .option('--id <id>', 'Delete one command by id')
  .option('--all', 'Delete all captured commands')
  .option('--yes', 'Confirm destructive delete')
  .action(async (flags) => {
    if (flags.noIcons) setIconsEnabled(false);
    const { handleDelete } = await import('./cli/delete.ts');
    handleDelete(flags);
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
  .command('hook <action>', 'Internal: shell hook actions')
  .option('--raw-command <cmd>', 'Raw command string')
  .option('--cwd <dir>', 'Working directory')
  .option('--shell <shell>', 'Shell type')
  .option('--start-time <ms>', 'Command start time')
  .option('--session-id <id>', 'Shell session ID')
  .option('--exit-code <code>', 'Command exit code')
  .option('--duration-ms <ms>', 'Command duration')
  .option('--command-id <id>', 'Command ID to update')
  .action(async (action, flags) => {
    const { handleHookAction } = await import('./cli/hook.ts');
    await handleHookAction(action, flags);
  });

if (experimentalEnabled) {
  // ─── recall ask "<question>" ───────────────────────
  cli
    .command('ask <query>', 'Experimental: AI-powered semantic search')
    .action(async (query, flags) => {
      if (flags.noIcons) setIconsEnabled(false);
      const { handleAsk } = await import('./cli/ask.ts');
      await handleAsk(query);
    });

  // ─── recall fix ────────────────────────────────────
  cli
    .command('fix', 'Experimental: show known fixes for recent errors')
    .action(async (flags) => {
      if (flags.noIcons) setIconsEnabled(false);
      const { handleFix } = await import('./cli/fix.ts');
      handleFix();
    });

  // ─── recall replay ─────────────────────────────────
  cli
    .command('replay', 'Experimental: replay startup workflow for current project')
    .option('--dry-run', 'Preview without executing')
    .option('--skip <n>', 'Skip first N commands')
    .action(async (flags) => {
      if (flags.noIcons) setIconsEnabled(false);
      const { handleReplay } = await import('./cli/replay.ts');
      await handleReplay(flags);
    });

  // ─── recall forgotten-tools ────────────────────────
  cli
    .command('forgotten-tools', 'Experimental: show installed but unused tools')
    .action(async (flags) => {
      if (flags.noIcons) setIconsEnabled(false);
      const { handleForgottenTools } = await import('./cli/forgotten-tools.ts');
      handleForgottenTools();
    });

  // ─── recall embed (internal) ───────────────────────
  cli
    .command('embed', 'Experimental: generate missing embeddings in background')
    .option('--batch-size <n>', 'Commands per batch', { default: 200 })
    .option('--daemon', 'Keep running and generate embeddings periodically')
    .action(async (flags) => {
      const { handleEmbed } = await import('./cli/embed.ts');
      await handleEmbed(flags);
    });
}

// ─── Help & Version ──────────────────────────────────
cli.help();
cli.version(version);

// ─── Parse ───────────────────────────────────────────
cli.parse();

if (!cli.matchedCommand && cli.args.length === 0 && !cli.options.help && !cli.options.version) {
  cli.outputHelp();
}
