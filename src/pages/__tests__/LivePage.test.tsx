import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import LivePage from "../LivePage";
import { fetchLiveStatus } from "../../api/live";

vi.mock("../../api/live", () => ({
  fetchLiveStatus: vi.fn(),
}));

const mockFetchLiveStatus = vi.mocked(fetchLiveStatus);

beforeEach(() => {
  mockFetchLiveStatus.mockReset();
});

describe("LivePage", () => {
  it("affiche le badge LIVE quand un live est actif", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      liveEmbedUrl: "https://www.youtube.com/embed/live-id",
      fallbackEmbedUrl: "https://www.youtube.com/embed/fallback-id",
    });

    render(<LivePage />);

    expect(await screen.findByTestId("live-badge")).toBeInTheDocument();
  });

  it("affiche la video fallback quand aucun live n'est actif", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: false,
      fallbackEmbedUrl: "https://www.youtube.com/embed/at3v7WepbDg",
    });

    render(<LivePage />);

    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain("at3v7WepbDg");
  });

  it("affiche un etat d'erreur quand le chargement echoue", async () => {
    mockFetchLiveStatus.mockResolvedValue({
      isLive: true,
      liveEmbedUrl: undefined,
      fallbackEmbedUrl: "",
    });

    render(<LivePage />);

    expect(await screen.findByTestId("live-error")).toBeInTheDocument();
    expect(screen.getByTestId("live-retry")).toBeInTheDocument();
  });

  it("affiche la video fallback quand l'appel live echoue", async () => {
    mockFetchLiveStatus.mockRejectedValue(new Error("Network error"));

    render(<LivePage />);

    const iframe = (await screen.findByTestId("live-iframe")) as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toContain("at3v7WepbDg");
  });
});
