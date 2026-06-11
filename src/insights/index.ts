/**
 * First-Run Insights — The "value bomb"
 *
 * After init imports history and scans tools, this module finds the single
 * most interesting/surprising insight to show the user — creating a "wow"
 * moment that makes the value of Recall immediately tangible.
 *
 * Insight types (prioritized):
 *   1. Tool alternative — "You have ripgrep installed but still use grep"
 *   2. Frequency anomaly — "You ran 'git status' 47 times this month"
 *   3. Forgotten tool — "You have bat installed — it replaces cat"
 *   4. Unused tool — "You installed dust 6 months ago, never used it"
 *   5. Workflow pattern — "You always run npm test after git pull"
 */

import { getTopCommands } from '../db/commands.ts';
import { getDormantTools, type Tool } from '../db/tools.ts';

// ─── Tool alternatives map ────────────────────────────────────────────────
// Maps old/classic tools to their modern alternatives, used for insight #1
interface ToolAlternative {
  oldTool: string;
  newTool: string;
  benefit: string;
}

const TOOL_ALTERNATIVES: ToolAlternative[] = [
  { oldTool: 'grep', newTool: 'ripgrep (rg)', benefit: '10x faster with better defaults' },
  { oldTool: 'find', newTool: 'fd', benefit: 'faster with friendlier syntax' },
  { oldTool: 'cat', newTool: 'bat', benefit: 'syntax highlighting + git diff' },
  { oldTool: 'du', newTool: 'dust', benefit: 'intuitive disk usage visualization' },
  { oldTool: 'top', newTool: 'btm (bottom)', benefit: 'better TUI with resource monitoring' },
  { oldTool: 'diff', newTool: 'delta', benefit: 'syntax highlighting for diffs' },
  { oldTool: 'sed', newTool: 'sd', benefit: 'simpler regex syntax' },
  { oldTool: 'curl', newTool: 'httpie (http)', benefit: 'more intuitive API requests' },
  { oldTool: 'man', newTool: 'tldr', benefit: 'practical examples, not full manuals' },
  { oldTool: 'ls', newTool: 'eza', benefit: 'color output + git integration' },
  { oldTool: 'ps', newTool: 'procs', benefit: 'human-readable process list' },
];

// ─── Insight structure ────────────────────────────────────────────────────

export interface Insight {
  /** Priority: 1 = highest (tool alternative), 5 = lowest (generic) */
  priority: number;
  /** Main insight text (single line, no wrapping needed) */
  text: string;
  /** Optional tip/suggestion */
  tip?: string;
}

// ─── Insight generators ───────────────────────────────────────────────────

/**
 * Find tool alternatives: user has a modern tool installed but still uses
 * the old one in their history.
 */
export function findToolAlternativeInsights(
  recentCommands: string[],
  dormant: Tool[],
): Insight[] {
  const results: Insight[] = [];

  for (const alt of TOOL_ALTERNATIVES) {
    // Check if user IS using the old tool (word-boundary match, not substring)
    // e.g. matches `grep foo` but not `ripgrep foo`, `ps aux` but not `docker ps`
    const usesOld = recentCommands.some(cmd =>
      cmd.split(/\s+/).some(token => token === alt.oldTool)
    );
    if (!usesOld) continue;

    // Check if the new tool is installed (in dormant tools or any scanned tool)
    const newToolKey = alt.newTool.split(/[ (]/)[0].toLowerCase();
    const hasNew = dormant.some(t => t.tool_name.toLowerCase() === newToolKey);

    if (hasNew) {
      results.push({
        priority: 1,
        text: `You have ${alt.newTool} installed but still use \`${alt.oldTool}\``,
        tip: alt.benefit,
      });
    }
  }

  return results;
}

/**
 * Find forgotten tools: tools installed long ago with zero/low usage.
 */
export function findForgottenToolInsights(dormant: Tool[]): Insight[] {
  const results: Insight[] = [];

  for (const tool of dormant.slice(0, 3)) {
    if (tool.usage_count && tool.usage_count > 0) continue; // has been used

    const installedAgo = tool.installed_at
      ? daysSince(tool.installed_at)
      : null;

    if (installedAgo !== null && installedAgo > 30) {
      results.push({
        priority: 2,
        text: `${tool.tool_name} installed ${installedAgo} days ago — never used`,
        tip: `Check it out: ${tool.tool_name} --help`,
      });
    }
  }

  return results;
}

/**
 * Find frequency anomaly: commands run unusually often.
 */
export function findFrequencyInsights(): Insight[] {
  const results: Insight[] = [];

  // Get top commands (all sources — includes imported history on first run)
  const top = getTopCommands(5);
  if (top.length === 0) return results;

  // Find the most frequent command
  const topCmd = top[0];
  if (topCmd.count >= 10) {
    results.push({
      priority: 3,
      text: `You've run \`${topCmd.normalized_command}\` ${topCmd.count} times in your history`,
      tip: topCmd.count >= 50
        ? 'Consider creating an alias'
        : undefined,
    });
  }

  return results;
}

// ─── Main insight engine ───────────────────────────────────────────────────

export function generateFirstRunInsight(): Insight | null {
  // Gather data
  const dormant = getDormantTools(1); // any tool not used recently
  const top = getTopCommands(20);
  const recentCommands = top.map(t => t.normalized_command);

  // Collect all possible insights, prioritized
  const allInsights: Insight[] = [
    ...findToolAlternativeInsights(recentCommands, dormant),
    ...findForgottenToolInsights(dormant),
    ...findFrequencyInsights(),
  ];

  if (allInsights.length === 0) return null;

  // Return the highest priority insight
  allInsights.sort((a, b) => a.priority - b.priority);
  return allInsights[0];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function daysSince(isoString: string): number {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
