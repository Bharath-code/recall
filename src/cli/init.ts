/**
 * recall init — Onboarding wizard
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { detectShell, getShellRcPath, appendHookToRc, isHookInstalledAsync } from '../hooks/detect.ts';
import { generateZshSnippet, ZSH_EVAL_LINE } from '../hooks/zsh-snippet.ts';
import { generateBashSnippet, BASH_EVAL_LINE } from '../hooks/bash-snippet.ts';
import { parseZshHistory, parseBashHistory, getHistoryFilePaths } from '../import/history-parser.ts';
import { normalize, shouldSkipCommand } from '../import/normalizer.ts';
import { getCommandCount } from '../db/commands.ts';
import { scanAllTools } from '../tools/scanner.ts';
import { batchUpsertTools } from '../db/tools.ts';
import { getDb, getRecallDir } from '../db/index.ts';
import { 
  colors, 
  formatCount, 
  getIcons, 
  createSpinner, 
  formatSection, 
  SPACING,
} from '../ui/index.ts';

export interface InitFlags {
  auto?: boolean;
}

export async function handleInit(flags: InitFlags): Promise<void> {
  const icons = getIcons();

  console.log('');
  console.log(`${SPACING.indent}${icons.brain} ${colors.bold('Welcome to Recall')}`);
  console.log(`${SPACING.indent}${colors.textDim('Your terminal remembers what you forget.')}`);
  console.log('');
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
  console.log('');

  // Step 1: Initialize database
  console.log(formatSection('Step 1/4 — Database'));
  const db = getDb(); // triggers schema creation
  console.log(`${SPACING.indent}${icons.check} ${colors.success('Database initialized')} ${colors.textDim(`(${getRecallDir()})`)}`);
  console.log('');

  // Step 2: Shell hook installation
  console.log(formatSection('Step 2/4 — Shell Hook'));
  const shell = detectShell();

  if (shell === 'unknown') {
    console.log(`${SPACING.indent}${icons.warn} ${colors.warning('Could not detect shell. Supported: zsh, bash')}`);
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Add this to your shell config manually:`));
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${SPACING.indent}eval "$(recall hook zsh)"  ${colors.textDim('# for zsh')}`));
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${SPACING.indent}eval "$(recall hook bash)" ${colors.textDim('# for bash')}`));
  } else {
    const rcPath = getShellRcPath(shell);
    const snippet = shell === 'zsh' ? generateZshSnippet() : generateBashSnippet();
    const evalLine = shell === 'zsh' ? ZSH_EVAL_LINE : BASH_EVAL_LINE;

    if (rcPath) {
      const alreadyInstalled = await isHookInstalledAsync(rcPath);

      if (alreadyInstalled) {
        console.log(`${SPACING.indent}${icons.check} ${colors.success('Shell hook already installed')} ${colors.textDim(rcPath)}`);
      } else if (flags.auto) {
        await appendHookToRc(rcPath, snippet);
        console.log(`${SPACING.indent}${icons.check} ${colors.success('Shell hook installed')} ${colors.textDim(rcPath)}`);
        console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Run: source ${rcPath}`));
      } else {
        console.log(`${SPACING.indent}${colors.textDim('Add this to')} ${colors.path(rcPath)}:`);
        console.log('');
        console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${evalLine}`));
        console.log('');
        console.log(colors.textDim(`${SPACING.indent}Or re-run with --auto to install automatically.`));
      }
    }
  }
  console.log('');

  // Step 3: Import history
  console.log(formatSection('Step 3/4 — Import History'));
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

            insertStmt.run(cmd.command, normalized, process.env.HOME ?? homedir(), currentShell, timestamp);
            imported++;
          }
        });

        transaction();
      }

      spinner.succeed(`${colors.success('History imported')} ${colors.textDim(`${formatCount(imported, 'command')} from ${histPath}`)}`);
    } catch (err) {
      spinner.fail(colors.warning('History import failed'));
      console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}${err instanceof Error ? err.message : 'Unknown error'}`));
    }
  } else {
    console.log(`${SPACING.indent}${icons.cross} ${colors.textDim('No history file found')}`);
  }
  console.log('');

  // Step 4: Tool scan
  console.log(formatSection('Step 4/4 — Tool Inventory'));
  const toolSpinner = createSpinner('Scanning installed tools...', 'scan');
  toolSpinner.start();

  try {
    const tools = await scanAllTools();
    if (tools.length > 0) {
      batchUpsertTools(tools);
      toolSpinner.succeed(`${colors.success('Tools scanned')} ${colors.textDim(formatCount(tools.length, 'tool'))}`);
    } else {
      toolSpinner.succeed(colors.textDim('No tools detected'));
    }
  } catch {
    toolSpinner.fail(colors.textDim('Tool scan failed (non-critical)'));
  }

  // Summary
  console.log('');
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
  console.log('');
  console.log(`${SPACING.indent}${icons.check} ${colors.bold(colors.success('Recall is ready.'))}`);
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Quick commands:`));
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall search <query>')} ${colors.textDim('— Find past commands')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall recent')}          ${colors.textDim('— Last 20 commands')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall project')}         ${colors.textDim('— Current repo context')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall doctor')}          ${colors.textDim('— Check installation')}`);

  // Show experimental commands only when enabled
  if (process.env.RECALL_EXPERIMENTAL === '1') {
    console.log('');
    console.log(colors.textDim(`${SPACING.indent}Experimental commands:`));
    console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall ask "<question>"')} ${colors.textDim('— AI-powered search')}`);
    console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall fix')}             ${colors.textDim('— Show fixes for errors')}`);
  }

  console.log('');

  // Privacy note
  console.log(`${SPACING.indent}${icons.lock} ${colors.textDim('All data stays on your machine. Nothing is phoned home.')}`);
  console.log('');

  // Golden path onboarding: guide user to run 3 commands
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
  console.log('');
  console.log(`${SPACING.indent}${icons.brain} ${colors.bold('Try it out!')}`);
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Run these 3 commands to see Recall in action:`));
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('ls')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('pwd')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('echo "hello"')}`);
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Then run:`));
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall recent')}`);
  console.log('');
}
