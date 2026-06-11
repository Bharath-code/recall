import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { setDb, closeDb, createTestDb } from '../../src/db/index.ts';
import { insertCommand } from '../../src/db/commands.ts';
import { batchUpsertTools, type Tool } from '../../src/db/tools.ts';
import {
  findToolAlternativeInsights,
  findForgottenToolInsights,
  findFrequencyInsights,
  generateFirstRunInsight,
} from '../../src/insights/index.ts';

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Create a fake Tool for testing the pure functions */
function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 1,
    tool_name: 'test-tool',
    source: 'brew',
    installed_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    last_used_at: null,
    usage_count: 0,
    ...overrides,
  };
}

/** Seed an in-memory DB with the given commands and tools */
function seedDb(commands: { normalized: string; count: number }[], tools: { tool_name: string; source: Tool['source'] }[]) {
  setDb(createTestDb());

  for (const cmd of commands) {
    for (let i = 0; i < cmd.count; i++) {
      insertCommand({
        raw_command: cmd.normalized,
        normalized_command: cmd.normalized,
        cwd: '/tmp',
        shell: 'zsh',
      });
    }
  }

  batchUpsertTools(tools);
}

// ───────────────────────────────────────────────────────────────────────────
// findToolAlternativeInsights
// ───────────────────────────────────────────────────────────────────────────

