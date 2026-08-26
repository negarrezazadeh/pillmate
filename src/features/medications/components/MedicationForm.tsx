import { useState } from 'react';
import type { DayOfWeek, Medication } from '../types';
import { COLOR_PALETTE, DAYS_OF_WEEK } from '../types';
import { DOSAGE_TREND_LABEL, getDosageTrend, toDateKey } from '../dosage';
import { getMedicationStartKey } from '../schedule';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/JalaliDatePicker';
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
  // Day tracking starts. New medications default to today so they never
  // backfill past weeks; editing an old record keeps its original start day.
  const [startDate, setStartDate] = useState(
    medication ? getMedicationStartKey(medication) : toDateKey(new Date()),
  );

  // Planned dosage change. An already-applied change is treated as "no pending
  // change", so editing a medication doesn't resurrect an old one.
  const pendingChange =
    medication?.dosageChange && !medication.dosageChange.applied
      ? medication.dosageChange
      : null;
  const [hasDosageChange, setHasDosageChange] = useState(pendingChange !== null);
  const [changeDate, setChangeDate] = useState(pendingChange?.effectiveDate ?? '');
  const [newDosage, setNewDosage] = useState(pendingChange?.newDosage ?? '');
  const [changeNote, setChangeNote] = useState(pendingChange?.note ?? '');
  // Default to reminders on; `!== false` keeps changes saved before this flag existed
  const [remindChange, setRemindChange] = useState(
    pendingChange ? pendingChange.remind !== false : true,
  );

  const trend = getDosageTrend(dosage, newDosage);
  // The date input must not accept a day that has already passed
  const minChangeDate = toDateKey(new Date());
  const changeDateIsValid = changeDate !== '' && changeDate >= minChangeDate;

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

    const wantsChange =
      hasDosageChange && changeDateIsValid && newDosage.trim() !== '';

    // Keep already-notified offsets when only the note/dosage is tweaked, but
    // reset them if the effective date moved, so reminders fire for the new date.
    const keepNotified =
      pendingChange !== null && pendingChange.effectiveDate === changeDate;

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
      startDate: startDate || toDateKey(new Date()),
      dosageChange: wantsChange
        ? {
            effectiveDate: changeDate,
            newDosage: newDosage.trim(),
            note: changeNote.trim(),
            remind: remindChange,
            applied: false,
            notifiedOffsets: keepNotified ? pendingChange.notifiedOffsets : [],
          }
        : null,
      dosageHistory: medication?.dosageHistory ?? [],
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

          {/* Planned dosage change */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="med-has-change">
                  احتمال تغییر دوز وجود دارد؟
                </Label>
                <p className="text-xs text-muted-foreground">
                  اگر پزشک گفته دوز در آینده کم یا زیاد می‌شود، تاریخش را ثبت کنید.
                </p>
              </div>
              <Switch
                id="med-has-change"
                checked={hasDosageChange}
                onCheckedChange={setHasDosageChange}
              />
            </div>

            {hasDosageChange && (
              <div className="space-y-3 pt-1">
                <div className="space-y-2">
                  <Label htmlFor="med-change-date">تاریخ تغییر دوز</Label>
                  <JalaliDatePicker
                    id="med-change-date"
                    value={changeDate}
                    onChange={setChangeDate}
                    minDateKey={minChangeDate}
                  />
                  {changeDate === '' && (
                    <p className="text-xs text-muted-foreground">
                      تاریخ شروع دوز جدید را انتخاب کنید.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-new-dosage">دوز جدید</Label>
                  <Input
                    id="med-new-dosage"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    placeholder="مثلاً 250mg"
                    required
                  />
                  {newDosage.trim() !== '' && trend !== 'unknown' && (
                    <p
                      className={cn(
                        'text-xs flex items-center gap-1',
                        trend === 'increase' ? 'text-orange-600' : 'text-green-600',
                      )}
                    >
                      {trend === 'increase' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                      {DOSAGE_TREND_LABEL[trend]}: از {dosage || '—'} به{' '}
                      {newDosage.trim()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="med-change-note">دلیل تغییر (اختیاری)</Label>
                  <Input
                    id="med-change-note"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="مثلاً طبق دستور پزشک"
                  />
                </div>

                {/* Reminder opt-in */}
                <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-2.5">
                  <div className="space-y-0.5">
                    <Label htmlFor="med-remind-change">
                      برای این تغییر یادآوری کنم؟
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      ۲ روز قبل، ۱ روز قبل و روز تغییر اطلاع می‌دهم.
                    </p>
                  </div>
                  <Switch
                    id="med-remind-change"
                    checked={remindChange}
                    onCheckedChange={setRemindChange}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  {remindChange
                    ? 'در تاریخ انتخابی دوز به‌صورت خودکار به‌روز می‌شود و یادآوری‌ها ارسال می‌شود.'
                    : 'در تاریخ انتخابی دوز به‌صورت خودکار به‌روز می‌شود، اما یادآوری‌ای ارسال نمی‌شود.'}
                </p>
              </div>
            )}
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

          {/* Start date */}
          <div className="space-y-2">
            <Label htmlFor="med-start-date">تاریخ شروع مصرف</Label>
            <JalaliDatePicker
              id="med-start-date"
              value={startDate}
              onChange={setStartDate}
            />
            <p className="text-xs text-muted-foreground">
              پیگیری مصرف از این روز شروع می‌شود و دارو در روزهای قبل از آن
              نمایش داده نمی‌شود.
            </p>
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
