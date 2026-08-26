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

/** Day of week for a specific date */
export function getDayOfWeek(date: Date): DayOfWeek {
  return DAY_MAP[date.getDay()];
}

/** Day of week for right now */
export function getCurrentDay(): DayOfWeek {
  return getDayOfWeek(new Date());
}

/**
 * The day tracking begins for a medication.
 *
 * Falls back to the creation timestamp for records saved before `startDate`
 * existed, so old data keeps working without a migration.
 */
export function getMedicationStartKey(medication: Medication): string {
  if (medication.startDate) return medication.startDate;
  return toDateKey(new Date(medication.createdAt));
}

/**
 * Whether a medication is scheduled on a given date.
 *
 * Three conditions, all required:
 *   - the medication is active
 *   - the weekday is one of its scheduled days
 *   - the date is not before the day tracking started
 *
 * The last one is what keeps a medication added today from appearing on past
 * days and months just because the weekday matches.
 */
export function isMedicationScheduledOn(
  medication: Medication,
  date: Date,
): boolean {
  if (!medication.isActive) return false;
  if (!medication.days.includes(getDayOfWeek(date))) return false;
  return toDateKey(date) >= getMedicationStartKey(medication);
}

/** Medications scheduled on a given date */
export function medicationsScheduledOn(
  medications: Medication[],
  date: Date,
): Medication[] {
  return medications.filter((med) => isMedicationScheduledOn(med, date));
}
