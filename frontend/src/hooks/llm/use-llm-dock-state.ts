import { useState, useCallback } from "react";

export type DockMode = "minimized" | "docked";

export type LlmDockState = {
  mode: DockMode;
  activeThreadId: string | null;
};

export type LlmDockApi = LlmDockState & {
  openDock: () => void;
  closeDock: () => void;
  setActiveThreadId: (id: string | null) => void;
};

export function useLlmDockState(): LlmDockApi {
  const [mode, setMode] = useState<DockMode>("minimized");
  const [activeThreadId, setActiveThreadIdState] = useState<string | null>(null);

  const openDock = useCallback(() => setMode("docked"), []);
  const closeDock = useCallback(() => setMode("minimized"), []);
  const setActiveThreadId = useCallback((id: string | null) => setActiveThreadIdState(id), []);

  return { mode, activeThreadId, openDock, closeDock, setActiveThreadId };
}
