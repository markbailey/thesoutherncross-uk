import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit and decrements remaining', () => {
    const rl = createRateLimiter({ max: 3, windowMs: 60_000 });
    const a = rl.check('ip:1');
    const b = rl.check('ip:1');
    const c = rl.check('ip:1');
    expect(a.ok).toBe(true);
    expect(a.remaining).toBe(2);
    expect(b.ok).toBe(true);
    expect(b.remaining).toBe(1);
    expect(c.ok).toBe(true);
    expect(c.remaining).toBe(0);
  });

  it('blocks once over the limit and returns positive resetMs', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    const first = rl.check('ip:2');
    const second = rl.check('ip:2');
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.remaining).toBe(0);
    expect(second.resetMs).toBeGreaterThan(0);
    expect(second.resetMs).toBeLessThanOrEqual(60_000);
  });

  it('resets the window after windowMs has elapsed', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.check('ip:3').ok).toBe(true);
    expect(rl.check('ip:3').ok).toBe(false);
    vi.advanceTimersByTime(60_001);
    const after = rl.check('ip:3');
    expect(after.ok).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(rl.check('a').ok).toBe(true);
    expect(rl.check('b').ok).toBe(true);
    expect(rl.check('a').ok).toBe(false);
    expect(rl.check('b').ok).toBe(false);
  });
});
