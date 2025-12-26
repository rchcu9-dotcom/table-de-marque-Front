import { getApiBaseUrl } from "./env";

export type Joueur = {
  id: string;
  equipeId: string;
  name: string;
  numero: number;
  poste: "Att" | "Def" | "Gar";
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchJoueursByEquipe(equipeId: string): Promise<Joueur[]> {
  const params = new URLSearchParams();
  params.set("equipe", equipeId);
  const res = await fetch(`${API_BASE_URL}/joueurs?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Erreur lors du chargement des joueurs");
  }
  return res.json();
}
