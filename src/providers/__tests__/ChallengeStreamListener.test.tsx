import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ChallengeStreamListener } from "../ChallengeStreamListener";

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

  it("invalide les queries challenge quand diff.changed est true", async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <ChallengeStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    await act(async () => {
      es.emit({
        type: "challenge",
        diff: { changed: true, added: ["p1"], updated: [], removed: [] },
        timestamp: Date.now(),
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["challenge"], exact: false });
  });

  it("n'invalide pas les queries quand diff.changed est false", async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <ChallengeStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    await act(async () => {
      es.emit({
        type: "challenge",
        diff: { changed: false, added: [], updated: [], removed: [] },
        timestamp: Date.now(),
      });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("ignore les events qui ne sont pas de type challenge", async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    render(
      <QueryClientProvider client={qc}>
        <ChallengeStreamListener />
      </QueryClientProvider>,
    );

    const es = FakeEventSource.instances[0];

    await act(async () => {
      es.emit({ type: "ping", timestamp: Date.now() });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
