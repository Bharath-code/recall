/**
 * recall ignore — Manage command capture ignore patterns
 */

import {
  addIgnoredPattern,
  getIgnoredPatterns,
  removeIgnoredPattern,
} from '../config/index.ts';
import { colors, getIcons } from '../ui/index.ts';

export function handleIgnore(action: string, pattern?: string): void {
  const icons = getIcons();

  switch (action) {
    case 'add': {
      if (!pattern?.trim()) {
        console.log(colors.error('Usage: recall ignore add <pattern>'));
        process.exit(1);
      }
      addIgnoredPattern(pattern);
      console.log(`  ${icons.check} ${colors.success('Ignore pattern added')}: ${colors.path(pattern)}`);
      return;
    }

    case 'remove': {
      if (!pattern?.trim()) {
        console.log(colors.error('Usage: recall ignore remove <pattern>'));
        process.exit(1);
      }
      removeIgnoredPattern(pattern);
      console.log(`  ${icons.check} ${colors.success('Ignore pattern removed')}: ${colors.path(pattern)}`);
      return;
    }

    case 'list': {
      const patterns = getIgnoredPatterns();
      console.log(colors.bold('  Recall Ignore Patterns'));
      console.log('');
      if (patterns.length === 0) {
        console.log(colors.dim('  No ignore patterns configured.'));
        console.log(colors.dim('  Add one with: recall ignore add <pattern>'));
        console.log('');
        return;
      }

      for (const item of patterns) {
        console.log(`  ${icons.tree} ${item}`);
      }
      console.log('');
      return;
    }

    default:
      console.log(colors.error(`Unknown ignore action: ${action}`));
      console.log(colors.dim('  Usage: recall ignore add|remove|list [pattern]'));
      process.exit(1);
  }
}
