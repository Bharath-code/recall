import { describe, test, expect } from 'bun:test';
import { parseZshHistory, parseBashHistory } from '../../src/import/history-parser.ts';

describe('parseZshHistory', () => {
  test('parses extended format ": timestamp:0;command"', () => {
    const content = ': 1700000000:0;ls -la\n: 1700000100:0;git status\n';
    const result = parseZshHistory(content);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('ls -la');
    expect(result[0].timestamp).toBe(1700000000);
    expect(result[1].command).toBe('git status');
  });

  test('handles commands with semicolons', () => {
    const content = ': 1700000000:0;echo "hello;world"\n';
    const result = parseZshHistory(content);

    expect(result).toHaveLength(1);
    expect(result[0].command).toBe('echo "hello;world"');
  });

  test('handles multiline commands with backslash continuation', () => {
    const content = ': 1700000000:0;docker run \\\n  -p 3000:3000 \\\n  myapp\n: 1700000100:0;ls\n';
    const result = parseZshHistory(content);

    expect(result).toHaveLength(2);
    expect(result[0].command).toContain('docker run');
  });

  test('handles plain format (no timestamps)', () => {
    const content = 'ls -la\ngit status\nnpm install\n';
    const result = parseZshHistory(content);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe('ls -la');
    expect(result[0].timestamp).toBeNull();
  });

  test('skips empty lines', () => {
    const content = 'ls\n\n\ngit status\n';
    const result = parseZshHistory(content);

    expect(result).toHaveLength(2);
  });

  test('handles empty input', () => {
    expect(parseZshHistory('')).toHaveLength(0);
  });
});

describe('parseBashHistory', () => {
  test('parses simple format (one command per line)', () => {
    const content = 'ls -la\ngit status\nnpm install\n';
    const result = parseBashHistory(content);

    expect(result).toHaveLength(3);
    expect(result[0].command).toBe('ls -la');
  });

  test('parses timestamped format (#timestamp + command)', () => {
    const content = '#1700000000\nls -la\n#1700000100\ngit status\n';
    const result = parseBashHistory(content);

    expect(result).toHaveLength(2);
    expect(result[0].command).toBe('ls -la');
    expect(result[0].timestamp).toBe(1700000000);
  });

  test('skips empty lines', () => {
    const content = 'ls\n\ngit status\n';
    const result = parseBashHistory(content);

    expect(result).toHaveLength(2);
  });

  test('handles empty input', () => {
    expect(parseBashHistory('')).toHaveLength(0);
  });
});
