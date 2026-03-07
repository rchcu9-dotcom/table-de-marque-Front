import { getApiBaseUrl } from "./env";
import { fetchWithRetry } from "./fetchWithRetry";

export type LiveSourceState =
  | "ok"
  | "detection_error"
  | "timeout"
  | "quota_exceeded";

export type LiveMode = "live" | "fallback";

export type LiveStatus = {
  isLive: boolean;
  mode?: LiveMode;
  channelUrl?: string;
  liveVideoId?: string | null;
  liveEmbedUrl?: string | null;
  fallbackVideoId?: string;
  fallbackEmbedUrl: string;
  updatedAt?: string;
  nextRefreshInSec?: number;
  sourceState?: LiveSourceState;
};

export const API_BASE_URL = getApiBaseUrl();

export type LiveStreamEnvelope = {
  type?: string;
  status?: LiveStatus;
  version?: string;
  timestamp?: number;
};

export async function fetchLiveStatus(): Promise<LiveStatus> {
  const url = `${API_BASE_URL}/live/status`;
  const res = await fetchWithRetry(url);
  return res.json();
}
