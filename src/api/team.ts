import { getApiBaseUrl } from "./env";

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
  const res = await fetch(`${API_BASE_URL}/equipes`);
  if (!res.ok) throw new Error("Erreur lors du chargement des équipes");
  return res.json();
}

export async function fetchTeamById(id: string): Promise<Team> {
  const res = await fetch(`${API_BASE_URL}/equipes/${id}`);
  if (!res.ok) throw new Error("Équipe introuvable");
  return res.json();
}
