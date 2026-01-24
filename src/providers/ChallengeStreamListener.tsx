import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { getApiBaseUrl } from "../api/env";
import type {
  ChallengeAllResponse,
  ChallengeEquipeResponse,
  ClassementGlobalEntry,
  ChallengeVitesseJ3Response,
} from "../api/challenge";

type ChallengeSnapshot = {
  all: ChallengeAllResponse;
  ateliers?: unknown[];
  classementGlobal?: ClassementGlobalEntry[];
  classementByAtelier?: Record<string, unknown>;
  vitesseJ3?: ChallengeVitesseJ3Response;
};

type ChallengeStreamPayload =
  | {
      type: "challenge";
      diff: { changed: boolean; added: string[]; updated: string[]; removed: string[] };
      snapshot: ChallengeSnapshot;
      timestamp: number;
    }
  | { type: string };

function normalizeTeamId(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function filterByTeam(all: ChallengeAllResponse, teamId: string): ChallengeAllResponse {
  const needle = normalizeTeamId(teamId);
  const filter = (attempt: ChallengeAllResponse["jour1"][number]) =>
    normalizeTeamId(attempt.equipeId) === needle;
  return {
    jour1: all.jour1.filter(filter),
    jour3: all.jour3.filter(filter),
    autres: all.autres.filter(filter),
  };
}

function buildEquipeResponse(all: ChallengeAllResponse, equipeId: string): ChallengeEquipeResponse {
  const filtered = filterByTeam(all, equipeId);
  const first = filtered.jour1[0] ?? filtered.jour3[0] ?? filtered.autres[0];
  return {
    equipeId,
    equipeName: first?.equipeName ?? equipeId,
    ...filtered,
  };
}

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

      source.onmessage = async (event) => {
        try {
          const parsed: ChallengeStreamPayload = JSON.parse(event.data);
          if (parsed.type !== "challenge" || !("snapshot" in parsed)) return;

          const snapshot = parsed.snapshot;
          await queryClient.cancelQueries({ queryKey: ["challenge"], exact: false });

          queryClient.setQueryData<ChallengeAllResponse>(["challenge", "all", null], snapshot.all);
          if (snapshot.classementGlobal) {
            queryClient.setQueryData<ClassementGlobalEntry[]>(
              ["challenge", "classement-global"],
              snapshot.classementGlobal,
            );
          }
          if (snapshot.vitesseJ3) {
            queryClient.setQueryData<ChallengeVitesseJ3Response>(
              ["challenge", "vitesse", "j3"],
              snapshot.vitesseJ3,
            );
          }

          const challengeQueries = queryClient.getQueryCache().findAll({
            predicate: (query) => query.queryKey[0] === "challenge",
          });

          challengeQueries.forEach((query) => {
            const key = query.queryKey as Array<string | null | undefined>;
            const scope = key[1];

            if (scope === "all") {
              const teamId = key[2];
              const data = teamId ? filterByTeam(snapshot.all, teamId) : snapshot.all;
              queryClient.setQueryData<ChallengeAllResponse>(key, data);
              return;
            }

            if (scope === "equipe") {
              const equipeId = key[2];
              if (!equipeId) return;
              queryClient.setQueryData<ChallengeEquipeResponse>(
                key,
                buildEquipeResponse(snapshot.all, equipeId),
              );
              return;
            }

            if (scope === "classement-global" && snapshot.classementGlobal) {
              queryClient.setQueryData<ClassementGlobalEntry[]>(
                key,
                snapshot.classementGlobal,
              );
              return;
            }

            if (scope === "ateliers" && snapshot.ateliers) {
              queryClient.setQueryData(key, snapshot.ateliers);
              return;
            }

            if (scope === "classement-atelier" && snapshot.classementByAtelier) {
              const atelierId = key[2] ?? undefined;
              const data = atelierId ? snapshot.classementByAtelier[atelierId] : undefined;
              if (data) {
                queryClient.setQueryData(key, data);
              }
            }
          });
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
