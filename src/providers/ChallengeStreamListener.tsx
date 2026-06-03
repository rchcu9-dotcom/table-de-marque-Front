import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "../api/env";

type ChallengeStreamPayload =
  | {
      type: "challenge";
      diff: { changed: boolean; added: string[]; updated: string[]; removed: string[] };
      timestamp: number;
    }
  | { type: string };

export function ChallengeStreamListener() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const streamUrl = `${baseUrl}/challenge/stream`;

    let source: EventSource | null = null;
    let reconnectHandle: number | null = null;

    const connect = () => {
      source?.close();
      source = new EventSource(streamUrl);

      source.onmessage = (event) => {
        try {
          const parsed: ChallengeStreamPayload = JSON.parse(event.data);
          if (parsed.type !== "challenge") return;
          const payload = parsed as Extract<ChallengeStreamPayload, { type: "challenge" }>;
          if (!payload.diff?.changed) return;

          void queryClient.invalidateQueries({ queryKey: ["challenge"], exact: false });
        } catch (err) {
          console.error("Challenge stream parse error", err);
        }
      };

      const scheduleReconnect = () => {
        source?.close();
        source = null;
        if (reconnectHandle) {
          clearTimeout(reconnectHandle);
        }
        reconnectHandle = window.setTimeout(connect, 5000);
      };

      source.onerror = scheduleReconnect;
      source.onopen = () => {
        if (reconnectHandle) {
          clearTimeout(reconnectHandle);
          reconnectHandle = null;
        }
      };
    };

    connect();

    return () => {
      if (reconnectHandle) {
        clearTimeout(reconnectHandle);
      }
      source?.close();
    };
  }, [queryClient]);

  return null;
}
