/**
 * A "date key" is a Gregorian `YYYY-MM-DD` string: unambiguous, sortable with
 * plain string comparison, and calendar-agnostic. Jalali formatting happens only
 * at the presentation layer.
 */

/**
 * Local, not UTC. `toISOString()` would shift the day for timezones ahead of
 * UTC - a Date at local midnight in Tehran is 20:30 the previous day in UTC.
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Via UTC timestamps, so a DST transition in between cannot skew the result. */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}
