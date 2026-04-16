import { describe, test, expect } from 'bun:test';
import { normalize, shouldSkipCommand } from '../../src/import/normalizer.ts';

describe('normalize', () => {
  test('trims leading and trailing whitespace', () => {
    expect(normalize('  ls  ')).toBe('ls');
  });

  test('trims tabs and mixed whitespace', () => {
    expect(normalize('\t ls -la \t')).toBe('ls -la');
  });

  test('collapses multiple spaces to single', () => {
    expect(normalize('ls   -la')).toBe('ls -la');
  });

  test('collapses tabs and spaces', () => {
    expect(normalize('git\t\tpush   origin   main')).toBe('git push origin main');
  });

  test('expands tilde to HOME', () => {
    const home = process.env.HOME ?? '/home/test';
    expect(normalize('ls ~/foo')).toBe(`ls ${home}/foo`);
  });

  test('expands tilde at start of command', () => {
    const home = process.env.HOME ?? '/home/test';
    expect(normalize('~/scripts/deploy.sh')).toBe(`${home}/scripts/deploy.sh`);
  });

  test('does not expand tilde in middle of word', () => {
    expect(normalize('echo hello~world')).toBe('echo hello~world');
  });

  test('preserves case sensitivity', () => {
    expect(normalize('Docker')).toBe('Docker');
    expect(normalize('docker')).toBe('docker');
    expect(normalize('LS')).toBe('LS');
  });

  test('handles empty string', () => {
    expect(normalize('')).toBe('');
  });

  test('handles single command', () => {
    expect(normalize('ls')).toBe('ls');
  });

  test('handles complex command with pipes', () => {
    expect(normalize('cat file.txt | grep "hello" | wc -l')).toBe('cat file.txt | grep "hello" | wc -l');
  });

  test('preserves quoted strings', () => {
    expect(normalize('echo "hello   world"')).toBe('echo "hello   world"');
  });

  test('handles command with environment variables', () => {
    expect(normalize('NODE_ENV=production   npm   start')).toBe('NODE_ENV=production npm start');
  });
});

describe('shouldSkipCommand', () => {
  test('skips commands starting with space', () => {
    expect(shouldSkipCommand(' secret-command')).toBe(true);
  });

  test('skips empty commands', () => {
    expect(shouldSkipCommand('')).toBe(true);
    expect(shouldSkipCommand('   ')).toBe(true);
  });

  test('does not skip normal commands', () => {
    expect(shouldSkipCommand('ls')).toBe(false);
    expect(shouldSkipCommand('git push')).toBe(false);
  });

  test('skips single character commands', () => {
    expect(shouldSkipCommand('l')).toBe(true);
  });

  test('does not skip two character commands', () => {
    expect(shouldSkipCommand('ls')).toBe(false);
  });
});
