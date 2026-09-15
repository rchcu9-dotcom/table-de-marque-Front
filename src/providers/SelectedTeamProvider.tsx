/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

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

/**
 * L'équipe suivie (localStorage, cf. STORAGE_KEY ci-dessus) est un réglage de confort
 * local au navigateur, jamais lié à un compte — sans ce composant elle survit à une
 * déconnexion/reconnexion et peut donc afficher, après connexion, l'équipe qu'un AUTRE
 * compte a suivie sur ce même navigateur (bug confirmé en usage réel : connecté en
 * `4test@yahoo.fr`, sans candidature, l'app affichait encore "Loups de Lyon" suivi par
 * une session précédente). À monter une seule fois, dans l'arbre de <AuthProvider>
 * (nécessaire pour useAuth) ET de <SelectedTeamProvider> (nécessaire pour
 * useSelectedTeam) — cf. main.tsx.
 */
export function SelectedTeamAuthSync() {
  const { user } = useAuth();
  const { selectedTeam, setSelectedTeam } = useSelectedTeam();
  const uid = user?.uid ?? null;
  const previousUidRef = useRef(uid);

  useEffect(() => {
    if (previousUidRef.current === uid) return;
    previousUidRef.current = uid;
    if (selectedTeam) {
      setSelectedTeam(null);
    }
    // selectedTeam volontairement absent des deps : on ne veut réagir qu'aux changements
    // d'identité (uid), pas aux changements de selectedTeam lui-même (qui inclurait le
    // setSelectedTeam(null) qu'on vient de déclencher, sans effet ici mais plus fragile).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return null;
}
