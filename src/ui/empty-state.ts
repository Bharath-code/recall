import { colors, getIcons, SPACING } from './index.ts';

export interface EmptyStateOptions {
  icon?: string;
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    command: string;
  }>;
  indent?: number;
}

export function formatEmptyState(options: EmptyStateOptions): string[] {
  const icons = getIcons();
  const { icon = icons.info, title, message, actions = [], indent = 0 } = options;
  const prefix = SPACING.indent.repeat(indent);
  const lines: string[] = [];

  lines.push('');
  lines.push(`${prefix}${icon} ${colors.bold(title)}`);
  lines.push('');
  lines.push(`${prefix}${colors.textDim(message)}`);
  
  if (actions.length > 0) {
    lines.push('');
    lines.push(`${prefix}${colors.textDim('Next steps:')}`);
    for (const action of actions) {
      lines.push(`${prefix}${SPACING.indent}${colors.dim('•')} ${colors.path(action.command)} ${colors.textDim(`— ${action.label}`)}`);
    }
  }
  
  lines.push('');
  
  return lines;
}

export function formatNoCommandsFound(): string[] {
  return formatEmptyState({
    icon: getIcons().search,
    title: 'No commands found',
    message: 'Commands you run will appear here after setup.',
    actions: [
      { label: 'Initialize Recall', command: 'recall init' },
      { label: 'Run some commands', command: 'ls && pwd' },
      { label: 'View recent commands', command: 'recall recent' },
    ],
  });
}

export function formatNoSearchResults(query: string): string[] {
  return formatEmptyState({
    icon: getIcons().search,
    title: `No matches for "${query}"`,
    message: 'Try different search terms or use broader keywords.',
    actions: [
      { label: 'View all recent commands', command: 'recall recent' },
      { label: 'Search with partial words', command: 'recall search "dock"' },
      { label: 'View project context', command: 'recall project' },
    ],
  });
}

export function formatNoProjectContext(): string[] {
  return formatEmptyState({
    icon: getIcons().dir,
    title: 'Not in a git repository',
    message: 'Project memory works in git repos. cd into a project to see context.',
    actions: [
      { label: 'Navigate to a project', command: 'cd ~/your-project' },
      { label: 'View recent commands', command: 'recall recent' },
      { label: 'Search commands', command: 'recall search "<query>"' },
    ],
  });
}

export function formatNoHistoryImported(): string[] {
  return formatEmptyState({
    icon: getIcons().memory,
    title: 'No shell history imported',
    message: 'Import your existing shell history to see past commands.',
    actions: [
      { label: 'Initialize with history import', command: 'recall init' },
      { label: 'Run new commands', command: 'echo "hello"' },
      { label: 'View recent commands', command: 'recall recent' },
    ],
  });
}

export function formatNoToolsDetected(): string[] {
  return formatEmptyState({
    icon: getIcons().tool,
    title: 'No tools detected',
    message: 'Tool detection scans for brew, npm, and cargo packages.',
    actions: [
      { label: 'Run tool scan manually', command: 'recall init' },
      { label: 'Install tools via brew', command: 'brew install <package>' },
      { label: 'Install tools via npm', command: 'npm install -g <package>' },
    ],
  });
}
