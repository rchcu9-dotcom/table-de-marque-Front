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

export async function fetchChallengeAll(): Promise<ChallengeAllResponse> {
  const res = await fetch(`${API_BASE_URL}/challenge/all`);
  if (!res.ok) throw new Error("Erreur lors du chargement du challenge");
  return res.json();
}
