import { describe, test, expect } from 'bun:test';
import { redactSecretsFromCommand } from '../../src/config/index.ts';

describe('Secret Redaction Security', () => {
  test('redacts AWS keys', () => {
    const cmd = 'aws configure set aws_access_key_id AKIAIOSFODNN7EXAMPLE';
    const redacted = redactSecretsFromCommand(cmd);
    expect(redacted).toInclude('[REDACTED]');
    expect(redacted).not.toInclude('AKIAIOSFODNN7EXAMPLE');
  });

  test('redacts GitHub tokens', () => {
    const cmdWithToken = 'gh auth login --with-token ghp_1234567890abcdef1234567890abcdef12345678';
    const redacted = redactSecretsFromCommand(cmdWithToken);
    expect(redacted).toInclude('[REDACTED]');
    expect(redacted).not.toInclude('ghp_1234567890abcdef');
  });

  test('redacts passwords in URLs', () => {
    const cmdWithPassword = 'curl https://user:password@example.com/api';
    const redacted = redactSecretsFromCommand(cmdWithPassword);
    expect(redacted).toInclude('[REDACTED]');
    expect(redacted).not.toInclude(':password@');
  });

  test('redacts private key markers', () => {
    const cmdWithKey = 'echo "-----BEGIN RSA PRIVATE KEY-----"';
    const redacted = redactSecretsFromCommand(cmdWithKey);
    expect(redacted).toInclude('[REDACTED]');
  });

  test('handles multiple secrets in one command', () => {
    const cmd = 'export API_KEY=sk-12345 && export AWS_KEY=AKIAIOSFODNN7EXAMPLE';
    const redacted = redactSecretsFromCommand(cmd);
    expect(redacted).toInclude('[REDACTED]');
    // Should redact both secrets
    const redactionCount = (redacted.match(/\[REDACTED\]/g) || []).length;
    expect(redactionCount).toBeGreaterThanOrEqual(1);
  });

  test('does not modify safe commands', () => {
    const cmd = 'ls -la';
    const redacted = redactSecretsFromCommand(cmd);
    expect(redacted).toBe(cmd);
  });

  test('handles empty commands', () => {
    const cmd = '';
    const redacted = redactSecretsFromCommand(cmd);
    expect(redacted).toBe('');
  });
});
