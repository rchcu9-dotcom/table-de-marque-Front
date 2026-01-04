import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "../api/env";
import type { Match } from "../api/match";

type StreamPayload =
  | {
      type: "matches";
      matches: Match[];
      diff: { changed: boolean; added: string[]; updated: string[]; removed: string[] };
      timestamp: number;
    }
  | { type: string };

/**
 * Ouvre une connexion SSE vers /matches/stream et synchronise le cache react-query.
 * - rejoue le dernier event à la connexion (replay depuis le serveur)
 * - ping keep-alive géré côté serveur
 * - reconnexion automatique en cas de perte
 */
type MatchStreamListenerProps = {
  onOpen?: () => void;
  onError?: () => void;
};

export function MatchStreamListener({ onOpen, onError }: MatchStreamListenerProps = {}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    const streamUrl = `${baseUrl}/matches/stream`;

    let source: EventSource | null = null;
    let reconnectHandle: number | null = null;

    const connect = () => {
      source?.close();
      source = new EventSource(streamUrl);

      source.onmessage = (event) => {
        try {
          const parsed: StreamPayload = JSON.parse(event.data);
          if (parsed.type !== "matches" || !("matches" in parsed)) return;

          const matches = parsed.matches ?? [];
          queryClient.setQueryData<Match[]>(["matches"], matches);
          matches.forEach((m) => queryClient.setQueryData<Match>(["matches", m.id], m));
          queryClient.invalidateQueries({ queryKey: ["matches", "momentum"], exact: false });
        } catch (err) {
          console.error("Match stream parse error", err);
        }
      };

      const scheduleReconnect = () => {
        source?.close();
        source = null;
        if (reconnectHandle) {
          clearTimeout(reconnectHandle);
        }
        reconnectHandle = window.setTimeout(connect, 5000);
        window.dispatchEvent(new CustomEvent("match-stream:error"));
        onError?.();
      };

      source.onerror = scheduleReconnect;
      source.onopen = () => {
        if (reconnectHandle) {
          clearTimeout(reconnectHandle);
          reconnectHandle = null;
        }
        window.dispatchEvent(new CustomEvent("match-stream:open"));
        onOpen?.();
      };
    };

    connect();

    return () => {
      if (reconnectHandle) {
        clearTimeout(reconnectHandle);
      }
      source?.close();
    };
  }, [queryClient, onError, onOpen]);

  return null;
}
