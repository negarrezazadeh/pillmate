import { useEffect, useState } from 'react';

/**
 * A Date that refreshes on an interval, so views whose output depends on the
 * current time re-render as time passes.
 *
 * Needed because a dose moves from upcoming to due to missed purely because the
 * clock advanced, with no user action and no data change to trigger a render.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
