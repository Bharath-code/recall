import { describe, test, expect } from 'bun:test';
import { resolve, normalize } from 'node:path';

// Test the path validation logic (matches implementation in export/import)
function validateFilePath(filePath: string): string {
  const resolved = resolve(filePath);
  const normalizedPath = normalize(resolved);
  
  // Check for obvious path traversal patterns that could be malicious
  // Allow absolute paths and tilde expansion, but reject relative paths with ..
  if (filePath.includes('..') && !filePath.startsWith('/') && !filePath.startsWith('~')) {
    // Check if the resolved path actually escapes the current directory
    const cwd = process.cwd();
    if (!normalizedPath.startsWith(cwd)) {
      throw new Error('Path traversal detected: file path must be within current directory or subdirectories');
    }
  }
  
  return normalizedPath;
}

describe('Path Validation Security', () => {
  test('allows absolute paths', () => {
    // Absolute paths should be allowed
    const result = validateFilePath('/etc/passwd');
    expect(result).toBeTruthy();
  });

  test('allows tilde expansion', () => {
    // Tilde paths should be allowed
    const result = validateFilePath('~/Documents/file.json');
    expect(result).toBeTruthy();
  });

  test('allows valid relative paths within current directory', () => {
    const result = validateFilePath('export.json');
    expect(result).toBeTruthy();
    expect(result).toInclude(process.cwd());
  });

  test('allows subdirectory paths within current directory', () => {
    const result = validateFilePath('./subdir/file.json');
    expect(result).toBeTruthy();
    expect(result).toInclude(process.cwd());
  });

  test('rejects relative paths with .. that escape CWD', () => {
    // This will resolve to parent of CWD, which should be rejected
    const parentPath = resolve('..');
    if (!parentPath.startsWith(process.cwd())) {
      expect(() => validateFilePath('../etc/passwd')).toThrow('Path traversal detected');
    }
  });

  test('allows relative paths with .. that stay within CWD', () => {
    // Create a test case where ../something resolves to a path within CWD
    // This is harder to test reliably, so we'll skip this edge case
    const result = validateFilePath('./subdir/../file.json');
    expect(result).toBeTruthy();
  });

  test('handles edge cases with current directory', () => {
    const result = validateFilePath('.');
    expect(result).toBeTruthy();
    expect(result).toBe(process.cwd());
  });
});
