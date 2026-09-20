import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import InscriptionsSwitch from "../InscriptionsSwitch";
import { ServerError } from "../../../api/errors";
import * as api from "../../../api/inscription";
import type { EditionEtape } from "../../../api/types/inscription.types";

vi.mock("../../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/inscription")>();
  return { ...actual, ouvrirInscriptions: vi.fn(), cloturerInscriptions: vi.fn() };
});

const ouvrir = api.ouvrirInscriptions as ReturnType<typeof vi.fn>;
const cloturer = api.cloturerInscriptions as ReturnType<typeof vi.fn>;

let invalidateSpy: ReturnType<typeof vi.spyOn>;

function renderSwitch(etape: EditionEtape) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  invalidateSpy = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();
  const ui = (e: EditionEtape) => (
    <QueryClientProvider client={qc}>
      <InscriptionsSwitch edition={{ id: 5, etape: e }} token="tok" />
    </QueryClientProvider>
  );
  const utils = render(ui(etape));
  return { ...utils, rerenderWith: (e: EditionEtape) => utils.rerender(ui(e)) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InscriptionsSwitch — rendu des 4 états", () => {
  it.each(["CREEE", "CREATION_NOUVEAU_TOURNOI"] as const)(
    "%s : fermé, « pas encore ouvertes »",
    (etape) => {
      renderSwitch(etape);

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-checked", "false");
      expect(toggle).toHaveAttribute("aria-disabled", "false");
      expect(screen.getByText("Inscriptions fermées")).toBeInTheDocument();
      expect(
        screen.getByText("Les inscriptions ne sont pas encore ouvertes."),
      ).toBeInTheDocument();
    },
  );

  it("INSCRIPTIONS_OUVERTES : ouvert", () => {
    renderSwitch("INSCRIPTIONS_OUVERTES");

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Inscriptions ouvertes")).toBeInTheDocument();
    expect(
      screen.getByText("Les équipes peuvent déposer leur candidature."),
    ).toBeInTheDocument();
  });

  it("CLOTUREE : fermé, « clôturées »", () => {
    renderSwitch("CLOTUREE");

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Les inscriptions sont clôturées.")).toBeInTheDocument();
  });

  it("TOURNOI_DEMARRE : fermé, désactivé, texte explicatif relié par aria-describedby", () => {
    renderSwitch("TOURNOI_DEMARRE");

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute("aria-disabled", "true");
    expect(toggle).toHaveAccessibleDescription(
      "Le tournoi a démarré, les inscriptions ne peuvent plus être rouvertes",
    );
  });

  it("TOURNOI_DEMARRE : aucun appel ni modale au clic", () => {
    renderSwitch("TOURNOI_DEMARRE");

    fireEvent.click(screen.getByRole("switch"));

    expect(ouvrir).not.toHaveBeenCalled();
    expect(cloturer).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("InscriptionsSwitch — ouverture initiale (CREEE / CREATION_NOUVEAU_TOURNOI)", () => {
  it.each(["CREEE", "CREATION_NOUVEAU_TOURNOI"] as const)(
    "%s : appelle ouvrirInscriptions directement, sans confirmation, et invalide les deux caches",
    async (etape) => {
      ouvrir.mockResolvedValue({ id: 5, etape: "INSCRIPTIONS_OUVERTES" });
      renderSwitch(etape);

      fireEvent.click(screen.getByRole("switch"));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      await waitFor(() => expect(ouvrir).toHaveBeenCalledWith(5, "tok"));
      await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(2));
      expect(cloturer).not.toHaveBeenCalled();
    },
  );
});

describe("InscriptionsSwitch — fermeture (INSCRIPTIONS_OUVERTES)", () => {
  it("ouvre la modale factuelle et n'appelle rien avant confirmation", () => {
    renderSwitch("INSCRIPTIONS_OUVERTES");

    fireEvent.click(screen.getByRole("switch"));

    const modale = screen.getByRole("dialog", { name: "Fermer les inscriptions ?" });
    expect(modale).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText(/Plus aucune nouvelle équipe ne pourra candidater/)).toBeInTheDocument();
    expect(screen.getByText(/candidatures déjà déposées restent traitables/)).toBeInTheDocument();
    expect(screen.getByText(/sélectionné une équipe sans avoir lancé leur demande/)).toBeInTheDocument();
    expect(screen.getByText(/réversible tant que le tournoi n'est pas démarré/)).toBeInTheDocument();
    expect(cloturer).not.toHaveBeenCalled();
  });

  it("ne reprend pas l'ancien texte inexact sur la perte d'accès des référents", () => {
    renderSwitch("INSCRIPTIONS_OUVERTES");

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.queryByText(/perdront l'accès/)).not.toBeInTheDocument();
  });

  it("Annuler ferme la modale sans appel", () => {
    renderSwitch("INSCRIPTIONS_OUVERTES");

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(cloturer).not.toHaveBeenCalled();
  });

  it("Confirmer appelle cloturerInscriptions, invalide les deux caches et ferme la modale", async () => {
    cloturer.mockResolvedValue({ id: 5, etape: "CLOTUREE" });
    renderSwitch("INSCRIPTIONS_OUVERTES");

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(cloturer).toHaveBeenCalledWith(5, "tok"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
    expect(ouvrir).not.toHaveBeenCalled();
  });
});

describe("InscriptionsSwitch — réouverture (CLOTUREE)", () => {
  it("demande une confirmation d'une ligne mentionnant Planning et Équipes", () => {
    renderSwitch("CLOTUREE");

    fireEvent.click(screen.getByRole("switch"));

    expect(screen.getByRole("dialog", { name: "Rouvrir les inscriptions ?" })).toBeInTheDocument();
    expect(
      screen.getByText("Les onglets Planning et Équipes disparaîtront temporairement."),
    ).toBeInTheDocument();
    expect(ouvrir).not.toHaveBeenCalled();
  });

  it("Confirmer appelle ouvrirInscriptions", async () => {
    ouvrir.mockResolvedValue({ id: 5, etape: "INSCRIPTIONS_OUVERTES" });
    renderSwitch("CLOTUREE");

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(ouvrir).toHaveBeenCalledWith(5, "tok"));
    expect(cloturer).not.toHaveBeenCalled();
  });

  it("Annuler n'appelle rien", () => {
    renderSwitch("CLOTUREE");

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(ouvrir).not.toHaveBeenCalled();
  });
});

describe("InscriptionsSwitch — état serveur, pas d'optimisme, erreurs", () => {
  it("désactive le switch pendant l'appel (anti double clic) et ne change pas d'état tant que le serveur n'a pas répondu", async () => {
    let resolve!: (v: unknown) => void;
    ouvrir.mockReturnValue(new Promise((r) => (resolve = r)));
    renderSwitch("CREEE");

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-disabled", "true"));
    expect(toggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(toggle);
    expect(ouvrir).toHaveBeenCalledTimes(1);

    resolve({ id: 5, etape: "INSCRIPTIONS_OUVERTES" });
    await waitFor(() => expect(toggle).toHaveAttribute("aria-disabled", "false"));
    // Toujours fermé : l'état ne bascule que quand le serveur (via les queries) le dit.
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("bascule uniquement quand l'édition reçoit la nouvelle etape (rerender = requête invalidée)", async () => {
    ouvrir.mockResolvedValue({ id: 5, etape: "INSCRIPTIONS_OUVERTES" });
    const { rerenderWith } = renderSwitch("CREEE");

    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(ouvrir).toHaveBeenCalled());
    rerenderWith("INSCRIPTIONS_OUVERTES");

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("erreur réseau : message près du switch, état inchangé, pas d'invalidation", async () => {
    ouvrir.mockRejectedValue(new ServerError(500, "boom"));
    renderSwitch("CREEE");

    fireEvent.click(screen.getByRole("switch"));

    expect(
      await screen.findByText("Impossible de modifier l'état des inscriptions."),
    ).toBeInTheDocument();
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("erreur 409 : message « L'état des inscriptions a changé entre-temps » + rechargement des queries", async () => {
    cloturer.mockRejectedValue(new ServerError(409, "Transition d'étape interdite"));
    renderSwitch("INSCRIPTIONS_OUVERTES");

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(
      await screen.findByText("L'état des inscriptions a changé entre-temps"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("efface l'erreur au prochain clic", async () => {
    ouvrir.mockRejectedValueOnce(new ServerError(500, "boom"));
    ouvrir.mockResolvedValueOnce({ id: 5 });
    renderSwitch("CREEE");

    fireEvent.click(screen.getByRole("switch"));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});
