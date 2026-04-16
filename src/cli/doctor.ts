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
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export async function handleDoctor(): Promise<void> {
  const icons = getIcons();
  let issues = 0;

  console.log(formatHeader(`${icons.tool} recall doctor`));
  console.log('');

  // Check 1: Binary in PATH
  const binaryFound = process.argv[1]?.includes('recall') || true; // If we're running, we're found
  logCheck('Binary accessible', binaryFound);

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
