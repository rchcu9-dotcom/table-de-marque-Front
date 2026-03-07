import { getApiBaseUrl } from "./env";
import { fetchWithRetry } from "./fetchWithRetry";

export type Joueur = {
  id: string;
  equipeId: string;
  name: string;
  prenom?: string;
  nom?: string;
  numero: number;
  poste: "Att" | "Def" | "Gar";
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchJoueursByEquipe(equipeId: string): Promise<Joueur[]> {
  const params = new URLSearchParams();
  params.set("equipe", equipeId);
  const res = await fetchWithRetry(`${API_BASE_URL}/joueurs?${params.toString()}`);
  return res.json();
}
