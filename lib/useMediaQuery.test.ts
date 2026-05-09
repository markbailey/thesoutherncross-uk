/**
 * Tests for the SSR-safe useMediaQuery hook.
 *
 * useMediaQuery is a React hook, so we cannot call it directly in a Node.js
 * test environment without a rendering context. Instead, we mock React's
 * `useState` and `useEffect` exports so the hook's logic executes as a plain
 * function call. This is an intentional whitebox contract test — we're
 * verifying the hook's behavior, not React's rendering primitives.
 *
 * Behaviours under test:
 * 1. Returns `defaultValue` on first render (before useEffect fires) → SSR-safe.
 * 2. Accepts a custom `defaultValue` (e.g. `true` to avoid desktop CLS).
 * 3. Calls `window.matchMedia(query)` on mount and updates state with the result.
 * 4. Attaches a `change` listener and removes it on cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── React mock ────────────────────────────────────────────────────────────
// These are module-level so vi.mock can capture them in its factory.
const mockSetState = vi.fn();
let latestInit: unknown;
let pendingEffect: (() => (() => void) | void) | undefined;

vi.mock('react', () => ({
  useState: (init: unknown) => {
    latestInit = init;
    return [init, mockSetState];
  },
  useEffect: (fn: () => (() => void) | void, _deps?: unknown[]) => {
    pendingEffect = fn;
  },
}));

// ── window.matchMedia factory ─────────────────────────────────────────────
type MockMql = {
  matches: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  runEffect: () => (() => void) | void;
};

function makeMatchMedia(matches: boolean): MockMql {
  const mql = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // Convenience: run the captured effect and return its cleanup
    runEffect(): (() => void) | void {
      return pendingEffect?.();
    },
  };
  Object.defineProperty(globalThis, 'window', {
    value: { matchMedia: vi.fn(() => mql) },
    writable: true,
    configurable: true,
  });
  return mql;
}

// ── Import the hook (uses mocked React) ──────────────────────────────────
import { useMediaQuery } from './useMediaQuery';

// ── Tests ─────────────────────────────────────────────────────────────────
describe('useMediaQuery', () => {
  beforeEach(() => {
    mockSetState.mockClear();
    latestInit = undefined;
    pendingEffect = undefined;
  });

  it('returns false (default) before effects run — SSR-safe', () => {
    const result = useMediaQuery('(min-width: 768px)');
    // No effect has fired yet → still the initial useState value
    expect(result).toBe(false);
    expect(latestInit).toBe(false);
    expect(pendingEffect).toBeDefined(); // effect was registered
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('accepts a custom defaultValue of true', () => {
    const result = useMediaQuery('(min-width: 1024px)', true);
    expect(result).toBe(true);
    expect(latestInit).toBe(true);
    expect(mockSetState).not.toHaveBeenCalled();
  });

  it('calls window.matchMedia with the query string on mount', () => {
    const mql = makeMatchMedia(false);
    useMediaQuery('(min-width: 768px)');
    mql.runEffect();
    expect((window.matchMedia as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(
      '(min-width: 768px)',
    );
  });

  it('calls setState(true) when the query matches on mount', () => {
    const mql = makeMatchMedia(true);
    useMediaQuery('(max-width: 767px)');
    mql.runEffect();
    expect(mockSetState).toHaveBeenCalledWith(true);
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('calls setState(false) when the query does not match on mount', () => {
    const mql = makeMatchMedia(false);
    useMediaQuery('(min-width: 1920px)');
    mql.runEffect();
    expect(mockSetState).toHaveBeenCalledWith(false);
  });

  it('removes the change listener on cleanup', () => {
    const mql = makeMatchMedia(false);
    useMediaQuery('(min-width: 768px)');
    const cleanup = mql.runEffect();
    if (typeof cleanup === 'function') cleanup();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
