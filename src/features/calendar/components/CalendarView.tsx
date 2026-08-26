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
} from 'date-fns-jalali';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { useMedicationContext } from '../../medications/context';
import { isMedicationScheduledOn } from '../../medications/schedule';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DayDetail } from './DayDetail';

const WEEKDAY_LABELS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

/** Dots shown per day cell before collapsing the rest into a +N marker */
const MAX_DAY_DOTS = 2;

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { medications } = useMedicationContext();

  // Generate calendar days (Jalali calendar, week starts Saturday)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start week on Saturday (6)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 6 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 6 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // Medication colors per day. Keyed by Gregorian date key so it lines up with
  // how schedules and logs are stored.
  const dayMedicationColors = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const day of calendarDays) {
      const colors = medications
        .filter((med) => isMedicationScheduledOn(med, day))
        .map((med) => med.color);
      if (colors.length > 0) {
        map.set(toDateKey(day), colors);
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
      <Card>
        <CardContent className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <Button variant="secondary" size="sm" onClick={goToToday}>
                امروز
              </Button>
            </div>

            <Button variant="ghost" size="icon" onClick={goToNextMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
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
                      ? 'bg-primary/10 ring-2 ring-primary'
                      : 'hover:bg-muted',
                    isToday && !isSelected && 'bg-primary/5',
                  )}
                >
                  {/* Medication dots, capped at MAX_DAY_DOTS with the rest
                      collapsed into a +N marker, because more dots than that
                      do not fit a day cell on a phone.
                      The row is always rendered so day numbers stay aligned
                      across cells with and without medications. */}
                  <div className="flex items-center justify-center gap-0.5 mb-0.5 h-2">
                    {colors.slice(0, MAX_DAY_DOTS).map((color, i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    {colors.length > MAX_DAY_DOTS && (
                      <span className="text-[9px] leading-none text-muted-foreground font-medium">
                        +{colors.length - MAX_DAY_DOTS}
                      </span>
                    )}
                  </div>

                  {/* Day number (Persian digits via format) */}
                  <span
                    className={cn(
                      'text-sm',
                      isToday
                        ? 'font-bold text-primary'
                        : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day detail */}
      {selectedDate && <DayDetail date={selectedDate} />}
    </div>
  );
}
