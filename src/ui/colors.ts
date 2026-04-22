import pc from 'picocolors';

const isColorEnabled = !process.env.NO_COLOR && process.stdout.isTTY;

function wrap(fn: (s: string) => string): (s: string) => string {
  return isColorEnabled ? fn : (s: string) => s;
}

// Brand-compliant color palette (approximated to picocolors)
// Cyan: #00d9ff → pc.cyan
// Mint: #00ff9f → pc.green (bright)
// Ember: #ff6b6b → pc.red (bright)
// Dust: #8892b0 → pc.gray
// Cloud: #e6e6e6 → pc.white (dim)
// Ink: #1a1a2e → pc.bgBlack
// Slate: #16213e → pc.bgBlue (dark)

export const colors = {
  // Semantic colors
  primary: wrap(pc.cyan),
  success: wrap(pc.green),
  warning: wrap(pc.yellow),
  error: wrap(pc.red),
  info: wrap(pc.blue),
  muted: wrap(pc.gray),
  
  // Text colors
  text: wrap(pc.white),
  textDim: wrap(pc.dim),
  textSecondary: wrap(pc.gray),
  
  // Background colors
  bgPrimary: wrap(pc.bgBlack),
  bgSecondary: wrap(pc.bgBlue),
  bgHighlight: wrap(pc.bgCyan),
  
  // Accent colors
  accent: wrap(pc.cyan),
  accentMuted: (s: string) => wrap(pc.dim)(pc.cyan(s)),
  highlight: wrap(pc.magenta),
  
  // Utility colors
  dim: wrap(pc.dim),
  bold: wrap(pc.bold),
  italic: wrap(pc.italic),
  underline: wrap(pc.underline),
  strikethrough: wrap(pc.strikethrough),
  
  // Specific semantic mappings
  path: wrap(pc.cyan),
  command: wrap(pc.white),
  keyword: wrap(pc.magenta),
  value: wrap(pc.green),
  meta: wrap(pc.gray),
  
  // Status colors
  passed: wrap(pc.green),
  failed: wrap(pc.red),
  skipped: wrap(pc.yellow),
  pending: wrap(pc.cyan),
} as const;
