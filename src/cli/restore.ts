/**
 * recall restore — Replay a stored workflow
 */

import { getWorkflowById } from '../db/workflows.ts';
import { colors, formatHeader, getIcons, SPACING } from '../ui/index.ts';

export interface RestoreFlags {
  id?: string;
}

export function handleRestore(flags: RestoreFlags): void {
  const icons = getIcons();

  console.log(formatHeader(`${icons.cmd} recall restore`));
  console.log('');

  if (!flags.id) {
    console.log(`${SPACING.indent}${colors.error('Workflow ID required')}`);
    console.log(`${SPACING.indent}${colors.dim('Usage: recall restore --id <workflow-id>')}`);
    console.log(`${SPACING.indent}${colors.dim('Run `recall workflows` to see available IDs.')}`);
    process.exit(1);
  }

  const id = parseInt(flags.id, 10);
  if (isNaN(id)) {
    console.log(`${SPACING.indent}${colors.error('Invalid workflow ID')}`);
    process.exit(1);
  }

  const workflow = getWorkflowById(id);
  if (!workflow) {
    console.log(`${SPACING.indent}${colors.error(`Workflow #${id} not found`)}`);
    process.exit(1);
  }

  const seq = JSON.parse(workflow.sequence_json) as string[];
  console.log(`${SPACING.indent}${colors.bold(`Workflow #${workflow.id}`)} ${colors.dim(`(seen ${workflow.frequency}x)`)}`);
  console.log('');

  for (const cmd of seq) {
    console.log(`${SPACING.indent}${colors.path(cmd)}`);
  }

  console.log('');
  console.log(`${SPACING.indent}${colors.dim('Copy these commands to replay the workflow.')}`);
}
