/**
 * recall doctor — Diagnose installation health
 */

import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { getDbPath, getRecallDir } from '../db/index.ts';
import { getCommandCount } from '../db/commands.ts';
import { getRepoCount } from '../db/repos.ts';
import { getToolCount } from '../db/tools.ts';
import { getErrorCount, getFixedErrorCount } from '../db/errors.ts';
import { detectShell, getShellRcPath, isHookInstalledAsync } from '../hooks/detect.ts';
import { resolveAIConfig } from '../ai/adapter.ts';
import { isCaptureEnabled, shouldRedactSecrets, getIgnoredPatterns } from '../config/index.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export async function handleDoctor(): Promise<void> {
  const icons = getIcons();
  let issues = 0;

  console.log(formatHeader(`${icons.tool} recall doctor`));
  console.log('');

  // Check 1: Binary in PATH
  let binaryFound = false;
  let binaryPath = '';
  try {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    binaryPath = execSync(`${whichCmd} recall`, { encoding: 'utf-8' }).trim();
    binaryFound = true;
  } catch {
    binaryFound = false;
  }

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
  const shell = detectShell();
  console.log(`  ${icons.cmd} Shell: ${shell}`);

  if (shell !== 'unknown') {
    const rcPath = getShellRcPath(shell);
    if (rcPath) {
      const hookInstalled = await isHookInstalledAsync(rcPath);
      logCheck(`Shell hook installed (${rcPath})`, hookInstalled);
      if (!hookInstalled) issues++;
    }
  } else {
    console.log(`  ${icons.warn} ${colors.warning('Unknown shell — cannot check hook')}`);
    issues++;
  }

  // Check 5: Data stats
  console.log('');
  console.log(colors.dim('  Statistics:'));
  try {
    const cmdCount = getCommandCount();
    const repoCount = getRepoCount();
    const toolCount = getToolCount();
    const errorCount = getErrorCount();
    const fixedCount = getFixedErrorCount();

    console.log(`    Commands:  ${cmdCount}`);
    console.log(`    Repos:     ${repoCount}`);
    console.log(`    Tools:     ${toolCount}`);
    console.log(`    Errors:    ${errorCount} (${fixedCount} fixed)`);
  } catch {
    console.log(colors.dim('    Unable to read database stats'));
    issues++;
  }

  // Check 6: AI provider
  console.log('');
  const aiConfig = resolveAIConfig();
  console.log(colors.dim(`  AI provider: ${aiConfig.provider}`));
  if (aiConfig.provider === 'openai' || aiConfig.provider === 'openrouter') {
    console.log(colors.dim(`  API key: ${aiConfig.apiKey ? '••••' + aiConfig.apiKey.slice(-4) : 'not set'}`));
  }

  // Check 7: Privacy settings
  console.log('');
  console.log(colors.dim('  Privacy settings:'));
  const captureEnabled = isCaptureEnabled();
  logCheck(`Capture enabled`, captureEnabled);
  if (!captureEnabled) {
    console.log(colors.dim('    Run \'recall resume\' to enable capture'));
  }

  const redactSecrets = shouldRedactSecrets();
  logCheck(`Secret redaction`, redactSecrets);
  if (!redactSecrets) {
    console.log(colors.dim('    Warning: Secrets may be stored in plain text'));
    issues++;
  }

  const ignoredPatterns = getIgnoredPatterns();
  if (ignoredPatterns.length > 0) {
    console.log(`  ${icons.cmd} Ignored patterns (${ignoredPatterns.length}):`);
    for (const pattern of ignoredPatterns) {
      console.log(`    ${colors.dim(pattern)}`);
    }
  } else {
    console.log(`  ${icons.cmd} No ignored patterns`);
  }

  // Summary
  console.log('');
  if (issues === 0) {
    console.log(`  ${icons.check} ${colors.success('All checks passed. Recall is healthy.')}`);
  } else {
    console.log(`  ${icons.warn} ${colors.warning(`${issues} issue(s) found.`)}`);
    console.log(colors.dim('  Run \'recall init\' to fix common issues.'));
  }
  console.log('');
}

function logCheck(label: string, ok: boolean): void {
  const icons = getIcons();
  console.log(`  ${ok ? icons.check : icons.cross} ${ok ? colors.success(label) : colors.error(label)}`);
}