describe('findToolAlternativeInsights', () => {
  const dormant: Tool[] = [
    makeTool({ tool_name: 'ripgrep' }),
    makeTool({ tool_name: 'fd' }),
    makeTool({ tool_name: 'bat' }),
    makeTool({ tool_name: 'procs' }),
    makeTool({ tool_name: 'eza' }),
  ];

  test('matches old tool on word boundary, not substring', () => {
    // 'grep' should NOT match 'ripgrep' (substring of first token)
    const result = findToolAlternativeInsights(
      ['ripgrep foo'],
      [makeTool({ tool_name: 'ripgrep' })],
    );
    expect(result).toHaveLength(0);
  });

  test('matches old tool when it is a standalone token', () => {
    // 'grep' in 'grep foo' → token-level match
    const result = findToolAlternativeInsights(
      ['grep foo'],
      [makeTool({ tool_name: 'ripgrep' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(1);
    expect(result[0].text).toContain('ripgrep');
    expect(result[0].text).toContain('grep');
    expect(result[0].tip).toBeTruthy();
  });

  test('ps does not match psql (substring of first token)', () => {
    const result = findToolAlternativeInsights(
      ['psql -U postgres'],
      [makeTool({ tool_name: 'procs' })],
    );
    expect(result).toHaveLength(0);
  });

  test('ps matches ps aux (standalone first token)', () => {
    const result = findToolAlternativeInsights(
      ['ps aux'],
      [makeTool({ tool_name: 'procs' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('procs');
  });

  test('ps matches docker ps (standalone non-first token)', () => {
    // docker ps → tokens ['docker', 'ps'] → 'ps' is a standalone token
    const result = findToolAlternativeInsights(
      ['docker ps'],
      [makeTool({ tool_name: 'procs' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('procs');
  });

  test('returns nothing when old tool not in history', () => {
    const result = findToolAlternativeInsights(
      ['npm start'],
      dormant,
    );
    expect(result).toHaveLength(0);
  });

  test('returns nothing when new tool not in dormant list', () => {
    const result = findToolAlternativeInsights(
      ['grep foo'],
      [], // no dormant tools
    );
    expect(result).toHaveLength(0);
  });

  test('returns nothing when dormant list is empty', () => {
    const result = findToolAlternativeInsights(
      ['grep foo', 'find .', 'cat file'],
      [],
    );
    expect(result).toHaveLength(0);
  });

  test('matches multiple alternatives when both old tools used and new tools installed', () => {
    const result = findToolAlternativeInsights(
      ['grep foo', 'find .', 'cat file'],
      [
        makeTool({ tool_name: 'ripgrep' }),
        makeTool({ tool_name: 'fd' }),
        makeTool({ tool_name: 'bat' }),
      ],
    );

    // All three should match: grep→ripgrep, find→fd, cat→bat
    expect(result).toHaveLength(3);
    const texts = result.map(r => r.text);
    expect(texts.some(t => t.includes('ripgrep'))).toBe(true);
    expect(texts.some(t => t.includes('fd'))).toBe(true);
    expect(texts.some(t => t.includes('bat'))).toBe(true);
  });

  test('handles newTool name with parenthetical alias (ripgrep (rg))', () => {
    const result = findToolAlternativeInsights(
      ['grep foo'],
      [makeTool({ tool_name: 'ripgrep' })],
    );
    // The key is extracted as 'ripgrep' (before space/paren)
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('ripgrep (rg)');
  });

  test('matches commands with flags and arguments', () => {
    const result = findToolAlternativeInsights(
      ['grep -r "foo" --include="*.ts" .'],
      [makeTool({ tool_name: 'ripgrep' })],
    );
    expect(result).toHaveLength(1);
  });

  test('matches diff in git diff (subcommand position)', () => {
    const result = findToolAlternativeInsights(
      ['git diff --staged'],
      [makeTool({ tool_name: 'delta' })],
    );
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('delta');
  });

  test('all 11 alternatives are reachable', () => {
    const allOldTools = ['grep', 'find', 'cat', 'du', 'top', 'diff', 'sed', 'curl', 'man', 'ls', 'ps'];
    const allNewTools = ['ripgrep', 'fd', 'bat', 'dust', 'btm', 'delta', 'sd', 'httpie', 'tldr', 'eza', 'procs'];

    const commands = allOldTools.map(t => `${t} foo`);
    const dormant = allNewTools.map(name => makeTool({ tool_name: name }));

    const result = findToolAlternativeInsights(commands, dormant);
    expect(result).toHaveLength(11);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// findForgottenToolInsights
// ───────────────────────────────────────────────────────────────────────────

describe('findForgottenToolInsights', () => {
  test('flags tool installed >30 days ago with 0 usage', () => {
    const tools: Tool[] = [
      makeTool({
        tool_name: 'dust',
        installed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        usage_count: 0,
      }),
    ];
    const result = findForgottenToolInsights(tools);
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(2);
    expect(result[0].text).toContain('dust');
    expect(result[0].text).toContain('60 days ago');
    expect(result[0].tip).toContain('dust --help');
  });

  test('does not flag tool with usage_count > 0', () => {
    const tools: Tool[] = [
      makeTool({
        tool_name: 'bat',
        installed_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        usage_count: 3,
      }),
    ];
    const result = findForgottenToolInsights(tools);
    expect(result).toHaveLength(0);
  });

  test('does not flag recently installed tool (<30 days)', () => {
    const tools: Tool[] = [
      makeTool({
        tool_name: 'fd',
        installed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        usage_count: 0,
      }),
    ];
    const result = findForgottenToolInsights(tools);
    expect(result).toHaveLength(0);
  });

  test('limits results to 3', () => {
    const tools: Tool[] = Array.from({ length: 5 }, (_, i) =>
      makeTool({
        tool_name: `tool-${i}`,
        installed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        usage_count: 0,
      }),
    );
    const result = findForgottenToolInsights(tools);
    expect(result).toHaveLength(3);
  });

  test('returns empty array when no tools are dormant', () => {
    const result = findForgottenToolInsights([]);
    expect(result).toHaveLength(0);
  });

  test('handles tool with missing installed_at gracefully', () => {
    const tools: Tool[] = [
      makeTool({
        tool_name: 'gh',
        installed_at: '', // empty string, daysSince will compute NaN
        usage_count: 0,
      }),
    ];
    // Should not throw and should not return a result (NaN > 30 is false)
    const result = findForgottenToolInsights(tools);
    expect(result).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// findFrequencyInsights  (DB-backed)
// ───────────────────────────────────────────────────────────────────────────

describe('findFrequencyInsights', () => {
  beforeEach(() => {
    setDb(createTestDb());
  });

  afterEach(() => {
    closeDb();
  });

  test('returns insight when top command count >= 10', () => {
    for (let i = 0; i < 10; i++) {
      insertCommand({
        raw_command: 'git status',
        normalized_command: 'git status',
        cwd: '/tmp',
        shell: 'zsh',
      });
    }

    const result = findFrequencyInsights();
    expect(result).toHaveLength(1);
    expect(result[0].priority).toBe(3);
    expect(result[0].text).toContain('git status');
    expect(result[0].text).toContain('10 times');
  });

  test('includes alias tip when count >= 50', () => {
    for (let i = 0; i < 50; i++) {
      insertCommand({
        raw_command: 'docker ps',
        normalized_command: 'docker ps',
        cwd: '/tmp',
        shell: 'zsh',
      });
    }

    const result = findFrequencyInsights();
    expect(result).toHaveLength(1);
    expect(result[0].tip).toBe('Consider creating an alias');
  });

  test('does not include alias tip when count < 50', () => {
    for (let i = 0; i < 15; i++) {
      insertCommand({
        raw_command: 'ls',
        normalized_command: 'ls',
        cwd: '/tmp',
        shell: 'zsh',
      });
    }

    const result = findFrequencyInsights();
    expect(result).toHaveLength(1);
    expect(result[0].tip).toBeUndefined();
  });

  test('returns empty when top command count < 10', () => {
    insertCommand({
      raw_command: 'ls',
      normalized_command: 'ls',
      cwd: '/tmp',
      shell: 'zsh',
    });

    const result = findFrequencyInsights();
    expect(result).toHaveLength(0);
  });

  test('returns empty when no commands exist', () => {
    const result = findFrequencyInsights();
    expect(result).toHaveLength(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// generateFirstRunInsight  (end-to-end, DB-backed)
// ───────────────────────────────────────────────────────────────────────────

describe('generateFirstRunInsight', () => {
  afterEach(() => {
    closeDb();
  });

  test('returns null when no data exists', () => {
    setDb(createTestDb());
    const result = generateFirstRunInsight();
    expect(result).toBeNull();
  });

  test('returns tool alternative (priority 1) when available', () => {
    seedDb(
      [{ normalized: 'grep foo', count: 3 }],
      [{ tool_name: 'ripgrep', source: 'cargo' }],
    );

    const result = generateFirstRunInsight();
    expect(result).not.toBeNull();
    expect(result!.priority).toBe(1);
    expect(result!.text).toContain('ripgrep');
    expect(result!.text).toContain('grep');
  });

  test('returns null when no insight type matches', () => {
    // Insert a command that doesn't match any old tool
    seedDb(
      [{ normalized: 'npm start', count: 1 }],
      [
        {
          tool_name: 'dust',
          source: 'cargo',
        },
      ],
    );

    // The tool was just inserted (now) so daysSince < 30 → no forgotten insight
    // So we should get null unless the tool's installed_at is old enough
    // But batchUpsertTools uses DEFAULT installed_at which is NOW
    // So findForgottenToolInsights won't match it
    // Let's test that it falls through to frequency or null
    const result = generateFirstRunInsight();
    // npm start count is 1 < 10, tool is new → null
    expect(result).toBeNull();
  });

  test('falls back to frequency anomaly (priority 3) when no tool alternative or forgotten tool', () => {
    seedDb(
      [{ normalized: 'git status', count: 15 }],
      [{ tool_name: 'ripgrep', source: 'cargo' }], // not dormant, just installed
    );

    const result = generateFirstRunInsight();
    // grep isn't in history, so no tool alternative
    // ripgrep was just installed, so no forgotten tool
    // git status count = 15 >= 10 → frequency anomaly
    expect(result).not.toBeNull();
    expect(result!.priority).toBe(3);
    expect(result!.text).toContain('git status');
    expect(result!.text).toContain('15 times');
  });

  test('returns the highest priority insight when multiple are available', () => {
    // seed with grep in history AND ripgrep dormant (generates priority 1)
    // AND high-frequency command (priority 3)
    seedDb(
      [
        { normalized: 'grep error', count: 20 },
        { normalized: 'git status', count: 15 },
      ],
      [{ tool_name: 'ripgrep', source: 'cargo' }],
    );

    const result = generateFirstRunInsight();
    expect(result).not.toBeNull();
    // Priority 1 (tool alternative) should win over priority 3 (frequency)
    expect(result!.priority).toBe(1);
    expect(result!.text).toContain('ripgrep');
  });
});
