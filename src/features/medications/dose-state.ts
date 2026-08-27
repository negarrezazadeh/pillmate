import { fromDateKey } from '@/lib/date';
import type { IntakeLog } from './types';

/**
 * How long after the scheduled time a dose is still considered "due" rather
 * than missed.
 */
export const DOSE_WINDOW_MINUTES = 60;
const DOSE_WINDOW_MS = DOSE_WINDOW_MINUTES * 60 * 1000;

/**
 * Lifecycle of a single dose.
 *
 *   ignored   the slot had already passed when the medication was created, so
 *             there was never an opportunity to take it
 *   upcoming  scheduled time has not arrived yet
 *   due       inside the window: time has arrived, still fine to take
 *   missed    the window elapsed and it was never marked taken
 *   taken     the user recorded it
 *
 * Only `taken` is persisted, because it records a user action. The rest are
 * derived from the clock on every read: storing them would need a background
 * writer and would go stale whenever the app is closed or the schedule is
 * edited.
 */
export type DoseState = 'ignored' | 'upcoming' | 'due' | 'missed' | 'taken';

/**
 * The states that actually get rendered. `ignored` slots are filtered out
 * before display, and this type makes the compiler enforce that rather than
 * leaving it to a comment.
 */
export type VisibleDoseState = Exclude<DoseState, 'ignored'>;

export interface DoseStateInput {
  /** The moment this dose is scheduled for */
  scheduled: Date;
  /** The persisted log for this slot, if one exists */
  log?: IntakeLog;
  /** medication.createdAt - when the record came into existence */
  createdAt: string;
  now?: Date;
}

/** Local Date for a dose, from a YYYY-MM-DD key and an HH:mm time */
export function getScheduledDate(dateKey: string, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const date = fromDateKey(dateKey);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function getDoseState({
  scheduled,
  log,
  createdAt,
  now = new Date(),
}: DoseStateInput): DoseState {
  // An explicit record from the user always wins, even on a slot that would
  // otherwise be ignored
  if (log?.status === 'taken') return 'taken';

  // Adding a medication at 15:00 must not retroactively fault the user for the
  // 09:00 slot that predates the record. The first real slot is the next one.
  if (new Date(createdAt).getTime() > scheduled.getTime()) return 'ignored';

  const elapsed = now.getTime() - scheduled.getTime();
  if (elapsed < 0) return 'upcoming';
  if (elapsed < DOSE_WINDOW_MS) return 'due';
  return 'missed';
}

/** Whole minutes until the scheduled time. Negative once it has passed. */
export function minutesUntil(scheduled: Date, now: Date = new Date()): number {
  return Math.round((scheduled.getTime() - now.getTime()) / 60_000);
}

/** Whole minutes left in the take window. Zero once the window has closed. */
export function windowMinutesLeft(
  scheduled: Date,
  now: Date = new Date(),
): number {
  const left = Math.round(
    (scheduled.getTime() + DOSE_WINDOW_MS - now.getTime()) / 60_000,
  );
  return Math.max(0, left);
}

/**
 * Compact Persian duration for a positive number of minutes,
 * e.g. 45 -> "۴۵ دقیقه", 90 -> "۱ ساعت و ۳۰ دقیقه", 120 -> "۲ ساعت".
 */
export function formatMinutes(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} دقیقه`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${hours} ساعت`;
  return `${hours} ساعت و ${rest} دقیقه`;
}

export const DOSE_STATE_LABEL: Record<DoseState, string> = {
  ignored: 'خارج از بازه ثبت',
  upcoming: 'در انتظار',
  due: 'زمان مصرف',
  missed: 'از دست رفته',
  taken: 'مصرف شده',
};
