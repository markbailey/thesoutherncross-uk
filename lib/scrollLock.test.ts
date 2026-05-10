/**
 * Unit tests for the ref-counted scroll lock.
 *
 * These tests verify the multi-consumer contract — the whole reason the module
 * exists is to handle NavDrawer and MemberModal locking independently without
 * clobbering each other. The happy path is also covered.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── helpers ───────────────────────────────────────────────────────────────

/** Re-import a fresh module instance between tests by clearing the module cache. */
async function freshLockScroll() {
  // vitest module cache is cleared per vi.resetModules()
  vi.resetModules();
  const mod = await import('./scrollLock');
  return mod.lockScroll;
}

/** Set up a minimal document.body with a controllable overflow value. */
function setupBody(initialOverflow = '') {
  Object.defineProperty(globalThis, 'document', {
    value: {
      body: { style: { overflow: initialOverflow } },
    },
    writable: true,
    configurable: true,
  });
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('lockScroll', () => {
  beforeEach(async () => {
    // Reset module state and body overflow before each test.
    setupBody('');
  });

  it('locks body scroll on first call', async () => {
    const lockScroll = await freshLockScroll();
    setupBody('');
    lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('two lock calls + one unlock leave body locked', async () => {
    const lockScroll = await freshLockScroll();
    setupBody('');
    const unlock1 = lockScroll();
    const unlock2 = lockScroll();
    unlock1();
    // One consumer still holds the lock → body must stay locked.
    expect(document.body.style.overflow).toBe('hidden');
    unlock2(); // clean up
  });

  it('second (last) unlock restores the original overflow', async () => {
    const lockScroll = await freshLockScroll();
    setupBody('auto');
    const unlock1 = lockScroll();
    const unlock2 = lockScroll();
    unlock1();
    unlock2();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('extra (third) unlock beyond the lock count is idempotent', async () => {
    const lockScroll = await freshLockScroll();
    setupBody('');
    const unlock1 = lockScroll();
    const unlock2 = lockScroll();
    unlock1();
    unlock2();
    // Both unlocked — calling unlock1 again must not crash or double-restore.
    expect(() => unlock1()).not.toThrow();
    expect(document.body.style.overflow).toBe(''); // unchanged
  });

  it('single lock + single unlock restores original overflow', async () => {
    const lockScroll = await freshLockScroll();
    setupBody('scroll');
    const unlock = lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlock();
    expect(document.body.style.overflow).toBe('scroll');
  });
});
