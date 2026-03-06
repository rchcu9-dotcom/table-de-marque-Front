import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ChallengeStreamListener } from "../ChallengeStreamListener";
import type { ChallengeAllResponse, ClassementGlobalEntry, ChallengeJ1MomentumEntry } from "../../api/challenge";

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
    setTimeout(() => this.onopen?.(), 0);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  close() {
    // noop
  }
}

describe("ChallengeStreamListener", () => {
  beforeEach(() => {
    (globalThis as any).EventSource = FakeEventSource;
    FakeEventSource.reset();
    (globalThis as any).__APP_API_BASE_URL__ = "http://localhost:3000";
  });

  afterEach(() => {
    FakeEventSource.reset();
  });

  it("applique le snapshot challenge sur les queries all/equipe/classement", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["challenge", "all", null], { jour1: [], jour3: [], autres: [] });
    qc.setQueryData(["challenge", "all", "rennes"], { jour1: [], jour3: [], autres: [] });
    qc.setQueryData(["challenge", "equipe", "rennes"], {
      equipeId: "rennes",
      equipeName: "Rennes",
      jour1: [],
      jour3: [],
      autres: [],
    });
    qc.setQueryData(["challenge", "classement-global"], []);

    render(
      <QueryClientProvider client={qc}>
        <ChallengeStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];
    const snapshotAll: ChallengeAllResponse = {
      jour1: [
        {
          joueurId: "p1",
          joueurName: "Rennes J1",
          equipeId: "rennes",
          equipeName: "Rennes",
          atelierId: "vitesse-1",
          atelierLabel: "Atelier Vitesse",
          atelierType: "vitesse",
          phase: "evaluation",
          attemptDate: "2026-01-01T10:00:00.000Z",
          metrics: { type: "vitesse", tempsMs: 25000 },
        },
      ],
      jour3: [],
      autres: [],
    };
    const classementGlobal: ClassementGlobalEntry[] = [
      { joueurId: "p1", totalRang: 1, details: [{ atelierId: "vitesse-1", rang: 1 }] },
    ];

    await act(async () => {
      es.emit({
        type: "challenge",
        diff: { changed: true, added: ["p1"], updated: [], removed: [] },
        snapshot: {
          all: snapshotAll,
          classementGlobal,
        },
        timestamp: Date.now(),
      });
    });

    expect(qc.getQueryData<ChallengeAllResponse>(["challenge", "all", null])).toEqual(snapshotAll);
    expect(qc.getQueryData<ChallengeAllResponse>(["challenge", "all", "rennes"])).toEqual({
      jour1: snapshotAll.jour1,
      jour3: [],
      autres: [],
    });
    expect(qc.getQueryData(["challenge", "equipe", "rennes"])).toEqual({
      equipeId: "rennes",
      equipeName: "Rennes",
      jour1: snapshotAll.jour1,
      jour3: [],
      autres: [],
    });
    expect(qc.getQueryData(["challenge", "classement-global"])).toEqual(classementGlobal);
  });

  it('met a jour la key challenge momentum j1 depuis snapshot.j1Momentum', async () => {
    const qc = new QueryClient();
    qc.setQueryData<ChallengeJ1MomentumEntry[]>(["challenge", "momentum", "j1"], [
      {
        teamId: "old",
        teamName: "Old Team",
        teamLogoUrl: null,
        slotStart: "2026-01-17T09:00:00.000Z",
        slotEnd: "2026-01-17T09:40:00.000Z",
        status: "planned",
        startedAt: null,
        finishedAt: null,
      },
    ]);

    render(
      <QueryClientProvider client={qc}>
        <ChallengeStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];
    const j1Momentum: ChallengeJ1MomentumEntry[] = [
      {
        teamId: "rennes",
        teamName: "Rennes",
        teamLogoUrl: null,
        slotStart: "2026-01-17T10:00:00.000Z",
        slotEnd: "2026-01-17T10:40:00.000Z",
        status: "ongoing",
        startedAt: "2026-01-17T10:00:00.000Z",
        finishedAt: null,
      },
    ];

    await act(async () => {
      es.emit({
        type: "challenge",
        diff: { changed: true, added: [], updated: ["momentum"], removed: [] },
        snapshot: {
          all: { jour1: [], jour3: [], autres: [] },
          j1Momentum,
        },
        timestamp: Date.now(),
      });
    });

    expect(qc.getQueryData(["challenge", "momentum", "j1"])).toEqual(j1Momentum);
  });
});
