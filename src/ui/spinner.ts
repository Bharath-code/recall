import ora, { type Ora, type Options } from 'ora';

const isInteractive = process.stdout.isTTY && !process.env.NO_COLOR;

// Spinner presets with semantic naming and brand-compliant colors
const PRESETS: Record<string, Partial<Options>> = {
  // Core operations
  default: { spinner: 'dots', color: 'cyan' },
  processing: { spinner: 'dots', color: 'cyan' },
  
  // Search operations
  search: { spinner: 'dots', color: 'cyan' },
  indexing: { spinner: 'line', color: 'cyan' },
  
  // Import/export operations
  import: { spinner: 'line', color: 'cyan' },
  export: { spinner: 'line', color: 'cyan' },
  
  // Scanning operations
  scan: { spinner: 'dots', color: 'yellow' },
  analyze: { spinner: 'dots', color: 'yellow' },
  
  // Health/diagnostics
  doctor: { spinner: 'line', color: 'green' },
  check: { spinner: 'line', color: 'green' },
  
  // AI operations
  ai: { spinner: 'dots', color: 'magenta' },
  generate: { spinner: 'dots', color: 'magenta' },
  embed: { spinner: 'dots', color: 'magenta' },
  
  // Network operations
  fetch: { spinner: 'dots', color: 'blue' },
  download: { spinner: 'line', color: 'blue' },
  
  // Build operations
  build: { spinner: 'dots', color: 'yellow' },
  compile: { spinner: 'dots', color: 'yellow' },
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

// Helper for wrapping async operations with spinner
export async function withSpinner<T>(
  text: string,
  preset: keyof typeof PRESETS,
  fn: () => Promise<T>
): Promise<T> {
  const spinner = createSpinner(text, preset);
  spinner.start();
  
  try {
    const result = await fn();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}
