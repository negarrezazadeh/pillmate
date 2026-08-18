import { format } from 'date-fns';
import { useMedicationsForDate } from '../../medications/hooks';
import { DAYS_OF_WEEK } from '../../medications/types';
import { getDayOfWeek } from '../../medications/hooks';
import { Clock, Pill } from 'lucide-react';

interface DayDetailProps {
  date: Date;
}

export function DayDetail({ date }: DayDetailProps) {
  const medications = useMedicationsForDate(date);
  const dayOfWeek = getDayOfWeek(date);
  const dayLabel = DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label ?? '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">
          {dayLabel} - {format(date, 'yyyy/MM/dd')}
        </h3>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
          {medications.length} دارو
        </span>
      </div>

      {medications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">
          دارویی برای این روز ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: med.color }}
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                    <Pill className="h-3.5 w-3.5 text-gray-400" />
                    {med.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{med.dosage}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>{med.times.join(' ، ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
