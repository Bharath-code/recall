/**
 * Tool Scanner — brew/npm/cargo inventory
 */

export interface ScannedTool {
  tool_name: string;
  source: 'brew' | 'npm' | 'cargo';
}

async function runCommand(cmd: string[]): Promise<string> {
  try {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    return exitCode === 0 ? output : '';
  } catch {
    return '';
  }
}

export async function scanBrewTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['brew', 'list', '--formula']);
  if (!output) return [];

  return output.trim().split('\n')
    .filter(line => line.trim())
    .map(name => ({ tool_name: name.trim(), source: 'brew' as const }));
}

export async function scanNpmTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['npm', 'list', '-g', '--depth=0', '--parseable']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim() || line.includes('node_modules/.package-lock')) continue;
    const name = line.split('/').pop() ?? '';
    if (name) results.push({ tool_name: name, source: 'npm' });
  }
  return results;
}

export async function scanCargoTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['cargo', 'install', '--list']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim() || line.startsWith(' ')) continue;
    const name = line.split(' ')[0]?.replace(/:$/, '') ?? '';
    if (name) results.push({ tool_name: name, source: 'cargo' });
  }
  return results;
}

export async function scanAllTools(): Promise<ScannedTool[]> {
  const [brew, npm, cargo] = await Promise.all([
    scanBrewTools(),
    scanNpmTools(),
    scanCargoTools(),
  ]);

  return [...brew, ...npm, ...cargo];
}
