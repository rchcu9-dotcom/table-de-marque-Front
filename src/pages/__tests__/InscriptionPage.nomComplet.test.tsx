import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { ServerError } from "../../api/errors";

// docs/specs/-prise-en-compte-du-nom-court-pour-les-logos-contexte-actuel.md
// CA3 (recherche), CA4 (affichage), CA8 (doublon)
// docs/specs/-ajout-de-la-colonne-nomcomplet-contexte-la-colonne-nomcompl.md
// CA3 à CA5 (saisie du nom complet dans la modale « Ajouter une équipe »)

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockUser = {
  getIdToken: vi.fn().mockResolvedValue("fake-firebase-token"),
  uid: "test-uid-123",
} as unknown as import("firebase/auth").User;

const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchEditionCourante = vi.fn();
const mockFetchEquipesReferentiel = vi.fn();
const mockFetchProfilInscription = vi.fn();
const mockFetchMaCandidature = vi.fn();
const mockCreateEquipeDemande = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: (...args: unknown[]) => mockCreateEquipeDemande(...args),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: vi.fn(),
  accepterCandidature: vi.fn(),
  promouvoCandidature: vi.fn(),
  mettreListeAttente: vi.fn(),
  refuserCandidature: vi.fn(),
  validerPaiement: vi.fn(),
  validerDossier: vi.fn(),
  rouvrirDossier: vi.fn(),
}));

let InscriptionPage: typeof import("../InscriptionPage").default;

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const EQUIPES = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", active: true },
  { id: 2, nom: "Rennes", nomComplet: null, active: true },
  { id: 3, nom: "Orléans", active: true },
];

async function ouvrirSelecteur() {
  fireEvent.click(await screen.findByRole("button", { name: /Choisir une équipe/ }));
  return screen.getByPlaceholderText("Rechercher...");
}

/** Boutons d'option du sélecteur (ils suivent le champ de recherche dans la liste). */
function options() {
  const liste = screen.getByPlaceholderText("Rechercher...").closest("div")!.parentElement!;
  return within(liste).queryAllByRole("button");
}

