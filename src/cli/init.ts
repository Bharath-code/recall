/**
 * recall init — Onboarding wizard
 */

import { existsSync, readFileSync } from 'node:fs';
import { detectShell, getShellRcPath, appendHookToRc, isHookInstalledAsync } from '../hooks/detect.ts';
import { generateZshSnippet, ZSH_EVAL_LINE } from '../hooks/zsh-snippet.ts';
import { generateBashSnippet, BASH_EVAL_LINE } from '../hooks/bash-snippet.ts';
import { parseZshHistory, parseBashHistory, getHistoryFilePaths } from '../import/history-parser.ts';
import { normalize, shouldSkipCommand } from '../import/normalizer.ts';
import { getCommandCount } from '../db/commands.ts';
import { scanAllTools } from '../tools/scanner.ts';
import { batchUpsertTools } from '../db/tools.ts';
import { getDb, getRecallDir } from '../db/index.ts';
import { colors, formatCount, getIcons, createSpinner } from '../ui/index.ts';

export interface InitFlags {
  auto?: boolean;
}

export async function handleInit(flags: InitFlags): Promise<void> {
  const icons = getIcons();

  console.log('');
  console.log(`  ${icons.brain} ${colors.bold('Welcome to Recall')}`);
  console.log(`  ${colors.dim('Your terminal remembers what you forget.')}`);
  console.log('');
  console.log(`  ${'─'.repeat(50)}`);
  console.log('');

  // Step 1: Initialize database
  console.log(`  ${colors.bold('Step 1/4')} ${colors.dim('— Database')}`);
  const db = getDb(); // triggers schema creation
  console.log(`  ${icons.check} ${colors.success('Database initialized')} ${colors.dim(`(${getRecallDir()})`)}`);
  console.log('');

  // Step 2: Shell hook installation
  console.log(`  ${colors.bold('Step 2/4')} ${colors.dim('— Shell Hook')}`);
  const shell = detectShell();

  if (shell === 'unknown') {
    console.log(`  ${icons.warn} ${colors.warning('Could not detect shell. Supported: zsh, bash')}`);
    console.log(colors.dim('    Add this to your shell config manually:'));
    console.log(colors.dim(`    eval "$(recall hook zsh)"  ${colors.dim('# for zsh')}`));
    console.log(colors.dim(`    eval "$(recall hook bash)" ${colors.dim('# for bash')}`));
  } else {
    const rcPath = getShellRcPath(shell);
    const snippet = shell === 'zsh' ? generateZshSnippet() : generateBashSnippet();
    const evalLine = shell === 'zsh' ? ZSH_EVAL_LINE : BASH_EVAL_LINE;

    if (rcPath) {
      const alreadyInstalled = await isHookInstalledAsync(rcPath);

      if (alreadyInstalled) {
        console.log(`  ${icons.check} ${colors.success('Shell hook already installed')} ${colors.dim(rcPath)}`);
      } else if (flags.auto) {
        await appendHookToRc(rcPath, snippet);
        console.log(`  ${icons.check} ${colors.success('Shell hook installed')} ${colors.dim(rcPath)}`);
        console.log(colors.dim(`    Run: source ${rcPath}`));
      } else {
        console.log(`  ${colors.dim('Add this to')} ${colors.path(rcPath)}:`);
        console.log('');
        console.log(colors.dim(`    ${evalLine}`));
        console.log('');
        console.log(colors.dim('  Or re-run with --auto to install automatically.'));
      }
    }
  }
  console.log('');

  // Step 3: Import history
  console.log(`  ${colors.bold('Step 3/4')} ${colors.dim('— Import History')}`);
  const currentShell = shell !== 'unknown' ? shell : 'zsh';
  const histPaths = getHistoryFilePaths(currentShell);
  const histPath = histPaths.find(p => existsSync(p));

  if (histPath) {
    const spinner = createSpinner('Importing shell history...', 'import');
    spinner.start();

    try {
      const content = readFileSync(histPath, 'utf-8');
      const parsed = currentShell === 'zsh'
        ? parseZshHistory(content)
        : parseBashHistory(content);

      let imported = 0;
      const existingCount = getCommandCount();

      if (existingCount === 0 && parsed.length > 0) {
        // Batch import with transaction
        const insertStmt = db.prepare(`
          INSERT INTO commands (raw_command, normalized_command, cwd, shell, created_at, source)
          VALUES (?, ?, ?, ?, ?, 'import')
        `);

        const transaction = db.transaction(() => {
          for (const cmd of parsed) {
            if (shouldSkipCommand(cmd.command)) continue;
            const normalized = normalize(cmd.command);
            if (!normalized) continue;

            const timestamp = cmd.timestamp
              ? new Date(cmd.timestamp * 1000).toISOString()
              : new Date().toISOString();

            insertStmt.run(cmd.command, normalized, process.env.HOME ?? '~', currentShell, timestamp);
            imported++;
          }
        });

        transaction();
      }

      spinner.succeed(`${colors.success('History imported')} ${colors.dim(`${formatCount(imported, 'command')} from ${histPath}`)}`);
    } catch (err) {
      spinner.fail(colors.warning('History import failed'));
      console.log(colors.dim(`    ${err instanceof Error ? err.message : 'Unknown error'}`));
    }
  } else {
    console.log(`  ${icons.cross} ${colors.dim('No history file found')}`);
  }
  console.log('');

  // Step 4: Tool scan
  console.log(`  ${colors.bold('Step 4/4')} ${colors.dim('— Tool Inventory')}`);
  const toolSpinner = createSpinner('Scanning installed tools...', 'scan');
  toolSpinner.start();

  try {
    const tools = await scanAllTools();
    if (tools.length > 0) {
      batchUpsertTools(tools);
      toolSpinner.succeed(`${colors.success('Tools scanned')} ${colors.dim(formatCount(tools.length, 'tool'))}`);
    } else {
      toolSpinner.succeed(colors.dim('No tools detected'));
    }
  } catch {
    toolSpinner.fail(colors.dim('Tool scan failed (non-critical)'));
  }

  // Summary
  console.log('');
  console.log(`  ${'─'.repeat(50)}`);
  console.log('');
  console.log(`  ${icons.check} ${colors.bold(colors.success('Recall is ready.'))}`);
  console.log('');
  console.log(colors.dim('  Quick commands:'));
  console.log(`    ${colors.path('recall search <query>')} ${colors.dim('— Find past commands')}`);
  console.log(`    ${colors.path('recall ask "<question>"')} ${colors.dim('— AI-powered search')}`);
  console.log(`    ${colors.path('recall recent')}          ${colors.dim('— Last 20 commands')}`);
  console.log(`    ${colors.path('recall fix')}             ${colors.dim('— Show fixes for errors')}`);
  console.log(`    ${colors.path('recall project')}         ${colors.dim('— Current repo context')}`);
  console.log(`    ${colors.path('recall doctor')}          ${colors.dim('— Check installation')}`);
  console.log('');

  // Privacy note
  console.log(`  ${icons.lock} ${colors.dim('All data stays on your machine. Nothing is phoned home.')}`);
  console.log('');
}
