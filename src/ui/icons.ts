// Icon set using UTF-8 glyphs (Nerd Font compatible)
// Visual anchors, not decoration
// One icon per semantic meaning

const ICON_SET = {
  // Core actions
  cmd: '⚡',
  run: '▶',
  exec: '⦿',
  
  // Navigation & paths
  dir: '📁',
  file: '📄',
  home: '⌂',
  arrow: '→',
  back: '←',
  
  // Search & discovery
  search: '🔍',
  filter: '⏎',
  recent: '⊙',
  
  // Status indicators
  check: '✓',
  cross: '✗',
  warn: '⚠',
  info: 'ℹ',
  question: '?',
  
  // Tools & utilities
  tool: '🔧',
  pkg: '📦',
  fix: '💡',
  settings: '⚙',
  
  // Memory & intelligence
  brain: '🧠',
  memory: '💾',
  replay: '🔄',
  
  // Security & privacy
  lock: '🔒',
  unlock: '🔓',
  shield: '�',
  
  // Time & performance
  clock: '⏱',
  streak: '🔥',
  speed: '⚡',
  
  // Data & structure
  tree: '├─',
  treeLast: '└─',
  treeVert: '│',
  list: '•',
  
  // Projects & repos
  repo: '📂',
  branch: '⑂',
  commit: '⌥',
  
  // Success states
  success: '✓',
  done: '✔',
  complete: '◉',
  
  // Error states
  error: '✗',
  fail: '✕',
  critical: '⛔',
  
  // Progress states
  pending: '⏳',
  loading: '◐',
  processing: '◑',
} as const;

// ASCII fallback icons for terminals without emoji support
const ASCII_ICONS = {
  cmd: '>',
  run: '>',
  exec: 'o',
  dir: '/',
  file: '-',
  home: '~',
  arrow: '->',
  back: '<-',
  search: '?',
  filter: 'F',
  recent: 'o',
  check: '[x]',
  cross: '[ ]',
  warn: '!',
  info: 'i',
  question: '?',
  tool: '#',
  pkg: '[+]',
  fix: '*',
  settings: '=',
  brain: '[M]',
  memory: '[S]',
  replay: '<<',
  lock: '[L]',
  unlock: '[ ]',
  shield: '[P]',
  clock: '@',
  streak: '*',
  speed: '>>',
  tree: '|-',
  treeLast: '`-',
  treeVert: '|',
  list: '-',
  repo: '[R]',
  branch: '+',
  commit: '*',
  success: '[x]',
  done: '[x]',
  complete: '(x)',
  error: '[x]',
  fail: '[ ]',
  critical: '[X]',
  pending: '...',
  loading: '...',
  processing: '...',
} as const;

// No-op icons for when icons are disabled
const NOOP_ICONS = Object.fromEntries(
  Object.keys(ICON_SET).map((k) => [k, ''])
) as unknown as typeof ICON_SET;

let iconsEnabled = true;
let useAsciiFallback = false;

export function setIconsEnabled(enabled: boolean): void {
  iconsEnabled = enabled;
}

export function setAsciiFallback(enabled: boolean): void {
  useAsciiFallback = enabled;
}

export function getIcons(): typeof ICON_SET {
  if (!iconsEnabled || process.env.NO_COLOR) return NOOP_ICONS;
  if (useAsciiFallback) return ASCII_ICONS as unknown as typeof ICON_SET;
  return ICON_SET;
}

export type IconKey = keyof typeof ICON_SET;
