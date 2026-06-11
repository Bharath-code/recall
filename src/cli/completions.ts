/**
 * recall completions — Generate shell completion scripts
 *
 * Usage:
 *   recall completions zsh    # print zsh completion
 *   recall completions bash   # print bash completion
 */

import { colors, getIcons } from '../ui/index.ts';

// ─── Command tree (sourced from src/index.ts) ─────────────────────────────────
// Keep in sync with src/index.ts when adding/removing commands

interface CompletionEntry {
  command: string;
  description: string;
  options?: Array<{ flag: string; description: string }>;
  args?: Array<{ name: string; required: boolean }>;
}

export const COMMANDS: CompletionEntry[] = [
  { command: 'init', description: 'Set up Recall on your system', options: [
    { flag: '--auto', description: 'Auto-install shell hooks without prompting' },
  ]},
  { command: 'search', description: 'Search command history', args: [
    { name: 'query', required: true },
  ], options: [
    { flag: '--repo', description: 'Filter by repo path hash' },
    { flag: '--since', description: 'Filter commands since date (ISO)' },
    { flag: '--limit', description: 'Max results' },
    { flag: '--failed-only', description: 'Show only failed commands' },
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'recent', description: 'Show recent commands', options: [
    { flag: '--limit', description: 'Number of commands to show' },
    { flag: '--repo', description: 'Filter by repo' },
    { flag: '--all', description: 'Include imported shell history' },
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'project', description: 'Show current project context', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'doctor', description: 'Diagnose installation health', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'config', description: 'View and update Recall settings', options: [
    { flag: '--get', description: 'Get a specific config value' },
    { flag: '--set', description: 'Set a config value' },
    { flag: '--list', description: 'List all config values' },
    { flag: '--reset', description: 'Reset config to defaults' },
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'ignore', description: 'Manage command capture ignore patterns', args: [
    { name: 'action', required: true },
    { name: 'pattern', required: false },
  ]},
  { command: 'delete', description: 'Delete captured command data', options: [
    { flag: '--id', description: 'Delete one command by id' },
    { flag: '--all', description: 'Delete all captured commands' },
    { flag: '--yes', description: 'Confirm destructive delete' },
  ]},
  { command: 'uninstall', description: 'Remove Recall from your system', options: [
    { flag: '--keep-data', description: 'Keep your command history data' },
  ]},
  { command: 'export', description: 'Export captured data to JSON', options: [
    { flag: '--format', description: 'Export format (json)' },
    { flag: '--output', description: 'Output file path' },
  ]},
  { command: 'import', description: 'Import data from Recall export or shell history', options: [
    { flag: '--file', description: 'File to import' },
    { flag: '--format', description: 'Format (json, zsh, bash)' },
  ]},
  { command: 'pick', description: 'Interactive command picker', options: [
    { flag: '--repo', description: 'Filter by repo' },
    { flag: '--failed-only', description: 'Show only failed commands' },
    { flag: '--query', description: 'Search query' },
  ]},
  { command: 'pause', description: 'Pause command capture' },
  { command: 'resume', description: 'Resume command capture' },
  { command: 'digest', description: 'Weekly summary of your terminal activity', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'workflows', description: 'Detect and list repeated command sequences', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'restore', description: 'Replay a stored workflow', options: [
    { flag: '--id', description: 'Workflow ID to restore' },
  ]},
  { command: 'session', description: 'Show session timeline view', options: [
    { flag: '--limit', description: 'Number of sessions to show' },
    { flag: '--repo', description: 'Filter by repo' },
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'mcp', description: 'Start MCP server for AI tool integration' },
  { command: 'ask', description: 'AI-powered semantic search over your command history', args: [
    { name: 'query', required: true },
  ], options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'fix', description: 'Show known fixes for recent errors', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'forgotten-tools', description: 'Show installed but unused tools', options: [
    { flag: '--json', description: 'Output as JSON' },
  ]},
  { command: 'completions', description: 'Generate shell completion scripts', args: [
    { name: 'shell', required: true },
  ]},
];

// ─── Global options ──────────────────────────────────────────────────────────

const GLOBAL_OPTIONS = [
  { flag: '--no-icons', description: 'Disable icons in output' },
  { flag: '--help', description: 'Display help' },
  { flag: '--version', description: 'Display version' },
];

// Options that take a value argument
const VALUE_OPTIONS = new Set([
  '--repo', '--since', '--limit',
  '--get', '--set', '--id',
  '--format', '--output', '--file', '--query',
]);

// Options that expect a file path
const FILE_OPTIONS = new Set(['--file', '--output']);

// ─── Zsh completion generation ───────────────────────────────────────────────

export function generateZsh(): string {
  const lines: string[] = [
    '#compdef _recall recall',
    '',
    '# recall zsh completion',
    '# Generated by "recall completions zsh"',
    '',
    '_recall() {',
    '  local -a commands',
    '',
    '  commands=(',
    ...COMMANDS.map(c =>
      `    '${c.command}:${c.description}'`
    ),
    '  )',
    '',
    '  _arguments -C \\',
    '    "(-h --help)"{-h,--help}"[Show help]" \\',
    '    "(-v --version)"{-v,--version}"[Show version]" \\',
    '    "--no-icons[Disable icons in output]" \\',
    '    "(-): :->command" \\',
    '    "(-)*:: :->args" \\',
    '    && return 0',
    '',
    '  case $state in',
    '    command)',
    '      _describe "command" commands && return 0',
    '      ;;',
    '    args)',
    '      local cmd="${words[1]}"',
    '      case $cmd in',
    ...COMMANDS.flatMap(c => {
      const opts = [...(c.options ?? []), ...GLOBAL_OPTIONS];
      const optLines = opts.map(o => {
        const long = o.flag.startsWith('--')
          ? o.flag
          : o.flag.includes('--')
            ? o.flag.match(/--\S+/)?.[0] ?? o.flag
            : o.flag;
        const hasArg = VALUE_OPTIONS.has(long!);
        if (hasArg) {
          return `"${long}[${o.description}]:${long!.replace(/^--/, '')}: "`;
        }
        return `"${long}[${o.description}]"`;
      });

      const argDefs = (c.args ?? []).map((a) =>
        a.required ? `":${a.name}: "` : `"::${a.name}: "`
      );

      return [
        `        ${c.command})`,
        ...(optLines.length > 0
          ? [`          _arguments ${optLines.join(' \\\n            ')}${argDefs.length > 0 ? ' \\\n            ' + argDefs.join(' \\\n            ') : ''} && return 0`]
          : argDefs.length > 0
            ? [`          _arguments ${argDefs.join(' \\\n            ')} && return 0`]
            : [`          ;;`]
        ),
        `          ;;`,
      ];
    }),
    '      esac',
    '      ;;',
    '  esac',
    '}',
    '',
    '_recall "$@"',
    '',
  ];

  return lines.join('\n');
}

// ─── Bash completion generation ──────────────────────────────────────────────

export function generateBash(): string {
  const cmdNames = COMMANDS.map(c => c.command).join(' ');

  // Build per-command option lists (as flag-only strings)
  const cmdOpts: Record<string, string> = {};
  for (const c of COMMANDS) {
    const opts = [...(c.options ?? []), ...GLOBAL_OPTIONS];
    cmdOpts[c.command] = opts.map(o => o.flag.split(' ')[0]).join(' ');
  }

  // Build prev-handling case entries (value-taking options suppress flag suggestions)
  const fileOptCases = Array.from(FILE_OPTIONS)
    .map(f => `${f}) COMPREPLY=(\$(compgen -f -- "\$cur")) && return 0 ;;`).join('\n        ');
  const valueOptCases = Array.from(VALUE_OPTIONS)
    .filter(f => !FILE_OPTIONS.has(f))
    .map(f => `${f}) return 0 ;;`).join('\n        ');

  // Generate per-command case branches with prev-aware handling
  const optCases = COMMANDS.map(c => {
    const flags = cmdOpts[c.command] ?? '';
    return `    ${c.command})
      case \$prev in
        ${fileOptCases}
        ${valueOptCases}
        *) COMPREPLY=(\$(compgen -W "${flags}" -- "\$cur")) && return 0 ;;
      esac
      ;;`;
  }).join('\n');

  const lines = [
    '# recall bash completion',
    '# Generated by "recall completions bash"',
    '',
    '_recall_completions() {',
    '  local cur="${COMP_WORDS[COMP_CWORD]}"',
    '  local prev="${COMP_WORDS[COMP_CWORD-1]}"',
    '  local cmd="${COMP_WORDS[1]}"',
    '',
    '  if [[ $COMP_CWORD -eq 1 ]]; then',
    `    COMPREPLY=(\$(compgen -W "${cmdNames}" -- "\$cur"))`,
    '    return 0',
    '  fi',
    '',
    '  case "$cmd" in',
    optCases,
    `    *) COMPREPLY=(\$(compgen -W "${cmdNames}" -- "\$cur")) && return 0 ;;`,
    '  esac',
    '}',
    '',
    'complete -F _recall_completions recall',
    '',
  ];

  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function handleCompletions(shell: string): void {
  const icons = getIcons();

  switch (shell) {
    case 'zsh':
      process.stdout.write(generateZsh());
      break;
    case 'bash':
      process.stdout.write(generateBash());
      break;
    default:
      console.error(`${icons.cross} ${colors.error(`Unsupported shell: ${shell}`)}`);
      console.error(`  ${colors.textDim('Supported: zsh, bash')}`);
      process.exit(1);
  }
}
