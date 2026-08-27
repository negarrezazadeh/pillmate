import { flushSync } from 'react-dom';

/**
 * Runs a state update inside a View Transition so elements that change position
 * glide to their new spot instead of jumping.
 *
 * `flushSync` is required: the browser snapshots the DOM before the callback and
 * again after it returns, so React has to commit synchronously inside it.
 * Only call this from an event handler, never during render.
 *
 * Falls back to a plain update when the API is unavailable or the user has asked
 * for reduced motion.
 */
export function withViewTransition(update: () => void): void {
  const reducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  if (reducedMotion || typeof document.startViewTransition !== 'function') {
    update();
    return;
  }

  document.startViewTransition(() => {
    flushSync(update);
  });
}

/**
 * Builds a value safe to use as `view-transition-name`, which must be a CSS
 * custom identifier: no colons, dots or spaces, and it cannot start with a
 * digit. Medication ids are UUIDs and times contain a colon, so both need
 * stripping.
 */
export function toViewTransitionName(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
