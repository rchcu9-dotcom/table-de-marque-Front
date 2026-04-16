import { getApiBaseUrl } from "./env";
import { fetchWithRetry } from "./fetchWithRetry";

export type Partenaire = {
  id: number;
  nom: string;
  logoUrl: string | null;
  urlSite: string | null;
  type: "naming" | "general";
  namingGroup: "A" | "B" | "C" | "D" | null;
  ordre: number;
};

export async function fetchPartenaires(): Promise<Partenaire[]> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/partenaires`);
  return res.json();
}
