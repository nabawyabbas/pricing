"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AppShellActionsContextType {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const AppShellActionsContext = createContext<AppShellActionsContextType | undefined>(undefined);

export function AppShellActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null);

  const setActions = useCallback((newActions: ReactNode) => {
    setActionsState(newActions);
  }, []);

  return (
    <AppShellActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </AppShellActionsContext.Provider>
  );
}

export function useAppShellActions() {
  const context = useContext(AppShellActionsContext);
  if (!context) {
    throw new Error("useAppShellActions must be used within AppShellActionsProvider");
  }
  return context;
}

