import { DEFAULT_REMINDER } from './types';
import type { Medication, ReminderSettings } from './types';

/** How close to a reminder moment still counts as due, matching the poll rate. */
export const FIRE_WINDOW_MS = 60_000;

/** Falls back to the default for records saved before reminders existed. */
export function getReminder(medication: Medication): ReminderSettings {
  return medication.reminder ?? DEFAULT_REMINDER;
}

/**
 * The moments a dose should announce itself: the scheduled time, then one per
 * snooze repeat.
 */
export function getReminderTimes(
  scheduled: Date,
  reminder: ReminderSettings,
): Date[] {
  const times = [scheduled];
  if (!reminder.snooze.enabled) return times;

  const gap = Math.max(1, reminder.snooze.minutes) * 60_000;
  const repeats = Math.max(0, reminder.snooze.repeat);
  for (let i = 1; i <= repeats; i++) {
    times.push(new Date(scheduled.getTime() + i * gap));
  }
  return times;
}

/**
 * Index of the reminder that has just come due, or -1.
 *
 * A window rather than an equality test: the checker polls, so an exact
 * timestamp match would miss almost every reminder. This is also why snooze
 * offsets cannot be matched by comparing HH:mm strings.
 */
export function findDueReminder(
  times: Date[],
  now: Date,
  windowMs = FIRE_WINDOW_MS,
): number {
  for (let i = 0; i < times.length; i++) {
    const elapsed = now.getTime() - times[i].getTime();
    if (elapsed >= 0 && elapsed < windowMs) return i;
  }
  return -1;
}

/** Stable key so a given reminder fires once per dose. */
export function reminderKey(
  medicationId: string,
  scheduledTime: string,
  index: number,
): string {
  return `${medicationId}|${scheduledTime}|${index}`;
}
