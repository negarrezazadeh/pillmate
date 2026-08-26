/**
 * Date-key helpers shared across features.
 *
 * A "date key" is a Gregorian `YYYY-MM-DD` string. It is the storage format:
 * unambiguous, sortable with plain string comparison, and calendar-agnostic.
 * Jalali formatting happens only at the presentation layer.
 */

/**
 * Local (not UTC) date key. Using local time matters: `toISOString()` would
 * shift the day for timezones ahead of UTC (e.g. Tehran after 20:30).
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a date key into a local Date at midnight */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Whole days from `fromKey` to `toKey`. Computed through UTC timestamps so a
 * daylight-saving transition in between cannot produce a fractional result.
 */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}
