import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import NouvelleSaisonPanel from "../NouvelleSaisonPanel";

vi.mock("../../../hooks/useEditionEnPreparation", () => ({
  EDITION_EN_PREPARATION_QUERY_KEY: ["inscription", "edition-en-preparation"],
}));

vi.mock("../../../hooks/useInscriptionSession", () => ({
  EDITION_QUERY_KEY: ["inscription", "edition-courante"],
}));

const mockExportTaDump = vi.fn();
const mockCreateEditionEnPreparation = vi.fn();
const mockNavigate = vi.fn();
vi.mock("../../../api/inscription", () => ({
  exportTaDump: (...args: unknown[]) => mockExportTaDump(...args),
  createEditionEnPreparation: (...args: unknown[]) => mockCreateEditionEnPreparation(...args),
}));

vi.mock("react-router-dom", async (orig) => {
  const mod = await orig<typeof import("react-router-dom")>();
  return { ...mod, useNavigate: () => mockNavigate };
});

let mockInvalidateQueries: ReturnType<typeof vi.spyOn>;

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockInvalidateQueries = vi.spyOn(qc, "invalidateQueries").mockResolvedValue();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <NouvelleSaisonPanel token="fake-token" editionActiveId={1} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom n'implémente pas URL.createObjectURL/revokeObjectURL.
  (globalThis as { URL: typeof URL }).URL.createObjectURL = vi.fn(() => "blob:mock-url");
  (globalThis as { URL: typeof URL }).URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

describe("NouvelleSaisonPanel — dump (spec §4)", () => {
  it("affiche le bouton \"Préparer la saison suivante\" ", () => {
    renderPanel();
    expect(
      screen.getByRole("button", { name: "Préparer la saison suivante" }),
    ).toBeInTheDocument();
  });

  it("déclenche exportTaDump(editionActiveId, token) et télécharge le fichier au clic", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    mockExportTaDump.mockResolvedValue({ blob, filename: "dump-ta-2026-rchc.json" });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Préparer la saison suivante" }));

    await waitFor(() => expect(mockExportTaDump).toHaveBeenCalledWith(1, "fake-token"));
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("affiche le formulaire de création une fois le dump réussi", async () => {
    mockExportTaDump.mockResolvedValue({ blob: new Blob(), filename: "dump.json" });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Préparer la saison suivante" }));

    expect(await screen.findByRole("button", { name: "Créer la nouvelle édition" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nom")).toBeInTheDocument();
    expect(screen.getByLabelText("Catégorie")).toBeInTheDocument();
    expect(screen.getByLabelText("Année")).toBeInTheDocument();
  });

  it("affiche une erreur et un bouton Réessayer quand le dump échoue, sans afficher le formulaire de création", async () => {
    mockExportTaDump.mockRejectedValue(new Error("500"));
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Préparer la saison suivante" }));

    expect(
      await screen.findByText(
        "Le téléchargement du dump a échoué. Réessayez avant de créer la nouvelle édition.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Réessayer le dump" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Créer la nouvelle édition" })).not.toBeInTheDocument();
  });

  it("permet de réessayer le dump après un échec", async () => {
    mockExportTaDump.mockRejectedValueOnce(new Error("500"));
    mockExportTaDump.mockResolvedValueOnce({ blob: new Blob(), filename: "dump.json" });
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Préparer la saison suivante" }));
    await screen.findByRole("button", { name: "Réessayer le dump" });

    fireEvent.click(screen.getByRole("button", { name: "Réessayer le dump" }));

    expect(await screen.findByRole("button", { name: "Créer la nouvelle édition" })).toBeInTheDocument();
    expect(mockExportTaDump).toHaveBeenCalledTimes(2);
  });
});

describe("NouvelleSaisonPanel — création de la nouvelle édition (spec §5.2)", () => {
  async function atteindreFormulaireCreation() {
    mockExportTaDump.mockResolvedValue({ blob: new Blob(), filename: "dump.json" });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Préparer la saison suivante" }));
    await screen.findByRole("button", { name: "Créer la nouvelle édition" });
  }

  it("soumet nom/catégorie/année à createEditionEnPreparation et invalide la query edition-en-preparation", async () => {
    await atteindreFormulaireCreation();
    mockCreateEditionEnPreparation.mockResolvedValue({ id: 2 });

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "RCHC U11" } });
    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "U11" } });
    fireEvent.change(screen.getByLabelText("Année"), { target: { value: "2027" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la nouvelle édition" }));

    await waitFor(() =>
      expect(mockCreateEditionEnPreparation).toHaveBeenCalledWith(
        { nom: "RCHC U11", categorie: "U11", annee: 2027 },
        "fake-token",
      ),
    );
    await waitFor(() =>
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["inscription", "edition-en-preparation"],
      }),
    );
  });

  it("reste sur l'accueil admin après création : la nouvelle édition apparaît dans le bloc Pilotage", async () => {
    await atteindreFormulaireCreation();
    mockCreateEditionEnPreparation.mockResolvedValue({ id: 2 });

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "RCHC U11" } });
    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "U11" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la nouvelle édition" }));

    await waitFor(() => expect(mockCreateEditionEnPreparation).toHaveBeenCalled());
    await waitFor(() => expect(mockInvalidateQueries).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("affiche un message d'erreur et garde le formulaire affiché quand la création échoue (pas besoin de refaire le dump)", async () => {
    await atteindreFormulaireCreation();
    mockCreateEditionEnPreparation.mockRejectedValue(new Error("409"));

    fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "RCHC U11" } });
    fireEvent.change(screen.getByLabelText("Catégorie"), { target: { value: "U11" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer la nouvelle édition" }));

    expect(
      await screen.findByText("Impossible de créer la nouvelle édition."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer la nouvelle édition" })).toBeInTheDocument();
    expect(mockExportTaDump).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
