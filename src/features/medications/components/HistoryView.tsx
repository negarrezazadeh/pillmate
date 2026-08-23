import { format } from 'date-fns-jalali';
import { useIntakeHistory } from '../hooks';
import { Clock, CheckCircle2, XCircle, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function HistoryView() {
  const history = useIntakeHistory(30);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">تاریخچه مصرف</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          سوابق مصرف داروهای شما در ۳۰ روز گذشته
        </p>
      </div>

      {history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              هنوز تاریخچه‌ای ثبت نشده است.
            </p>
          </CardContent>
        </Card>
      ) : (
        history.map((day) => {
          const dateObj = new Date(day.date + 'T00:00:00');
          const takenCount = day.logs.filter((l) => l.status === 'taken').length;
          const missedCount = day.logs.filter((l) => l.status === 'missed').length;

          return (
            <Card key={day.date}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{format(dateObj, 'EEEE d MMMM yyyy')}</span>
                  <div className="flex items-center gap-2">
                    {takenCount > 0 && (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        {takenCount} مصرف‌شده
                      </Badge>
                    )}
                    {missedCount > 0 && (
                      <Badge variant="destructive">
                        {missedCount} فراموش‌شده
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {day.logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === 'taken' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive shrink-0" />
                        )}
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: log.medication.color }}
                        />
                        <div>
                          <p className="font-medium text-sm">{log.medication.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.medication.dosage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {log.scheduledTime.split('T')[1]?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