async function ouvrirModale() {
  fireEvent.click(
    await screen.findByRole("button", { name: /Ton équipe n'est pas présente/ }),
  );
  return screen.getByRole("heading", { name: "Ajouter une équipe" }).parentElement!;
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    token: "fake-firebase-token",
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    logout: vi.fn(),
  });
  mockFetchEditionCourante.mockResolvedValue({
    id: 1,
    nom: "RCHC U11 2026",
    categorie: "U11",
    annee: 2026,
    etape: "INSCRIPTIONS_OUVERTES",
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-01T23:59:59",
    fraisInscription: 120,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
  });
  mockFetchProfilInscription.mockResolvedValue({
    id: 1,
    pseudo: "CapitaineRennes",
    role: "RESPONSABLE_EQUIPE",
  });
  mockFetchMaCandidature.mockResolvedValue(null);
  mockFetchEquipesReferentiel.mockResolvedValue(EQUIPES);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("InscriptionPage — sélecteur d'équipe : affichage du nom complet (CA4)", () => {
  it("affiche le nom court en ligne principale et le nom complet en dessous, en plus petit", async () => {
    renderPage();
    await ouvrirSelecteur();

    const option = options().find((b) => b.textContent?.includes("Courbevoie"))!;
    const nomCourt = within(option).getByText("Courbevoie");
    const nomComplet = within(option).getByText("Les Coqs de Courbevoie");

    expect(nomComplet).toHaveClass("text-xs");
    expect(nomCourt).not.toHaveClass("text-xs");
    expect(
      nomCourt.compareDocumentPosition(nomComplet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("n'affiche qu'une ligne pour une équipe sans nom complet (null ou absent)", async () => {
    renderPage();
    await ouvrirSelecteur();

    for (const nom of ["Rennes", "Orléans"]) {
      const option = options().find((b) => b.textContent?.includes(nom))!;
      expect(option.textContent).toBe(nom);
    }
  });

  it("reprend les deux lignes dans la valeur sélectionnée", async () => {
    renderPage();
    await ouvrirSelecteur();
    fireEvent.click(options().find((b) => b.textContent?.includes("Courbevoie"))!);

    // Sélecteur refermé : les deux noms restent visibles dans le bouton.
    expect(screen.queryByPlaceholderText("Rechercher...")).not.toBeInTheDocument();
    expect(screen.getByText("Courbevoie")).toBeInTheDocument();
    expect(screen.getByText("Les Coqs de Courbevoie")).toHaveClass("text-xs");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Lancer la demande" })).toBeEnabled(),
    );
  });
});

describe("InscriptionPage — sélecteur d'équipe : recherche sur nom et nom complet (CA3)", () => {
  it.each(["coqs", "courb", "COQS"])(
    "« %s » fait apparaître Courbevoie et elle seule",
    async (saisie) => {
      renderPage();
      const recherche = await ouvrirSelecteur();

      fireEvent.change(recherche, { target: { value: saisie } });

      expect(options().map((b) => within(b).getAllByText(/./)[0].textContent)).toEqual([
        "Courbevoie",
      ]);
    },
  );

  it("garde trouvable par son nom une équipe sans nom complet", async () => {
    renderPage();
    const recherche = await ouvrirSelecteur();

    fireEvent.change(recherche, { target: { value: "renn" } });

    expect(options().map((b) => b.textContent)).toEqual(["Rennes"]);
  });

  it("affiche « Aucune équipe trouvée. » quand la saisie n'est dans aucun des deux champs", async () => {
    renderPage();
    const recherche = await ouvrirSelecteur();

    fireEvent.change(recherche, { target: { value: "strasbourg" } });

    expect(options()).toHaveLength(0);
    expect(screen.getByText("Aucune équipe trouvée.")).toBeInTheDocument();
  });
});

describe("InscriptionPage — modale « Ajouter une équipe » : saisie des deux noms, erreurs", () => {
  // docs/specs/-ajout-de-la-colonne-nomcomplet-contexte-la-colonne-nomcompl.md — §3, CA3, CA4
  it("propose « Nom court » puis « Nom complet du club (optionnel) », dans cet ordre", async () => {
    renderPage();
    const modale = await ouvrirModale();

    const nomCourt = within(modale).getByLabelText("Nom court");
    const nomComplet = within(modale).getByLabelText("Nom complet du club (optionnel)");

    expect(within(modale).getAllByRole("textbox")).toEqual([nomCourt, nomComplet]);
    expect(within(modale).queryByLabelText("Nom de l'équipe")).not.toBeInTheDocument();
    // Les exemples guident vers un nom court dans le premier champ, le nom long dans le second.
    expect(nomCourt).toHaveAttribute("placeholder", "Ex: San Jose");
    expect(nomComplet).toHaveAttribute("placeholder", "Ex: Les Sharks de San Jose");
    expect(nomComplet).toHaveAttribute("maxLength", "150");
    expect(nomComplet).not.toBeRequired();
    // Le champ du blason reste après les deux noms.
    const blason = within(modale).getByLabelText("Blason (optionnel)");
    expect(
      nomComplet.compareDocumentPosition(blason) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("explique le nom court par une aide reliée au champ, sans changer son libellé", async () => {
    renderPage();
    const modale = await ouvrirModale();

    const nomCourt = within(modale).getByLabelText("Nom court");

    expect(nomCourt).toHaveAccessibleDescription(/planning et les scores/);
  });

  it("crée l'équipe avec ses deux noms, la sélectionne et l'affiche sur deux lignes (CA3)", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 9,
      nom: "San Jose",
      nomComplet: "Les Sharks de San Jose",
      active: true,
    });
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "  San Jose " },
    });
    fireEvent.change(within(modale).getByLabelText(/Nom complet du club/), {
      target: { value: "  Les Sharks de San Jose  " },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    await waitFor(() => expect(mockCreateEquipeDemande).toHaveBeenCalledTimes(1));
    const [payload, token] = mockCreateEquipeDemande.mock.calls[0];
    expect(payload).toEqual({
      nom: "San Jose",
      nomComplet: "Les Sharks de San Jose",
      logoUrl: undefined,
    });
    expect(token).toBe("fake-firebase-token");

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter une équipe" }),
      ).not.toBeInTheDocument(),
    );
    const nomCourt = screen.getByText("San Jose");
    const nomComplet = screen.getByText("Les Sharks de San Jose");
    expect(nomComplet).toHaveClass("text-xs");
    expect(nomCourt.parentElement).toBe(nomComplet.parentElement);
    expect(
      nomCourt.compareDocumentPosition(nomComplet) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lancer la demande" })).toBeEnabled();
  });

  it("rend l'équipe créée trouvable par son nom complet dans le sélecteur", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 9,
      nom: "San Jose",
      nomComplet: "Les Sharks de San Jose",
      active: true,
    });
    renderPage();
    const modale = await ouvrirModale();
    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "San Jose" },
    });
    fireEvent.change(within(modale).getByLabelText(/Nom complet du club/), {
      target: { value: "Les Sharks de San Jose" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter une équipe" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /San Jose/ }));
    fireEvent.change(screen.getByPlaceholderText("Rechercher..."), {
      target: { value: "sharks" },
    });

    expect(options().map((b) => within(b).getAllByText(/./)[0].textContent)).toEqual([
      "San Jose",
    ]);
  });

  it.each([
    ["vide", ""],
    ["composé d'espaces", "    "],
  ])(
    "n'envoie pas la clé nomComplet quand le champ est %s (CA4)",
    async (_cas, saisie) => {
      mockCreateEquipeDemande.mockResolvedValue({
        id: 9,
        nom: "San Jose",
        nomComplet: null,
        active: true,
      });
      renderPage();
      const modale = await ouvrirModale();

      fireEvent.change(within(modale).getByLabelText("Nom court"), {
        target: { value: "San Jose" },
      });
      fireEvent.change(within(modale).getByLabelText(/Nom complet du club/), {
        target: { value: saisie },
      });
      fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

      await waitFor(() => expect(mockCreateEquipeDemande).toHaveBeenCalledTimes(1));
      expect(mockCreateEquipeDemande.mock.calls[0][0]).not.toHaveProperty("nomComplet");
    },
  );

  it("le bouton « Soumettre » ne dépend que du nom court (CA4)", async () => {
    renderPage();
    const modale = await ouvrirModale();
    const soumettre = within(modale).getByRole("button", { name: "Soumettre" });
    const nomCourt = within(modale).getByLabelText("Nom court");
    const nomComplet = within(modale).getByLabelText(/Nom complet du club/);

    expect(soumettre).toBeDisabled();

    // Un nom complet seul ne suffit pas.
    fireEvent.change(nomComplet, { target: { value: "Les Sharks de San Jose" } });
    expect(soumettre).toBeDisabled();

    fireEvent.change(nomCourt, { target: { value: "   " } });
    expect(soumettre).toBeDisabled();

    fireEvent.change(nomCourt, { target: { value: "San Jose" } });
    expect(soumettre).toBeEnabled();

    // Et le nom court suffit, sans nom complet.
    fireEvent.change(nomComplet, { target: { value: "" } });
    expect(soumettre).toBeEnabled();
    expect(mockCreateEquipeDemande).not.toHaveBeenCalled();
  });

  it("envoie le nom complet tel que saisi : la normalisation appartient au back (CA5)", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 9,
      nom: "San Jose",
      nomComplet: null,
      active: true,
    });
    renderPage();
    const modale = await ouvrirModale();

    // Égal au nom court : le back l'enregistrera null, le front ne décide pas.
    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "San Jose" },
    });
    fireEvent.change(within(modale).getByLabelText(/Nom complet du club/), {
      target: { value: "san jose" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    await waitFor(() => expect(mockCreateEquipeDemande).toHaveBeenCalledTimes(1));
    expect(mockCreateEquipeDemande.mock.calls[0][0].nomComplet).toBe("san jose");
    // L'équipe renvoyée sans nom complet s'affiche sur une seule ligne.
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter une équipe" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("San Jose").parentElement!.children).toHaveLength(1);
  });

  it("garde la saisie des deux champs quand le back refuse un emoji dans le nom complet", async () => {
    mockCreateEquipeDemande.mockRejectedValue(
      new ServerError(400, "Le nom ne doit pas contenir d'emoji"),
    );
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "Trois-Chêne" },
    });
    fireEvent.change(within(modale).getByLabelText(/Nom complet du club/), {
      target: { value: "Les \u{1F98A} Trois-Chêne" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    expect(
      await within(modale).findByText("Le nom ne doit pas contenir d'emoji"),
    ).toBeInTheDocument();
    expect(within(modale).getByLabelText("Nom court")).toHaveValue("Trois-Chêne");
    expect(within(modale).getByLabelText(/Nom complet du club/)).toHaveValue(
      "Les \u{1F98A} Trois-Chêne",
    );
    expect(within(modale).getByRole("button", { name: "Soumettre" })).toBeEnabled();
  });

  it("désactive les deux champs pendant l'envoi", async () => {
    let terminer!: (equipe: unknown) => void;
    mockCreateEquipeDemande.mockReturnValue(
      new Promise((resolve) => {
        terminer = resolve;
      }),
    );
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "San Jose" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    await waitFor(() => expect(within(modale).getByLabelText("Nom court")).toBeDisabled());
    expect(within(modale).getByLabelText(/Nom complet du club/)).toBeDisabled();

    terminer({ id: 9, nom: "San Jose", nomComplet: null, active: true });
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter une équipe" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("envoie une requête sans nomComplet, et l'équipe créée s'affiche sur une seule ligne", async () => {
    mockCreateEquipeDemande.mockResolvedValue({
      id: 9,
      nom: "Les Sharks",
      nomComplet: null,
      active: true,
    });
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "  Les Sharks " },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    await waitFor(() => expect(mockCreateEquipeDemande).toHaveBeenCalledTimes(1));
    const [payload, token] = mockCreateEquipeDemande.mock.calls[0];
    expect(payload).toEqual({ nom: "Les Sharks", logoUrl: undefined });
    expect(payload).not.toHaveProperty("nomComplet");
    expect(token).toBe("fake-firebase-token");

    // Modale refermée, équipe sélectionnée, immédiatement candidatable.
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Ajouter une équipe" }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Les Sharks").parentElement!.children).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Lancer la demande" })).toBeEnabled();
  });

  it("affiche « Cette équipe existe déjà » quand le back répond 409, et garde la modale ouverte", async () => {
    mockCreateEquipeDemande.mockRejectedValue(new ServerError(409, "Conflict"));
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "Rennes" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    expect(await within(modale).findByText("Cette équipe existe déjà")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ajouter une équipe" })).toBeInTheDocument();
  });

  // docs/specs/-correction-des-anomalies-dans-la-liste-contexte-dans-la-lis.md — CA5
  it("affiche le motif quand le back refuse un emoji (400), et garde la modale ouverte avec la saisie", async () => {
    mockCreateEquipeDemande.mockRejectedValue(
      new ServerError(400, "Le nom ne doit pas contenir d'emoji"),
    );
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "Les \u{1F98A} Trois-Chêne" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    expect(
      await within(modale).findByText("Le nom ne doit pas contenir d'emoji"),
    ).toBeInTheDocument();
    expect(
      within(modale).queryByText("Erreur lors de la création. Réessaie."),
    ).not.toBeInTheDocument();
    // La saisie est envoyée telle quelle : c'est le back qui fait autorité.
    expect(mockCreateEquipeDemande.mock.calls[0][0].nom).toBe("Les \u{1F98A} Trois-Chêne");
    expect(within(modale).getByLabelText("Nom court")).toHaveValue(
      "Les \u{1F98A} Trois-Chêne",
    );
  });

  it("n'affiche pas tel quel un autre refus 400 (message de validation technique)", async () => {
    mockCreateEquipeDemande.mockRejectedValue(
      new ServerError(400, "nom should not be empty"),
    );
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "Rennes" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    expect(
      await within(modale).findByText("Erreur lors de la création. Réessaie."),
    ).toBeInTheDocument();
    expect(within(modale).queryByText(/should not be empty/)).not.toBeInTheDocument();
  });

  it("garde le message générique pour toute autre erreur", async () => {
    mockCreateEquipeDemande.mockRejectedValue(new ServerError(500, "Internal"));
    renderPage();
    const modale = await ouvrirModale();

    fireEvent.change(within(modale).getByLabelText("Nom court"), {
      target: { value: "Rennes" },
    });
    fireEvent.click(within(modale).getByRole("button", { name: "Soumettre" }));

    expect(
      await within(modale).findByText("Erreur lors de la création. Réessaie."),
    ).toBeInTheDocument();
    expect(within(modale).queryByText("Cette équipe existe déjà")).not.toBeInTheDocument();
  });
});
