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
}

const MedicationContext = createContext<MedicationContextValue | null>(null);

export function MedicationProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [intakeLogs, setIntakeLogs] = useState<IntakeLog[]>([]);

  useEffect(() => {
    setMedications(store.getMedications());
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
