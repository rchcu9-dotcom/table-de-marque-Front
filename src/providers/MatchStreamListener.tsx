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
    let degradedPollHandle: number | null = null;
    let j3RefetchHandle: number | null = null;
    let lastJ3RefetchAt = 0;

    const maybeRefreshJ3Squares = () => {
      const j3QueryKey = ["classement", "j3", "carres"] as const;

      const triggerRefresh = () => {
        lastJ3RefetchAt = Date.now();
        j3RefetchHandle = null;
        void queryClient.invalidateQueries({
          queryKey: j3QueryKey,
          exact: true,
          refetchType: "active",
        });
      };

      const now = Date.now();
      const remaining = 2000 - (now - lastJ3RefetchAt);
      if (remaining <= 0 && !j3RefetchHandle) {
        triggerRefresh();
        return;
      }

      if (j3RefetchHandle) return;
      j3RefetchHandle = window.setTimeout(triggerRefresh, remaining);
    };

    const connect = () => {
      source?.close();
      source = new EventSource(streamUrl);

      source.onmessage = async (event) => {
        try {
          const parsed: StreamPayload = JSON.parse(event.data);
          if (parsed.type !== "matches" || !("matches" in parsed)) return;

          const matches = parsed.matches ?? [];
          await queryClient.cancelQueries({ queryKey: ["matches"], exact: false });
          queryClient.setQueryData<Match[]>(["matches"], matches);

          maybeRefreshJ3Squares();

          queryClient.invalidateQueries({
            predicate: (query) =>
              query.queryKey[0] === "classement" && query.queryKey[1] !== "j3",
            refetchType: "active",
          });
        } catch (err) {
          console.error("Match stream parse error", err);
        }
      };

      const scheduleReconnect = () => {
        source?.close();
        source = null;
        if (reconnectHandle) clearTimeout(reconnectHandle);
        reconnectHandle = window.setTimeout(connect, 5000);
        if (!degradedPollHandle) {
          degradedPollHandle = window.setInterval(() => {
            void queryClient.refetchQueries({ queryKey: ["matches"], exact: true });
          }, 30_000);
        }
        window.dispatchEvent(new CustomEvent("match-stream:error"));
        onError?.();
      };

      source.onerror = scheduleReconnect;
      source.onopen = () => {
        if (reconnectHandle) {
          clearTimeout(reconnectHandle);
          reconnectHandle = null;
        }
        if (degradedPollHandle) {
          clearInterval(degradedPollHandle);
          degradedPollHandle = null;
        }
        window.dispatchEvent(new CustomEvent("match-stream:open"));
        onOpen?.();
      };
    };

    connect();

    return () => {
      if (reconnectHandle) clearTimeout(reconnectHandle);
      if (degradedPollHandle) clearInterval(degradedPollHandle);
      if (j3RefetchHandle) clearTimeout(j3RefetchHandle);
      source?.close();
    };
  }, [queryClient, onError, onOpen]);

  return null;
}
