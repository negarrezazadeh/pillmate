import { useDosageChangeChecker, useNotificationChecker } from '../hooks';

/**
 * Invisible component that initializes the notification checking intervals.
 * Must be rendered inside MedicationProvider.
 */
export function NotificationInitializer() {
  useNotificationChecker();
  useDosageChangeChecker();
  return null;
}
