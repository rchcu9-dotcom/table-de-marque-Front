import "@testing-library/jest-dom/vitest";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import LivePage from "../LivePage";
import { fetchLiveStatus } from "../../api/live";

vi.mock("../../api/live", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/live")>();
  return {
    ...actual,
    fetchLiveStatus: vi.fn(),
  };
});

class MockEventSource {
  static instances: MockEventSource[] = [];

  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;

  private listeners = new Map<string, Set<EventListener>>();
  readonly url: string;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }

  emitLiveStatus(payload: unknown) {
    const event = { data: JSON.stringify(payload) } as MessageEvent<string>;
    this.listeners.get("live_status")?.forEach((listener) => listener(event as unknown as Event));
  }

  emitMessage(payload: unknown) {
    const event = { data: JSON.stringify(payload) } as MessageEvent<string>;
    this.onmessage?.(event);
  }
}

const mockFetchLiveStatus = vi.mocked(fetchLiveStatus);

beforeEach(() => {
  mockFetchLiveStatus.mockReset();
  MockEventSource.instances = [];
  vi.stubGlobal("EventSource", MockEventSource as unknown as typeof EventSource);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LivePage", () => {
  it("affiche le badge LIVE et l'iframe live au bootstrap quand un live est actif", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      liveEmbedUrl: "https://www.youtube.com/embed/live-id",
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);

    expect(await screen.findByTestId("live-badge")).toBeInTheDocument();
    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.src).toContain("live-id");
  });

  it("affiche la video fallback quand aucun live n'est actif", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/at3v7WepbDg",
    });

    render(<LivePage />);

    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.src).toContain("at3v7WepbDg");
  });

  it("applique un fallback silencieux quand /live/status est en erreur", async () => {
    mockFetchLiveStatus.mockRejectedValue(new Error("Network error"));

    render(<LivePage />);

    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.src).toContain("at3v7WepbDg");
    expect(screen.queryByTestId("live-error")).not.toBeInTheDocument();
  });

  it("applique un fallback silencieux quand sourceState=quota_exceeded", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      mode: "fallback",
      sourceState: "quota_exceeded",
      fallbackEmbedUrl: "https://www.youtube.com/embed/quota-fallback-id",
    });

    render(<LivePage />);

    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.src).toContain("quota-fallback-id");
    expect(screen.queryByTestId("live-error")).not.toBeInTheDocument();
  });

  it("bascule fallback -> live sur event SSE enveloppe", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);

    const fallbackIframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(fallbackIframe.src).toContain("fallback-id");

    const stream = MockEventSource.instances[0];
    await act(async () => {
      stream.emitLiveStatus({
        type: "live_status",
        status: {
          isLive: true,
          liveEmbedUrl: "https://www.youtube.com/embed/live-id",
          fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
        },
      });
    });

    await waitFor(() => expect(screen.getByTestId("live-badge")).toBeInTheDocument());
    const liveIframe = screen.getByTestId("live-iframe") as HTMLIFrameElement;
    expect(liveIframe.src).toContain("live-id");
  });

  it("bascule live -> fallback sur event SSE direct", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      liveEmbedUrl: "https://www.youtube.com/embed/live-id",
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);
    const liveIframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(liveIframe.src).toContain("live-id");

    const stream = MockEventSource.instances[0];
    await act(async () => {
      stream.emitMessage({
        isLive: false,
        fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
      });
    });

    await waitFor(() => expect(screen.queryByTestId("live-badge")).not.toBeInTheDocument());
    const fallbackIframe = screen.getByTestId("live-iframe") as HTMLIFrameElement;
    expect(fallbackIframe.src).toContain("fallback-id");
  });

  it("active le polling apres erreur SSE puis le stoppe a la reconnexion", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);
    await screen.findByTestId("live-iframe");
    vi.useFakeTimers();

    const firstStream = MockEventSource.instances[0];
    await act(async () => {
      firstStream.emitError();
    });

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(mockFetchLiveStatus).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
    const secondStream = MockEventSource.instances[1];
    secondStream.emitOpen();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(mockFetchLiveStatus).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("ignore un payload SSE invalide sans casser l'affichage courant", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);

    const stream = MockEventSource.instances[0];
    const before = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(before.src).toContain("fallback-id");

    await act(async () => {
      stream.emitMessage("{not-json");
    });

    const after = screen.getByTestId("live-iframe") as HTMLIFrameElement;
    expect(after.src).toContain("fallback-id");
    expect(screen.queryByTestId("live-error")).not.toBeInTheDocument();
  });

  it("accepte aussi un payload direct sur l'event live_status", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);
    await screen.findByTestId("live-iframe");

    const stream = MockEventSource.instances[0];
    await act(async () => {
      stream.emitLiveStatus({
        isLive: true,
        liveEmbedUrl: "https://www.youtube.com/embed/live-id",
        fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
      });
    });

    await waitFor(() => expect(screen.getByTestId("live-badge")).toBeInTheDocument());
  });

  it("bascule live -> fallback via event live_status", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      mode: "live",
      liveVideoId: "live-id",
      liveEmbedUrl: "https://www.youtube.com/embed/live-id",
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);
    await screen.findByTestId("live-badge");

    const stream = MockEventSource.instances[0];
    await act(async () => {
      stream.emitLiveStatus({
        type: "live_status",
        status: {
          isLive: false,
          mode: "fallback",
          sourceState: "ok",
          fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
        },
      });
    });

    await waitFor(() => expect(screen.queryByTestId("live-badge")).not.toBeInTheDocument());
    const iframe = screen.getByTestId("live-iframe") as HTMLIFrameElement;
    expect(iframe.src).toContain("fallback-id");
  });

  it("affiche un live force comme un live normal", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      mode: "live",
      liveVideoId: "forced-live-id",
      liveEmbedUrl: "https://www.youtube.com/embed/forced-live-id",
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
      sourceState: "ok",
    });

    render(<LivePage />);

    expect(await screen.findByTestId("live-badge")).toBeInTheDocument();
    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.src).toContain("forced-live-id");
  });

  it("reconnecte le stream apres timeout et garde une seule connexion active", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);
    await screen.findByTestId("live-iframe");
    vi.useFakeTimers();

    const firstStream = MockEventSource.instances[0];
    await act(async () => {
      firstStream.emitError();
      vi.advanceTimersByTime(5_000);
    });

    expect(MockEventSource.instances).toHaveLength(2);
    expect(firstStream.closed).toBe(true);
    const activeStreams = MockEventSource.instances.filter((instance) => !instance.closed);
    expect(activeStreams).toHaveLength(1);
  });
});
