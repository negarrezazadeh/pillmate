import { useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationPermission } from '../hooks';

/**
 * Reminds the user to grant notification permission on every app open where
 * it is still missing. The automatic request in useNotificationPermission
 * covers the 'default' case (the browser prompt appears on its own); this
 * banner also covers 'denied', which the browser prompt cannot recover from,
 * by pointing at the browser's own site settings.
 *
 * Dismissing hides it for the current session only - it is not stored, so it
 * reappears next time the app is opened, matching "every time they open it
 * and haven't granted access, remind them."
 */
export function NotificationPermissionBanner() {
  const { status, request } = useNotificationPermission();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === 'granted' || status === 'unsupported') {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <BellRing className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">یادآور دارو فعال نیست</p>
        <p className="text-xs text-muted-foreground">
          {status === 'denied'
            ? 'دسترسی مسدود شده است. از تنظیمات مرورگر برای این سایت اجازه بدهید.'
            : 'بدون اجازه، وقت مصرف داروها به شما اطلاع داده نمی‌شود.'}
        </p>
      </div>
      {status === 'default' && (
        <Button size="sm" onClick={() => void request()}>
          فعال‌سازی
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="بستن"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
