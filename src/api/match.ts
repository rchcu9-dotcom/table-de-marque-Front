export type MatchStatus = "planned" | "ongoing" | "finished" | "deleted";

export type Match = {
  id: string;
  date: string;
  teamA: string;
  teamB: string;
  status: MatchStatus;
  scoreA: number | null;
  scoreB: number | null;
  teamALogo?: string | null;
  teamBLogo?: string | null;
  pouleName?: string | null;
  pouleCode?: string | null;
};

import { requireBaseUrl } from "./config";

// Normalisation via helper (lève si manquant)
const API_BASE_URL = requireBaseUrl();

export async function fetchMatches(): Promise<Match[]> {
  const url = `${API_BASE_URL}/matches`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors du chargement des matchs");
  return res.json();
}

export async function fetchMatchById(id: string): Promise<Match> {
  const url = `${API_BASE_URL}/matches/${id}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Match introuvable");
  return res.json();
}

export async function fetchMomentumMatches(): Promise<Match[]> {
  const url = `${API_BASE_URL}/matches/momentum`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors du chargement du momentum");
  return res.json();
}
