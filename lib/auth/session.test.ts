import { describe, it, expect, afterEach, vi } from 'vitest';
import { getSessionOptions } from './session';

describe('getSessionOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when SESSION_SECRET is missing', () => {
    vi.stubEnv('SESSION_SECRET', '');
    expect(() => getSessionOptions()).toThrow('SESSION_SECRET environment variable is required');
  });

  it('throws when SESSION_SECRET is shorter than 32 characters', () => {
    vi.stubEnv('SESSION_SECRET', 'too-short');
    expect(() => getSessionOptions()).toThrow('SESSION_SECRET must be at least 32 characters');
  });

  it('returns sessionOptions when SESSION_SECRET is valid', () => {
    vi.stubEnv('SESSION_SECRET', 'a-valid-long-enough-secret-for-iron-session-x');
    const options = getSessionOptions();
    expect(options).toBeDefined();
    expect(options.cookieName).toBe('tsx-session');
    expect(options.password).toBe('a-valid-long-enough-secret-for-iron-session-x');
  });
});
