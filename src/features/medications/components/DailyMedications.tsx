import { useEffect } from 'react';
import { useMedicationContext } from '../context';
import { useTodayMedications, useGenerateTodayLogs } from '../hooks';
import type { IntakeLog, MedicationWithLogs } from '../types';
import {
  DOSE_STATE_LABEL,
  DOSE_WINDOW_MINUTES,
  formatMinutes,
  getDoseState,
  getScheduledDate,
  minutesUntil,
  windowMinutesLeft,
  type DoseState,
  type VisibleDoseState,
} from '../dose-state';
import {
  AlarmClock,
  Check,
  CheckCircle2,
  Clock,
  Hourglass,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toDateKey } from '@/lib/date';
import { useNow } from '@/lib/use-now';
import {
  toViewTransitionName,
  withViewTransition,
} from '@/lib/view-transition';

interface Dose {
  key: string;
  medication: MedicationWithLogs;
  time: string;
  scheduled: Date;
  log: IntakeLog | undefined;
  state: DoseState;
}

type VisibleDose = Omit<Dose, 'state'> & { state: VisibleDoseState };

function getDoseAppearance(dose: VisibleDose, now: Date) {
  switch (dose.state) {
    case 'due':
      return {
        row: 'bg-primary/5 border-primary/40 ring-1 ring-primary/20',
        name: 'text-foreground',
        hint: `${formatMinutes(windowMinutesLeft(dose.scheduled, now))} فرصت دارید`,
      };
    case 'missed':
      return {
        row: 'bg-destructive/5 border-destructive/40',
        name: 'text-foreground',
        hint: `${formatMinutes(-minutesUntil(dose.scheduled, now))} گذشته`,
      };
    case 'taken':
      return {
        row: 'bg-muted border-border/50',
        name: 'text-muted-foreground',
        hint: null,
      };
    case 'upcoming':
      return {
        row: 'bg-muted/50 border-border',
        name: 'text-foreground',
        hint: `${formatMinutes(minutesUntil(dose.scheduled, now))} دیگر`,
      };
  }
}

function DoseRow({
  dose,
  now,
  onTake,
}: {
  dose: VisibleDose;
  now: Date;
  onTake: () => void;
}) {
  const { medication, time, log, state } = dose;
  const appearance = getDoseAppearance(dose, now);
  const isTaken = state === 'taken';

  const takenAtTime = log?.takenAt
    ? new Date(log.takenAt).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      // Named so the browser can match it across sections and animate the move
      style={{ viewTransitionName: toViewTransitionName('dose', dose.key) }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border transition-colors',
        appearance.row,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={cn('w-3 h-3 rounded-full shrink-0', isTaken && 'opacity-50')}
          style={{ backgroundColor: medication.color }}
        />
        <div className="min-w-0">
          <p className={cn('font-medium text-sm truncate', appearance.name)}>
            {medication.name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {medication.dosage}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-xs text-muted-foreground text-left">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{time}</span>
          </div>
          {appearance.hint && (
            <div className="mt-0.5 whitespace-nowrap">{appearance.hint}</div>
          )}
        </div>

        {isTaken ? (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 gap-1"
          >
            <Check className="h-3 w-3" />
            {takenAtTime ?? 'مصرف شد'}
          </Badge>
        ) : (
          <Button
            size="sm"
            // A missed dose is still recordable, but must not compete with the
            // one actually due now
            variant={state === 'due' ? 'default' : 'outline'}
            onClick={onTake}
          >
            مصرف شد
          </Button>
        )}
      </div>
    </div>
  );
}

function SectionHeading({
  icon,
  label,
  count,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <div className="h-px flex-1 bg-border" />
      <span
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium shrink-0',
          tone ?? 'text-muted-foreground',
        )}
      >
        {icon}
        {label} ({count})
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function DailyMedications() {
  const { updateIntakeLog } = useMedicationContext();
  const todayMedications = useTodayMedications();
  const { missingLogs, generateLogs } = useGenerateTodayLogs();
  const now = useNow(30_000);

  useEffect(() => {
    if (missingLogs.length > 0) {
      generateLogs();
    }
  }, [missingLogs.length, generateLogs]);

  const handleTake = (dose: Dose) => {
    if (!dose.log) return;
    const log = dose.log;

    // The row unmounts from one section and mounts in another, so only a view
    // transition can animate the move
    withViewTransition(() => {
      updateIntakeLog({
        ...log,
        status: 'taken',
        takenAt: new Date().toISOString(),
      });
    });
  };

  const todayKey = toDateKey(now);

  const doses: VisibleDose[] = todayMedications
    .flatMap((medication) =>
      medication.times.map((time) => {
        const log = medication.todayLogs.find((l) =>
          l.scheduledTime.includes(`T${time}:`),
        );
        const scheduled = getScheduledDate(todayKey, time);
        return {
          key: `${medication.id}-${time}`,
          medication,
          time,
          scheduled,
          log,
          state: getDoseState({
            scheduled,
            log,
            createdAt: medication.createdAt,
            now,
          }),
        };
      }),
    )
    // Slots predating the medication are dropped, not shown as missed
    .filter((dose): dose is VisibleDose => dose.state !== 'ignored')
    .sort((a, b) => a.time.localeCompare(b.time));

  // Covers both "nothing runs today" and "every slot today predates the record"
  if (doses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>داروهای امروز</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            امروز دارویی برای مصرف ندارید 🎉
          </p>
        </CardContent>
      </Card>
    );
  }

  const byState = (state: VisibleDoseState) =>
    doses.filter((d) => d.state === state);
  const due = byState('due');
  const missed = byState('missed');
  const upcoming = byState('upcoming');
  const taken = byState('taken');

  // Ordered by how much attention each group needs
  const sections = [
    {
      state: 'due' as const,
      doses: due,
      icon: <AlarmClock className="h-3.5 w-3.5" />,
      tone: 'text-primary',
    },
    {
      state: 'missed' as const,
      doses: missed,
      icon: <XCircle className="h-3.5 w-3.5" />,
      tone: 'text-destructive',
    },
    {
      state: 'upcoming' as const,
      doses: upcoming,
      icon: <Hourglass className="h-3.5 w-3.5" />,
      tone: undefined,
    },
    {
      state: 'taken' as const,
      doses: taken,
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
      tone: undefined,
    },
  ].filter((section) => section.doses.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>داروهای امروز</span>
          <div className="flex items-center gap-1.5">
            {missed.length > 0 && (
              <Badge variant="destructive">{missed.length} از دست رفته</Badge>
            )}
            <Badge variant="secondary">
              {taken.length} از {doses.length}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {taken.length === doses.length && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            همه داروهای امروز مصرف شد
          </div>
        )}

        {sections.map((section) => (
          <div key={section.state} className="space-y-3">
            <SectionHeading
              icon={section.icon}
              label={DOSE_STATE_LABEL[section.state]}
              count={section.doses.length}
              tone={section.tone}
            />
            {section.doses.map((dose) => (
              <DoseRow
                key={dose.key}
                dose={dose}
                now={now}
                onTake={() => handleTake(dose)}
              />
            ))}
          </div>
        ))}

        <p className="text-xs text-muted-foreground pt-1">
          بازه مجاز مصرف هر دوز {formatMinutes(DOSE_WINDOW_MINUTES)} پس از ساعت
          مقرر است.
        </p>
      </CardContent>
    </Card>
  );
}
