import { useEffect } from 'react';
import { useMedicationContext } from '../context';
import { useTodayMedications, useGenerateTodayLogs } from '../hooks';
import { Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function DailyMedications() {
  const { updateIntakeLog } = useMedicationContext();
  const todayMedications = useTodayMedications();
  const { missingLogs, generateLogs } = useGenerateTodayLogs();

  // Generate today's logs if missing
  useEffect(() => {
    if (missingLogs.length > 0) {
      generateLogs();
    }
  }, [missingLogs.length, generateLogs]);

  if (todayMedications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>داروهای امروز</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">امروز دارویی برای مصرف ندارید 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>داروهای امروز</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayMedications.map((med) =>
          med.times.map((time) => {
            const log = med.todayLogs.find(
              (l) => l.scheduledTime.includes(`T${time}:`),
            );
            const isTaken = log?.status === 'taken';
            const isPast = new Date() > new Date(`${new Date().toISOString().split('T')[0]}T${time}:00`);

            return (
              <div
                key={`${med.id}-${time}`}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  isTaken
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                    : isPast
                      ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
                      : 'bg-muted/50 border-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: med.color }}
                  />
                  <div>
                    <p className="font-medium text-sm text-foreground">{med.name}</p>
                    <p className="text-xs text-muted-foreground">{med.dosage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{time}</span>
                  </div>
                  {isTaken ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 gap-1">
                      <Check className="h-3 w-3" />
                      مصرف شد
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (log) {
                          updateIntakeLog({
                            ...log,
                            status: 'taken',
                            takenAt: new Date().toISOString(),
                          });
                        }
                      }}
                    >
                      مصرف شد
                    </Button>
                  )}
                </div>
              </div>
            );
          }),
        )}
      </CardContent>
    </Card>
  );
}
