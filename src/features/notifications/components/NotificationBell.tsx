import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendNotification,
} from '../notification-service';

type Status = NotificationPermission | 'unsupported';

/**
 * Compact bell for the mobile header, where the sidebar's NotificationPermission
 * is hidden and there is otherwise no way to grant permission.
 *
 * When permission is already granted, tapping fires a real notification so the
 * user can confirm reminders actually arrive on their device.
 */
export function NotificationBell() {
  const [status, setStatus] = useState<Status>('default');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStatus(getNotificationPermission());
  }, []);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(id);
  }, [message]);

  const handleClick = async () => {
    if (status === 'unsupported') {
      setMessage('مرورگر شما از یادآور پشتیبانی نمی‌کند.');
      return;
    }

    if (status === 'denied') {
      setMessage('یادآور مسدود شده است. از تنظیمات مرورگر اجازه بدهید.');
      return;
    }

    if (status === 'default') {
      const result = await requestNotificationPermission();
      setStatus(result);
      if (result === 'granted') {
        const shown = await sendNotification('یادآور فعال شد', {
          body: 'از این پس زمان مصرف داروها به شما اطلاع داده می‌شود.',
          tag: 'permission-granted',
        });
        setMessage(shown ? 'یادآور فعال شد' : 'یادآور فعال شد، اما نمایش پیام ممکن نبود.');
      } else {
        setMessage('اجازه داده نشد.');
      }
      return;
    }

    // Already granted: prove it works
    const shown = await sendNotification('یادآور فعال است', {
      body: 'این یک پیام آزمایشی است.',
      tag: 'test-notification',
    });
    setMessage(shown ? 'پیام آزمایشی ارسال شد' : 'ارسال پیام ممکن نبود.');
  };

  const Icon =
    status === 'granted' ? BellRing : status === 'default' ? Bell : BellOff;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={
          status === 'granted' ? 'ارسال پیام آزمایشی' : 'فعال‌سازی یادآور'
        }
      >
        <Icon
          className={
            status === 'granted'
              ? 'h-5 w-5 text-green-600'
              : status === 'default'
                ? 'h-5 w-5'
                : 'h-5 w-5 text-muted-foreground'
          }
        />
      </Button>

      {/* The OS banner can be easy to miss, so confirm in-app as well */}
      {message && (
        <div
          role="status"
          className="absolute top-full mt-1 start-0 z-50 w-56 rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-md"
        >
          {message}
        </div>
      )}
    </div>
  );
}
