import { useMemo } from 'react';
import { useMedicationContext } from './context';
import type { IntakeLog, MedicationWithLogs } from './types';
import { isMedicationScheduledOn } from './schedule';
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
    const totalTodayDoses = todayMedications.reduce(
      (sum, med) => sum + med.times.length,
      0,
    );

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
 * Hook to get intake history grouped by date (most recent first)
 */
export function useIntakeHistory(daysBack = 30) {
  const { medications, intakeLogs } = useMedicationContext();

  return useMemo(() => {
    // Only include non-pending logs (taken or missed)
    const historyLogs = intakeLogs.filter(
      (log) => log.status === 'taken' || log.status === 'missed',
    );

    // Group by date
    const grouped = new Map<string, IntakeLog[]>();
    for (const log of historyLogs) {
      const dateStr = log.scheduledTime.split('T')[0];
      if (!grouped.has(dateStr)) {
        grouped.set(dateStr, []);
      }
      grouped.get(dateStr)!.push(log);
    }

    // Sort dates descending and limit
    const sortedDates = [...grouped.keys()]
      .sort((a, b) => b.localeCompare(a))
      .slice(0, daysBack);

    // Build result with medication info
    return sortedDates.map((dateStr) => {
      const logs = grouped.get(dateStr)!;
      const logsWithMedInfo = logs
        .map((log) => {
          const med = medications.find((m) => m.id === log.medicationId);
          return med ? { ...log, medication: med } : null;
        })
        .filter(Boolean) as (IntakeLog & { medication: typeof medications[number] })[];

      // Sort by scheduled time
      logsWithMedInfo.sort((a, b) =>
        a.scheduledTime.localeCompare(b.scheduledTime),
      );

      return {
        date: dateStr,
        logs: logsWithMedInfo,
      };
    });
  }, [medications, intakeLogs, daysBack]);
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
