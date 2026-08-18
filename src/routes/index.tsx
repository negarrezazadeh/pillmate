import { createFileRoute } from '@tanstack/react-router';
import { MedicationTable } from '../features/medications/components/MedicationTable';
import { DailyMedications } from '../features/medications/components/DailyMedications';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">داشبورد</h2>
        <p className="text-sm text-gray-500 mt-1">مدیریت و پیگیری داروهای شما</p>
      </div>

      {/* Today's medications */}
      <DailyMedications />

      {/* All medications table */}
      <MedicationTable />
    </div>
  );
}
