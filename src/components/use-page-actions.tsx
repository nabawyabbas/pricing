"use client";

import { useEffect } from "react";
import { useAppShellActions } from "./app-shell-actions";

export function usePageActions(actions: React.ReactNode) {
  const { setActions } = useAppShellActions();

  useEffect(() => {
    setActions(actions);
    return () => setActions(null);
  }, [actions, setActions]);
}

