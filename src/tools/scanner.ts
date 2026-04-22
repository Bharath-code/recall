/**
 * Tool Scanner — brew/npm/cargo inventory
 */

export interface ScannedTool {
  tool_name: string;
  source: 'brew' | 'npm' | 'cargo' | 'pip' | 'gem' | 'go' | 'pnpm' | 'yarn';
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

export async function scanPipTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['pip', 'list', '--format=freeze']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    const name = line.split('==')[0]?.trim() ?? '';
    if (name) results.push({ tool_name: name, source: 'pip' });
  }
  return results;
}

export async function scanGemTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['gem', 'list']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    if (!line.trim() || line.startsWith(' ')) continue;
    const match = line.match(/^([a-zA-Z0-9_-]+)\s*\(/);
    if (match) {
      results.push({ tool_name: match[1], source: 'gem' });
    }
  }
  return results;
}

export async function scanGoTools(): Promise<ScannedTool[]> {
  const gopath = await runCommand(['go', 'env', 'GOPATH']);
  if (!gopath) return [];

  const binDir = gopath.trim() + '/bin';
  const output = await runCommand(['ls', binDir]);
  if (!output) return [];

  return output.trim().split('\n')
    .filter(line => line.trim() && !line.includes(' '))
    .map(name => ({ tool_name: name.trim(), source: 'go' as const }));
}

export async function scanPnpmTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['pnpm', 'list', '-g', '--depth=0']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('Legend:') || trimmed.includes('node_modules')) continue;
    const match = trimmed.match(/^([@a-zA-Z0-9_/-]+)\s+[\d@]/);
    if (match) {
      results.push({ tool_name: match[1], source: 'pnpm' });
    }
  }
  return results;
}

export async function scanYarnTools(): Promise<ScannedTool[]> {
  const output = await runCommand(['yarn', 'global', 'list']);
  if (!output) return [];

  const results: ScannedTool[] = [];
  for (const line of output.trim().split('\n')) {
    const match = line.match(/info\s+"([^@]+)@/);
    if (match) {
      results.push({ tool_name: match[1], source: 'yarn' });
    }
  }
  return results;
}

export async function scanAllTools(): Promise<ScannedTool[]> {
  const [brew, npm, cargo, pip, gem, go, pnpm, yarn] = await Promise.all([
    scanBrewTools(),
    scanNpmTools(),
    scanCargoTools(),
    scanPipTools(),
    scanGemTools(),
    scanGoTools(),
    scanPnpmTools(),
    scanYarnTools(),
  ]);

  return [...brew, ...npm, ...cargo, ...pip, ...gem, ...go, ...pnpm, ...yarn];
}
