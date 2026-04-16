const ICON_SET = {
  cmd: '⚡',
  dir: '📁',
  pkg: '📦',
  search: '🔍',
  tool: '🔧',
  warn: '⚠',
  check: '✓',
  cross: '✗',
  arrow: '→',
  recent: '⊙',
  fix: '💡',
  brain: '🧠',
  replay: '🔄',
  lock: '🔒',
  streak: '🔥',
  clock: '⏱',
  tree: '├─',
  treeLast: '└─',
  treeVert: '│',
} as const;

const NOOP_ICONS = Object.fromEntries(
  Object.keys(ICON_SET).map((k) => [k, ''])
) as unknown as typeof ICON_SET;

let iconsEnabled = true;

export function setIconsEnabled(enabled: boolean): void {
  iconsEnabled = enabled;
}

export function getIcons(): typeof ICON_SET {
  if (!iconsEnabled || process.env.NO_COLOR) return NOOP_ICONS;
  return ICON_SET;
}

export type IconKey = keyof typeof ICON_SET;
