export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday';

/**
 * A scheduled (planned) dosage change for a medication.
 * The dosage may go up or down; `newDosage` is applied to the medication
 * once `effectiveDate` arrives.
 */
export interface DosageChange {
  effectiveDate: string; // YYYY-MM-DD - the day the new dosage takes effect
  newDosage: string;
  note: string;
  /**
   * Whether to notify ahead of the change. When false the dosage is still
   * updated on the effective date, just silently.
   */
  remind: boolean;
  applied: boolean; // true once newDosage has replaced medication.dosage
  /** Day offsets (2, 1, 0) that have already been notified, to avoid repeats */
  notifiedOffsets: number[];
}

/**
 * `notification` shows a silent OS notification. `alarm` shows the same
 * notification and additionally plays a sound, which needs the app to be open.
 */
export type ReminderMode = 'notification' | 'alarm';

export interface ReminderSettings {
  /** When false, this medication produces no reminders at all */
  enabled: boolean;
  mode: ReminderMode;
  snooze: {
    enabled: boolean;
    /** Gap between repeats */
    minutes: number;
    /** How many times to repeat after the first reminder */
    repeat: number;
  };
}

export const DEFAULT_REMINDER: ReminderSettings = {
  enabled: true,
  mode: 'notification',
  snooze: { enabled: false, minutes: 10, repeat: 2 },
};

export const SNOOZE_MINUTE_PRESETS = [5, 10, 15, 30] as const;

/** Record of a dosage that was replaced by a scheduled change */
export interface DosageHistoryEntry {
  dosage: string;
  replacedAt: string; // ISO string
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  color: string;
  days: DayOfWeek[];
  times: string[]; // HH:mm format
  notes: string;
  isActive: boolean;
  createdAt: string; // ISO string
  /**
   * Date key (YYYY-MM-DD) from which this medication is tracked. Doses are not
   * scheduled before this day, so adding a medication today does not
   * retroactively populate past weeks and months.
   *
   * Defaults to the day the record was created. Optional for backward
   * compatibility - see getMedicationStartKey().
   */
  startDate?: string;
  /** Reminder preferences. Absent on records saved before this existed. */
  reminder?: ReminderSettings;
  /** Optional planned dosage change. Null/undefined when none is scheduled. */
  dosageChange?: DosageChange | null;
  /** Previous dosages, appended whenever a scheduled change is applied */
  dosageHistory?: DosageHistoryEntry[];
}

/**
 * A medication the user deleted.
 *
 * The record is archived rather than destroyed so its intake history stays
 * readable. Deleting a medication removes it from the schedule; it does not
 * undo the fact that doses were taken.
 */
export interface ArchivedMedication extends Medication {
  deletedAt: string; // ISO string
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
