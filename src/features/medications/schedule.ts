import type { DayOfWeek, Medication } from './types';
import { toDateKey } from '@/lib/date';

const DAY_MAP: DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export function getDayOfWeek(date: Date): DayOfWeek {
  return DAY_MAP[date.getDay()];
}

export function getCurrentDay(): DayOfWeek {
  return getDayOfWeek(new Date());
}

/** Falls back to createdAt for records saved before `startDate` existed. */
export function getMedicationStartKey(medication: Medication): string {
  if (medication.startDate) return medication.startDate;
  return toDateKey(new Date(medication.createdAt));
}

/**
 * The start-date bound is what keeps a medication added today from appearing on
 * past days and months just because the weekday matches.
 */
export function isMedicationScheduledOn(
  medication: Medication,
  date: Date,
): boolean {
  if (!medication.isActive) return false;
  if (!medication.days.includes(getDayOfWeek(date))) return false;
  return toDateKey(date) >= getMedicationStartKey(medication);
}

/** Derived from the schedule, so it cannot disagree with it. */
export function getDosesPerWeek(medication: Medication): number {
  return medication.days.length * medication.times.length;
}

export function medicationsScheduledOn(
  medications: Medication[],
  date: Date,
): Medication[] {
  return medications.filter((med) => isMedicationScheduledOn(med, date));
}
