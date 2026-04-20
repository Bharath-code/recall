import { describe, expect, test } from 'bun:test';
import { detectCommonWorkflows, detectStartupSequence } from '../../src/workflows/detector.ts';

describe('workflow detector', () => {
  test('detectCommonWorkflows returns array for valid input', () => {
    const workflows = detectCommonWorkflows('test-repo-hash', 5);
    expect(workflows).toBeInstanceOf(Array);
    expect(Array.isArray(workflows)).toBe(true);
  });

  test('detectCommonWorkflows handles empty repo hash gracefully', () => {
    const workflows = detectCommonWorkflows('', 5);
    expect(workflows).toBeInstanceOf(Array);
    expect(Array.isArray(workflows)).toBe(true);
  });

  test('detectCommonWorkflows respects limit parameter', () => {
    const workflows = detectCommonWorkflows('test-repo-hash', 3);
    expect(workflows.length).toBeLessThanOrEqual(3);
  });

  test('detectStartupSequence returns null or workflow for valid input', () => {
    const result = detectStartupSequence('test-repo-hash', 2, 6);
    expect(result === null || typeof result === 'object').toBe(true);
  });

  test('detectStartupSequence handles empty repo hash gracefully', () => {
    const result = detectStartupSequence('', 2, 6);
    expect(result === null || typeof result === 'object').toBe(true);
  });
});
