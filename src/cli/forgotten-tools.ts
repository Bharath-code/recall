/**
 * recall forgotten-tools — Surface dormant installed tools
 */

import { getDormantTools } from '../db/tools.ts';
import { colors, formatHeader, formatRelativeTime, getIcons } from '../ui/index.ts';

// Known tool alternatives — maps suboptimal tools to better alternatives
const TOOL_ALTERNATIVES: Record<string, { better: string; reason: string; alias: string }> = {
  grep: { better: 'ripgrep (rg)', reason: 'rg is 10x faster with better defaults', alias: "alias grep='rg'" },
  find: { better: 'fd', reason: 'fd is faster and has friendlier syntax', alias: "alias find='fd'" },
  ls: { better: 'eza', reason: 'eza has color output and git integration', alias: "alias ll='eza -la'" },
  cat: { better: 'bat', reason: 'bat has syntax highlighting and git diff', alias: "alias cat='bat'" },
  du: { better: 'dust', reason: 'dust shows intuitive disk usage visualization', alias: "alias du='dust'" },
  top: { better: 'btm (bottom)', reason: 'bottom has a better TUI and resource monitoring', alias: "alias top='btm'" },
  diff: { better: 'delta', reason: 'delta has syntax highlighting for diffs', alias: '' },
  sed: { better: 'sd', reason: 'sd has simpler regex syntax', alias: "alias sed='sd'" },
  curl: { better: 'httpie (http)', reason: 'httpie has more intuitive API request syntax', alias: '' },
  man: { better: 'tldr', reason: 'tldr shows practical examples instead of full manuals', alias: '' },
};

export function handleForgottenTools(): void {
  const icons = getIcons();
  const dormant = getDormantTools(30);

  console.log(formatHeader(`${icons.tool} recall forgotten-tools`));
  console.log('');

  if (dormant.length === 0) {
    console.log(`  ${icons.check} ${colors.success('All your installed tools are being used.')}`);
    console.log(colors.dim('  (or we haven\'t scanned enough commands yet)'));
    return;
  }

  console.log(colors.dim('  You have tools installed but rarely use:'));
  console.log('');

  for (const tool of dormant) {
    const installedAgo = tool.installed_at ? formatRelativeTime(tool.installed_at) : 'unknown';

    console.log(`  ┌${'─'.repeat(54)}┐`);
    console.log(`  │ ${icons.cmd} ${colors.bold(tool.tool_name.padEnd(16))} ${colors.dim(tool.source.padEnd(8))} installed ${colors.dim(installedAgo.padEnd(12))} │`);

    // Check if this tool is a better alternative to something the user IS using
    const alternative = Object.entries(TOOL_ALTERNATIVES).find(
      ([_, info]) => info.better.toLowerCase().includes(tool.tool_name.toLowerCase())
    );

    if (alternative) {
      const [oldTool, info] = alternative;
      console.log(`  │   You use '${oldTool}' instead. ${info.reason.slice(0, 38).padEnd(38)} │`);
      if (info.alias) {
        console.log(`  │   ${icons.arrow} ${colors.path(info.alias.padEnd(48))} │`);
      }
    }

    console.log(`  └${'─'.repeat(54)}┘`);
    console.log('');
  }
}
