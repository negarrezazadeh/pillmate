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
    const todayDateStr = now.toISOString().split('T')[0];
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
