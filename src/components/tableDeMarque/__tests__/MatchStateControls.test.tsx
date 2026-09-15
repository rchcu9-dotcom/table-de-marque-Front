import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import MatchStateControls from "../MatchStateControls";
import type { MatchLiveEtat } from "../../../api/tableDeMarque";

vi.mock("../../../api/tableDeMarque", () => ({
  annoncerMatch: vi.fn(),
  demarrerMatch: vi.fn(),
  pauserMatch: vi.fn(),
  terminerMatch: vi.fn(),
  fetchMatchLive: vi.fn(),
  fetchEffectifsMatch: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderControls(etat: MatchLiveEtat) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <MatchStateControls numMatch={1} etat={etat} token="test-token" />,
    { wrapper: makeWrapper(qc) },
  );
}

describe("MatchStateControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("état PLANIFIE", () => {
    it("affiche uniquement le bouton \"Lancer l'annonce\"", () => {
      renderControls("PLANIFIE");
      expect(screen.getByRole("button", { name: "Lancer l'annonce" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Démarrer" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Terminer le match" })).not.toBeInTheDocument();
    });
  });

  describe("état ANNONCE", () => {
    it("affiche uniquement le bouton \"Démarrer\"", () => {
      renderControls("ANNONCE");
      expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lancer l'annonce" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Terminer le match" })).not.toBeInTheDocument();
    });
  });

  describe("état EN_COURS", () => {
    it("affiche uniquement le bouton \"Pause\"", () => {
      renderControls("EN_COURS");
      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lancer l'annonce" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Démarrer" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Terminer le match" })).not.toBeInTheDocument();
    });
  });

  describe("état EN_PAUSE", () => {
    it("affiche les boutons \"Démarrer\" (reprise) et \"Terminer le match\"", () => {
      renderControls("EN_PAUSE");
      expect(screen.getByRole("button", { name: "Démarrer" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Terminer le match" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Lancer l'annonce" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
    });
  });

  describe("état TERMINE", () => {
    it("n'affiche aucun bouton d'action (D4 — match non réouvrable)", () => {
      renderControls("TERMINE");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText(/terminé/i)).toBeInTheDocument();
    });
  });

  describe("dispatch de l'action au clic", () => {
    it("\"Lancer l'annonce\" appelle annoncerMatch avec le token depuis PLANIFIE", async () => {
      renderControls("PLANIFIE");
      fireEvent.click(screen.getByRole("button", { name: "Lancer l'annonce" }));
      await waitFor(() => expect(api.annoncerMatch).toHaveBeenCalledWith(1, "test-token"));
    });

    it("\"Démarrer\" appelle demarrerMatch depuis ANNONCE", async () => {
      renderControls("ANNONCE");
      fireEvent.click(screen.getByRole("button", { name: "Démarrer" }));
      await waitFor(() => expect(api.demarrerMatch).toHaveBeenCalledWith(1, "test-token"));
    });

    it("\"Démarrer\" (reprise) appelle demarrerMatch depuis EN_PAUSE", async () => {
      renderControls("EN_PAUSE");
      fireEvent.click(screen.getByRole("button", { name: "Démarrer" }));
      await waitFor(() => expect(api.demarrerMatch).toHaveBeenCalledWith(1, "test-token"));
    });

    it("\"Pause\" appelle pauserMatch depuis EN_COURS", async () => {
      renderControls("EN_COURS");
      fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      await waitFor(() => expect(api.pauserMatch).toHaveBeenCalledWith(1, "test-token"));
    });

    it("\"Terminer le match\" appelle terminerMatch depuis EN_PAUSE", async () => {
      renderControls("EN_PAUSE");
      fireEvent.click(screen.getByRole("button", { name: "Terminer le match" }));
      await waitFor(() => expect(api.terminerMatch).toHaveBeenCalledWith(1, "test-token"));
    });
  });
});
