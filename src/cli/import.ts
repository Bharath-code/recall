/**
 * recall import — Import data from Recall export or shell history
 */

import { readFileSync, existsSync } from 'node:fs';
import { insertCommand } from '../db/commands.ts';
import { upsertRepo } from '../db/repos.ts';
import { batchUpsertTools } from '../db/tools.ts';
import { parseZshHistory, parseBashHistory } from '../import/history-parser.ts';
import { normalize, shouldSkipCommand } from '../import/normalizer.ts';
import { getRecentNormalizedCommands } from '../db/commands.ts';
import { colors, formatHeader, getIcons, createSpinner } from '../ui/index.ts';

export interface ImportFlags {
  file?: string;
  format?: string;
}

export function handleImport(flags: ImportFlags): void {
  const icons = getIcons();
  const filePath = flags.file;

  if (!filePath) {
    console.log(colors.error('Usage: recall import --file <path>'));
    console.log(colors.dim('  Example: recall import --file recall-export.json'));
    console.log(colors.dim('  Example: recall import --file ~/.zsh_history'));
    process.exit(1);
  }

  if (!existsSync(filePath)) {
    console.log(colors.error(`File not found: ${filePath}`));
    process.exit(1);
  }

  console.log(formatHeader(`${icons.pkg} recall import`));
  console.log('');

  // Detect format based on file extension or content
  const format = detectFormat(filePath, flags.format);

  if (format === 'recall-json') {
    importRecallJSON(filePath);
  } else if (format === 'zsh-history') {
    importShellHistory(filePath, 'zsh');
  } else if (format === 'bash-history') {
    importShellHistory(filePath, 'bash');
  } else {
    console.log(colors.error('Unknown file format'));
    process.exit(1);
  }
}

function detectFormat(filePath: string, explicitFormat?: string): 'recall-json' | 'zsh-history' | 'bash-history' {
  if (explicitFormat) {
    if (explicitFormat === 'json') return 'recall-json';
    if (explicitFormat === 'zsh') return 'zsh-history';
    if (explicitFormat === 'bash') return 'bash-history';
  }

  const content = readFileSync(filePath, 'utf-8');

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(content);
    if (parsed.version && parsed.commands && parsed.repos) {
      return 'recall-json';
    }
  } catch {
    // Not JSON, assume shell history
  }

  // Detect shell history based on filename or content patterns
  if (filePath.includes('zsh') || content.includes(': 0;')) {
    return 'zsh-history';
  }

  return 'bash-history';
}

function importRecallJSON(filePath: string): void {
  const spinner = createSpinner('Importing Recall JSON export...', 'import');
  spinner.start();

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    if (!data.version || !data.commands) {
      throw new Error('Invalid Recall export format');
    }

    let importedCommands = 0;
    let importedRepos = 0;
    let importedTools = 0;

    // Get existing commands for deduplication
    const existingCommands = new Set(getRecentNormalizedCommands(1000));

    // Import commands
    if (Array.isArray(data.commands)) {
      for (const cmd of data.commands) {
        if (shouldSkipCommand(cmd.raw_command)) continue;
        const normalized = normalize(cmd.raw_command);
        if (!normalized) continue;

        // Skip if already exists (simple dedup)
        if (existingCommands.has(normalized)) continue;

        insertCommand({
          raw_command: cmd.raw_command,
          normalized_command: normalized,
          cwd: cmd.cwd || process.env.HOME || '~',
          repo_path_hash: cmd.repo_path_hash || null,
          exit_code: cmd.exit_code || null,
          duration_ms: cmd.duration_ms || null,
          shell: cmd.shell || 'unknown',
          stderr_output: cmd.stderr_output || null,
          session_id: cmd.session_id || null,
          source: 'import',
        });

        importedCommands++;
      }
    }

    // Import repos
    if (Array.isArray(data.repos)) {
      for (const repo of data.repos) {
        upsertRepo({
          repo_path_hash: repo.repo_path_hash,
          repo_name: repo.repo_name,
          repo_root: repo.repo_root,
        });
        importedRepos++;
      }
    }

    // Import tools
    if (Array.isArray(data.tools)) {
      const toolsToUpsert = data.tools.map((t: any) => ({
        tool_name: t.tool_name,
        source: t.source || 'manual',
      }));
      batchUpsertTools(toolsToUpsert);
      importedTools = toolsToUpsert.length;
    }

    spinner.succeed(colors.success('Import complete'));
    console.log('');
    console.log(colors.dim('  Statistics:'));
    console.log(`    Commands: ${importedCommands}`);
    console.log(`    Repos:     ${importedRepos}`);
    console.log(`    Tools:     ${importedTools}`);
    console.log('');
  } catch (err) {
    spinner.fail(colors.error('Import failed'));
    console.log(colors.dim(`  ${err instanceof Error ? err.message : 'Unknown error'}`));
    process.exit(1);
  }
}

function importShellHistory(filePath: string, shell: 'zsh' | 'bash'): void {
  const spinner = createSpinner(`Importing ${shell} history...`, 'import');
  spinner.start();

  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = shell === 'zsh' ? parseZshHistory(content) : parseBashHistory(content);

    let imported = 0;
    const existingCommands = new Set(getRecentNormalizedCommands(1000));

    for (const cmd of parsed) {
      if (shouldSkipCommand(cmd.command)) continue;
      const normalized = normalize(cmd.command);
      if (!normalized) continue;

      // Skip if already exists
      if (existingCommands.has(normalized)) continue;

      insertCommand({
        raw_command: cmd.command,
        normalized_command: normalized,
        cwd: process.env.HOME || '~',
        shell,
        source: 'import',
      });

      imported++;
    }

    spinner.succeed(colors.success('Import complete'));
    console.log('');
    console.log(colors.dim('  Statistics:'));
    console.log(`    Commands: ${imported}`);
    console.log('');
  } catch (err) {
    spinner.fail(colors.error('Import failed'));
    console.log(colors.dim(`  ${err instanceof Error ? err.message : 'Unknown error'}`));
    process.exit(1);
  }
}
