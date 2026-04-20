/**
 * recall export — Export captured data for portability
 */

import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { getAllCommands } from '../db/commands.ts';
import { getAllRepos } from '../db/repos.ts';
import { getAllTools } from '../db/tools.ts';
import { colors, formatHeader, getIcons, createSpinner } from '../ui/index.ts';

const ExportFlagsSchema = z.object({
  format: z.enum(['json']).default('json'),
  output: z.string().default('recall-export.json'),
});

export interface ExportFlags {
  format?: string;
  output?: string;
}

export function handleExport(flags: ExportFlags): void {
  const icons = getIcons();

  // Validate flags
  const validated = ExportFlagsSchema.safeParse(flags);
  if (!validated.success) {
    console.log(colors.error('Invalid export options:'));
    for (const error of validated.error.errors) {
      console.log(colors.dim(`  ${error.message}`));
    }
    process.exit(1);
  }

  const { format, output } = validated.data;

  console.log(formatHeader(`${icons.pkg} recall export`));
  console.log('');

  if (format !== 'json') {
    console.log(colors.error('Only JSON format is currently supported.'));
    process.exit(1);
  }

  const spinner = createSpinner('Gathering data...');

  // Gather all data
  const commands = getAllCommands();
  const repos = getAllRepos();
  const tools = getAllTools();

  spinner.succeed('Data gathered');

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    commands,
    repos,
    tools,
  };

  const outputPath = output;

  try {
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
    console.log(`  ${icons.check} ${colors.success('Export complete')}`);
    console.log(`  ${icons.dir} ${colors.path(outputPath)}`);
    console.log('');
    console.log(colors.dim('  Statistics:'));
    console.log(`    Commands: ${commands.length}`);
    console.log(`    Repos:     ${repos.length}`);
    console.log(`    Tools:     ${tools.length}`);
    console.log('');
  } catch (err) {
    console.log(colors.error('Export failed'));
    console.log(colors.dim(`  ${err instanceof Error ? err.message : 'Unknown error'}`));
    process.exit(1);
  }
}
