import { useState, useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useMedicationContext } from '../../medications/context';
import { getDayOfWeek } from '../../medications/hooks';
import { cn } from '../../../lib/utils';
import { DayDetail } from './DayDetail';

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { medications } = useMedicationContext();

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start week on Saturday (6)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 6 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Get medication colors for each day
  const dayMedicationColors = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const day of calendarDays) {
      const dayOfWeek = getDayOfWeek(day);
      const colors = medications
        .filter((med) => med.isActive && med.days.includes(dayOfWeek))
        .map((med) => med.color);
      if (colors.length > 0) {
        map.set(format(day, 'yyyy-MM-dd'), colors);
      }
    }
    return map;
  }, [calendarDays, medications]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              onClick={goToToday}
              className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium hover:bg-blue-100 transition-colors"
            >
              امروز
            </button>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-medium text-gray-500 py-2"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const colors = dayMedicationColors.get(dateKey) ?? [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'relative flex flex-col items-center py-2 rounded-lg transition-colors min-h-[52px]',
                  !isCurrentMonth && 'opacity-30',
                  isSelected
                    ? 'bg-blue-50 ring-2 ring-blue-500'
                    : 'hover:bg-gray-50',
                  isToday && !isSelected && 'bg-blue-50/50',
                )}
              >
                {/* Medication dots */}
                {colors.length > 0 && (
                  <div className="flex items-center gap-0.5 mb-0.5">
                    {colors.slice(0, 4).map((color, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {colors.length > 4 && (
                      <span className="text-[8px] text-gray-400">+</span>
                    )}
                  </div>
                )}

                {/* Day number */}
                <span
                  className={cn(
                    'text-sm',
                    isToday
                      ? 'font-bold text-blue-700'
                      : isCurrentMonth
                        ? 'text-gray-800'
                        : 'text-gray-400',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      {selectedDate && <DayDetail date={selectedDate} />}
    </div>
  );
}
