import { useMemo } from 'react';
import { useMedicationContext } from './context';
import type { DayOfWeek, IntakeLog, MedicationWithLogs } from './types';

/**
 * Get the current day of week as DayOfWeek type
 */
export function getCurrentDay(): DayOfWeek {
  const dayMap: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return dayMap[new Date().getDay()];
}

/**
 * Get day of week for a specific date
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const dayMap: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return dayMap[date.getDay()];
}

/**
 * Hook to get today's medications with their intake logs
 */
export function useTodayMedications(): MedicationWithLogs[] {
  const { medications, intakeLogs } = useMedicationContext();
  const today = getCurrentDay();
  const todayDateStr = new Date().toISOString().split('T')[0];

  return useMemo(() => {
    return medications
      .filter((med) => med.isActive && med.days.includes(today))
      .map((med) => ({
        ...med,
        todayLogs: intakeLogs.filter(
          (log) =>
            log.medicationId === med.id &&
            log.scheduledTime.split('T')[0] === todayDateStr,
        ),
      }));
  }, [medications, intakeLogs, today, todayDateStr]);
}

/**
 * Hook to get medications scheduled for a specific date
 */
export function useMedicationsForDate(date: Date) {
  const { medications, intakeLogs } = useMedicationContext();
  const dayOfWeek = getDayOfWeek(date);
  const dateStr = date.toISOString().split('T')[0];

  return useMemo(() => {
    return medications
      .filter((med) => med.isActive && med.days.includes(dayOfWeek))
      .map((med) => ({
        ...med,
        todayLogs: intakeLogs.filter(
          (log) =>
            log.medicationId === med.id &&
            log.scheduledTime.split('T')[0] === dateStr,
        ),
      }));
  }, [medications, intakeLogs, dayOfWeek, dateStr]);
}

/**
 * Hook to get dashboard stats
 */
export function useDashboardStats() {
  const { medications, intakeLogs } = useMedicationContext();
  const todayDateStr = new Date().toISOString().split('T')[0];
  const today = getCurrentDay();

  return useMemo(() => {
    const activeMedications = medications.filter((m) => m.isActive);
    const todayMedications = activeMedications.filter((m) =>
      m.days.includes(today),
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
  }, [medications, intakeLogs, todayDateStr, today]);
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
  const today = getCurrentDay();
  const todayDateStr = new Date().toISOString().split('T')[0];

  return useMemo(() => {
    const todayMedications = medications.filter(
      (med) => med.isActive && med.days.includes(today),
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
  }, [medications, intakeLogs, today, todayDateStr, addIntakeLog]);
}
