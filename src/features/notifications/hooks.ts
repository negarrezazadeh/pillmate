import { useEffect, useRef, useCallback } from 'react';
import { useMedicationContext } from '../medications/context';
import { getCurrentDay } from '../medications/hooks';
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
