import { getApiBaseUrl } from "./env";
import { fetchWithRetry } from "./fetchWithRetry";

export type Team = {
  id: string;
  name: string;
  logoUrl?: string | null;
  pouleCode?: string | null;
  pouleName?: string | null;
  rang?: number;
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchTeams(): Promise<Team[]> {
  const res = await fetchWithRetry(`${API_BASE_URL}/equipes`);
  return res.json();
}

export async function fetchTeamById(id: string): Promise<Team> {
  const res = await fetchWithRetry(`${API_BASE_URL}/equipes/${id}`);
  return res.json();
}
