import { useMedicationContext } from '../context';
import { useDashboardStats } from '../hooks';
import { DAYS_OF_WEEK } from '../types';
import type { Medication } from '../types';
import { CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function getLastTaken(medicationId: string, logs: { medicationId: string; status: string; takenAt: string | null }[]): string {
  const taken = logs
    .filter((l) => l.medicationId === medicationId && l.status === 'taken' && l.takenAt)
    .sort((a, b) => (b.takenAt! > a.takenAt! ? 1 : -1));

  if (taken.length === 0) return 'هنوز مصرف نشده';

  const date = new Date(taken[0].takenAt!);
  return date.toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDaysLabel(med: Medication): string {
  if (med.days.length === 7) return 'هر روز';
  return med.days
    .map((d) => DAYS_OF_WEEK.find((dw) => dw.value === d)?.label ?? d)
    .join('، ');
}

export function MedicationTable() {
  const { medications, intakeLogs } = useMedicationContext();
  const stats = useDashboardStats();

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">کل داروها</p>
            <p className="text-2xl font-bold">{stats.totalMedications}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">داروهای فعال</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeMedications}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">مصرف‌شده امروز</p>
            <p className="text-2xl font-bold text-blue-600">{stats.takenToday}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent>
            <p className="text-sm text-muted-foreground">باقی‌مانده امروز</p>
            <p className="text-2xl font-bold text-orange-600">{stats.remainingToday}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>لیست داروها</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">دارو</TableHead>
                <TableHead className="text-right">دوز</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right hidden md:table-cell">زمان مصرف</TableHead>
                <TableHead className="text-right hidden md:table-cell">روزها</TableHead>
                <TableHead className="text-right hidden lg:table-cell">آخرین مصرف</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    هنوز دارویی ثبت نشده است. از صفحه «داروها» دارو اضافه کنید.
                  </TableCell>
                </TableRow>
              ) : (
                medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: med.color }}
                        />
                        <span className="font-medium">{med.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{med.dosage}</TableCell>
                    <TableCell>
                      {med.isActive ? (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          فعال
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          غیرفعال
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{med.times.join(' ، ')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {getDaysLabel(med)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {getLastTaken(med.id, intakeLogs)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
