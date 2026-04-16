/**
 * recall uninstall — Clean removal
 */

import { existsSync, rmSync } from 'node:fs';
import { detectShell, getShellRcPath, removeHookFromRc } from '../hooks/detect.ts';
import { getRecallDir, closeDb } from '../db/index.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export interface UninstallFlags {
  keepData?: boolean;
}

export async function handleUninstall(flags: UninstallFlags): Promise<void> {
  const icons = getIcons();

  console.log(formatHeader(`${icons.tool} recall uninstall`));
  console.log('');

  // Step 1: Remove shell hook
  const shell = detectShell();
  if (shell !== 'unknown') {
    const rcPath = getShellRcPath(shell);
    if (rcPath && existsSync(rcPath)) {
      const removed = await removeHookFromRc(rcPath);
      if (removed) {
        console.log(`  ${icons.check} ${colors.success('Shell hook removed')} ${colors.dim(rcPath)}`);
        console.log(colors.dim(`    Run: source ${rcPath}`));
      } else {
        console.log(colors.dim('  No shell hook found to remove.'));
      }
    }
  }

  // Step 2: Remove data
  if (!flags.keepData) {
    const recallDir = getRecallDir();
    closeDb();
    if (existsSync(recallDir)) {
      rmSync(recallDir, { recursive: true, force: true });
      console.log(`  ${icons.check} ${colors.success('Data removed')} ${colors.dim(recallDir)}`);
    }
  } else {
    console.log(`  ${icons.check} ${colors.dim('Data preserved (--keep-data)')}`);
  }

  console.log('');
  console.log(colors.dim('  Recall has been removed. Thanks for trying it out.'));
  console.log('');
}
