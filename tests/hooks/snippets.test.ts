import { describe, expect, test } from 'bun:test';
import { generateBashSnippet } from '../../src/hooks/bash-snippet.ts';
import { generateZshSnippet } from '../../src/hooks/zsh-snippet.ts';

describe('shell snippets', () => {
  test('zsh snippet captures start and updates finish metadata', () => {
    const snippet = generateZshSnippet();

    expect(snippet).toContain('recall hook capture');
    expect(snippet).toContain('recall hook update');
    expect(snippet).toContain('add-zsh-hook preexec _recall_preexec');
    expect(snippet).toContain('add-zsh-hook precmd _recall_precmd');
    expect(snippet).toContain('recall hook cd');
    expect(snippet).toContain('add-zsh-hook chpwd _recall_chpwd');
  });

  test('bash snippet uses one consistent session id variable', () => {
    const snippet = generateBashSnippet();

    expect(snippet).toContain('_RECALL_SESSION_ID=');
    expect(snippet).toContain('--session-id "$_RECALL_SESSION_ID"');
    expect(snippet).not.toContain('_recall_session_id=');
    expect(snippet).toContain('recall hook cd');
    expect(snippet).toContain('cd() {');
  });
});
