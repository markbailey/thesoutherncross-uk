import { describe, it, expect, afterEach, vi } from 'vitest';

describe('session module', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws when SESSION_SECRET is missing', async () => {
    vi.stubEnv('SESSION_SECRET', '');
    await expect(import('./session')).rejects.toThrow('SESSION_SECRET environment variable is required');
  });

  it('throws when SESSION_SECRET is shorter than 32 characters', async () => {
    vi.stubEnv('SESSION_SECRET', 'too-short');
    await expect(import('./session')).rejects.toThrow('SESSION_SECRET must be at least 32 characters');
  });

  it('exports sessionOptions when SESSION_SECRET is valid', async () => {
    vi.stubEnv('SESSION_SECRET', 'a-valid-long-enough-secret-for-iron-session-x');
    const { sessionOptions } = await import('./session');
    expect(sessionOptions).toBeDefined();
    expect(sessionOptions.cookieName).toBe('tsx-session');
    expect(sessionOptions.password).toBe('a-valid-long-enough-secret-for-iron-session-x');
  });
});
