import { useNotificationChecker } from '../hooks';

/**
 * Invisible component that initializes the notification checking interval.
 * Must be rendered inside MedicationProvider.
 */
export function NotificationInitializer() {
  useNotificationChecker();
  return null;
}
