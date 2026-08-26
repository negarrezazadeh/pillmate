import type { Medication, IntakeLog } from './types';
import { daysBetweenKeys, toDateKey } from './dosage';

const MEDICATIONS_KEY = 'pillmate_medications';
const INTAKE_LOGS_KEY = 'pillmate_intake_logs';

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

export function deleteMedication(id: string): Medication[] {
  const medications = getMedications().filter((m) => m.id !== id);
  saveMedications(medications);
  // Also remove related intake logs
  const logs = getIntakeLogs().filter((l) => l.medicationId !== id);
  saveIntakeLogs(logs);
  return medications;
}

// Dosage changes

export interface DosageChangeAlert {
  medicationId: string;
  medicationName: string;
  /** 2 = two days out, 1 = tomorrow, 0 = takes effect today */
  daysUntil: number;
  fromDosage: string;
  toDosage: string;
  effectiveDate: string;
}

/**
 * Single pass over the medications that:
 *   1. collects reminders due today (2 days before, 1 day before, and the day itself)
 *   2. applies any change whose effective date has arrived, archiving the old dosage
 *
 * Both happen together so a day-0 reminder still reports the dosage the user is
 * moving away from. Reminder offsets are recorded on the medication, so each
 * reminder fires only once even if the app is reopened several times a day.
 */
export function processDosageChanges(): {
  medications: Medication[];
  alerts: DosageChangeAlert[];
  /** True when something was written back, so callers know to refresh state */
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

    // Reminder window: two days out, one day out, and the day it happens.
    // `remind !== false` so changes saved before this flag existed still remind.
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

    // Effective date reached (or passed, e.g. the app was closed for a while)
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
  const dateStr = date.toISOString().split('T')[0];
  return getIntakeLogs().filter(
    (log) => log.scheduledTime.split('T')[0] === dateStr,
  );
}

export function getLogsForMedication(medicationId: string): IntakeLog[] {
  return getIntakeLogs().filter((log) => log.medicationId === medicationId);
}
