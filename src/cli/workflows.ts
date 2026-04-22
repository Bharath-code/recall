/**
 * recall workflows — Detect and list repeated command sequences
 */

import { detectAndStoreWorkflows } from '../db/workflows.ts';
import { colors, formatHeader, getIcons, SPACING, createSpinner } from '../ui/index.ts';

export function handleWorkflows(): void {
  const icons = getIcons();

  console.log(formatHeader(`${icons.brain} recall workflows`));
  console.log('');

  const spinner = createSpinner('Detecting workflows...', 'detect');
  spinner.start();

  const workflows = detectAndStoreWorkflows();
  spinner.stop();

  if (workflows.length === 0) {
    console.log(`${SPACING.indent}${colors.dim('No repeated command sequences detected yet.')}`);
    console.log(`${SPACING.indent}${colors.dim('Keep working — workflows appear after you repeat the same commands 3+ times across different sessions.')}`);
    return;
  }

  console.log(`${SPACING.indent}${colors.success(String(workflows.length))} ${colors.dim('workflow(s) detected')}`);
  console.log('');

  for (const wf of workflows.slice(0, 10)) {
    const seq = JSON.parse(wf.sequence_json) as string[];
    console.log(`${SPACING.indent}${colors.bold(`Workflow #${wf.id}`)} ${colors.dim(`(seen ${wf.frequency}x in ${Math.round(wf.confidence * 4)} sessions)`)}`);
    for (const cmd of seq) {
      console.log(`${SPACING.indent}${SPACING.indent}${colors.path(cmd)}`);
    }
    console.log('');
  }
}
