/**
 * Ref-counted body scroll lock.
 *
 * Multiple components (e.g. NavDrawer and MemberModal) may lock body scroll
 * independently. A naïve save/restore pattern breaks when one component
 * closes while the other is still open, because the restoring component
 * clobbers the lock the other component is still holding.
 *
 * This module keeps a reference count so the lock is only released when the
 * last consumer calls its returned unlock function.
 *
 * Usage:
 *   const unlock = lockScroll();
 *   // ... later:
 *   unlock();
 *
 * The module-level `lockCount` is reset to 0 at startup to prevent state
 * drift across hot-module-replacement or unusual route-change cycles.
 */

let lockCount = 0;
let savedOverflow = '';

// Escape hatch: release any stale lock on next module evaluation (HMR / route change).
if (typeof document !== 'undefined' && document.body.style.overflow === 'hidden') {
  // Only reset when there are no active lock holders (e.g. after a crash-then-reload).
  // If lockCount is 0 but body is still hidden, restore it safely.
  if (lockCount === 0) {
    document.body.style.overflow = '';
  }
}

/**
 * Increment the scroll-lock ref count, locking `document.body` scroll on the
 * first call. Returns an unlock function that decrements the count and
 * restores scroll when the count reaches zero.
 */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') {
    // SSR / test environment with no DOM — return a no-op.
    return () => {};
  }

  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return; // idempotent
    released = true;
    lockCount--;
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
    }
  };
}
