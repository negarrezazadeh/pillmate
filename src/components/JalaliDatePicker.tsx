import { useMemo, useState } from 'react';
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  subMonths,
} from 'date-fns-jalali';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fromDateKey, toDateKey } from '@/lib/date';
import { JALALI_WEEKDAY_LABELS, getJalaliMonthGrid } from '@/lib/jalali';
import { Button } from '@/components/ui/button';

interface JalaliDatePickerProps {
  id?: string;
  /** Gregorian date key (YYYY-MM-DD), or '' when nothing is selected */
  value: string;
  onChange: (dateKey: string) => void;
  /** Inclusive lower bound as a date key; earlier days are disabled */
  minDateKey?: string;
  placeholder?: string;
}

/**
 * Persian (Jalali) calendar picker.
 *
 * Displays and navigates in the Jalali calendar but emits a Gregorian
 * `YYYY-MM-DD` key, so storage and date arithmetic stay on one representation.
 * The panel expands inline rather than floating, because this is used inside a
 * scrollable dialog where an absolutely positioned popover would get clipped.
 */
export function JalaliDatePicker({
  id,
  value,
  onChange,
  minDateKey,
  placeholder = 'انتخاب تاریخ',
}: JalaliDatePickerProps) {
  const selected = value ? fromDateKey(value) : null;
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => selected ?? new Date());

  const days = useMemo(() => getJalaliMonthGrid(viewMonth), [viewMonth]);

  const handlePick = (day: Date) => {
    onChange(toDateKey(day));
    setOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    setViewMonth(today);
    handlePick(today);
  };

  return (
    <div className="space-y-2">
      <Button
        id={id}
        type="button"
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full justify-start gap-2 font-normal"
      >
        <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        {selected ? (
          format(selected, 'EEEE d MMMM yyyy')
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      {open && (
        <div className="rounded-lg border bg-card p-3">
          {/* Month navigation - chevrons follow RTL reading order */}
          <div className="flex items-center justify-between mb-3">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              aria-label="ماه قبل"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {format(viewMonth, 'MMMM yyyy')}
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={goToToday}>
                امروز
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              aria-label="ماه بعد"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {JALALI_WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] font-medium text-muted-foreground py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayKey = toDateKey(day);
              const inMonth = isSameMonth(day, viewMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = selected ? isSameDay(day, selected) : false;
              const isDisabled = minDateKey ? dayKey < minDateKey : false;

              return (
                <button
                  key={dayKey}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handlePick(day)}
                  className={cn(
                    'h-9 rounded-md text-sm transition-colors',
                    !inMonth && 'opacity-40',
                    isDisabled && 'opacity-25 cursor-not-allowed',
                    !isDisabled && !isSelected && 'hover:bg-muted',
                    isSelected && 'bg-primary text-primary-foreground font-medium',
                    isToday && !isSelected && 'ring-1 ring-primary text-primary font-medium',
                  )}
                  aria-label={format(day, 'EEEE d MMMM yyyy')}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
