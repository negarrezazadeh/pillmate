import { fromDateKey } from '@/lib/date';
import type { IntakeLog } from './types';

/** How long after the scheduled time a dose counts as due rather than missed. */
export const DOSE_WINDOW_MINUTES = 60;
const DOSE_WINDOW_MS = DOSE_WINDOW_MINUTES * 60 * 1000;

/**
 *   ignored   the slot had already passed when the medication was created
 *   upcoming  scheduled time has not arrived
 *   due       inside the window
 *   missed    the window elapsed with nothing recorded
 *   taken     the user recorded it
 *
 * Only `taken` is persisted. The rest are derived on every read: storing them
 * would need a background writer and would go stale whenever the app is closed
 * or the schedule is edited.
 */
export type DoseState = 'ignored' | 'upcoming' | 'due' | 'missed' | 'taken';

/** `ignored` is filtered out before display; this makes the compiler check it. */
export type VisibleDoseState = Exclude<DoseState, 'ignored'>;

export interface DoseStateInput {
  scheduled: Date;
  log?: IntakeLog;
  createdAt: string;
  now?: Date;
}

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
  // Checked before `ignored` so an explicit record is never discarded
  if (log?.status === 'taken') return 'taken';

  // Adding a medication at 15:00 must not fault the user for the 09:00 slot
  if (new Date(createdAt).getTime() > scheduled.getTime()) return 'ignored';

  const elapsed = now.getTime() - scheduled.getTime();
  if (elapsed < 0) return 'upcoming';
  if (elapsed < DOSE_WINDOW_MS) return 'due';
  return 'missed';
}

/** Negative once the scheduled time has passed. */
export function minutesUntil(scheduled: Date, now: Date = new Date()): number {
  return Math.round((scheduled.getTime() - now.getTime()) / 60_000);
}

export function windowMinutesLeft(
  scheduled: Date,
  now: Date = new Date(),
): number {
  const left = Math.round(
    (scheduled.getTime() + DOSE_WINDOW_MS - now.getTime()) / 60_000,
  );
  return Math.max(0, left);
}

/** 45 -> "۴۵ دقیقه", 90 -> "۱ ساعت و ۳۰ دقیقه", 120 -> "۲ ساعت" */
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
