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

/**
 * Send a browser notification
 */
export function sendNotification(title: string, options?: NotificationOptions): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  return new Notification(title, {
    icon: '/favicon.svg',
    dir: 'rtl',
    lang: 'fa',
    ...options,
  });
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
