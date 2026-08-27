import { useMemo } from 'react';
import { useMedicationContext } from './context';
import type { IntakeLog, MedicationWithLogs } from './types';
import { isMedicationScheduledOn } from './schedule';
import { getDoseState, getScheduledDate } from './dose-state';
import { buildHistory, HISTORY_DAYS } from './history';
import { toDateKey } from '@/lib/date';

// Scheduling primitives live in ./schedule; re-exported so existing callers
// keep importing them from here.
export { getCurrentDay, getDayOfWeek } from './schedule';

/**
 * Hook to get today's medications with their intake logs
 */
export function useTodayMedications(): MedicationWithLogs[] {
  const { medications, intakeLogs } = useMedicationContext();
  const todayDateStr = toDateKey(new Date());

  return useMemo(() => {
    const today = new Date();
    return medications
      .filter((med) => isMedicationScheduledOn(med, today))
      .map((med) => ({
        ...med,
        todayLogs: intakeLogs.filter(
          (log) =>
            log.medicationId === med.id &&
            log.scheduledTime.split('T')[0] === todayDateStr,
        ),
      }));
  }, [medications, intakeLogs, todayDateStr]);
}

/**
 * Hook to get medications scheduled for a specific date
 */
export function useMedicationsForDate(date: Date) {
  const { medications, intakeLogs } = useMedicationContext();
  const dateStr = toDateKey(date);

  return useMemo(() => {
    const target = new Date(dateStr + 'T00:00:00');
    return medications
      .filter((med) => isMedicationScheduledOn(med, target))
      .map((med) => ({
        ...med,
        todayLogs: intakeLogs.filter(
          (log) =>
            log.medicationId === med.id &&
            log.scheduledTime.split('T')[0] === dateStr,
        ),
      }));
  }, [medications, intakeLogs, dateStr]);
}

/**
 * Hook to get dashboard stats
 */
export function useDashboardStats() {
  const { medications, intakeLogs } = useMedicationContext();
  const todayDateStr = toDateKey(new Date());

  return useMemo(() => {
    const today = new Date();
    const activeMedications = medications.filter((m) => m.isActive);
    const todayMedications = activeMedications.filter((m) =>
      isMedicationScheduledOn(m, today),
    );

    const todayLogs = intakeLogs.filter(
      (log) => log.scheduledTime.split('T')[0] === todayDateStr,
    );
    const takenToday = todayLogs.filter((log) => log.status === 'taken').length;

    // Count only slots that were actually schedulable today. A medication added
    // this afternoon must not inflate the total with its morning slots.
    const totalTodayDoses = todayMedications.reduce((sum, med) => {
      const countable = med.times.filter(
        (time) =>
          getDoseState({
            scheduled: getScheduledDate(todayDateStr, time),
            createdAt: med.createdAt,
            now: today,
          }) !== 'ignored',
      ).length;
      return sum + countable;
    }, 0);

    return {
      totalMedications: medications.length,
      activeMedications: activeMedications.length,
      todayMedications: todayMedications.length,
      takenToday,
      totalTodayDoses,
      remainingToday: totalTodayDoses - takenToday,
    };
  }, [medications, intakeLogs, todayDateStr]);
}

/**
 * Hook that builds the history timeline, newest day first.
 *
 * Includes deleted medications, because their doses stay in history: see
 * buildHistory for why the timeline is reconstructed from the schedule rather
 * than read straight off the intake logs.
 */
export function useIntakeHistory(daysBack = HISTORY_DAYS) {
  const { medications, archivedMedications, intakeLogs } =
    useMedicationContext();

  return useMemo(
    () =>
      buildHistory({
        medications,
        archived: archivedMedications,
        logs: intakeLogs,
        days: daysBack,
      }),
    [medications, archivedMedications, intakeLogs, daysBack],
  );
}

/**
 * Generate intake logs for today if they don't exist yet
 */
export function useGenerateTodayLogs() {
  const { medications, intakeLogs, addIntakeLog } = useMedicationContext();
  const todayDateStr = toDateKey(new Date());

  return useMemo(() => {
    const today = new Date();
    const todayMedications = medications.filter((med) =>
      isMedicationScheduledOn(med, today),
    );

    const missingLogs: IntakeLog[] = [];

    for (const med of todayMedications) {
      for (const time of med.times) {
        const scheduledTime = `${todayDateStr}T${time}:00`;

        // Do not create a log for a slot that predates the medication, or it
        // would linger in storage as a dose that was never really scheduled
        const state = getDoseState({
          scheduled: getScheduledDate(todayDateStr, time),
          createdAt: med.createdAt,
          now: today,
        });
        if (state === 'ignored') continue;

        const exists = intakeLogs.some(
          (log) =>
            log.medicationId === med.id &&
            log.scheduledTime === scheduledTime,
        );
        if (!exists) {
          missingLogs.push({
            id: crypto.randomUUID(),
            medicationId: med.id,
            scheduledTime,
            takenAt: null,
            status: 'pending',
          });
        }
      }
    }

    return {
      missingLogs,
      generateLogs: () => {
        for (const log of missingLogs) {
          addIntakeLog(log);
        }
      },
    };
  }, [medications, intakeLogs, todayDateStr, addIntakeLog]);
}
