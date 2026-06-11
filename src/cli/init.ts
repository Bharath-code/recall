/**
 * recall init — Onboarding wizard (interactive + non-interactive fallback)
 *
 * Interactive mode: Guided step-by-step wizard using @clack/prompts.
 * Non-interactive mode (CI / piped): original linear auto flow.
 * --auto flag: Skips all prompts, auto-installs everything.
 */

import { existsSync } from 'node:fs';
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
  SPACING,
} from '../ui/index.ts';
import * as prompts from '../ui/prompts.ts';
import { createSpinner } from '../ui/spinner.ts';
import { generateFirstRunInsight } from '../insights/index.ts';

export interface InitFlags {
  auto?: boolean;
}

export async function handleInit(flags: InitFlags): Promise<void> {
  const icons = getIcons();
  const isInteractive = prompts.isInteractive() && !flags.auto;

  // ─── Interactive wizard ─────────────────────────────────────────────────────
  if (isInteractive) {
    await runWizard(icons);
    return;
  }

  // ─── Non-interactive (CI / piped / --auto) ─────────────────────────────────
  await runAuto(icons, flags);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Interactive Wizard
// ═══════════════════════════════════════════════════════════════════════════════

async function runWizard(icons: ReturnType<typeof getIcons>): Promise<void> {
  // ── Welcome ───────────────────────────────────────────────────────────────
  prompts.intro(`${icons.brain} ${colors.bold('Welcome to Recall')}`);

  // ── Step 1: Detect shell & install hook ──────────────────────────────────
  prompts.log.step('Shell Hook Installation');

  const shell = detectShell();

  // Determine shell choice
  let shellChoice = shell;
  if (shell === 'unknown') {
    shellChoice = prompts.unwrap(await prompts.select({
      message: 'Could not auto-detect your shell. Which one do you use?',
      options: [
        { value: 'zsh', label: 'Zsh', hint: 'Default on macOS' },
        { value: 'bash', label: 'Bash', hint: 'Default on Linux' },
      ],
    }));
  }

  // Check if hook is already installed
  const rcPath = shellChoice !== 'unknown' ? getShellRcPath(shellChoice as 'zsh' | 'bash') : null;
  let hookInstalled = false;

  if (rcPath) {
    hookInstalled = await isHookInstalledAsync(rcPath);
  }

  if (hookInstalled) {
    prompts.log.success(`Shell hook already installed in ${rcPath}`);
  } else if (rcPath) {
    const snippet = shellChoice === 'zsh' ? generateZshSnippet() : generateBashSnippet();
    const evalLine = shellChoice === 'zsh' ? ZSH_EVAL_LINE : BASH_EVAL_LINE;

    const installHook = prompts.unwrap(await prompts.confirm({
      message: `Auto-install shell hook in ${rcPath}?`,
      active: 'Yes, install it',
      inactive: 'No, show me the manual command',
    }));

    if (installHook) {
      await appendHookToRc(rcPath, snippet);
      prompts.log.success(`Shell hook installed in ${rcPath}`);
      prompts.note(`Run: source ${rcPath}`, 'Activate now');
    } else {
      prompts.note(
        `Add this to ${rcPath}:\n\n  ${evalLine}\n\nThen run: source ${rcPath}`,
        'Manual setup'
      );
    }
  }

  // ── Step 2: Database ─────────────────────────────────────────────────────
  prompts.log.step('Database Initialization');
  getDb(); // triggers schema creation
  prompts.log.success(`Database initialized at ${getRecallDir()}`);

  // ── Step 3: Import history ───────────────────────────────────────────────
  prompts.log.step('History Import');

  const currentShell = shell !== 'unknown' ? shell : 'zsh';
  const histPaths = getHistoryFilePaths(currentShell);
  const histPath = histPaths.find(p => existsSync(p));

  if (histPath) {
    const shouldImport = prompts.unwrap(await prompts.confirm({
      message: `Import existing shell history from ${histPath}?`,
      active: 'Yes, import it',
      inactive: 'Skip for now',
    }));

    if (shouldImport) {
      const s = prompts.spinner();
      s.start('Importing history...');

      try {
        const content = await Bun.file(histPath).text();
        const parsed = currentShell === 'zsh'
          ? parseZshHistory(content)
          : parseBashHistory(content);

        let imported = 0;
        const existingCount = getCommandCount();
        const db = getDb();

        if (existingCount === 0 && parsed.length > 0) {
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

        s.stop(`${icons.check} Imported ${formatCount(imported, 'command')}`);
      } catch (err) {
        s.stop(`${icons.warn} Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      prompts.log.info('Skipped history import');
    }
  } else {
    prompts.log.info('No history file found — commands will be captured from now on');
  }

  // ── Step 4: Tool scanning ────────────────────────────────────────────────
  prompts.log.step('Tool Inventory');

  const scanTools = prompts.unwrap(await prompts.confirm({
    message: 'Scan installed tools for smarter suggestions?',
    active: 'Yes, scan them',
    inactive: 'Skip',
  }));

  if (scanTools) {
    const s = prompts.spinner();
    s.start('Scanning installed tools...');

    try {
      const tools = await scanAllTools();
      if (tools.length > 0) {
        batchUpsertTools(tools);
        s.stop(`${icons.check} Detected ${formatCount(tools.length, 'tool')}`);
      } else {
        s.stop(`${icons.check} No additional tools detected`);
      }
    } catch {
      s.stop('Tool scan failed (non-critical)');
    }
  } else {
    prompts.log.info('Skipped tool scan');
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  const insight = generateFirstRunInsight();

  prompts.outro(`${icons.check} ${colors.success('Recall is ready.')}`);

  // Quick-start guide
  prompts.note(
    [
      `${colors.path('recall search  <query>')}    Find past commands`,
      `${colors.path('recall recent')}              Last 20 commands`,
      `${colors.path('recall project')}             Current repo context`,
      `${colors.path('recall doctor')}              Check installation`,
      '',
      `${colors.textDim('Run a few commands in your terminal, then:')}`,
      `${colors.path('recall recent')}              See what you ran`,
      `${colors.path('recall search docker')}        Find that command from last week`,
    ].join('\n'),
    `${icons.brain} Quick start`
  );

  // Privacy note
  prompts.log.info('All data stays on your machine. Nothing is phoned home.');

  // First-run insight
  if (insight) {
    prompts.note(`${insight.text}${insight.tip ? `\n${colors.textDim(insight.tip)}` : ''}`, `${icons.bulb} Did you know?`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Auto / Non-interactive flow (original behaviour, preserved exactly)
// ═══════════════════════════════════════════════════════════════════════════════

async function runAuto(icons: ReturnType<typeof getIcons>, flags: InitFlags): Promise<void> {
  console.log('');
  console.log(`${SPACING.indent}${icons.brain} ${colors.bold('Welcome to Recall')}`);
  console.log(`${SPACING.indent}${colors.textDim('Your terminal remembers what you forget.')}`);
  console.log('');
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
  console.log('');

  // Step 1: Initialize database
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}\n`);
  console.log(`${SPACING.indent}${colors.bold('Step 1/4 — Database')}`);
  const db = getDb(); // triggers schema creation
  console.log(`${SPACING.indent}${icons.check} ${colors.success('Database initialized')} ${colors.textDim(`(${getRecallDir()})`)}`);
  console.log('');

  // Step 2: Shell hook installation
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}\n`);
  console.log(`${SPACING.indent}${colors.bold('Step 2/4 — Shell Hook')}`);
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
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}\n`);
  console.log(`${SPACING.indent}${colors.bold('Step 3/4 — Import History')}`);
  const currentShell = shell !== 'unknown' ? shell : 'zsh';
  const histPaths = getHistoryFilePaths(currentShell);
  const histPath = histPaths.find(p => existsSync(p));

  if (histPath) {
    const spinner = createSpinner('Importing shell history...', 'import');
    spinner.start();

    try {
      const content = await Bun.file(histPath).text();
      const parsed = currentShell === 'zsh'
        ? parseZshHistory(content)
        : parseBashHistory(content);

      let imported = 0;
      const existingCount = getCommandCount();

      if (existingCount === 0 && parsed.length > 0) {
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
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}\n`);
  console.log(`${SPACING.indent}${colors.bold('Step 4/4 — Tool Inventory')}`);
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
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Advanced commands:`));
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall ask "<question>"')} ${colors.textDim('— AI-powered semantic search')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall fix')}             ${colors.textDim('— Show fixes for recent errors')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall forgotten-tools')} ${colors.textDim('— Find installed but unused tools')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall digest')}          ${colors.textDim('— Weekly terminal activity summary')}`);
  console.log('');
  console.log(`${SPACING.indent}${icons.lock} ${colors.textDim('All data stays on your machine. Nothing is phoned home.')}`);
  console.log('');

  // First-run insight
  const insight = generateFirstRunInsight();
  if (insight) {
    console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
    console.log('');
    console.log(`${SPACING.indent}${icons.bulb} ${colors.bold(colors.insight('Did you know?'))}`);
    console.log('');
    console.log(`${SPACING.indent}  ${colors.insight(insight.text)}`);
    if (insight.tip) {
      console.log(`${SPACING.indent}  ${colors.textDim(insight.tip)}`);
    }
    console.log('');
  }

  // Golden path onboarding
  console.log(`${SPACING.indent}${SPACING.separator.repeat(SPACING.separatorLength)}`);
  console.log('');
  console.log(`${SPACING.indent}${icons.brain} ${colors.bold('Try it out!')}`);
  console.log('');
  console.log(colors.textDim(`${SPACING.indent}Run a few commands in your terminal, then:`));
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall recent')}          ${colors.textDim('— See what you ran')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall search docker')}    ${colors.textDim('— Find that command from last week')}`);
  console.log(`${SPACING.indent}${SPACING.indent}${colors.path('recall project')}         ${colors.textDim('— Get repo context')}`);
  console.log('');
}


