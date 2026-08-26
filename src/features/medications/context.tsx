import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { IntakeLog, Medication } from './types';
import * as store from './store';

interface MedicationContextValue {
  medications: Medication[];
  intakeLogs: IntakeLog[];
  addMedication: (medication: Medication) => void;
  updateMedication: (medication: Medication) => void;
  deleteMedication: (id: string) => void;
  addIntakeLog: (log: IntakeLog) => void;
  updateIntakeLog: (log: IntakeLog) => void;
  getLogsForDate: (date: Date) => IntakeLog[];
  getTodayLogs: () => IntakeLog[];
  /**
   * Applies any due dosage changes and returns the reminders that should be
   * surfaced right now. Safe to call repeatedly - each reminder fires once.
   */
  processDosageChanges: () => store.DosageChangeAlert[];
}

const MedicationContext = createContext<MedicationContextValue | null>(null);

export function MedicationProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);

  useEffect(() => {
    // Apply any dosage change that came due while the app was closed
    const { medications: initial } = store.processDosageChanges();
    setMedications(initial);
    setIntakeLogs(store.getIntakeLogs());
  }, []);

  const handleAddMedication = useCallback((medication: Medication) => {
    const updated = store.addMedication(medication);
    setMedications(updated);
  }, []);

  const handleUpdateMedication = useCallback((medication: Medication) => {
    const updated = store.updateMedication(medication);
    setMedications(updated);
  }, []);

  const handleDeleteMedication = useCallback((id: string) => {
    const updated = store.deleteMedication(id);
    setMedications(updated);
    setIntakeLogs(store.getIntakeLogs());
  }, []);

  const handleAddIntakeLog = useCallback((log: IntakeLog) => {
    const updated = store.addIntakeLog(log);
    setIntakeLogs(updated);
  }, []);

  const handleUpdateIntakeLog = useCallback((log: IntakeLog) => {
    const updated = store.updateIntakeLog(log);
    setIntakeLogs(updated);
  }, []);

  const getLogsForDate = useCallback((date: Date) => {
    return store.getLogsForDate(date);
  }, []);

  const getTodayLogs = useCallback(() => {
    return store.getLogsForDate(new Date());
  }, []);

  const handleProcessDosageChanges = useCallback(() => {
    const { medications: updated, alerts, mutated } = store.processDosageChanges();
    // Only swap state when something actually changed, otherwise the new array
    // reference would re-render (and re-trigger) on every interval tick.
    if (mutated) {
      setMedications(updated);
    }
    return alerts;
  }, []);

  return (
    <MedicationContext.Provider
      value={{
        medications,
        intakeLogs,
        addMedication: handleAddMedication,
        updateMedication: handleUpdateMedication,
        deleteMedication: handleDeleteMedication,
        addIntakeLog: handleAddIntakeLog,
        updateIntakeLog: handleUpdateIntakeLog,
        getLogsForDate,
        getTodayLogs,
        processDosageChanges: handleProcessDosageChanges,
      }}
    >
      {children}
    </MedicationContext.Provider>
  );
}

export function useMedicationContext(): MedicationContextValue {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error(
      'useMedicationContext must be used within a MedicationProvider',
    );
  }
  return context;
}
