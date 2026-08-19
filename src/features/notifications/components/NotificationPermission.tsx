import { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getNotificationPermission,
  requestNotificationPermission,
} from '../notification-service';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleRequest = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  if (permission === 'granted') {
    return (
      <Badge variant="secondary" className="w-full justify-center gap-1.5 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300">
        <CheckCircle className="h-3.5 w-3.5" />
        یادآور فعال است
      </Badge>
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
    <Button variant="outline" size="sm" onClick={handleRequest} className="w-full gap-1.5">
      <Bell className="h-3.5 w-3.5" />
      فعال‌سازی یادآور
    </Button>
  );
}
