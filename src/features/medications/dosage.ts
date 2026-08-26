import type { DosageChange } from './types';
import { daysBetweenKeys, toDateKey } from '@/lib/date';

// Re-exported so callers in this feature can keep a single import site
export { daysBetweenKeys, fromDateKey, toDateKey } from '@/lib/date';

/** Number of days before the effective date that we remind the user */
export const DOSAGE_REMINDER_OFFSETS = [2, 1, 0] as const;

export type DosageTrend = 'increase' | 'decrease' | 'unknown';

/**
 * Compare the leading number of two free-text dosages (e.g. "500mg" vs "250mg")
 * to tell whether the dose goes up or down. Returns 'unknown' when either side
 * has no parsable number or the numbers are equal.
 */
export function getDosageTrend(current: string, next: string): DosageTrend {
  const parse = (value: string): number | null => {
    const match = value.match(/\d+(?:[.,]\d+)?/);
    if (!match) return null;
    return Number.parseFloat(match[0].replace(',', '.'));
  };

  const a = parse(current);
  const b = parse(next);
  if (a === null || b === null || a === b) return 'unknown';
  return b > a ? 'increase' : 'decrease';
}

export const DOSAGE_TREND_LABEL: Record<DosageTrend, string> = {
  increase: 'افزایش دوز',
  decrease: 'کاهش دوز',
  unknown: 'تغییر دوز',
};

/**
 * Days remaining until a change takes effect. Negative when already past.
 * Returns null when there is no pending change.
 */
export function daysUntilChange(
  change: DosageChange | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!change || change.applied) return null;
  return daysBetweenKeys(toDateKey(now), change.effectiveDate);
}

/** Human readable countdown used in cards and notifications */
export function formatDaysUntil(days: number): string {
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  if (days === 2) return 'پس‌فردا';
  return `${days} روز دیگر`;
}
