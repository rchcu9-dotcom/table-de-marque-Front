import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MatchStreamListener } from "../MatchStreamListener";
import { matchLiveQueryKey } from "../../hooks/useMatchLive";
import type { MatchLiveDetail } from "../../api/tableDeMarque";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static reset() {
    FakeEventSource.instances = [];
  }

  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  close() {}
}

describe("MatchStreamListener — événements match-live", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as unknown as Record<string, unknown>).EventSource = FakeEventSource;
    FakeEventSource.reset();
    (globalThis as unknown as Record<string, unknown>).__APP_API_BASE_URL__ = "http://localhost:3000";
  });

  afterEach(() => {
    vi.useRealTimers();
    FakeEventSource.reset();
  });

  it("met à jour le cache react-query pour la clé [\"match-live\", numMatch] lors d'un événement match-live", async () => {
    const numMatch = 42;
    const qc = new QueryClient();

    const initialDetail: MatchLiveDetail = {
      matchLive: {
        numMatch,
        etat: "PLANIFIE",
        tempsEcouleSecondes: 0,
        chronoEnCours: false,
        chronoDerniereMajAt: null,
        score1Cache: 0,
        score2Cache: 0,
        createdAt: "2026-09-04T10:00:00.000Z",
        updatedAt: "2026-09-04T10:00:00.000Z",
      },
      buts: [],
      penalites: [],
    };

    qc.setQueryData(matchLiveQueryKey(numMatch), initialDetail);

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    const payload = {
      type: "match-live",
      numMatch,
      etat: "EN_COURS",
      tempsEcouleSecondes: 300,
      chronoEnCours: true,
      chronoDerniereMajAt: "2026-09-04T10:05:00.000Z",
      score1: 1,
      score2: 0,
      timestamp: Date.now(),
    };

    await act(async () => {
      es.emit(payload);
    });

    const updated = qc.getQueryData<MatchLiveDetail>(matchLiveQueryKey(numMatch));
    expect(updated).toBeDefined();
    expect(updated!.matchLive.etat).toBe("EN_COURS");
    expect(updated!.matchLive.tempsEcouleSecondes).toBe(300);
    expect(updated!.matchLive.chronoEnCours).toBe(true);
    expect(updated!.matchLive.chronoDerniereMajAt).toBe("2026-09-04T10:05:00.000Z");
    expect(updated!.matchLive.score1Cache).toBe(1);
    expect(updated!.matchLive.score2Cache).toBe(0);
  });

  it("préserve les buts et pénalités existants dans le cache lors d'une mise à jour SSE", async () => {
    const numMatch = 5;
    const qc = new QueryClient();

    const initialDetail: MatchLiveDetail = {
      matchLive: {
        numMatch,
        etat: "EN_PAUSE",
        tempsEcouleSecondes: 100,
        chronoEnCours: false,
        chronoDerniereMajAt: null,
        score1Cache: 1,
        score2Cache: 0,
        createdAt: "2026-09-04T10:00:00.000Z",
        updatedAt: "2026-09-04T10:00:00.000Z",
      },
      buts: [
        {
          id: 1,
          numMatch,
          equipeId: 10,
          buteurId: 101,
          assist1Id: null,
          assist2Id: null,
          tempsJeuSecondes: 60,
          createdAt: "2026-09-04T10:01:00.000Z",
        },
      ],
      penalites: [],
    };

    qc.setQueryData(matchLiveQueryKey(numMatch), initialDetail);

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    await act(async () => {
      es.emit({
        type: "match-live",
        numMatch,
        etat: "EN_COURS",
        tempsEcouleSecondes: 150,
        chronoEnCours: true,
        chronoDerniereMajAt: "2026-09-04T10:02:30.000Z",
        score1: 1,
        score2: 0,
        timestamp: Date.now(),
      });
    });

    const updated = qc.getQueryData<MatchLiveDetail>(matchLiveQueryKey(numMatch));
    expect(updated!.buts).toHaveLength(1);
    expect(updated!.penalites).toHaveLength(0);
  });

  it("ignore un événement match-live sans numMatch valide", async () => {
    const qc = new QueryClient();
    const setQueryDataSpy = vi.spyOn(qc, "setQueryData");

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    await act(async () => {
      es.emit({ type: "match-live" });
    });

    // setQueryData ne doit pas être appelé avec une clé match-live si numMatch manque
    const matchLiveCalls = setQueryDataSpy.mock.calls.filter(
      (args) => Array.isArray(args[0]) && args[0][0] === "match-live",
    );
    expect(matchLiveCalls).toHaveLength(0);
  });

  it("ne perturbe pas le traitement des événements matches classiques", async () => {
    const qc = new QueryClient();

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];
    const fakeMatches = [{ id: "1", teamA: "A", teamB: "B", status: "planned" }];

    await act(async () => {
      es.emit({
        type: "matches",
        matches: fakeMatches,
        diff: { changed: true, added: ["1"], updated: [], removed: [] },
        timestamp: Date.now(),
      });
    });

    expect(qc.getQueryData(["matches"])).toEqual(fakeMatches);
  });
});
