import { describe, expect, test } from 'bun:test';
import { patternMatchesCommand } from '../../src/config/index.ts';

describe('ignore pattern matching', () => {
  test('matches plain substrings', () => {
    expect(patternMatchesCommand('secret', 'echo secret-token')).toBe(true);
    expect(patternMatchesCommand('deploy', 'echo hello')).toBe(false);
  });

  test('supports simple wildcard patterns', () => {
    expect(patternMatchesCommand('aws*secret', 'aws configure --secret value')).toBe(true);
    expect(patternMatchesCommand('aws*secret', 'aws configure')).toBe(false);
  });
});
