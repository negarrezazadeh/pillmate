import { format } from 'date-fns-jalali';
import type { Medication } from '../types';
import { DAYS_OF_WEEK } from '../types';
import {
  DOSAGE_TREND_LABEL,
  daysUntilChange,
  formatDaysUntil,
  fromDateKey,
  getDosageTrend,
} from '../dosage';
import {
  Clock,
  Calendar,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  CalendarClock,
  CalendarPlus,
  BellOff,
} from 'lucide-react';
import { getMedicationStartKey } from '../schedule';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MedicationCardProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
}

export function MedicationCard({ medication, onEdit, onDelete }: MedicationCardProps) {
  const daysLabel =
    medication.days.length === 7
      ? 'هر روز'
      : medication.days
          .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label ?? d)
          .join('، ');

  const pendingChange =
    medication.dosageChange && !medication.dosageChange.applied
      ? medication.dosageChange
      : null;
  const daysLeft = daysUntilChange(pendingChange);
  const changeTrend = pendingChange
    ? getDosageTrend(medication.dosage, pendingChange.newDosage)
    : 'unknown';

  return (
    <Card className="overflow-hidden">
      {/* Color bar */}
      <div className="h-2 -mt-4" style={{ backgroundColor: medication.color }} />

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full shrink-0"
            style={{ backgroundColor: medication.color }}
          />
          {medication.name}
        </CardTitle>
        <CardAction>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(medication)}
              aria-label="ویرایش"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(medication.id)}
              aria-label="حذف"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Dosage */}
        <p className="text-sm text-muted-foreground">
          دوز: <span className="font-medium text-foreground">{medication.dosage}</span>
        </p>

        {/* Upcoming dosage change */}
        {pendingChange && daysLeft !== null && daysLeft >= 0 && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 space-y-1">
            <p className="text-xs font-medium flex items-center gap-1.5">
              {changeTrend === 'increase' ? (
                <ArrowUp className="h-3.5 w-3.5 text-orange-600" />
              ) : changeTrend === 'decrease' ? (
                <ArrowDown className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5 text-primary" />
              )}
              {DOSAGE_TREND_LABEL[changeTrend]} {formatDaysUntil(daysLeft)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(fromDateKey(pendingChange.effectiveDate), 'd MMMM yyyy')} →{' '}
              <span className="font-medium text-foreground">
                {pendingChange.newDosage}
              </span>
            </p>
            {pendingChange.note && (
              <p className="text-xs text-muted-foreground">{pendingChange.note}</p>
            )}
            {pendingChange.remind === false && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BellOff className="h-3 w-3" />
                بدون یادآوری
              </p>
            )}
          </div>
        )}

        {/* Times */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{medication.times.join(' ، ')}</span>
        </div>

        {/* Days */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{daysLabel}</span>
        </div>

        {/* Tracking start */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarPlus className="h-4 w-4" />
          <span>
            از {format(fromDateKey(getMedicationStartKey(medication)), 'd MMMM yyyy')}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {medication.timesPerWeek} بار در هفته
          </Badge>
          <Badge variant={medication.isActive ? 'default' : 'outline'}>
            {medication.isActive ? 'فعال' : 'غیرفعال'}
          </Badge>
        </div>
      </CardContent>

      {/* Notes */}
      {medication.notes && (
        <CardFooter className="text-xs text-muted-foreground">
          {medication.notes}
        </CardFooter>
      )}
    </Card>
  );
}
