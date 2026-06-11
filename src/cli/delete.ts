/**
 * recall delete — Delete captured local command data
 */

import { deleteAllCommands, deleteCommandById } from '../db/commands.ts';
import { colors, formatCount, getIcons } from '../ui/index.ts';
import * as prompts from '../ui/prompts.ts';

export interface DeleteFlags {
  id?: string;
  all?: boolean;
  yes?: boolean;
  interactive?: boolean;
}

export async function handleDelete(flags: DeleteFlags): Promise<void> {
  const icons = getIcons();

  // ─── Interactive wizard ──────────────────────────────────────────────────
  if (flags.interactive) {
    await runDeleteWizard(icons);
    return;
  }

  if (flags.id && flags.all) {
    console.log(colors.error('Choose either --id <id> or --all, not both.'));
    process.exit(1);
  }

  if (flags.id) {
    const id = Number(flags.id);
    if (!Number.isInteger(id) || id <= 0) {
      console.log(colors.error('Usage: recall delete --id <positive-number>'));
      process.exit(1);
    }

    const deleted = deleteCommandById(id);
    if (deleted) {
      console.log(`  ${icons.check} ${colors.success('Deleted command')} ${colors.dim(`#${id}`)}`);
    } else {
      console.log(`  ${icons.cross} ${colors.warning('No command found')} ${colors.dim(`#${id}`)}`);
    }
    return;
  }

  if (flags.all) {
    if (!flags.yes && prompts.isInteractive()) {
      const confirmed = prompts.unwrap(await prompts.confirm({
        message: 'Delete all captured command data? This cannot be undone.',
        active: 'Yes, delete everything',
        inactive: 'No, keep my data',
      }));
      if (!confirmed) {
        prompts.log.info('Cancelled — no data was deleted.');
        return;
      }
    } else if (!flags.yes) {
      console.log(colors.error('Refusing to delete all commands without --yes.'));
      console.log(colors.dim('  Run: recall delete --all --yes'));
      process.exit(1);
    }

    const count = deleteAllCommands();
    console.log(`  ${icons.check} ${colors.success('Deleted')} ${colors.dim(formatCount(count, 'command'))}`);
    return;
  }

  console.log(colors.error('Usage: recall delete --id <id> OR recall delete --all --yes'));
  process.exit(1);
}

/**
 * Interactive wizard for recall delete --interactive
 */
async function runDeleteWizard(icons: ReturnType<typeof getIcons>): Promise<void> {
  prompts.intro(`${icons.tool} ${colors.bold('Delete data')}`);

  const action = prompts.unwrap(await prompts.select({
    message: 'What would you like to delete?',
    options: [
      { value: 'single', label: 'A single command', hint: 'Delete one command by ID' },
      { value: 'all', label: 'All captured commands', hint: 'Wipes your entire Recall history' },
    ],
  }));

  if (action === 'single') {
    const idStr = prompts.unwrap(await prompts.text({
      message: 'Enter the command ID to delete',
      placeholder: 'e.g. 42',
      validate(value) {
        const n = Number(value);
        if (!Number.isInteger(n) || n <= 0) return 'Must be a positive integer';
      },
    }));

    const id = Number(idStr);
    const deleted = deleteCommandById(id);
    if (deleted) {
      prompts.log.success(`Deleted command #${id}`);
    } else {
      prompts.log.warn(`No command found with ID #${id}`);
    }
  } else {
    const confirmed = prompts.unwrap(await prompts.confirm({
      message: 'Delete all captured command data? This cannot be undone.',
      active: 'Yes, delete everything',
      inactive: 'No, keep my data',
    }));

    if (!confirmed) {
      prompts.log.info('Cancelled — no data was deleted.');
      prompts.outro(colors.dim('Nothing changed.'));
      return;
    }

    const count = deleteAllCommands();
    prompts.log.success(`Deleted ${formatCount(count, 'command')}`);
  }

  prompts.outro(colors.success('Done.'));
}
