/**
 * @vitest-environment happy-dom
 *
 * Tests for the SSR-safe useMediaQuery hook.
 *
 * These tests use a real React renderer (happy-dom) so they verify observable
 * *behaviour* rather than implementation shape. Refactoring the hook internals
 * (e.g. to useSyncExternalStore) will not break these tests as long as the
 * external contract is preserved.
 *
 * window.matchMedia is mocked because happy-dom does not implement it.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act, createElement } from 'react';
import { useMediaQuery } from './useMediaQuery';

// ── helpers ───────────────────────────────────────────────────────────────

/** Render a hook in a minimal React tree; returns the latest value + cleanup. */
function renderHook<T>(useHook: () => T): { getValue: () => T; cleanup: () => void } {
  let latestValue!: T;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  function TestComponent() {
    latestValue = useHook();
    return null;
  }

  act(() => {
    root.render(createElement(TestComponent, null));
  });

  return {
    getValue: () => latestValue,
    cleanup: () => {
      act(() => { root.unmount(); });
      container.remove();
    },
  };
}

/** Mock window.matchMedia and return helpers for asserting + firing changes. */
function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.add(cb);
    }),
    removeEventListener: vi.fn((_type: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.delete(cb);
    }),
    fireChange(newMatches: boolean) {
      mql.matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => mql),
    writable: true,
    configurable: true,
  });
  return mql;
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('useMediaQuery', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reflects the matchMedia result after mount (query matches = true)', () => {
    const mql = mockMatchMedia(true);
    const { getValue, cleanup } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(getValue()).toBe(true);
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    cleanup();
  });

  it('reflects the matchMedia result after mount (query matches = false)', () => {
    mockMatchMedia(false);
    const { getValue, cleanup } = renderHook(() => useMediaQuery('(min-width: 1920px)'));
    expect(getValue()).toBe(false);
    cleanup();
  });

  it('passes the query string to window.matchMedia', () => {
    const mql = mockMatchMedia(false);
    const { cleanup } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
    cleanup();
  });

  it('updates when the media query fires a change event', () => {
    const mql = mockMatchMedia(false);
    const { getValue, cleanup } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(getValue()).toBe(false);
    act(() => { mql.fireChange(true); });
    expect(getValue()).toBe(true);
    act(() => { mql.fireChange(false); });
    expect(getValue()).toBe(false);
    cleanup();
  });

  it('removes the change listener on unmount', () => {
    const mql = mockMatchMedia(false);
    const { cleanup } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(mql.removeEventListener).not.toHaveBeenCalled();
    cleanup();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

});
