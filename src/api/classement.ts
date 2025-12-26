import { getApiBaseUrl } from "./env";

export type ClassementEquipe = {
  id: string;
  name: string;
  logoUrl?: string | null;
  rang: number;
  joues: number;
  victoires: number;
  nuls: number;
  defaites: number;
  points: number;
  bp: number;
  bc: number;
  diff: number;
};

export type PouleClassement = {
  pouleCode: string;
  pouleName: string;
  phase?: string | null;
  equipes: ClassementEquipe[];
};

// Alias pour compat compatibilité éventuelle
export type ClassementEntry = ClassementEquipe;

const API_BASE_URL = getApiBaseUrl();

export async function fetchClassementByPoule(code: string, phase?: string): Promise<PouleClassement> {
  const params = phase ? `?phase=${encodeURIComponent(phase)}` : "";
  const res = await fetch(`${API_BASE_URL}/poules/${code}/classement${params}`);
  if (!res.ok) throw new Error("Erreur lors du chargement du classement");
  return res.json();
}

export async function fetchClassementByMatch(matchId: string): Promise<PouleClassement> {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}/classement`);
  if (!res.ok) throw new Error("Erreur lors du chargement du classement du match");
  return res.json();
}
