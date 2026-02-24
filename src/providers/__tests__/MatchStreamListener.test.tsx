import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { MatchStreamListener } from "../MatchStreamListener";
import type { Match } from "../../api/match";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static reset() {
    FakeEventSource.instances = [];
  }

  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onopen: (() => void) | null = null;

  constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
    // simulate open
    setTimeout(() => this.onopen?.(), 0);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  close() {
    // noop
  }
}

describe("MatchStreamListener", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).EventSource = FakeEventSource;
    FakeEventSource.reset();
    (globalThis as any).__APP_API_BASE_URL__ = "http://localhost:3000";
  });

  afterEach(() => {
    vi.useRealTimers();
    FakeEventSource.reset();
  });

  it("met à jour le cache react-query lors d'un event matches", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["matches", "42"], {
      id: "42",
      date: "2024-01-01T00:00:00.000Z",
      teamA: "A",
      teamB: "B",
      status: "planned",
      scoreA: null,
      scoreB: null,
    });

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    // Récupère l'instance EventSource créée par le listener
    const es = FakeEventSource.instances[0];

    const payload = {
      type: "matches",
      matches: [
        {
          id: "42",
          date: "2024-01-01T00:00:00.000Z",
          teamA: "A",
          teamB: "B",
          status: "planned",
          scoreA: null,
          scoreB: null,
        } satisfies Match,
      ],
      diff: { changed: true, added: ["42"], updated: [], removed: [] },
      timestamp: Date.now(),
    };

    await act(async () => {
      es.emit(payload);
    });

    expect(qc.getQueryData<Match[]>(["matches"])).toEqual(payload.matches);
    expect(qc.getQueryData<Match[]>(["matches", false])).toEqual(payload.matches);
    expect(qc.getQueryData<Match[]>(["matches", true])).toEqual(payload.matches);
    expect(qc.getQueryData<Match>(["matches", "42"])).toEqual(payload.matches[0]);
  });

  it("declenche un refresh J3 throttlé sur les events matches", async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <MatchStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];
    const payload = {
      type: "matches",
      matches: [],
      diff: { changed: true, added: [], updated: [], removed: [] },
      timestamp: Date.now(),
    };

    await act(async () => {
      es.emit(payload);
    });
    const getJ3RefreshCalls = () =>
      invalidateSpy.mock.calls.filter(
        (args: [unknown?]) =>
          JSON.stringify((args[0] as { queryKey?: unknown[] } | undefined)?.queryKey) ===
          JSON.stringify(["classement", "j3", "carres"]),
      );
    expect(getJ3RefreshCalls()).toHaveLength(1);

    await act(async () => {
      es.emit(payload);
      es.emit(payload);
    });
    expect(getJ3RefreshCalls()).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(getJ3RefreshCalls()).toHaveLength(2);
    expect(getJ3RefreshCalls()[0]?.[0]).toMatchObject({
      queryKey: ["classement", "j3", "carres"],
      exact: true,
      refetchType: "active",
    });
  });
});
