/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useMemo, useState } from "react";

type SelectedTeam = {
  id: string;
  name: string;
  logoUrl?: string;
  muted?: boolean;
};

type SelectedTeamContextValue = {
  selectedTeam: SelectedTeam | null;
  setSelectedTeam: (team: SelectedTeam | null) => void;
  toggleMuted: () => void;
};

const SelectedTeamContext = createContext<SelectedTeamContextValue | undefined>(undefined);
const STORAGE_KEY = "selected-team";

export function SelectedTeamProvider({ children }: { children: React.ReactNode }) {
  const [selectedTeam, setSelectedTeamState] = useState<SelectedTeam | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<SelectedTeam>;
      if (!parsed.id || !parsed.name) return null;
      return { id: parsed.id, name: parsed.name, logoUrl: parsed.logoUrl, muted: parsed.muted };
    } catch (e) {
      console.warn("Failed to read selected team from storage", e);
      return null;
    }
  });

  const setSelectedTeam = (team: SelectedTeam | null) => {
    setSelectedTeamState(team);
    try {
      if (team) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to persist selected team", e);
    }
  };

  const toggleMuted = () => {
    setSelectedTeamState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, muted: !prev.muted };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist selected team", e);
      }
      return next;
    });
  };

  const value = useMemo(
    () => ({
      selectedTeam,
      setSelectedTeam,
      toggleMuted,
    }),
    [selectedTeam],
  );

  return <SelectedTeamContext.Provider value={value}>{children}</SelectedTeamContext.Provider>;
}

export function useSelectedTeam() {
  const ctx = useContext(SelectedTeamContext);
  if (!ctx) {
    throw new Error("useSelectedTeam must be used within SelectedTeamProvider");
  }
  return ctx;
}
