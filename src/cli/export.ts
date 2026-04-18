/**
 * recall export — Export captured data for portability
 */

import { writeFileSync } from 'node:fs';
import { getAllCommands } from '../db/commands.ts';
import { getAllRepos } from '../db/repos.ts';
import { getAllTools } from '../db/tools.ts';
import { colors, formatHeader, getIcons } from '../ui/index.ts';

export interface ExportFlags {
  format?: string;
  output?: string;
}

export function handleExport(flags: ExportFlags): void {
  const icons = getIcons();

  console.log(formatHeader(`${icons.pkg} recall export`));
  console.log('');

  const format = flags.format || 'json';
  if (format !== 'json') {
    console.log(colors.error('Only JSON format is currently supported.'));
    process.exit(1);
  }

  // Gather all data
  const commands = getAllCommands();
  const repos = getAllRepos();
  const tools = getAllTools();

  const exportData = {
    version: 1,
    exported_at: new Date().toISOString(),
    commands,
    repos,
    tools,
  };

  const outputPath = flags.output || 'recall-export.json';

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
