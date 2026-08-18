import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMedicationContext } from '../features/medications/context';
import { MedicationCard } from '../features/medications/components/MedicationCard';
import { MedicationForm } from '../features/medications/components/MedicationForm';
import type { Medication } from '../features/medications/types';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/medications')({
  component: MedicationsPage,
});

function MedicationsPage() {
  const { medications, addMedication, updateMedication, deleteMedication } =
    useMedicationContext();
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);

  const handleSave = (medication: Medication) => {
    if (editingMedication) {
      updateMedication(medication);
    } else {
      addMedication(medication);
    }
    setShowForm(false);
    setEditingMedication(null);
  };

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('آیا از حذف این دارو مطمئن هستید؟')) {
      deleteMedication(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMedication(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">داروهای من</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {medications.length} دارو ثبت شده
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          افزودن دارو
        </Button>
      </div>

      {/* Cards grid */}
      {medications.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium mb-2">هنوز دارویی ندارید</h3>
            <p className="text-sm text-muted-foreground mb-4">
              اولین دارو خود را اضافه کنید تا مدیریت دارویی شما شروع شود.
            </p>
            <Button onClick={() => setShowForm(true)}>
              افزودن دارو
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medications.map((med) => (
            <MedicationCard
              key={med.id}
              medication={med}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <MedicationForm
        medication={editingMedication}
        open={showForm}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
