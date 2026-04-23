import { getApiBaseUrl } from "./env";
import { fetchWithRetry } from "./fetchWithRetry";
import { ServerError } from "./errors";

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
  competitionType?: "5v5" | "3v3" | "challenge";
  surface?: "GG" | "PG";
  phase?: string | null;
  jour?: string | null;
  ecart?: number | null;
};

const API_BASE_URL = getApiBaseUrl();

export type MatchFilters = {
  competitionType?: "5v5" | "3v3" | "challenge";
  surface?: "GG" | "PG";
  status?: MatchStatus;
  teamId?: string;
  jour?: string;
};

export async function fetchMatches(filters: MatchFilters = {}): Promise<Match[]> {
  const params = new URLSearchParams();
  if (filters.competitionType) params.set("competition", filters.competitionType);
  if (filters.surface) params.set("surface", filters.surface);
  if (filters.status) params.set("status", filters.status);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.jour) params.set("jour", filters.jour);
  const url = `${API_BASE_URL}/matches${params.toString() ? `?${params.toString()}` : ""}`;
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error: unknown) {
    if (error instanceof ServerError && error.status === 404) {
      throw new Error("Erreur lors du chargement des matchs");
    }
    throw error;
  }
}

export async function fetchMatchById(id: string): Promise<Match> {
  const url = `${API_BASE_URL}/matches/${id}`;
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error: unknown) {
    if (error instanceof ServerError && error.status === 404) {
      throw new Error("Match introuvable");
    }
    throw error;
  }
}

export async function fetchMomentumMatches(filters: MatchFilters = {}): Promise<Match[]> {
  const params = new URLSearchParams();
  if (filters.surface) params.set("surface", filters.surface);
  if (filters.competitionType) params.set("competition", filters.competitionType);
  const url = `${API_BASE_URL}/matches/momentum${params.toString() ? `?${params.toString()}` : ""}`;
  try {
    const res = await fetchWithRetry(url);
    return res.json();
  } catch (error: unknown) {
    if (error instanceof ServerError && error.status === 404) {
      throw new Error("Erreur lors du chargement du momentum");
    }
    throw error;
  }
}
