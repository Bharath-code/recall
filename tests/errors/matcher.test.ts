/**
 * Tests for the Error→Fix Matcher
 *
 * Coverage:
 * - hashCommandSignature (pure): path stripping, flag stripping, package stripping, consistency
 * - deriveErrorSignature (pure): stderr vs command fallback
 * - autoRecordError (DB): with/without stderr, idempotent upsert
 * - autoDetectFix (DB): full fix detection lifecycle, confidence boost, edge cases
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { setDb, closeDb, createTestDb } from '../../src/db/index.ts';
import { insertCommand } from '../../src/db/commands.ts';
import {
  hashCommandSignature,
  deriveErrorSignature,
  autoRecordError,
  autoDetectFix,
  hashErrorSignature,
} from '../../src/errors/matcher.ts';
import {
  getErrorCount,
  getFixedErrorCount,
  getRecentErrors,
  findFix,
} from '../../src/db/errors.ts';

// ───────────────────────────────────────────────────────────────────────────
// hashCommandSignature (pure — no DB needed)
// ───────────────────────────────────────────────────────────────────────────

describe('hashCommandSignature', () => {
  test('produces stable output for the same input', () => {
    const a = hashCommandSignature('npm install', 1);
    const b = hashCommandSignature('npm install', 1);
    expect(a).toBe(b);
  });

  test('different exit codes produce different signatures', () => {
    const a = hashCommandSignature('npm install', 1);
    const b = hashCommandSignature('npm install', 2);
    expect(a).not.toBe(b);
  });

  test('different commands produce different signatures', () => {
    const a = hashCommandSignature('npm install', 1);
    const b = hashCommandSignature('tsc --noEmit', 2);
    expect(a).not.toBe(b);
  });

  test('strips absolute paths from command', () => {
    const withPath = hashCommandSignature('cat /var/log/syslog', 1);
    const noPath = hashCommandSignature('cat <PATH>', 1);
    expect(withPath).toBe(noPath);
  });

  test('strips flags with values', () => {
    const withFlag = hashCommandSignature('grep --include "*.ts" foo', 1);
    const bare = hashCommandSignature('grep <FLAG> foo', 1);
    expect(withFlag).toBe(bare);
  });

  test('strips package names from npm install', () => {
    const withPkg = hashCommandSignature('npm install express', 1);
    const bare = hashCommandSignature('npm install <PACKAGE>', 1);
    expect(withPkg).toBe(bare);
  });

  test('strips package names from cargo add', () => {
    const withPkg = hashCommandSignature('cargo add serde', 1);
    const bare = hashCommandSignature('cargo add <PACKAGE>', 1);
    expect(withPkg).toBe(bare);
  });

  test('strips version numbers', () => {
    const withVer = hashCommandSignature('npm install react@18.2.0', 1);
    const bare = hashCommandSignature('npm install react@<VER>', 1);
    expect(withVer).toBe(bare);
  });

  test('handles empty command gracefully', () => {
    const result = hashCommandSignature('', 1);
    expect(result).toBeTruthy();
    expect(result.length).toBe(32);
  });

  test('matches same failure across different absolute file paths', () => {
    const a = hashCommandSignature('tsc /Users/alice/proj/src/app.ts /Users/alice/proj/src/utils.ts', 2);
    const b = hashCommandSignature('tsc /Users/bob/proj/lib/main.ts /Users/bob/proj/lib/helper.ts', 2);
    expect(a).toBe(b);
  });

  test('returns a 32-char hex string', () => {
    const result = hashCommandSignature('git merge main', 128);
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// deriveErrorSignature (pure — no DB needed)
// ───────────────────────────────────────────────────────────────────────────

describe('deriveErrorSignature', () => {
  test('uses stderr when available', () => {
    const stderrSig = hashErrorSignature('Error: something broke');
    const result = deriveErrorSignature('Error: something broke', 'npm install', 1);
    expect(result).toBe(stderrSig);
  });

  test('falls back to command signature when stderr is null', () => {
    const cmdSig = hashCommandSignature('npm install', 1);
    const result = deriveErrorSignature(null, 'npm install', 1);
    expect(result).toBe(cmdSig);
  });

  test('falls back to command signature when stderr is undefined', () => {
    const cmdSig = hashCommandSignature('npm install', 1);
    const result = deriveErrorSignature(undefined, 'npm install', 1);
    expect(result).toBe(cmdSig);
  });

  test('falls back to command signature when stderr is empty string', () => {
    const cmdSig = hashCommandSignature('npm install', 1);
    const result = deriveErrorSignature('', 'npm install', 1);
    expect(result).toBe(cmdSig);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// autoRecordError (DB-backed)
// ───────────────────────────────────────────────────────────────────────────

describe('autoRecordError', () => {
  let cmdId: number;

  beforeEach(() => {
    setDb(createTestDb());
    cmdId = insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
    });
  });

  afterEach(() => {
    closeDb();
  });

  test('records an error with stderr available', () => {
    autoRecordError(cmdId, 'npm ERR! code E404', 'npm install', 1);

    expect(getErrorCount()).toBe(1);
    const errors = getRecentErrors(10);
    expect(errors[0].command_id).toBe(cmdId);
    expect(errors[0].error_message).toContain('npm ERR');
    expect(errors[0].occurrences).toBe(1);
  });

  test('records an error without stderr (command fallback)', () => {
    autoRecordError(cmdId, null, 'npm install', 1);

    expect(getErrorCount()).toBe(1);
    const errors = getRecentErrors(10);
    expect(errors[0].command_id).toBe(cmdId);
    expect(errors[0].error_message).toContain('Failed: npm install');
    expect(errors[0].error_message).toContain('(exit 1)');
  });

  test('upserts on repeated error — increments occurrences', () => {
    autoRecordError(cmdId, 'npm ERR! code E404', 'npm install', 1);

    const cmdId2 = insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
    });
    autoRecordError(cmdId2, 'npm ERR! code E404', 'npm install', 1);

    expect(getErrorCount()).toBe(1);
    const errors = getRecentErrors(10);
    expect(errors[0].occurrences).toBe(2);
  });

  test('never throws — wrapped in try/catch', () => {
    expect(() => {
      autoRecordError(999999, 'some error', 'fake cmd', 1);
    }).not.toThrow();
  });

  test('records separate signatures for different stderr', () => {
    autoRecordError(cmdId, 'npm ERR! code E404', 'npm install', 1);

    const cmdId2 = insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
    });
    autoRecordError(cmdId2, 'npm ERR! code ENOTFOUND', 'npm install', 1);

    expect(getErrorCount()).toBe(2);
  });

  test('records separate signatures for different commands (no stderr)', () => {
    autoRecordError(cmdId, null, 'npm install', 1);

    const cmdId2 = insertCommand({
      raw_command: 'tsc --noEmit',
      normalized_command: 'tsc --noEmit',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 2,
    });
    autoRecordError(cmdId2, null, 'tsc --noEmit', 2);

    expect(getErrorCount()).toBe(2);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// autoDetectFix (DB-backed)
// ───────────────────────────────────────────────────────────────────────────

describe('autoDetectFix', () => {
  let sessionId: string;

  beforeEach(() => {
    setDb(createTestDb());
    sessionId = 'test-session-1';

    // Insert a failed command for each test to work with
    insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
      session_id: sessionId,
    });
  });

  afterEach(() => {
    closeDb();
  });

  test('records a fix when a failed command exists in the same session', () => {
    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });

    autoDetectFix(sessionId, fixCmdId, 'npm install --legacy-peer-deps');

    expect(getFixedErrorCount()).toBe(1);

    const signature = hashCommandSignature('npm install', 1);
    const fix = findFix(signature);
    expect(fix).not.toBeNull();
    expect(fix!.fix_command_id).toBe(fixCmdId);
  });

  test('does not record a fix when no failed command in session', () => {
    const fixCmdId = insertCommand({
      raw_command: 'echo hello',
      normalized_command: 'echo hello',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: 'other-session',
    });

    autoDetectFix('other-session', fixCmdId, 'echo hello');

    expect(getFixedErrorCount()).toBe(0);
    expect(getErrorCount()).toBe(0);
  });

  test('boosts confidence when same fix is repeated', () => {
    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });
    const fixCmdId2 = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });

    // First fix detection
    autoDetectFix(sessionId, fixCmdId, 'npm install --legacy-peer-deps');
    // Second fix detection — same fix, should boost confidence
    autoDetectFix(sessionId, fixCmdId2, 'npm install --legacy-peer-deps');

    const signature = hashCommandSignature('npm install', 1);
    const fix = findFix(signature);
    expect(fix).not.toBeNull();
    // Initial confidence is 0 + 0.2 (first fix) + 0.2 (second boost) = 0.4
    expect(fix!.confidence).toBe(0.4);
  });

  test('does not boost confidence for a different fix command', () => {
    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });
    const fixCmdId2 = insertCommand({
      raw_command: 'npm install --force',
      normalized_command: 'npm install --force',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });

    autoDetectFix(sessionId, fixCmdId, 'npm install --legacy-peer-deps');
    // Different fix command — should NOT boost confidence
    autoDetectFix(sessionId, fixCmdId2, 'npm install --force');

    const signature = hashCommandSignature('npm install', 1);
    const fix = findFix(signature);
    expect(fix).not.toBeNull();
    expect(fix!.fix_command_id).toBe(fixCmdId);
    expect(fix!.confidence).toBe(0.2);
  });

  test('fix summary includes auto: prefix', () => {
    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });

    autoDetectFix(sessionId, fixCmdId, 'npm install --legacy-peer-deps');

    const signature = hashCommandSignature('npm install', 1);
    const fix = findFix(signature);
    expect(fix!.fix_summary).toContain('auto:');
    expect(fix!.fix_summary).toContain('npm install --legacy-peer-deps');
  });

  test('never throws — wrapped in try/catch', () => {
    expect(() => {
      autoDetectFix('nonexistent-session', 999999, 'fake command');
    }).not.toThrow();
  });

  test('works with stderr on the failed command', () => {
    // Use a distinct session to avoid timing collision with the beforeEach failure
    const stderrSession = 'stderr-session';

    insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
      session_id: stderrSession,
      stderr_output: 'npm ERR! code E404\nnpm ERR! 404 Not Found',
    });

    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: stderrSession,
    });

    autoDetectFix(stderrSession, fixCmdId, 'npm install --legacy-peer-deps');

    expect(getFixedErrorCount()).toBe(1);

    const stderrSig = hashErrorSignature('npm ERR! code E404\nnpm ERR! 404 Not Found');
    const fix = findFix(stderrSig);
    expect(fix).not.toBeNull();
    expect(fix!.fix_command_id).toBe(fixCmdId);
  });

  test('uses the most recent failed command when multiple failures in session', () => {
    // Create a first failure (from beforeEach) with explicit early timestamp
    // Then create a second failure
    insertCommand({
      raw_command: 'npm install',
      normalized_command: 'npm install',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 1,
      session_id: sessionId,
    });

    const fixCmdId = insertCommand({
      raw_command: 'npm install --legacy-peer-deps',
      normalized_command: 'npm install --legacy-peer-deps',
      cwd: '/tmp',
      shell: 'zsh',
      exit_code: 0,
      session_id: sessionId,
    });

    autoDetectFix(sessionId, fixCmdId, 'npm install --legacy-peer-deps');

    // Should fix the most recent failure (npm install command, not the earlier one)
    const npmSig = hashCommandSignature('npm install', 1);
    const npmFix = findFix(npmSig);
    expect(npmFix).not.toBeNull();
    expect(npmFix!.fix_command_id).toBe(fixCmdId);
    expect(npmFix!.error_message).toContain('npm install');
  });
});
