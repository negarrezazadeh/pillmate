import { getJalaliMonthStart, getJalaliWeekStart } from '@/lib/jalali';
import type { ArchivedMedication, IntakeLog, Medication } from './types';
import { getDoseState, getScheduledDate } from './dose-state';
import { getDayOfWeek, getMedicationStartKey } from './schedule';
import { toDateKey } from '@/lib/date';

export const HISTORY_DAYS = 90;

export type HistoryDoseState = 'taken' | 'missed';

export interface HistoryDose {
  key: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  color: string;
  time: string;
  state: HistoryDoseState;
  takenAt: string | null;
  isArchived: boolean;
}

export type HistoryEventKind = 'added' | 'removed' | 'dosage-change';

export interface HistoryEvent {
  key: string;
  kind: HistoryEventKind;
  medicationName: string;
  color: string;
  detail?: string;
}

export interface HistoryDay {
  dateKey: string;
  doses: HistoryDose[];
  events: HistoryEvent[];
}

interface BuildHistoryInput {
  medications: Medication[];
  archived: ArchivedMedication[];
  logs: IntakeLog[];
  days?: number;
  now?: Date;
}

function timeOf(scheduledTime: string): string {
  return scheduledTime.split('T')[1]?.slice(0, 5) ?? '';
}

function dateKeyOf(scheduledTime: string): string {
  return scheduledTime.split('T')[0];
}

/**
 * `dosageHistory` stores the dosage that was superseded, so the value it changed
 * *to* is the next entry's dosage, or the current dosage for the last entry.
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
 * Doses are reconstructed from each medication's schedule rather than read off
 * the logs, because logs only exist for days the app was opened - exactly the
 * days least likely to contain a recorded dose. The times considered per day are
 * the union of the scheduled times and any times that already have a log, so
 * editing a schedule cannot make recorded doses vanish. `isActive` is ignored on
 * purpose: it describes today, and applying it would erase a paused
 * medication's past.
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

      const withinLifetime =
        dateKey >= getMedicationStartKey(medication) &&
        (deletedKey === null || dateKey <= deletedKey);
      const scheduledToday =
        withinLifetime && medication.days.includes(weekday);

      const times = new Set<string>(scheduledToday ? medication.times : []);
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

  return result;
}

export function summariseDay(day: HistoryDay): {
  taken: number;
  missed: number;
} {
  return {
    taken: day.doses.filter((d) => d.state === 'taken').length,
    missed: day.doses.filter((d) => d.state === 'missed').length,
  };
}

export type HistoryPeriod = 'today' | 'week' | 'month';

export const HISTORY_PERIOD_LABEL: Record<HistoryPeriod, string> = {
  today: 'امروز',
  week: 'این هفته',
  month: 'این ماه',
};

export const HISTORY_PERIODS: HistoryPeriod[] = ['today', 'week', 'month'];

/**
 * Week and month bounds come from the Jalali calendar: a Gregorian month would
 * cut the list at a date that means nothing on screen.
 */
export function getPeriodStartKey(
  period: HistoryPeriod,
  now: Date = new Date(),
): string {
  switch (period) {
    case 'today':
      return toDateKey(now);
    case 'week':
      return toDateKey(getJalaliWeekStart(now));
    case 'month':
      return toDateKey(getJalaliMonthStart(now));
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
  /** 0-100, or null when nothing has settled yet. */
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
    // null, not 0: 0% reads as total failure rather than "no data"
    adherence: total === 0 ? null : Math.round((taken / total) * 100),
  };
}

export function indexByDateKey(days: HistoryDay[]): Map<string, HistoryDay> {
  return new Map(days.map((day) => [day.dateKey, day]));
}
