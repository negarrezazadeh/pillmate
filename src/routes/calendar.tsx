import { createFileRoute } from '@tanstack/react-router';
import { CalendarView } from '../features/calendar/components/CalendarView';

export const Route = createFileRoute('/calendar')({
  component: CalendarPage,
});

function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">تقویم دارویی</h2>
        <p className="text-sm text-gray-500 mt-1">مشاهده برنامه مصرف دارو در تقویم</p>
      </div>
      <CalendarView />
    </div>
  );
}
