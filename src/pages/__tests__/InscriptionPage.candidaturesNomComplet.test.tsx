import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// docs/specs/-ajout-de-la-colonne-nomcomplet-contexte-la-colonne-nomcompl.md
// CA7 (recherche dans la liste des candidatures) et CA8 (affichage sur deux lignes).

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockUser = { uid: "organisateur-uid-1" } as unknown as import("firebase/auth").User;
const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchEditionCourante = vi.fn();
const mockFetchToutesCandidatures = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: vi.fn().mockResolvedValue([]),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: vi.fn().mockResolvedValue({ id: 1, pseudo: "Orga", role: "ORGANISATEUR" }),
  updatePseudo: vi.fn(),
  fetchMaCandidature: vi.fn().mockResolvedValue(null),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: (...args: unknown[]) => mockFetchToutesCandidatures(...args),
  changerStatutTriage: vi.fn(),
  validerPaiement: vi.fn(),
  validerDossier: vi.fn(),
  rouvrirDossier: vi.fn(),
  marquerPaiementRepas: vi.fn(),
  definirCommentaireOrganisateur: vi.fn(),
  fetchImageRib: vi.fn(),
  fetchMonDossier: vi.fn(),
  fetchDossierParCandidature: vi.fn(),
}));

let InscriptionPage: typeof import("../InscriptionPage").default;

function rendre(initialUrl = "/inscription") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <InscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function candidature(id: number, equipeNom: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    equipeNom,
    equipeLogoUrl: null,
    utilisateurEmail: `ref${id}@club.fr`,
    utilisateurDisplayName: null,
    statut: "CANDIDATE",
    createdAt: `2026-04-0${id}T00:00:00.000Z`,
    commentaireOrganisateur: null,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
    nbRepas: 0,
    ...extra,
  };
}

const NOM_LONG = `Association sportive ${"très ".repeat(25)}longue`;

const CANDIDATURES = [
  candidature(1, "Courbevoie", { equipeNomComplet: "Les Coqs de Courbevoie" }),
  candidature(2, "Rennes", { equipeNomComplet: null }),
  // Back pas encore redéployé : le champ est absent de la réponse.
  candidature(3, "Meudon"),
  candidature(4, "Orléans", { equipeNomComplet: "Les Renards d'Orléans" }),
];

/** Carte d'une candidature, repérée par son nom court. */
function carte(nomCourt: string): HTMLElement {
  return screen
    .getByText(nomCourt, { selector: "span.font-semibold > span" })
    .closest<HTMLElement>("div.bg-slate-800")!;
}

/** Bloc des noms (une ou deux lignes) d'une carte. */
function blocNoms(nomCourt: string): HTMLElement {
  return screen.getByText(nomCourt, { selector: "span.font-semibold > span" }).parentElement!;
}

const nomsCartes = () =>
  screen
    .queryAllByText(/^(Courbevoie|Rennes|Meudon|Orléans)$/, {
      selector: "span.font-semibold > span",
    })
    .map((el) => el.textContent);

beforeEach(async () => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    token: "fake-jwt-token",
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
    fraisInscription: 300,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
    anneesAge: [2015],
  });
  mockFetchToutesCandidatures.mockResolvedValue(CANDIDATURES);

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("Liste des candidatures de l'organisateur — affichage du nom complet (CA8)", () => {
  it("affiche le nom court en ligne principale et le nom complet en dessous, en plus petit", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");

    const bloc = blocNoms("Courbevoie");
    const [nomCourt, nomComplet] = Array.from(bloc.children);

    expect(bloc.children).toHaveLength(2);
    expect(nomCourt).toHaveTextContent("Courbevoie");
    expect(nomComplet).toHaveTextContent("Les Coqs de Courbevoie");
    expect(nomComplet).toHaveClass("text-xs");
    expect(nomCourt).not.toHaveClass("text-xs");
    expect(bloc).toHaveClass("font-semibold");
    expect(nomComplet).toHaveClass("font-normal");
  });

  it.each(["Rennes", "Meudon"])(
    "n'affiche qu'une ligne pour %s, sans nom complet (null ou absent) — ni ligne vide ni tiret",
    async (nom) => {
      rendre();
      await screen.findByText("4 équipes sur 4");

      const bloc = blocNoms(nom);

      expect(bloc.children).toHaveLength(1);
      expect(bloc.textContent).toBe(nom);
    },
  );

  it("garde le badge de statut à côté du nom, dans la même carte", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");

    const ligne = blocNoms("Courbevoie").parentElement!;

    expect(within(ligne).getByText("En attente")).toBeInTheDocument();
    expect(within(carte("Courbevoie")).getByText(/ref1@club\.fr/)).toBeInTheDocument();
  });

  it("tronque les deux lignes au lieu d'élargir la carte quand le nom complet est très long", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      candidature(1, "Courbevoie", { equipeNomComplet: NOM_LONG }),
    ]);
    rendre();
    await screen.findByText("1 équipe sur 1");

    const bloc = blocNoms("Courbevoie");

    expect(within(bloc).getByText(NOM_LONG)).toBeInTheDocument();
    expect(bloc).toHaveClass("min-w-0", "max-w-full", "[&>span]:truncate");
  });

  it("n'utilise le nom complet ni dans le titre du dossier ni dans les confirmations", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");

    // Une seule occurrence à l'écran : la seconde ligne de la carte.
    expect(screen.getAllByText("Les Coqs de Courbevoie")).toHaveLength(1);
  });
});

describe("Liste des candidatures de l'organisateur — recherche par nom complet (CA7)", () => {
  it.each(["coqs", "COQS", "les coqs"])(
    "« %s » fait apparaître la candidature de Courbevoie et elle seule",
    async (saisie) => {
      rendre();
      await screen.findByText("4 équipes sur 4");

      fireEvent.change(screen.getByRole("searchbox"), { target: { value: saisie } });

      expect(nomsCartes()).toEqual(["Courbevoie"]);
      expect(screen.getByText("1 équipe sur 4")).toBeInTheDocument();
    },
  );

  it("ignore les accents du nom complet", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "renards d'orleans" } });

    expect(nomsCartes()).toEqual(["Orléans"]);
  });

  it("trouve toujours par le nom court, y compris une candidature sans nom complet", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");
    const recherche = screen.getByRole("searchbox");

    fireEvent.change(recherche, { target: { value: "courb" } });
    expect(nomsCartes()).toEqual(["Courbevoie"]);

    fireEvent.change(recherche, { target: { value: "meud" } });
    expect(nomsCartes()).toEqual(["Meudon"]);
  });

  it("restaure depuis l'URL une recherche qui ne correspond qu'au nom complet", async () => {
    rendre("/inscription?q=coqs");
    await screen.findByText("1 équipe sur 4");

    expect(nomsCartes()).toEqual(["Courbevoie"]);
  });

  it("affiche le message « aucune équipe » pour un texte présent dans aucun champ", async () => {
    rendre();
    await screen.findByText("4 équipes sur 4");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "strasbourg" } });

    expect(
      screen.getByText("Aucune équipe ne correspond à ces filtres."),
    ).toBeInTheDocument();
    expect(nomsCartes()).toEqual([]);
  });

  it("garde le tri par nom court quand les noms complets sont dans un autre ordre", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      candidature(1, "Rennes", { equipeNomComplet: "Aaa Club" }),
      candidature(2, "Courbevoie", { equipeNomComplet: "Zzz Club" }),
    ]);
    rendre("/inscription?tri=nom");
    await screen.findByText("2 équipes sur 2");

    expect(nomsCartes()).toEqual(["Courbevoie", "Rennes"]);
  });
});
