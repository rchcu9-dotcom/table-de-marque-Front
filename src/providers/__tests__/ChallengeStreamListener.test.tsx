import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ChallengeStreamListener } from "../ChallengeStreamListener";
import type { ChallengeAllResponse, ClassementGlobalEntry } from "../../api/challenge";

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
});
