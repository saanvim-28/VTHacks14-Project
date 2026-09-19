import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type AppContextValue = {
  saved: Set<string>;
  toggleSaved: (key: string) => void;
  simulatedPatientId: string | null;
  simulateNewData: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function ChatOneProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [simulatedPatientId, setSimulatedPatientId] = useState<string | null>(null);
  const value = useMemo(() => ({
    saved,
    simulatedPatientId,
    toggleSaved: (key: string) => setSaved((current) => { const next = new Set(current); next.has(key) ? next.delete(key) : next.add(key); return next; }),
    simulateNewData: () => setSimulatedPatientId((current) => current ? null : "3371"),
  }), [saved, simulatedPatientId]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useChatOne() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useChatOne must be used within ChatOneProvider");
  return value;
}
