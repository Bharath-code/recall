import pc from 'picocolors';

const isColorEnabled = !process.env.NO_COLOR && process.stdout.isTTY;

function wrap(fn: (s: string) => string): (s: string) => string {
  return isColorEnabled ? fn : (s: string) => s;
}

export const colors = {
  path: wrap(pc.cyan),
  success: wrap(pc.green),
  warning: wrap(pc.yellow),
  error: wrap(pc.red),
  dim: wrap(pc.dim),
  bold: wrap(pc.bold),
  info: wrap(pc.blue),
  highlight: wrap(pc.magenta),
} as const;
