import { describe, expect, test } from 'bun:test';
import {
  getCommandsByRepo,
  getSessionsByRepo,
  getStartupCommands,
  getSuccessfulCommandsByRepo,
  getFailedCommandsByRepo,
  getAllCommands,
  getCommandById,
  deleteCommandById,
} from '../../src/db/commands.ts';

describe('database commands - enhanced functions', () => {
  test('getCommandsByRepo returns array for any input', () => {
    const commands = getCommandsByRepo('test-hash', 10);
    expect(commands).toBeInstanceOf(Array);
    expect(Array.isArray(commands)).toBe(true);
  });

  test('getSessionsByRepo returns array for any input', () => {
    const sessions = getSessionsByRepo('test-hash');
    expect(sessions).toBeInstanceOf(Array);
    expect(Array.isArray(sessions)).toBe(true);
  });

  test('getStartupCommands returns array for any input', () => {
    const commands = getStartupCommands('test-hash', 5);
    expect(commands).toBeInstanceOf(Array);
    expect(Array.isArray(commands)).toBe(true);
  });

  test('getSuccessfulCommandsByRepo returns array for any input', () => {
    const commands = getSuccessfulCommandsByRepo('test-hash', 10);
    expect(commands).toBeInstanceOf(Array);
    expect(Array.isArray(commands)).toBe(true);
  });

  test('getFailedCommandsByRepo returns array for any input', () => {
    const commands = getFailedCommandsByRepo('test-hash', 10);
    expect(commands).toBeInstanceOf(Array);
    expect(Array.isArray(commands)).toBe(true);
  });

  test('getAllCommands returns array', () => {
    const commands = getAllCommands();
    expect(commands).toBeInstanceOf(Array);
    expect(Array.isArray(commands)).toBe(true);
  });

  test('getCommandById returns null for non-existent command', () => {
    const command = getCommandById(999999);
    expect(command).toBeNull();
  });

  test('deleteCommandById returns false for non-existent command', () => {
    const result = deleteCommandById(999999);
    expect(result).toBe(false);
  });
});
