/**
 * recall doctor — Diagnose installation health
 */

import { existsSync } from 'node:fs';
import { getDbPath, getRecallDir } from '../db/index.ts';
import { getCommandCount } from '../db/commands.ts';
import { getRepoCount } from '../db/repos.ts';
import { getToolCount } from '../db/tools.ts';
import { getErrorCount, getFixedErrorCount } from '../db/errors.ts';
import { detectShell, getShellRcPath, isHookInstalledAsync } from '../hooks/detect.ts';
import { resolveAIConfig } from '../ai/adapter.ts';
import { isCaptureEnabled, shouldRedactSecrets, getIgnoredPatterns } from '../config/index.ts';
import { outputJson } from '../ui/json-output.ts';
import { generateFirstRunInsight } from '../insights/index.ts';
import { 
  colors, 
  formatHeader, 
  getIcons, 
  SPACING,
  formatSection,
  formatKeyValueTable,
} from '../ui/index.ts';

export interface DoctorFlags {
  json?: boolean;
}

export async function handleDoctor(flags: DoctorFlags = {}): Promise<void> {
  const icons = getIcons();
  let issues = 0;

  console.log(formatHeader(`${icons.tool} recall doctor`));
  console.log('');

  // Check 1: Binary in PATH
  console.log(formatSection('Installation'));
  const binaryPath = Bun.which('recall');
  const binaryFound = binaryPath !== null;

  if (binaryFound) {
    logCheck(`Binary accessible (${binaryPath})`, true);
  } else {
    logCheck('Binary accessible (recall not in PATH)', false);
    issues++;
  }

  // Check 2: Database
  const dbPath = getDbPath();
  const dbExists = existsSync(dbPath);
  logCheck(`Database exists (${dbPath})`, dbExists);
  if (!dbExists) issues++;

  // Check 3: Data directory permissions
  const recallDir = getRecallDir();
  const dirExists = existsSync(recallDir);
  logCheck(`Data directory (${recallDir})`, dirExists);
  if (!dirExists) issues++;

  // Check 4: Shell hook
  console.log(formatSection('Shell Integration'));
  const shell = detectShell();
  console.log(`${SPACING.indent}${icons.cmd} Shell: ${shell}`);

  let hookInstalled = false;
  if (shell !== 'unknown') {
    const rcPath = getShellRcPath(shell);
    if (rcPath) {
      hookInstalled = await isHookInstalledAsync(rcPath);
      logCheck(`Shell hook installed (${rcPath})`, hookInstalled);
      if (!hookInstalled) issues++;
    }
  } else {
    console.log(`${SPACING.indent}${icons.warn} ${colors.warning('Unknown shell — cannot check hook')}`);
    issues++;
  }

  // Check 5: Data stats
  console.log(formatSection('Statistics'));
  let cmdCount = 0, repoCount = 0, toolCount = 0, errorCount = 0, fixedCount = 0;
  try {
    cmdCount = getCommandCount();
    repoCount = getRepoCount();
    toolCount = getToolCount();
    errorCount = getErrorCount();
    fixedCount = getFixedErrorCount();

    const stats = formatKeyValueTable({
      'Commands': String(cmdCount),
      'Repos': String(repoCount),
      'Tools': String(toolCount),
      'Errors': `${errorCount} (${fixedCount} fixed)`,
    }, 1);
    for (const line of stats) {
      console.log(line);
    }
  } catch {
    console.log(colors.textDim(`${SPACING.indent}Unable to read database stats`));
    issues++;
  }

  // Check 6: AI provider
  console.log(formatSection('AI Configuration'));
  const aiConfig = resolveAIConfig();
  console.log(colors.textDim(`${SPACING.indent}AI provider: ${aiConfig.provider}`));
  if (aiConfig.provider === 'openai' || aiConfig.provider === 'openrouter') {
    console.log(colors.textDim(`${SPACING.indent}API key: ${aiConfig.apiKey ? '••••' + aiConfig.apiKey.slice(-4) : 'not set'}`));
  }

  // Check 7: Privacy settings
  console.log(formatSection('Privacy Settings'));
  const captureEnabled = isCaptureEnabled();
  logCheck(`Capture enabled`, captureEnabled);
  if (!captureEnabled) {
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Run 'recall resume' to enable capture`));
  }

  const redactSecrets = shouldRedactSecrets();
  logCheck(`Secret redaction`, redactSecrets);
  if (!redactSecrets) {
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Warning: Secrets may be stored in plain text`));
    issues++;
  }

  const ignoredPatterns = getIgnoredPatterns();
  if (ignoredPatterns.length > 0) {
    console.log(`${SPACING.indent}${icons.cmd} Ignored patterns (${ignoredPatterns.length}):`);
    for (const pattern of ignoredPatterns) {
      console.log(`${SPACING.indent}${SPACING.indent}${colors.textDim(pattern)}`);
    }
  } else {
    console.log(`${SPACING.indent}${icons.cmd} No ignored patterns`);
  }

  // Check 8: Insight
  const insight = generateFirstRunInsight();

  // JSON output
  if (flags.json) {
    outputJson({
      healthy: issues === 0,
      issues,
      checks: {
        binary: binaryFound,
        database: dbExists,
        data_directory: dirExists,
        shell_hook: hookInstalled,
      },
      stats: {
        commands: cmdCount,
        repos: repoCount,
        tools: toolCount,
        errors: errorCount,
        fixes: fixedCount,
      },
      ai_provider: aiConfig.provider,
      ...(insight ? { insight: { text: insight.text, tip: insight.tip } } : {}),
    });
    return;
  }

  // Text insight section
  if (insight) {
    console.log('');
    console.log(formatSection('Insights'));
    console.log(`${SPACING.indent}${icons.bulb} ${colors.insight(insight.text)}`);
    if (insight.tip) {
      console.log(`${SPACING.indent}  ${colors.textDim(insight.tip)}`);
    }
    console.log('');
  }

  // Summary
  console.log('');
  console.log(formatSection('Summary'));
  if (issues === 0) {
    console.log(`${SPACING.indent}${icons.check} ${colors.success('All checks passed. Recall is healthy.')}`);
  } else {
    console.log(`${SPACING.indent}${icons.warn} ${colors.warning(`${issues} issue(s) found.`)}`);
    console.log(colors.textDim(`${SPACING.indent}${SPACING.indent}Run 'recall init' to fix common issues.`));
  }
  console.log('');
}

function logCheck(label: string, ok: boolean): void {
  const icons = getIcons();
  console.log(`${SPACING.indent}${ok ? icons.check : icons.cross} ${ok ? colors.success(label) : colors.error(label)}`);
}
