import { describe, expect, test } from 'bun:test';
import { isDuplicate } from '../../src/import/normalizer.ts';

describe('isDuplicate', () => {
  test('matches within the sliding window only', () => {
    const commands = Array.from({ length: 101 }, (_, index) => `cmd-${index}`);

    expect(isDuplicate('cmd-1', commands, 100)).toBe(true);
    expect(isDuplicate('cmd-0', commands, 100)).toBe(false);
  });
});
