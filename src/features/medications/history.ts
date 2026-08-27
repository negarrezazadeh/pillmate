import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from 'date-fns-jalali';
import type { ArchivedMedication, IntakeLog, Medication } from './types';
import { getDoseState, getScheduledDate } from './dose-state';
import { getDayOfWeek, getMedicationStartKey } from './schedule';
import { toDateKey } from '@/lib/date';

/** How many days back the timeline is reconstructed by default */
export const HISTORY_DAYS = 90;

/** Only settled outcomes appear in history; nothing still actionable does */
export type HistoryDoseState = 'taken' | 'missed';

export interface HistoryDose {
  key: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  color: string;
  /** HH:mm the dose was scheduled for */
  time: string;
  state: HistoryDoseState;
  /** ISO string, present when the dose was recorded */
  takenAt: string | null;
  /** True when the medication has since been deleted */
  isArchived: boolean;
}

export type HistoryEventKind = 'added' | 'removed' | 'dosage-change';

export interface HistoryEvent {
  key: string;
  kind: HistoryEventKind;
  medicationName: string;
  color: string;
  /** Extra wording, e.g. the dosage that was replaced */
  detail?: string;
}

export interface HistoryDay {
  dateKey: string;
  doses: HistoryDose[];
  events: HistoryEvent[];
}

interface BuildHistoryInput {
  /** Medications currently on the schedule */
  medications: Medication[];
  /** Medications the user deleted */
  archived: ArchivedMedication[];
  logs: IntakeLog[];
  days?: number;
  now?: Date;
}

/** HH:mm portion of a stored scheduledTime */
function timeOf(scheduledTime: string): string {
  return scheduledTime.split('T')[1]?.slice(0, 5) ?? '';
}

/** YYYY-MM-DD portion of a stored scheduledTime */
function dateKeyOf(scheduledTime: string): string {
  return scheduledTime.split('T')[0];
}

/**
 * Resolves what each archived dosage was replaced by.
 *
 * `dosageHistory` stores the dosage that was superseded plus when. The value it
 * changed *to* is therefore the next entry's dosage, or the medication's current
 * dosage for the most recent entry.
 */
function describeDosageChanges(
  medication: Medication,
): { dateKey: string; from: string; to: string; at: string }[] {
  const entries = [...(medication.dosageHistory ?? [])].sort((a, b) =>
    a.replacedAt.localeCompare(b.replacedAt),
  );

  return entries.map((entry, index) => ({
    dateKey: toDateKey(new Date(entry.replacedAt)),
    from: entry.dosage,
    to: entries[index + 1]?.dosage ?? medication.dosage,
    at: entry.replacedAt,
  }));
}

/**
 * Builds the day-by-day timeline shown on the history page.
 *
 * Two decisions worth knowing about:
 *
 * 1. Doses are reconstructed from the medication's schedule, not read off the
 *    intake logs. Logs only exist for days the app was actually opened, so a
 *    log-only history would silently omit every dose from a day the user never
 *    launched it - exactly the days most likely to contain missed doses.
 *
 * 2. Reconstruction never overrides a real log. For each medication and day the
 *    times considered are the union of the scheduled times and any times that
 *    already have a log. Without the union, editing a medication's times or days
 *    would make previously recorded doses vanish from history.
 *
 * `isActive` is deliberately ignored. It describes the schedule today; applying
 * it here would erase the past of any medication the user has paused.
 */
