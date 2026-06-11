/**
 * Tests for recall completions generation
 *
 * Verifies that generateZsh() and generateBash() produce structurally
 * correct completion scripts.
 */

import { describe, expect, test } from 'bun:test';
import { execSync } from 'node:child_process';
import { generateZsh, generateBash, COMMANDS } from '../../src/cli/completions.ts';

// ─── Shared checks ───────────────────────────────────────────────────────────

// Derive command names from the source-of-truth COMMANDS array.
// If a command is added or removed from completions.ts, tests adapt automatically.
const ALL_COMMANDS = COMMANDS.map(c => c.command);

// ─── Zsh completion tests ────────────────────────────────────────────────────

describe('generateZsh()', () => {
  const output = generateZsh();

  test('passes zsh -n syntax validation', () => {
    // Run zsh's syntax checker on the generated script to catch
    // structural issues (unbalanced quotes, missing esac, etc.)
    // that content-string checks cannot detect.
    try {
      execSync('zsh -n', { input: output });
    } catch (err) {
      const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? 'unknown error';
      throw new Error(`zsh -n syntax check failed:\n${stderr}`);
    }
  });

  test('has correct header', () => {
    expect(output.startsWith('#compdef _recall recall')).toBe(true);
  });

  test('includes _arguments -C flag', () => {
    expect(output).toContain('_arguments -C');
  });

  test('includes every defined command', () => {
    for (const cmd of ALL_COMMANDS) {
      expect(output).toContain(`'${cmd}:`);
    }
  });

  test('includes value-taking options with argument spec', () => {
    // These options should have ":valueName: " in their _arguments spec
    expect(output).toContain('--repo[');
    expect(output).toContain(':repo: ');
    expect(output).toContain('--since[');
    expect(output).toContain('--limit[');
    expect(output).toContain('--format[');
    expect(output).toContain('--file[');
    expect(output).toContain('--output[');
  });

  test('includes boolean options without argument spec', () => {
    // Boolean flags should NOT have a trailing ":name: " spec
    expect(output).toContain('--json[Output as JSON]');
    expect(output).toContain('--failed-only[Show only failed commands]');
    expect(output).toContain('--all[Include imported shell history]');
  });

  test('includes global options (--no-icons, --help, --version)', () => {
    expect(output).toContain('--no-icons[Disable icons in output]');
    expect(output).toContain('{-h,--help}');
    expect(output).toContain('{-v,--version}');
  });

  test('has proper state machine structure', () => {
    expect(output).toContain('->command');
    expect(output).toContain('->args');
    expect(output).toContain('case $state in');
    expect(output).toContain('local cmd="${words[1]}"');
  });

  test('has _recall invocation at end', () => {
    expect(output.trim().endsWith('_recall "$@"')).toBe(true);
  });

  test('has no duplicate case entries', () => {
    // Each command should appear exactly once in the case statement
    for (const cmd of ALL_COMMANDS) {
      const matches = output.match(new RegExp(`        ${cmd}\\)`, 'g'));
      expect(matches?.length).toBe(1);
    }
  });
});

// ─── Bash completion tests ───────────────────────────────────────────────────

describe('generateBash()', () => {
  const output = generateBash();

  test('has correct header', () => {
    expect(output.startsWith('# recall bash completion')).toBe(true);
  });

  test('includes local prev variable', () => {
    expect(output).toContain('local prev="${COMP_WORDS[COMP_CWORD-1]}"');
  });

  test('includes local cur and cmd variables', () => {
    expect(output).toContain('local cur="${COMP_WORDS[COMP_CWORD]}"');
    expect(output).toContain('local cmd="${COMP_WORDS[1]}"');
  });

  test('checks COMP_CWORD -eq 1 for top-level commands', () => {
    expect(output).toContain('COMP_CWORD -eq 1');
  });

  test('includes every defined command in top-level completion', () => {
    for (const cmd of ALL_COMMANDS) {
      expect(output).toContain(cmd);
    }
  });

  test('includes case branches for every command', () => {
    for (const cmd of ALL_COMMANDS) {
      expect(output).toContain(`    ${cmd})`);
    }
  });

  test('includes file completion (compgen -f) for --file and --output', () => {
    const fileMatches = output.match(/compgen -f/g);
    expect(fileMatches?.length).toBeGreaterThanOrEqual(2);
  });

  test('includes return 0 after COMPREPLY assignments', () => {
    const returnMatches = output.match(/&& return 0/g);
    // At minimum, each command branch should have return 0
    expect(returnMatches?.length).toBeGreaterThanOrEqual(ALL_COMMANDS.length + 1);
  });

  test('includes final complete -F registration', () => {
    expect(output).toContain('complete -F _recall_completions recall');
  });

  test('has prev-aware handling in every command branch', () => {
    // Each command should have a nested `case $prev` block
    const prevCaseMatches = output.match(/case \$prev in/g);
    expect(prevCaseMatches?.length).toBe(ALL_COMMANDS.length);
  });

  test('no duplicate --file / --output entries in VALUE_OPTIONS', () => {
    // VALUE_OPTIONS filters out FILE_OPTIONS, so lines matching
    // "--file) return 0 ;;" (without compgen -f) should not exist
    expect(output.match(/^\s+--file\) return 0 ;;$/m)).toBeNull();
    expect(output.match(/^\s+--output\) return 0 ;;$/m)).toBeNull();
  });

  test('has default fallback case', () => {
    // Each command has `*)` in its `case $prev` block (23 total),
    // plus one `*)` in the outer `case "$cmd"` dispatch
    const starCases = output.match(/\*\)/g);
    expect(starCases?.length).toBe(ALL_COMMANDS.length + 1);
  });
});
