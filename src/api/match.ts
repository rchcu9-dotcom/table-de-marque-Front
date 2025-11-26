export type MatchStatus = "planned" | "ongoing" | "finished" | "deleted";

export type Match = {
  id: string;
  date: string;
  teamA: string;
  teamB: string;
  status: MatchStatus;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

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
