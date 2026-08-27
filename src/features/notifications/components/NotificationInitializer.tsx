import {
  useDosageChangeChecker,
  useMissedDoseChecker,
  useNotificationChecker,
} from '../hooks';

/**
 * Invisible component that initializes the notification checking intervals.
 * Must be rendered inside MedicationProvider.
 */
export function NotificationInitializer() {
  useNotificationChecker();
  useMissedDoseChecker();
  useDosageChangeChecker();
  return null;
}
