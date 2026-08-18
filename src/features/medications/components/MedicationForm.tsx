import { useState } from 'react';
import type { DayOfWeek, Medication } from '../types';
import { COLOR_PALETTE, DAYS_OF_WEEK } from '../types';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface MedicationFormProps {
  medication?: Medication | null;
  open: boolean;
  onSave: (medication: Medication) => void;
  onCancel: () => void;
}

export function MedicationForm({ medication, open, onSave, onCancel }: MedicationFormProps) {
  const [name, setName] = useState(medication?.name ?? '');
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [color, setColor] = useState(medication?.color ?? COLOR_PALETTE[0]);
  const [timesPerWeek, setTimesPerWeek] = useState(medication?.timesPerWeek ?? 7);
  const [days, setDays] = useState<DayOfWeek[]>(medication?.days ?? [...DAYS_OF_WEEK.map((d) => d.value)]);
  const [times, setTimes] = useState<string[]>(medication?.times ?? ['08:00']);
  const [notes, setNotes] = useState(medication?.notes ?? '');
  const [isActive, setIsActive] = useState(medication?.isActive ?? true);

  const toggleDay = (day: DayOfWeek) => {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const addTime = () => {
    setTimes((prev) => [...prev, '12:00']);
  };

  const removeTime = (index: number) => {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTime = (index: number, value: string) => {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dosage.trim() || times.length === 0 || days.length === 0) return;

    const med: Medication = {
      id: medication?.id ?? crypto.randomUUID(),
      name: name.trim(),
      dosage: dosage.trim(),
      color,
      timesPerWeek,
      days,
      times,
      notes: notes.trim(),
      isActive,
      createdAt: medication?.createdAt ?? new Date().toISOString(),
    };

    onSave(med);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onCancel(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {medication ? 'ویرایش دارو' : 'افزودن دارو'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="med-name">نام دارو</Label>
            <Input
              id="med-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً آموکسی‌سیلین"
              required
            />
          </div>

          {/* Dosage */}
          <div className="space-y-2">
            <Label htmlFor="med-dosage">دوز مصرفی</Label>
            <Input
              id="med-dosage"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="مثلاً 500mg"
              required
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>رنگ دارو</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-transform',
                    color === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`انتخاب رنگ ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Times per week */}
          <div className="space-y-2">
            <Label htmlFor="med-freq">تعداد مصرف در هفته</Label>
            <Input
              id="med-freq"
              type="number"
              min={1}
              max={21}
              value={timesPerWeek}
              onChange={(e) => setTimesPerWeek(Number(e.target.value))}
            />
          </div>

          {/* Days */}
          <div className="space-y-2">
            <Label>روزهای مصرف</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={days.includes(day.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="space-y-2">
            <Label>ساعت‌های مصرف</Label>
            <div className="space-y-2">
              {times.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => updateTime(index, e.target.value)}
                    className="flex-1"
                  />
                  {times.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeTime(index)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addTime}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                افزودن ساعت
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="med-notes">یادداشت (اختیاری)</Label>
            <Input
              id="med-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثلاً بعد از غذا مصرف شود"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="med-active">وضعیت فعال</Label>
            <Switch
              id="med-active"
              checked={isActive}
              onCheckedChange={(val) => setIsActive(val)}
            />
          </div>

          <DialogFooter>
            <Button type="submit">
              {medication ? 'ذخیره تغییرات' : 'افزودن دارو'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              انصراف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
