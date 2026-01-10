import { getApiBaseUrl } from "./env";

export type LiveStatus = {
  isLive: boolean;
  liveEmbedUrl?: string;
  fallbackEmbedUrl: string;
};

const API_BASE_URL = getApiBaseUrl();

export async function fetchLiveStatus(): Promise<LiveStatus> {
  const url = `${API_BASE_URL}/live/status`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur lors du chargement du live");
  return res.json();
}
