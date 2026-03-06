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

export type FinalSquareTeam = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type FinalSquareMatch = {
  id: string;
  date: string;
  status: "planned" | "ongoing" | "finished";
  teamA: FinalSquareTeam;
  teamB: FinalSquareTeam;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: string | null;
};

export type FinalSquareRankingRow = {
  rankInSquare: 1 | 2 | 3 | 4;
  place: number;
  team: FinalSquareTeam | null;
  placeholder: string | null;
};

export type FinalSquare = {
  dbCode: "E" | "F" | "G" | "H";
  label: string;
  placeRange: string;
  semiFinals: FinalSquareMatch[];
  finalMatch: FinalSquareMatch | null;
  thirdPlaceMatch: FinalSquareMatch | null;
  ranking: FinalSquareRankingRow[];
};

export type J3FinalSquaresResponse = {
  jour: "J3";
  carres: FinalSquare[];
  computedAt: string;
};

export type ClassementEntry = ClassementEquipe;

const API_BASE_URL = getApiBaseUrl();

export async function fetchClassementByPoule(
  code: string,
  phase?: string,
): Promise<PouleClassement> {
  const params = phase ? `?phase=${encodeURIComponent(phase)}` : "";
  const res = await fetch(`${API_BASE_URL}/poules/${code}/classement${params}`);
  if (!res.ok) throw new Error("Erreur lors du chargement du classement");
  return res.json();
}

export async function fetchClassementByMatch(
  matchId: string,
): Promise<PouleClassement> {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}/classement`);
  if (!res.ok)
    throw new Error("Erreur lors du chargement du classement du match");
  return res.json();
}

export async function fetchJ3FinalSquares(): Promise<J3FinalSquaresResponse> {
  const res = await fetch(`${API_BASE_URL}/tournoi/5v5/j3/carres`);
  if (!res.ok) throw new Error("Erreur lors du chargement des carrés J3");
  return res.json();
}
