import { flushSync } from 'react-dom';

/**
 * Runs a state update inside a View Transition so elements that change position
 * glide instead of jumping.
 *
 * `flushSync` is required: the browser snapshots the DOM before the callback and
 * again after it returns, so React has to commit synchronously inside it. Only
 * call this from an event handler, never during render.
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
 * `view-transition-name` must be a CSS identifier: no colons, dots or spaces,
 * and it cannot start with a digit. Medication ids are UUIDs and times contain a
 * colon, so both need stripping.
 */
export function toViewTransitionName(prefix: string, key: string): string {
  return `${prefix}-${key.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}
