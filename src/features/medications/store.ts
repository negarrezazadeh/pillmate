import type { ArchivedMedication, Medication, IntakeLog } from './types';
import { daysBetweenKeys, toDateKey } from './dosage';

const MEDICATIONS_KEY = 'pillmate_medications';
const INTAKE_LOGS_KEY = 'pillmate_intake_logs';
const ARCHIVED_MEDICATIONS_KEY = 'pillmate_archived_medications';

// Medications

export function getMedications(): Medication[] {
  const data = localStorage.getItem(MEDICATIONS_KEY);
  if (!data) return [];
  return JSON.parse(data) as Medication[];
}

export function saveMedications(medications: Medication[]): void {
  localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
}

export function addMedication(medication: Medication): Medication[] {
  const medications = getMedications();
  medications.push(medication);
  saveMedications(medications);
  return medications;
}

export function updateMedication(updated: Medication): Medication[] {
  const medications = getMedications().map((m) =>
    m.id === updated.id ? updated : m,
  );
  saveMedications(medications);
  return medications;
}

/**
 * Kept under their own key so `getMedications()` cannot return one and leak a
 * deleted medication back into the schedule.
 */
export function getArchivedMedications(): ArchivedMedication[] {
  const data = localStorage.getItem(ARCHIVED_MEDICATIONS_KEY);
  if (!data) return [];
  return JSON.parse(data) as ArchivedMedication[];
}

export function saveArchivedMedications(
  medications: ArchivedMedication[],
): void {
  localStorage.setItem(ARCHIVED_MEDICATIONS_KEY, JSON.stringify(medications));
}

/**
 * Intake logs are deliberately left untouched: they record what happened and
 * must outlive the medication.
 */
export function deleteMedication(id: string): {
  medications: Medication[];
  archived: ArchivedMedication[];
} {
  const medications = getMedications();
  const removed = medications.find((m) => m.id === id);
  const remaining = medications.filter((m) => m.id !== id);
  saveMedications(remaining);

  let archived = getArchivedMedications();
  if (removed) {
    archived = [
      ...archived.filter((a) => a.id !== id),
      { ...removed, deletedAt: new Date().toISOString() },
    ];
    saveArchivedMedications(archived);
  }

  return { medications: remaining, archived };
}

// Dosage changes

export interface DosageChangeAlert {
  medicationId: string;
  medicationName: string;
  /** 2 = two days out, 1 = tomorrow, 0 = today */
  daysUntil: number;
  fromDosage: string;
  toDosage: string;
  effectiveDate: string;
}

/**
 * Collects due reminders and applies due changes in one pass, so a day-0
 * reminder still reports the dosage being moved away from. Fired offsets are
 * recorded on the medication so each reminder happens once.
 */
export function processDosageChanges(): {
  medications: Medication[];
  alerts: DosageChangeAlert[];
  /** True when something was written back. */
  mutated: boolean;
} {
  const todayKey = toDateKey(new Date());
  const alerts: DosageChangeAlert[] = [];
  let mutated = false;

  const medications = getMedications().map((med) => {
    const change = med.dosageChange;
    if (!change || change.applied) return med;

    const daysUntil = daysBetweenKeys(todayKey, change.effectiveDate);
    let next = med;

    // `remind !== false` so changes saved before this flag existed still remind
    const wantsReminders = change.remind !== false;
    const withinReminderWindow = wantsReminders && daysUntil >= 0 && daysUntil <= 2;
    if (withinReminderWindow && !change.notifiedOffsets.includes(daysUntil)) {
      alerts.push({
        medicationId: med.id,
        medicationName: med.name,
        daysUntil,
        fromDosage: med.dosage,
        toDosage: change.newDosage,
        effectiveDate: change.effectiveDate,
      });
      next = {
        ...next,
        dosageChange: {
          ...change,
          notifiedOffsets: [...change.notifiedOffsets, daysUntil],
        },
      };
      mutated = true;
    }

    // Passed rather than reached, if the app was closed for a while
    if (daysUntil <= 0) {
      next = {
        ...next,
        dosage: change.newDosage,
        dosageHistory: [
          ...(med.dosageHistory ?? []),
          { dosage: med.dosage, replacedAt: new Date().toISOString() },
        ],
        dosageChange: { ...next.dosageChange!, applied: true },
      };
      mutated = true;
    }

    return next;
  });

  if (mutated) saveMedications(medications);
  return { medications, alerts, mutated };
}

// Intake Logs

export function getIntakeLogs(): IntakeLog[] {
  const data = localStorage.getItem(INTAKE_LOGS_KEY);
  if (!data) return [];
  return JSON.parse(data) as IntakeLog[];
}

export function saveIntakeLogs(logs: IntakeLog[]): void {
  localStorage.setItem(INTAKE_LOGS_KEY, JSON.stringify(logs));
}

export function addIntakeLog(log: IntakeLog): IntakeLog[] {
  const logs = getIntakeLogs();
  logs.push(log);
  saveIntakeLogs(logs);
  return logs;
}

export function updateIntakeLog(updated: IntakeLog): IntakeLog[] {
  const logs = getIntakeLogs().map((l) =>
    l.id === updated.id ? updated : l,
  );
  saveIntakeLogs(logs);
  return logs;
}

export function getLogsForDate(date: Date): IntakeLog[] {
  const dateStr = toDateKey(date);
  return getIntakeLogs().filter(
    (log) => log.scheduledTime.split('T')[0] === dateStr,
  );
}

export function getLogsForMedication(medicationId: string): IntakeLog[] {
  return getIntakeLogs().filter((log) => log.medicationId === medicationId);
}