export function buildHistory({
  medications,
  archived,
  logs,
  days = HISTORY_DAYS,
  now = new Date(),
}: BuildHistoryInput): HistoryDay[] {
  const entries = [
    ...medications.map((medication) => ({ medication, deletedAt: null })),
    ...archived.map((medication) => ({
      medication: medication as Medication,
      deletedAt: medication.deletedAt as string | null,
    })),
  ];

  // Lookup by exact slot, plus the times that have a log on a given day
  const logBySlot = new Map<string, IntakeLog>();
  const loggedTimesByMedDay = new Map<string, Set<string>>();
  for (const log of logs) {
    logBySlot.set(`${log.medicationId}|${log.scheduledTime}`, log);
    const dayKey = `${log.medicationId}|${dateKeyOf(log.scheduledTime)}`;
    const set = loggedTimesByMedDay.get(dayKey) ?? new Set<string>();
    set.add(timeOf(log.scheduledTime));
    loggedTimesByMedDay.set(dayKey, set);
  }

  const result: HistoryDay[] = [];

  for (let offset = 0; offset < days; offset++) {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const dateKey = toDateKey(date);
    const weekday = getDayOfWeek(date);

    const doses: HistoryDose[] = [];
    const events: HistoryEvent[] = [];

    for (const { medication, deletedAt } of entries) {
      const isArchived = deletedAt !== null;
      const createdKey = toDateKey(new Date(medication.createdAt));
      const deletedKey = deletedAt ? toDateKey(new Date(deletedAt)) : null;

      // --- events on this day
      if (createdKey === dateKey) {
        events.push({
          key: `added-${medication.id}`,
          kind: 'added',
          medicationName: medication.name,
          color: medication.color,
        });
      }
      if (deletedKey === dateKey) {
        events.push({
          key: `removed-${medication.id}`,
          kind: 'removed',
          medicationName: medication.name,
          color: medication.color,
        });
      }
      for (const change of describeDosageChanges(medication)) {
        if (change.dateKey !== dateKey) continue;
        events.push({
          key: `dosage-${medication.id}-${change.at}`,
          kind: 'dosage-change',
          medicationName: medication.name,
          color: medication.color,
          detail: `از ${change.from} به ${change.to}`,
        });
      }

      // --- doses on this day
      const withinLifetime =
        dateKey >= getMedicationStartKey(medication) &&
        (deletedKey === null || dateKey <= deletedKey);
      const scheduledToday =
        withinLifetime && medication.days.includes(weekday);

      const times = new Set<string>(scheduledToday ? medication.times : []);
      // Anything already logged counts, even if the schedule has moved on since
      for (const time of loggedTimesByMedDay.get(`${medication.id}|${dateKey}`) ??
        []) {
        times.add(time);
      }
      if (times.size === 0) continue;

      for (const time of times) {
        const log = logBySlot.get(`${medication.id}|${dateKey}T${time}:00`);
        const state = getDoseState({
          scheduled: getScheduledDate(dateKey, time),
          log,
          createdAt: medication.createdAt,
          now,
        });

        // 'ignored' predates the record, 'upcoming'/'due' are not settled yet
        if (state !== 'taken' && state !== 'missed') continue;

        doses.push({
          key: `${medication.id}-${dateKey}-${time}`,
          medicationId: medication.id,
          medicationName: medication.name,
          dosage: medication.dosage,
          color: medication.color,
          time,
          state,
          takenAt: log?.takenAt ?? null,
          isArchived,
        });
      }
    }

    if (doses.length === 0 && events.length === 0) continue;

    doses.sort((a, b) => a.time.localeCompare(b.time));
    result.push({ dateKey, doses, events });
  }

  // Already newest-first because the loop walks backwards from today
  return result;
}

/** Totals for a day, used for the summary badges */
export function summariseDay(day: HistoryDay): {
  taken: number;
  missed: number;
} {
  return {
    taken: day.doses.filter((d) => d.state === 'taken').length,
    missed: day.doses.filter((d) => d.state === 'missed').length,
  };
}

// Period filtering and aggregate stats

export type HistoryPeriod = 'today' | 'week' | 'month';

export const HISTORY_PERIOD_LABEL: Record<HistoryPeriod, string> = {
  today: 'امروز',
  week: 'این هفته',
  month: 'این ماه',
};

export const HISTORY_PERIODS: HistoryPeriod[] = ['today', 'week', 'month'];

/**
 * Inclusive lower bound for a period, as a date key.
 *
 * Week and month boundaries come from the Jalali calendar, since that is the
 * calendar the user sees; a Gregorian month would cut the list at a date that
 * means nothing on screen. Weeks start on Saturday.
 */
export function getPeriodStartKey(
  period: HistoryPeriod,
  now: Date = new Date(),
): string {
  switch (period) {
    case 'today':
      return toDateKey(now);
    case 'week':
      return toDateKey(startOfWeek(now, { weekStartsOn: 6 }));
    case 'month':
      return toDateKey(startOfMonth(now));
  }
}

export function filterByPeriod(
  days: HistoryDay[],
  period: HistoryPeriod,
  now: Date = new Date(),
): HistoryDay[] {
  const startKey = getPeriodStartKey(period, now);
  return days.filter((day) => day.dateKey >= startKey);
}

export interface HistorySummary {
  taken: number;
  missed: number;
  total: number;
  /** Percentage of settled doses that were recorded, 0-100. Null when none. */
  adherence: number | null;
}

export function summarisePeriod(days: HistoryDay[]): HistorySummary {
  let taken = 0;
  let missed = 0;

  for (const day of days) {
    for (const dose of day.doses) {
      if (dose.state === 'taken') taken++;
      else missed++;
    }
  }

  const total = taken + missed;
  return {
    taken,
    missed,
    total,
    // Undefined rather than 0 when nothing settled yet: 0% would read as a
    // perfect failure rather than "no data"
    adherence: total === 0 ? null : Math.round((taken / total) * 100),
  };
}

// Calendar helpers for the week and month views

/** Fast lookup of a day's history by date key */
export function indexByDateKey(days: HistoryDay[]): Map<string, HistoryDay> {
  return new Map(days.map((day) => [day.dateKey, day]));
}

/** The seven days of the current Jalali week, Saturday first */
export function getWeekDates(now: Date = new Date()): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(now, { weekStartsOn: 6 }),
    end: endOfWeek(now, { weekStartsOn: 6 }),
  });
}

/**
 * Every cell of the current Jalali month grid, including the leading and
 * trailing days needed to fill whole weeks.
 */
export function getMonthGridDates(now: Date = new Date()): Date[] {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(now), { weekStartsOn: 6 }),
    end: endOfWeek(endOfMonth(now), { weekStartsOn: 6 }),
  });
}
