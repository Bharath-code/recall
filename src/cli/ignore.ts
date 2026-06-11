/**
 * recall ignore — Manage command capture ignore patterns
 */

import {
  addIgnoredPattern,
  getIgnoredPatterns,
  removeIgnoredPattern,
} from '../config/index.ts';
import { colors, getIcons } from '../ui/index.ts';
import * as prompts from '../ui/prompts.ts';

export interface IgnoreFlags {
  interactive?: boolean;
}

export async function handleIgnore(action: string | undefined, pattern?: string, flags: IgnoreFlags = {}): Promise<void> {
  const icons = getIcons();

  // ─── Interactive wizard ──────────────────────────────────────────────────
  if (!action || flags.interactive) {
    await runIgnoreWizard(icons);
    return;
  }

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

/**
 * Interactive wizard for recall ignore --interactive
 */
async function runIgnoreWizard(icons: ReturnType<typeof getIcons>): Promise<void> {
  prompts.intro(`${icons.tool} ${colors.bold('Ignore Patterns')}`);

  const action = prompts.unwrap(await prompts.select({
    message: 'What would you like to do?',
    options: [
      { value: 'add', label: 'Add a pattern' },
      { value: 'remove', label: 'Remove a pattern' },
      { value: 'list', label: 'List all patterns' },
    ],
  }));

  if (action === 'list') {
    const patterns = getIgnoredPatterns();
    if (patterns.length === 0) {
      prompts.log.info('No ignore patterns configured.');
    } else {
      prompts.log.info('Configured patterns:');
      for (const item of patterns) {
        console.log(`  ${icons.tree} ${item}`);
      }
    }
    prompts.outro(colors.dim('Done.'));
    return;
  }

  if (action === 'add') {
    const pattern = prompts.unwrap(await prompts.text({
      message: 'Enter the command pattern to ignore',
      placeholder: 'e.g. git push or npm*',
      validate(value: string | undefined) {
        if (!value?.trim()) return 'Pattern cannot be empty';
      },
    }));

    addIgnoredPattern(pattern as string);
    prompts.log.success(`Ignore pattern added: ${pattern}`);
    prompts.outro(colors.success('Done.'));
    return;
  }

  // action === 'remove'
  const existing = getIgnoredPatterns();
  if (existing.length === 0) {
    prompts.log.info('No ignore patterns to remove.');
    prompts.outro(colors.dim('Done.'));
    return;
  }

  const pattern = prompts.unwrap(await prompts.select({
    message: 'Which pattern to remove?',
    options: existing.map(p => ({ value: p, label: p })),
  }));

  removeIgnoredPattern(pattern as string);
  prompts.log.success(`Ignore pattern removed: ${pattern}`);
  prompts.outro(colors.success('Done.'));
}
