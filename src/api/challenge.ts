import { getApiBaseUrl } from "./env";

export type ClassementGlobalEntry = {
  joueurId: string;
  totalRang: number;
  details: { atelierId: string; rang: number }[];
};

export type ChallengeAttempt = {
  joueurId: string;
  joueurName: string;
  equipeId?: string | null;
  equipeName?: string | null;
  equipeLogoUrl?: string | null;
  atelierId: string;
  atelierLabel: string;
  atelierType: "vitesse" | "tir" | "glisse_crosse";
  phase: string;
  attemptDate?: string | null;
  metrics:
    | { type: "vitesse"; tempsMs: number }
    | { type: "tir"; tirs: number[]; totalPoints: number }
    | { type: "glisse_crosse"; tempsMs: number; penalites: number };
};

export type ChallengeEquipeResponse = {
  equipeId: string;
  equipeName: string | null;
  jour1: ChallengeAttempt[];
  jour3: ChallengeAttempt[];
  autres: ChallengeAttempt[];
};

export type ChallengeAllResponse = {
  jour1: ChallengeAttempt[];
  jour3: ChallengeAttempt[];
  autres: ChallengeAttempt[];
};

export type VitesseJ3SlotId = string;
export type VitesseJ3Status = "qualified" | "finalist" | "winner";
export type VitesseJ3Player = {
  id: string;
  name: string;
  teamId: string;
  teamName?: string | null;
  status?: VitesseJ3Status;
};
export type ChallengeVitesseJ3Response = {
  slots: Record<string, VitesseJ3Player[]>;
  winnerId?: string | null;
  phases?: Record<
    "QF" | "DF" | "F",
    {
      label: string;
      scheduledAt: string | null;
      status: "planned" | "ongoing" | "finished";
      visible: boolean;
      homeVisible: boolean;
    }
  >;
};

export type ChallengeJ1MomentumEntry = {
  teamId: string;
  teamName: string;
  teamLogoUrl: string | null;
  slotStart: string;
  slotEnd: string;
  status: "planned" | "ongoing" | "finished";
  startedAt: string | null;
  finishedAt: string | null;
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchClassementGlobalChallenge(): Promise<ClassementGlobalEntry[]> {
  const res = await fetch(`${API_BASE_URL}/challenge/classement-global`);
  if (!res.ok) throw new Error("Erreur lors du chargement du classement challenge");
  return res.json();
}

export async function fetchChallengeByEquipe(equipeId: string): Promise<ChallengeEquipeResponse> {
  const res = await fetch(`${API_BASE_URL}/challenge/equipes/${encodeURIComponent(equipeId)}`);
  if (!res.ok) throw new Error("Erreur lors du chargement du challenge pour l'équipe");
  return res.json();
}

export async function fetchChallengeAll(params?: { teamId?: string | null }): Promise<ChallengeAllResponse> {
  const query = params?.teamId ? `?teamId=${encodeURIComponent(params.teamId)}` : "";
  const res = await fetch(`${API_BASE_URL}/challenge/all${query}`);
  if (!res.ok) throw new Error("Erreur lors du chargement du challenge");
  return res.json();
}

export async function fetchChallengeVitesseJ3(): Promise<ChallengeVitesseJ3Response> {
  const res = await fetch(`${API_BASE_URL}/challenge/vitesse/j3`);
  if (!res.ok) throw new Error("Erreur lors du chargement du challenge vitesse J3");
  return res.json();
}

export async function fetchChallengeJ1Momentum(): Promise<ChallengeJ1MomentumEntry[]> {
  const res = await fetch(`${API_BASE_URL}/challenge/j1/momentum`);
  if (!res.ok) throw new Error("Erreur lors du chargement du momentum challenge J1");
  return res.json();
}
