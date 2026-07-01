import { describe, expect, test } from 'bun:test';
import { formatCdHintLines } from '../../src/hooks/cd-hint.ts';

describe('formatCdHintLines', () => {
  test('returns null when there are no recent commands', () => {
    expect(
      formatCdHintLines({
        repoName: 'recall',
        recent: [],
        startup: [],
        workflows: [],
        failed: [],
      }),
    ).toBeNull();
  });

  test('includes repo name and recent commands', () => {
    const lines = formatCdHintLines({
      repoName: 'recall',
      recent: [{ raw_command: 'bun test' }, { raw_command: 'git status' }],
      startup: [],
      workflows: [],
      failed: [],
    });

    expect(lines).not.toBeNull();
    expect(lines!.join('\n')).toContain('recall: recall');
    expect(lines!.join('\n')).toContain('bun test · git status');
  });

  test('includes startup, workflow, and failure details when present', () => {
    const lines = formatCdHintLines({
      repoName: 'api',
      recent: [{ raw_command: 'docker compose up' }],
      startup: [{ raw_command: 'bun install' }],
      workflows: [{ commands: ['git pull', 'bun test'], frequency: 4 }],
      failed: [{ raw_command: 'docker compose up', exit_code: 1 }],
    });

    expect(lines!.join('\n')).toContain('startup: bun install');
    expect(lines!.join('\n')).toContain('workflow: git pull → bun test (4x)');
    expect(lines!.join('\n')).toContain('last fail: docker compose up (exit 1)');
  });
});