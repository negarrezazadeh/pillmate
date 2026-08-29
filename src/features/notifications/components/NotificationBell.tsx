import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useNotificationPermission } from '../hooks';
import { isMuted, sendNotification, setMuted } from '../notification-service';

/**
 * Bell for the mobile header.
 *
 * Permission itself is requested automatically on app open (see
 * useNotificationPermission / NotificationPermissionBanner) rather than from
 * here, so this shares that same status instead of tracking its own. Tapping
 * while permission is still 'default' offers a manual retry for whoever
 * dismissed the browser prompt; once granted, tapping opens the mute dialog
 * instead of firing a test notification on every tap.
 */
export function NotificationBell() {
  const { status, request } = useNotificationPermission();
  const [muted, setMutedState] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMutedState(isMuted());
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
      const result = await request();
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

    // Already granted: open settings instead of firing another test notification
    setDialogOpen(true);
  };

  const toggleMute = (value: boolean) => {
    setMuted(value);
    setMutedState(value);
  };

  const sendTest = async () => {
    const shown = await sendNotification('یادآور فعال است', {
      body: 'این یک پیام آزمایشی است.',
      tag: 'test-notification',
    });
    setMessage(shown ? 'پیام آزمایشی ارسال شد' : 'ارسال پیام ممکن نبود.');
  };

  const Icon =
    status !== 'granted'
      ? status === 'default'
        ? Bell
        : BellOff
      : muted
        ? BellOff
        : BellRing;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-label={
          status === 'granted' ? 'تنظیمات یادآور' : 'فعال‌سازی یادآور'
        }
      >
        <Icon
          className={
            status !== 'granted'
              ? 'h-5 w-5 text-muted-foreground'
              : muted
                ? 'h-5 w-5 text-muted-foreground'
                : 'h-5 w-5 text-emerald-500'
          }
        />
      </Button>

      {message && (
        <div
          role="status"
          className="absolute top-full mt-1 start-0 z-50 w-56 rounded-lg border bg-popover p-2 text-xs text-popover-foreground shadow-md"
        >
          {message}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تنظیمات یادآور</DialogTitle>
            <DialogDescription>
              یادآور برای شما فعال است. می‌توانید صدای آن را خاموش کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2.5">
              {muted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-primary" />
              )}
              <div>
                <Label htmlFor="mute-notifications">بی‌صدا</Label>
                <p className="text-xs text-muted-foreground">
                  در هر دو حالت نوتیفیکیشن و آلارم، صدا پخش نمی‌شود.
                </p>
              </div>
            </div>
            <Switch
              id="mute-notifications"
              checked={muted}
              onCheckedChange={toggleMute}
            />
          </div>

          <Button variant="outline" onClick={sendTest} className="gap-1.5">
            <Bell className="h-4 w-4" />
            ارسال پیام آزمایشی
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
