/**
 * recall delete — Delete captured local command data
 */

import { deleteAllCommands, deleteCommandById } from '../db/commands.ts';
import { colors, formatCount, getIcons } from '../ui/index.ts';

export interface DeleteFlags {
  id?: string;
  all?: boolean;
  yes?: boolean;
}

export function handleDelete(flags: DeleteFlags): void {
  const icons = getIcons();

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
    if (!flags.yes) {
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
