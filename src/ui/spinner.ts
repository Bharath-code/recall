import ora, { type Ora, type Options } from 'ora';

const isInteractive = process.stdout.isTTY && !process.env.NO_COLOR;

const PRESETS: Record<string, Partial<Options>> = {
  search: { spinner: 'dots', color: 'cyan' },
  import: { spinner: 'line', color: 'cyan' },
  scan: { spinner: 'dots', color: 'yellow' },
  doctor: { spinner: 'line', color: 'green' },
  ai: { spinner: 'dots', color: 'magenta' },
  default: { spinner: 'dots', color: 'cyan' },
} as const;

export function createSpinner(
  text: string,
  preset: keyof typeof PRESETS = 'default'
): Ora {
  const config = PRESETS[preset] ?? PRESETS.default;
  return ora({
    text,
    isEnabled: isInteractive,
    ...config,
  });
}
