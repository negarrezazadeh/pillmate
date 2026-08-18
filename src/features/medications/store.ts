import type { Medication, IntakeLog } from './types';

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
