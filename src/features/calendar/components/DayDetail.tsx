import { format } from 'date-fns-jalali';
import { useMedicationsForDate } from '../../medications/hooks';
import { DAYS_OF_WEEK } from '../../medications/types';
import { getDayOfWeek } from '../../medications/hooks';
import { Clock, Pill } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DayDetailProps {
  date: Date;
}

export function DayDetail({ date }: DayDetailProps) {
  const medications = useMedicationsForDate(date);
  const dayOfWeek = getDayOfWeek(date);
  const dayLabel = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ?? '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{dayLabel} - {format(date, 'd MMMM yyyy')}</span>
          <Badge variant="secondary">
            {medications.length} دارو
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {medications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            دارویی برای این روز ثبت نشده است.
          </p>
        ) : (
          <div className="space-y-3">
            {medications.map((med) => (
              <div
                key={med.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: med.color }}
                  />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Pill className="h-3.5 w-3.5 text-muted-foreground" />
                      {med.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{med.dosage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{med.times.join(' ، ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
