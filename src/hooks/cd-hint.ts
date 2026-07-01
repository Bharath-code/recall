/**
 * CD hint formatting — brief project context shown when entering a git repo.
 */

import { colors } from '../ui/index.ts';

export interface CdHintCommand {
  raw_command: string;
}

export interface CdHintWorkflow {
  commands: string[];
  frequency: number;
}

export interface CdHintFailure {
  raw_command: string;
  exit_code: number | null;
}

export interface CdHintInput {
  repoName: string;
  recent: CdHintCommand[];
  startup: CdHintCommand[];
  workflows: CdHintWorkflow[];
  failed: CdHintFailure[];
}

/**
 * Build dim hint lines for `recall hook cd`. Returns null when there is nothing to show.
 */
export function formatCdHintLines(input: CdHintInput): string[] | null {
  if (input.recent.length === 0) return null;

  const lastCmds = input.recent
    .slice(0, 3)
    .map(command => command.raw_command)
    .join(' · ');

  const lines: string[] = [
    `  ${colors.dim(`recall: ${input.repoName} | ${lastCmds}`)}`,
  ];

  if (input.startup.length > 0) {
    lines.push(
      `  ${colors.dim(`         ↳ startup: ${input.startup[0].raw_command}`)}`,
    );
  }

  if (input.workflows.length > 0) {
    const workflow = input.workflows[0];
    lines.push(
      `  ${colors.dim(`         ↳ workflow: ${workflow.commands.join(' → ')} (${workflow.frequency}x)`)}`,
    );
  }

  if (input.failed.length > 0) {
    const failure = input.failed[0];
    const exitCode = failure.exit_code ?? '?';
    lines.push(
      `  ${colors.dim(`         ↳ last fail: ${failure.raw_command} (exit ${exitCode})`)}`,
    );
  }

  return lines;
}