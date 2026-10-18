import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ServerError } from "../../../api/errors";
import { EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY } from "../../../hooks/useEquipesReferentiel";
import AjouterEquipeReferentielPanel from "../AjouterEquipeReferentielPanel";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md — CA5, CA6, CA8

const mockCreateEquipeDemande = vi.fn();

vi.mock("../../../api/inscription", () => ({
  createEquipeDemande: (...args: unknown[]) => mockCreateEquipeDemande(...args),
  fetchEquipesReferentielToutes: vi.fn(),
  activerEquipeReferentiel: vi.fn(),
  desactiverEquipeReferentiel: vi.fn(),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <AjouterEquipeReferentielPanel token="fake-token" />
    </QueryClientProvider>,
  );
  return { invalidate };
}

const champNom = () => screen.getByLabelText("Nom court");
const champNomComplet = () => screen.getByLabelText(/Nom complet/);
const boutonAjouter = () => screen.getByRole("button", { name: /Ajout/ });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AjouterEquipeReferentielPanel", () => {
  it("présente un nom court obligatoire et un nom complet facultatif, limité à 150 caractères", () => {
    renderPanel();

    expect(screen.getByText("Ajouter une équipe au référentiel")).toBeInTheDocument();
    expect(champNom()).toHaveValue("");
    expect(champNomComplet()).toHaveValue("");
    expect(champNomComplet()).toHaveAttribute("maxLength", "150");
    expect(screen.getByText(/Nom complet \(optionnel\)/)).toBeInTheDocument();
    // Pas de dépôt de blason dans ce formulaire.
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("désactive l'envoi tant que le nom court est vide ou fait d'espaces", () => {
    renderPanel();
    expect(boutonAjouter()).toBeDisabled();

    fireEvent.change(champNomComplet(), { target: { value: "Les Coqs de Courbevoie" } });
    expect(boutonAjouter()).toBeDisabled();

    fireEvent.change(champNom(), { target: { value: "   " } });
    expect(boutonAjouter()).toBeDisabled();

    fireEvent.change(champNom(), { target: { value: "Courbevoie" } });
    expect(boutonAjouter()).toBeEnabled();
  });

  it("crée l'équipe avec nom court et nom complet, sans espaces de bord (CA5)", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 7,
      nom: "Courbevoie",
      nomComplet: "Les Coqs de Courbevoie",
      active: true,
    });
    const { invalidate } = renderPanel();

    fireEvent.change(champNom(), { target: { value: "  Courbevoie " } });
    fireEvent.change(champNomComplet(), { target: { value: " Les Coqs de Courbevoie  " } });
    fireEvent.click(boutonAjouter());

    await waitFor(() =>
      expect(mockCreateEquipeDemande).toHaveBeenCalledWith(
        { nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" },
        "fake-token",
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Équipe « Courbevoie » ajoutée.",
    );
    // Champs vidés pour la saisie suivante, liste organisateur rafraîchie.
    expect(champNom()).toHaveValue("");
    expect(champNomComplet()).toHaveValue("");
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: EQUIPES_REFERENTIEL_TOUTES_QUERY_KEY,
    });
  });

  it.each([
    ["laissé vide", ""],
    ["fait d'espaces", "   "],
  ])("n'envoie pas de nomComplet quand le champ est %s", async (_cas, saisie) => {
    mockCreateEquipeDemande.mockResolvedValue({ id: 8, nom: "Rennes", active: true });
    renderPanel();

    fireEvent.change(champNom(), { target: { value: "Rennes" } });
    fireEvent.change(champNomComplet(), { target: { value: saisie } });
    fireEvent.click(boutonAjouter());

    await waitFor(() => expect(mockCreateEquipeDemande).toHaveBeenCalledTimes(1));
    expect(mockCreateEquipeDemande.mock.calls[0][0]).toEqual({
      nom: "Rennes",
      nomComplet: undefined,
    });
  });

  it("affiche « Cette équipe existe déjà » sur un doublon (409) et conserve la saisie (CA8)", async () => {
    mockCreateEquipeDemande.mockRejectedValue(new ServerError(409, "Conflict"));
    const { invalidate } = renderPanel();

    fireEvent.change(champNom(), { target: { value: "Rennes" } });
    fireEvent.change(champNomComplet(), { target: { value: "Les Cormorans de Rennes" } });
    fireEvent.click(boutonAjouter());

    expect(await screen.findByRole("alert")).toHaveTextContent("Cette équipe existe déjà");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(champNom()).toHaveValue("Rennes");
    expect(champNomComplet()).toHaveValue("Les Cormorans de Rennes");
    expect(invalidate).not.toHaveBeenCalled();
  });

  // docs/specs/-correction-des-anomalies-dans-la-liste-contexte-dans-la-lis.md — CA5
  it("affiche le motif quand le back refuse un emoji (400) et conserve la saisie", async () => {
    mockCreateEquipeDemande.mockRejectedValue(
      new ServerError(400, "Le nom ne doit pas contenir d'emoji"),
    );
    const { invalidate } = renderPanel();

    fireEvent.change(champNom(), { target: { value: "Trois-Chêne" } });
    fireEvent.change(champNomComplet(), { target: { value: "Les \u{1F98A} Trois-Chêne" } });
    fireEvent.click(boutonAjouter());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le nom ne doit pas contenir d'emoji",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(champNom()).toHaveValue("Trois-Chêne");
    expect(champNomComplet()).toHaveValue("Les \u{1F98A} Trois-Chêne");
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("affiche le message générique pour une autre erreur", async () => {
    mockCreateEquipeDemande.mockRejectedValue(new ServerError(500, "Internal"));
    renderPanel();

    fireEvent.change(champNom(), { target: { value: "Rennes" } });
    fireEvent.click(boutonAjouter());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erreur lors de la création. Réessaie.",
    );
  });

  it("efface l'erreur et confirme l'ajout quand un nouvel essai réussit", async () => {
    mockCreateEquipeDemande.mockRejectedValueOnce(new ServerError(409, "Conflict"));
    mockCreateEquipeDemande.mockResolvedValueOnce({ id: 9, nom: "Rennes 2", active: true });
    renderPanel();

    fireEvent.change(champNom(), { target: { value: "Rennes" } });
    fireEvent.click(boutonAjouter());
    await screen.findByRole("alert");

    fireEvent.change(champNom(), { target: { value: "Rennes 2" } });
    fireEvent.click(boutonAjouter());

    expect(await screen.findByRole("status")).toHaveTextContent("Équipe « Rennes 2 » ajoutée.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
