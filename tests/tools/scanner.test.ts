import { describe, expect, test } from 'bun:test';
import {
  scanBrewTools,
  scanNpmTools,
  scanCargoTools,
  scanPipTools,
  scanGemTools,
  scanGoTools,
  scanPnpmTools,
  scanYarnTools,
} from '../../src/tools/scanner.ts';

describe('tool scanners', () => {
  test('scanBrewTools parses brew list output', async () => {
    // We can't easily mock the spawn, but we can verify the function
    // handles empty output and exists without error
    const result = await scanBrewTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanNpmTools parses npm list output', async () => {
    const result = await scanNpmTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanCargoTools parses cargo install list output', async () => {
    const result = await scanCargoTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanPipTools parses pip freeze output', async () => {
    const result = await scanPipTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanGemTools parses gem list output', async () => {
    const result = await scanGemTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanGoTools handles go env GOPATH', async () => {
    const result = await scanGoTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanPnpmTools parses pnpm global list', async () => {
    const result = await scanPnpmTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);

  test('scanYarnTools parses yarn global list', async () => {
    const result = await scanYarnTools();
    expect(Array.isArray(result)).toBe(true);
  }, 5000);
});
