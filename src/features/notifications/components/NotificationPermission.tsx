import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationPermission } from '../hooks';
import { isMuted, setMuted } from '../notification-service';

export function NotificationPermission() {
  const { status: permission, request } = useNotificationPermission();
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  if (permission === 'granted') {
    return (
      <div className="space-y-1.5">
        <Badge variant="secondary" className="w-full justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          <CheckCircle className="h-3.5 w-3.5" />
          یادآور فعال است
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className="w-full gap-1.5 text-muted-foreground"
        >
          {muted ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
          {muted ? 'صدا خاموش است' : 'خاموش کردن صدا'}
        </Button>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <Badge variant="destructive" className="w-full justify-center gap-1.5 py-1.5">
        <BellOff className="h-3.5 w-3.5" />
        نوتیفیکیشن مسدود شده
      </Badge>
    );
  }

  if (permission === 'unsupported') {
    return (
      <Badge variant="outline" className="w-full justify-center gap-1.5 py-1.5">
        <BellOff className="h-3.5 w-3.5" />
        پشتیبانی نمی‌شود
      </Badge>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void request()} className="w-full gap-1.5">
      <Bell className="h-3.5 w-3.5" />
      فعال‌سازی یادآور
    </Button>
  );
}
