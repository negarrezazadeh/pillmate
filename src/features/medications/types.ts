export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  color: string;
  timesPerWeek: number;
  days: DayOfWeek[];
  times: string[]; // HH:mm format
  notes: string;
  isActive: boolean;
  createdAt: string; // ISO string
}

export interface IntakeLog {
  id: string;
  medicationId: string;
  scheduledTime: string; // ISO string
  takenAt: string | null; // ISO string or null if not taken
  status: 'taken' | 'missed' | 'pending';
}

export interface MedicationWithLogs extends Medication {
  todayLogs: IntakeLog[];
}

export const DAYS_OF_WEEK: { value: DayOfWeek; label: string }[] = [
  { value: 'saturday', label: 'شنبه' },
  { value: 'sunday', label: 'یکشنبه' },
  { value: 'monday', label: 'دوشنبه' },
  { value: 'tuesday', label: 'سه‌شنبه' },
  { value: 'wednesday', label: 'چهارشنبه' },
  { value: 'thursday', label: 'پنجشنبه' },
  { value: 'friday', label: 'جمعه' },
];

export const COLOR_PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];
