import { useMemo, useState } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns-jalali';
import type { LucideIcon } from 'lucide-react';
import { useIntakeHistory } from '../hooks';
import {
  HISTORY_PERIODS,
  HISTORY_PERIOD_LABEL,
  filterByPeriod,
  indexByDateKey,
  summarisePeriod,
  summariseDay,
  type HistoryDay,
  type HistoryDose,
  type HistoryEvent,
  type HistoryEventKind,
  type HistoryPeriod,
} from '../history';
import {
  CheckCircle2,
  Clock,
  Pencil,
  PlusCircle,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fromDateKey, toDateKey } from '@/lib/date';
import {
  JALALI_WEEKDAY_LABELS,
  getJalaliMonthGrid,
  getJalaliWeek,
} from '@/lib/jalali';
import { cn } from '@/lib/utils';

const EVENT_GROUP: Record<
  HistoryEventKind,
  { label: string; icon: LucideIcon; tone: string }
> = {
  added: { label: 'دارو ثبت شده', icon: PlusCircle, tone: 'text-primary' },
  removed: { label: 'دارو حذف شده', icon: Trash2, tone: 'text-destructive' },
  'dosage-change': {
    label: 'دوز تغییر کرده',
    icon: Pencil,
    tone: 'text-orange-600',
  },
};

const EVENT_ORDER: HistoryEventKind[] = ['added', 'dosage-change', 'removed'];

