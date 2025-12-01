import type { Match } from "./match";

export type ClassementEntry = {
  id: string;
  name: string;
  logoUrl?: string | null;
  rang: number;
  points: number;
  victoires: number;
  nuls: number;
  defaites: number;
  diff: number;
  pouleCode: string;
  pouleName: string;
};

export type PouleClassement = {
  pouleCode: string;
  pouleName: string;
  equipes: ClassementEntry[];
};

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "") : "http://localhost:3000";

export async function fetchClassementByPoule(
  code: string,
): Promise<PouleClassement> {
  const url = `${API_BASE_URL}/poules/${code}/classement`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Classement introuvable");
  return res.json();
}

export async function fetchClassementByMatch(
  id: Match["id"],
): Promise<PouleClassement> {
  const url = `${API_BASE_URL}/matches/${id}/classement`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Classement introuvable");
  return res.json();
}
