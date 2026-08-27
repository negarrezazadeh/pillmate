import { useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns-jalali';
import { useMedicationContext } from '../medications/context';
import { getCurrentDay } from '../medications/hooks';
import {
  DOSAGE_TREND_LABEL,
  formatDaysUntil,
  fromDateKey,
  getDosageTrend,
} from '../medications/dosage';
import { isMedicationScheduledOn } from '../medications/schedule';
import {
  DOSE_WINDOW_MINUTES,
  formatMinutes,
  getDoseState,
  getScheduledDate,
} from '../medications/dose-state';
import { toDateKey } from '@/lib/date';
import {
  sendNotification,
  playAlarmSound,
  getNotificationPermission,
} from './notification-service';

/**
 * Hook that checks medication times every minute and sends notifications + plays alarm
 */
export function useNotificationChecker() {
  const { medications, intakeLogs, addIntakeLog, updateIntakeLog } = useMedicationContext();
  const lastCheckedRef = useRef<string>('');
  const alarmRef = useRef<{ stop: () => void } | null>(null);

  const checkMedications = useCallback(() => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todayDateStr = toDateKey(now);
    const today = getCurrentDay();

    // Avoid checking same minute twice
    const checkKey = `${todayDateStr}-${currentTime}`;
    if (lastCheckedRef.current === checkKey) return;
    lastCheckedRef.current = checkKey;

    // Get medications that should be taken now
    const dueMedications = medications.filter(
      (med) => med.isActive && med.days.includes(today) && med.times.includes(currentTime),
    );

    if (dueMedications.length === 0) return;

    // Check which ones haven't been taken yet
    for (const med of dueMedications) {
      const scheduledTime = `${todayDateStr}T${currentTime}:00`;
      const existingLog = intakeLogs.find(
        (log) =>
          log.medicationId === med.id && log.scheduledTime === scheduledTime,
      );

      // If already taken, skip
      if (existingLog?.status === 'taken') continue;

      // Create log if doesn't exist
      if (!existingLog) {
        addIntakeLog({
          id: crypto.randomUUID(),
          medicationId: med.id,
          scheduledTime,
          takenAt: null,
          status: 'pending',
        });
      }

      // Send notification
      if (getNotificationPermission() === 'granted') {
        const notification = sendNotification(`وقت مصرف ${med.name}`, {
          body: `دوز: ${med.dosage}\nساعت ${currentTime}`,
          tag: `med-${med.id}-${currentTime}`,
          requireInteraction: true,
        });

        // Handle notification click - mark as taken
        if (notification) {
          notification.onclick = () => {
            const log = intakeLogs.find(
              (l) =>
                l.medicationId === med.id && l.scheduledTime === scheduledTime,
            );
            if (log && log.status !== 'taken') {
              updateIntakeLog({
                ...log,
                status: 'taken',
                takenAt: new Date().toISOString(),
              });
            }
            notification.close();
          };
        }
      }

      // Play alarm sound
      if (alarmRef.current) {
        alarmRef.current.stop();
      }
      alarmRef.current = playAlarmSound();
    }
  }, [medications, intakeLogs, addIntakeLog, updateIntakeLog]);

  useEffect(() => {
    // Check immediately
    checkMedications();

    // Check every 30 seconds (to catch the minute boundary reliably)
    const interval = setInterval(checkMedications, 30_000);

    return () => {
      clearInterval(interval);
      if (alarmRef.current) {
        alarmRef.current.stop();
      }
    };
  }, [checkMedications]);
}

/**
 * Hook that applies due dosage changes and notifies the user ahead of time:
 * two days before, one day before, and on the day the new dosage starts.
 *
 * Runs on mount and then hourly, so the reminder lands even if the app stays
 * open across midnight.
 */
export function useDosageChangeChecker() {
  const { processDosageChanges } = useMedicationContext();

  const checkDosageChanges = useCallback(() => {
    const alerts = processDosageChanges();
    if (alerts.length === 0) return;

    for (const alert of alerts) {
      const trend = getDosageTrend(alert.fromDosage, alert.toDosage);
      const when = formatDaysUntil(alert.daysUntil);
      const jalaliDate = format(fromDateKey(alert.effectiveDate), 'd MMMM yyyy');

      const title =
        alert.daysUntil === 0
          ? `دوز ${alert.medicationName} از امروز تغییر کرد`
          : `${DOSAGE_TREND_LABEL[trend]} ${alert.medicationName} ${when}`;

      const body =
        alert.daysUntil === 0
          ? `دوز جدید: ${alert.toDosage} (قبلاً ${alert.fromDosage})`
          : `${jalaliDate} دوز از ${alert.fromDosage} به ${alert.toDosage} تغییر می‌کند.`;

      if (getNotificationPermission() === 'granted') {
        sendNotification(title, {
          body,
          tag: `dosage-change-${alert.medicationId}-${alert.daysUntil}`,
          requireInteraction: alert.daysUntil === 0,
        });
      }
    }
  }, [processDosageChanges]);

  useEffect(() => {
    checkDosageChanges();

    // Hourly is enough for a day-granularity reminder and cheap to run
    const interval = setInterval(checkDosageChanges, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkDosageChanges]);
}

/**
 * Hook that notifies once the take window has elapsed on a dose that was never
 * marked as taken.
 *
 * This is the boundary between the "due" and "missed" states: the alarm at the
 * scheduled time is handled by useNotificationChecker, and this fires
 * DOSE_WINDOW_MINUTES later.
 */
export function useMissedDoseChecker() {
  const { medications, intakeLogs } = useMedicationContext();
  // Doses already announced this session, so a re-render does not re-notify
  const announcedRef = useRef<Set<string>>(new Set());

  const checkMissed = useCallback(() => {
    if (getNotificationPermission() !== 'granted') return;

    const now = new Date();
    const todayKey = toDateKey(now);
    const today = getCurrentDay();

    for (const med of medications) {
      if (!isMedicationScheduledOn(med, now)) continue;
      if (!med.days.includes(today)) continue;

      for (const time of med.times) {
        const scheduledTime = `${todayKey}T${time}:00`;
        const log = intakeLogs.find(
          (l) => l.medicationId === med.id && l.scheduledTime === scheduledTime,
        );

        const scheduled = getScheduledDate(todayKey, time);
        const state = getDoseState({
          scheduled,
          log,
          createdAt: med.createdAt,
          now,
        });
        // 'ignored' slots predate the medication, so there is nothing to warn
        // about; only a genuinely elapsed window counts
        if (state !== 'missed') continue;

        const doseKey = `${med.id}-${time}`;
        if (announcedRef.current.has(doseKey)) continue;
        announcedRef.current.add(doseKey);

        sendNotification(`${med.name} مصرف نشد`, {
          body: `${formatMinutes(DOSE_WINDOW_MINUTES)} از ساعت ${time} گذشت و این دوز ثبت نشد.`,
          // A stable tag means a reload replaces the old notification instead of
          // stacking a duplicate
          tag: `dose-missed-${doseKey}-${todayKey}`,
        });
      }
    }
  }, [medications, intakeLogs]);

  useEffect(() => {
    checkMissed();

    // The window boundary only needs minute-level accuracy
    const interval = setInterval(checkMissed, 60_000);

    return () => clearInterval(interval);
  }, [checkMissed]);
}