/** Plain SVG rather than a chart library: this is two arcs and a label. */
function AdherenceDonut({ taken, missed }: { taken: number; missed: number }) {
  const total = taken + missed;
  const size = 168;
  const stroke = 20;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const takenLength = total === 0 ? 0 : (taken / total) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* -90deg so the first segment starts at twelve o'clock */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* Missed is the remainder, so it sits underneath as the full ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={total === 0 ? 'stroke-muted' : 'stroke-rose-500'}
        />
        {taken > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${takenLength} ${circumference - takenLength}`}
            className="stroke-emerald-500"
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground">نوبت</span>
      </div>
    </div>
  );
}

function Group({
  label,
  icon: Icon,
  tone,
  count,
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', tone)}>
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
        <span className="text-muted-foreground font-normal">({count})</span>
      </div>
      <div className="divide-y divide-border ps-1">{children}</div>
    </div>
  );
}

function ItemRow({
  color,
  name,
  secondary,
  trailing,
  isArchived,
}: {
  color: string;
  name: string;
  secondary?: string;
  trailing?: React.ReactNode;
  isArchived?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate flex items-center gap-1.5">
            {name}
            {isArchived && (
              <span className="text-[10px] font-normal text-muted-foreground border rounded px-1 py-px shrink-0">
                حذف‌شده
              </span>
            )}
          </p>
          {secondary && (
            <p className="text-xs text-muted-foreground truncate">{secondary}</p>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

function DoseTime({ dose }: { dose: HistoryDose }) {
  const takenAtTime = dose.takenAt
    ? new Date(dose.takenAt).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
      <Clock className="h-3.5 w-3.5" />
      <span>{dose.time}</span>
      {takenAtTime && takenAtTime !== dose.time && (
        <span className="text-emerald-700 dark:text-emerald-400">
          ({takenAtTime})
        </span>
      )}
    </div>
  );
}

function DayGroups({ day }: { day: HistoryDay }) {
  const eventsByKind = useMemo(() => {
    const map = new Map<HistoryEventKind, HistoryEvent[]>();
    for (const event of day.events) {
      map.set(event.kind, [...(map.get(event.kind) ?? []), event]);
    }
    return map;
  }, [day.events]);

  const taken = day.doses.filter((d) => d.state === 'taken');
  const missed = day.doses.filter((d) => d.state === 'missed');

  return (
    <div className="space-y-4">
      {EVENT_ORDER.map((kind) => {
        const events = eventsByKind.get(kind);
        if (!events || events.length === 0) return null;
        const group = EVENT_GROUP[kind];

        return (
          <Group
            key={kind}
            label={group.label}
            icon={group.icon}
            tone={group.tone}
            count={events.length}
          >
            {events.map((event) => (
              <ItemRow
                key={event.key}
                color={event.color}
                name={event.medicationName}
                secondary={event.detail}
              />
            ))}
          </Group>
        );
      })}

      {taken.length > 0 && (
        <Group
          label="مصرف شده"
          icon={CheckCircle2}
          tone="text-emerald-500"
          count={taken.length}
        >
          {taken.map((dose) => (
            <ItemRow
              key={dose.key}
              color={dose.color}
              name={dose.medicationName}
              secondary={dose.dosage}
              isArchived={dose.isArchived}
              trailing={<DoseTime dose={dose} />}
            />
          ))}
        </Group>
      )}

      {missed.length > 0 && (
        <Group
          label="فراموش شده"
          icon={XCircle}
          tone="text-destructive"
          count={missed.length}
        >
          {missed.map((dose) => (
            <ItemRow
              key={dose.key}
              color={dose.color}
              name={dose.medicationName}
              secondary={dose.dosage}
              isArchived={dose.isArchived}
              trailing={<DoseTime dose={dose} />}
            />
          ))}
        </Group>
      )}
    </div>
  );
}

function WeekChart({
  dates,
  byDate,
  selectedKey,
  onSelect,
  today,
}: {
  dates: Date[];
  byDate: Map<string, HistoryDay>;
  selectedKey: string | null;
  onSelect: (dateKey: string) => void;
  today: Date;
}) {
  const columns = dates.map((date) => {
    const dateKey = toDateKey(date);
    const day = byDate.get(dateKey);
    const counts = day ? summariseDay(day) : { taken: 0, missed: 0 };
    return {
      date,
      dateKey,
      ...counts,
      total: counts.taken + counts.missed,
      isFuture: dateKey > toDateKey(today),
    };
  });

  // Scaled against the busiest day so the tallest bar always fills the track
  const max = Math.max(1, ...columns.map((c) => c.total));
  const trackHeight = 96;

  return (
    <div className="grid grid-cols-7 gap-1">
      {columns.map((column, index) => {
        const isSelected = column.dateKey === selectedKey;
        const takenHeight = (column.taken / max) * trackHeight;
        const missedHeight = (column.missed / max) * trackHeight;

        return (
          <button
            key={column.dateKey}
            type="button"
            disabled={column.isFuture || column.total === 0}
            onClick={() => onSelect(column.dateKey)}
            aria-pressed={isSelected}
            aria-label={`${format(column.date, 'EEEE d MMMM')}: ${column.taken} مصرف‌شده، ${column.missed} فراموش‌شده`}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors',
              column.isFuture && 'opacity-30',
              isSelected ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted',
              (column.isFuture || column.total === 0) &&
                'cursor-not-allowed hover:bg-transparent',
            )}
          >
            <div
              className="w-full flex flex-col justify-end items-center"
              style={{ height: trackHeight }}
            >
              {column.total === 0 ? (
                <div className="w-full h-1 rounded-sm bg-muted" />
              ) : (
                <div className="w-full flex flex-col justify-end overflow-hidden rounded-sm">
                  {column.missed > 0 && (
                    <div
                      className="w-full bg-destructive/70"
                      style={{ height: Math.max(3, missedHeight) }}
                    />
                  )}
                  {column.taken > 0 && (
                    <div
                      className="w-full bg-emerald-500"
                      style={{ height: Math.max(3, takenHeight) }}
                    />
                  )}
                </div>
              )}
            </div>

            <span className="text-[11px] text-muted-foreground">
              {JALALI_WEEKDAY_LABELS[index]}
            </span>
            <span
              className={cn(
                'text-xs',
                isSameDay(column.date, today)
                  ? 'font-bold text-primary'
                  : 'text-foreground',
              )}
            >
              {format(column.date, 'd')}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MonthGrid({
  dates,
  byDate,
  selectedKey,
  onSelect,
  today,
  month,
}: {
  dates: Date[];
  byDate: Map<string, HistoryDay>;
  selectedKey: string | null;
  onSelect: (dateKey: string) => void;
  today: Date;
  month: Date;
}) {
  const todayKey = toDateKey(today);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7">
        {JALALI_WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-medium text-muted-foreground py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dates.map((date) => {
          const dateKey = toDateKey(date);
          const day = byDate.get(dateKey);
          const counts = day ? summariseDay(day) : { taken: 0, missed: 0 };
          const total = counts.taken + counts.missed;
          const inMonth = isSameMonth(date, month);
          const isFuture = dateKey > todayKey;
          const isSelected = dateKey === selectedKey;

          const tone =
            total === 0
              ? null
              : counts.missed === 0
                ? 'bg-emerald-500'
                : counts.taken === 0
                  ? 'bg-destructive'
                  : 'bg-orange-500';

          return (
            <button
              key={dateKey}
              type="button"
              disabled={total === 0}
              onClick={() => onSelect(dateKey)}
              aria-pressed={isSelected}
              aria-label={`${format(date, 'd MMMM')}: ${counts.taken} مصرف‌شده، ${counts.missed} فراموش‌شده`}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg py-2 min-h-[46px] transition-colors',
                !inMonth && 'opacity-30',
                isFuture && 'opacity-40',
                isSelected
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : total > 0 && 'hover:bg-muted',
                total === 0 && 'cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  isSameDay(date, today)
                    ? 'font-bold text-primary'
                    : 'text-foreground',
                )}
              >
                {format(date, 'd')}
              </span>
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  tone ?? 'bg-transparent',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function HistoryView() {
  const history = useIntakeHistory();
  const [period, setPeriod] = useState<HistoryPeriod>('week');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const todayKey = toDateKey(now);

  const periodDays = useMemo(
    () => filterByPeriod(history, period, now),
    [history, period, now],
  );
  const summary = useMemo(() => summarisePeriod(periodDays), [periodDays]);
  const byDate = useMemo(() => indexByDateKey(history), [history]);

  const weekDates = useMemo(() => getJalaliWeek(now), [now]);
  const monthDates = useMemo(() => getJalaliMonthGrid(now), [now]);

  const changePeriod = (next: HistoryPeriod) => {
    setPeriod(next);
    setSelectedKey(null);
  };

  // Week and month select nothing until the user picks a day: defaulting to
  // today would show a "today" card under a chart about the whole period
  const effectiveKey = period === 'today' ? todayKey : selectedKey;
  const selectedDay = effectiveKey ? byDate.get(effectiveKey) : undefined;
  const showDetail = period === 'today' || selectedKey !== null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">تاریخچه مصرف</h2>
        <p className="text-sm text-muted-foreground mt-1">
          سوابق مصرف داروهای شما، شامل داروهایی که حذف کرده‌اید
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted w-fit">
        {HISTORY_PERIODS.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={period === option ? 'default' : 'ghost'}
            onClick={() => changePeriod(option)}
            aria-pressed={period === option}
          >
            {HISTORY_PERIOD_LABEL[option]}
          </Button>
        ))}
      </div>

      {/* Today needs no picker */}
      {period !== 'today' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {period === 'week'
                ? 'روزهای این هفته'
                : format(now, 'MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {period === 'week' ? (
              <WeekChart
                dates={weekDates}
                byDate={byDate}
                selectedKey={effectiveKey}
                onSelect={setSelectedKey}
                today={now}
              />
            ) : (
              <MonthGrid
                dates={monthDates}
                byDate={byDate}
                selectedKey={effectiveKey}
                onSelect={setSelectedKey}
                today={now}
                month={now}
              />
            )}
          </CardContent>
        </Card>
      )}

      {showDetail && effectiveKey && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              {format(fromDateKey(effectiveKey), 'EEEE d MMMM yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {selectedDay ? (
              <DayGroups day={selectedDay} />
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">
                برای این روز سابقه‌ای ثبت نشده است.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            آمار {HISTORY_PERIOD_LABEL[period]}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-6">
          <AdherenceDonut taken={summary.taken} missed={summary.missed} />

          <div className="space-y-3 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
              <span className="text-sm text-muted-foreground">مصرف‌شده</span>
              <span className="text-sm font-bold">{summary.taken}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-sm bg-destructive/70 shrink-0" />
              <span className="text-sm text-muted-foreground">فراموش‌شده</span>
              <span className="text-sm font-bold">{summary.missed}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">پایبندی به مصرف</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.adherence === null ? (
            <p className="text-sm text-muted-foreground">
              برای محاسبه پایبندی، هنوز نوبت ثبت‌شده‌ای وجود ندارد.
            </p>
          ) : (
            <>
              <div className="flex items-end justify-between gap-2">
                <span className="text-4xl font-bold">
                  {summary.adherence}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {summary.taken} از {summary.total} نوبت
                </span>
              </div>

              <div
                className="h-2.5 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={summary.adherence}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="درصد پایبندی به مصرف دارو"
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    summary.adherence >= 80
                      ? 'bg-emerald-500'
                      : summary.adherence >= 50
                        ? 'bg-orange-500'
                        : 'bg-destructive',
                  )}
                  style={{ width: `${summary.adherence}%` }}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
