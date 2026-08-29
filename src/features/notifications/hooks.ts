import { useEffect, useRef, useCallback, useState } from 'react';
import { format } from 'date-fns-jalali';
import { useMedicationContext } from '../medications/context';
import {
  DOSAGE_TREND_LABEL,
  formatDaysUntil,
  fromDateKey,
  getDosageTrend,
} from '../medications/dosage';
import { isMedicationScheduledOn } from '../medications/schedule';
import {
  findDueReminder,
  getReminder,
  getReminderTimes,
  reminderKey,
} from '../medications/reminder';
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
  requestNotificationPermission,
  onPermissionChange,
  isMuted,
} from './notification-service';

type PermissionStatus = NotificationPermission | 'unsupported';

/**
 * Requests notification permission automatically once, on the first render
 * after the app opens, instead of waiting for the user to tap the bell.
 *
 * Only fires the browser prompt while permission is still 'default': once the
 * user has denied it, `Notification.requestPermission()` is a no-op that
 * returns 'denied' immediately, so re-asking would do nothing. `request` is
 * exposed for a manual retry button, which is the only way forward once the
 * automatic attempt has been answered without granting.
 */
export function useNotificationPermission() {
  const [status, setStatus] = useState<PermissionStatus>(() =>
    getNotificationPermission(),
  );

  const request = useCallback(async () => {
    const result = await requestNotificationPermission();
    setStatus(result);
    return result;
  }, []);

  useEffect(() => {
    if (status === 'default') {
      void request();
    }
    // Runs once per app open; `request` is stable and `status` is only read
    // for its initial value here, not to re-trigger on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps every mounted instance (sidebar, mobile bell, banner) consistent when
  // any one of them resolves the request.
  useEffect(() => onPermissionChange(() => setStatus(getNotificationPermission())), []);

  return { status, request };
}

/**
 * Fires each medication's reminders: the dose time, plus any snooze repeats.
 *
 * Matching is by time window rather than by comparing HH:mm strings, because a
 * snooze lands at an arbitrary offset that no scheduled time string contains.
 */
export function useNotificationChecker() {
  const { medications, intakeLogs, addIntakeLog } = useMedicationContext();
  // One entry per reminder already fired, so a repeat never doubles up
  const firedRef = useRef<Set<string>>(new Set());
  const alarmRef = useRef<{ stop: () => void } | null>(null);

  const checkMedications = useCallback(() => {
    const now = new Date();
    const todayKey = toDateKey(now);

    for (const med of medications) {
      if (!isMedicationScheduledOn(med, now)) continue;

      const reminder = getReminder(med);
      if (!reminder.enabled) continue;

      for (const time of med.times) {
        const scheduledTime = `${todayKey}T${time}:00`;
        const log = intakeLogs.find(
          (l) => l.medicationId === med.id && l.scheduledTime === scheduledTime,
        );
        if (log?.status === 'taken') continue;

        const scheduled = getScheduledDate(todayKey, time);
        const state = getDoseState({
          scheduled,
          log,
          createdAt: med.createdAt,
          now,
        });
        // Nothing to announce for a slot that predates the medication
        if (state === 'ignored') continue;

        const index = findDueReminder(getReminderTimes(scheduled, reminder), now);
        if (index === -1) continue;

        const key = reminderKey(med.id, scheduledTime, index);
        if (firedRef.current.has(key)) continue;
        firedRef.current.add(key);

        if (!log) {
          addIntakeLog({
            id: crypto.randomUUID(),
            medicationId: med.id,
            scheduledTime,
            takenAt: null,
            status: 'pending',
          });
        }

        // Tapping brings the app forward, handled by the service worker: a
        // worker notification has no page-side click handler.
        const isSnooze = index > 0;
        void sendNotification(
          isSnooze ? `یادآور مجدد: ${med.name}` : `وقت مصرف ${med.name}`,
          {
            body: isSnooze
              ? `دوز ${med.dosage} برای ساعت ${time} هنوز ثبت نشده است.`
              : `دوز: ${med.dosage}\nساعت ${time}`,
            tag: `med-${med.id}-${time}`,
            requireInteraction: true,
            // Without this the OS uses its default channel, which has a sound.
            // Setting it is what actually makes the two modes differ.
            silent: reminder.mode === 'notification',
          },
        );

        if (reminder.mode === 'alarm' && !isMuted()) {
          alarmRef.current?.stop();
          alarmRef.current = playAlarmSound();
        }
      }
    }
  }, [medications, intakeLogs, addIntakeLog]);

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

    for (const med of medications) {
      if (!isMedicationScheduledOn(med, now)) continue;
      // Reminders off means silent, including the missed-dose warning
      const reminder = getReminder(med);
      if (!reminder.enabled) continue;

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

        void sendNotification(`${med.name} مصرف نشد`, {
          body: `${formatMinutes(DOSE_WINDOW_MINUTES)} از ساعت ${time} گذشت و این دوز ثبت نشد.`,
          // A stable tag means a reload replaces the old notification instead of
          // stacking a duplicate
          tag: `dose-missed-${doseKey}-${todayKey}`,
          silent: reminder.mode === 'notification',
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
