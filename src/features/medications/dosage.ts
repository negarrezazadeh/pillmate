import type { DosageChange } from './types';
import { daysBetweenKeys, toDateKey } from '@/lib/date';

export { daysBetweenKeys, fromDateKey, toDateKey } from '@/lib/date';

export const DOSAGE_REMINDER_OFFSETS = [2, 1, 0] as const;

export type DosageTrend = 'increase' | 'decrease' | 'unknown';

/** Compares the leading number of two free-text dosages, e.g. "500mg". */
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

/** Negative when already past, null when no change is pending. */
export function daysUntilChange(
  change: DosageChange | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!change || change.applied) return null;
  return daysBetweenKeys(toDateKey(now), change.effectiveDate);
}

export function formatDaysUntil(days: number): string {
  if (days === 0) return 'امروز';
  if (days === 1) return 'فردا';
  if (days === 2) return 'پس‌فردا';
  return `${days} روز دیگر`;
}
