/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  return await Notification.requestPermission();
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

const MUTE_KEY = 'pillmate_notifications_muted';

/**
 * A global mute, separate from the per-medication reminder mode. That setting
 * chooses notification vs alarm for a specific medication; this one silences
 * every notification the app sends, regardless of that choice.
 */
export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, String(muted));
}

const BASE_OPTIONS: NotificationOptions = {
  icon: '/pwa-192x192.png',
  badge: '/pwa-192x192.png',
  dir: 'rtl',
  lang: 'fa',
};

/**
 * Shows a notification, preferring the service worker.
 *
 * `new Notification()` throws "Illegal constructor" on Android, where the only
 * supported path is ServiceWorkerRegistration.showNotification. The constructor
 * stays as a fallback for desktop browsers without an active worker.
 *
 * Clicks are handled by the worker (see public/sw-notification-click.js), not
 * here, because a page-side onclick never fires for a worker notification.
 */
export async function sendNotification(
  title: string,
  options?: NotificationOptions,
): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return false;
  }

  // Global mute overrides whatever the caller asked for
  const merged = {
    ...BASE_OPTIONS,
    ...options,
    ...(isMuted() ? { silent: true } : {}),
  };

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, merged);
      return true;
    } catch {
      // Fall through to the constructor below
    }
  }

  try {
    new Notification(title, merged);
    return true;
  } catch {
    return false;
  }
}

/**
 * Play alarm sound
 */
export function playAlarmSound(): { stop: () => void } {
  // Create a simple alarm using AudioContext
  const audioContext = new AudioContext();

  let stopped = false;
  const oscillators: OscillatorNode[] = [];

  function playBeep(frequency: number, startTime: number, duration: number) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // Fade in and out
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration - 0.05);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    oscillators.push(oscillator);
  }

  // Play a pattern: beep-beep-beep (repeat 3 times)
  const now = audioContext.currentTime;
  for (let rep = 0; rep < 3; rep++) {
    const offset = rep * 1.2;
    playBeep(880, now + offset, 0.15);
    playBeep(880, now + offset + 0.25, 0.15);
    playBeep(1100, now + offset + 0.5, 0.3);
  }

  return {
    stop: () => {
      if (!stopped) {
        stopped = true;
        oscillators.forEach((osc) => {
          try {
            osc.stop();
          } catch {
            // Already stopped
          }
        });
        audioContext.close();
      }
    },
  };
}
