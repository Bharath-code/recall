/**
 * recall export — Export captured data for portability
 */

import { writeFileSync } from 'node:fs';
import { resolve, normalize } from 'node:path';
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

/**
 * Validate and sanitize file path to prevent path traversal attacks.
 * Resolves the path relative to current working directory and ensures it's normalized.
 */
function validateFilePath(filePath: string): string {
  const resolved = resolve(filePath);
  const normalized = normalize(resolved);
  
  // Check for obvious path traversal patterns that could be malicious
  // Allow absolute paths and tilde expansion, but reject relative paths with ..
  if (filePath.includes('..') && !filePath.startsWith('/') && !filePath.startsWith('~')) {
    // Check if the resolved path actually escapes the current directory
    const cwd = process.cwd();
    if (!normalized.startsWith(cwd)) {
      throw new Error('Path traversal detected: file path must be within current directory or subdirectories');
    }
  }
  
  return normalized;
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

  let outputPath: string;
  try {
    outputPath = validateFilePath(output);
  } catch (err) {
    console.log(colors.error('Invalid output path'));
    console.log(colors.dim(`  ${err instanceof Error ? err.message : 'Unknown error'}`));
    process.exit(1);
  }

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
