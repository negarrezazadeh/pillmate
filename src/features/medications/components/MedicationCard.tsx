import type { Medication } from '../types';
import { DAYS_OF_WEEK } from '../types';
import { Clock, Calendar, Pencil, Trash2 } from 'lucide-react';
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
              size="icon-xs"
              onClick={() => onEdit(medication)}
              aria-label="ویرایش"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
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
