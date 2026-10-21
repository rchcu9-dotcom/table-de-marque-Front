import "@testing-library/jest-dom/vitest";
import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";

/**
 * Backlog 1 (recherche / filtre / tri de la liste admin) et backlog 2 lot A
 * (panneau « Voir le dossier » adressé par ?dossier=<id>).
 */

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
const mockValiderDossier = vi.fn();
const mockRouvrirDossier = vi.fn();
const mockFetchDossierParCandidature = vi.fn();

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
  validerDossier: (...args: unknown[]) => mockValiderDossier(...args),
  rouvrirDossier: (...args: unknown[]) => mockRouvrirDossier(...args),
  marquerPaiementRepas: vi.fn(),
  definirCommentaireOrganisateur: vi.fn(),
  fetchImageRib: vi.fn(),
  fetchMonDossier: vi.fn(),
  fetchDossierParCandidature: (...args: unknown[]) => mockFetchDossierParCandidature(...args),
}));

let InscriptionPage: typeof import("../InscriptionPage").default;

const sonde = { url: "" };
function SondeUrl() {
  const location = useLocation();
  useEffect(() => {
    sonde.url = location.pathname + location.search;
  });
  return null;
}

function rendre(initialUrl = "/inscription") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <SondeUrl />
        <InscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function candidature(id: number, equipeNom: string, statut: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    equipeNom,
    equipeLogoUrl: null,
    utilisateurEmail: `ref${id}@club.fr`,
    utilisateurDisplayName: null,
    statut,
    createdAt: `2026-04-0${id}T00:00:00.000Z`,
    commentaireOrganisateur: null,
    fraisInscriptionPaye: statut !== "PAIEMENT_ATTENDU",
    repasPaiementRecu: false,
    nbRepas: 0,
    ...extra,
  };
}

const CANDIDATURES = [
  candidature(1, "Rouen", "CANDIDATE"),
  candidature(2, "Cormeilles-en-Parisis", "DOSSIER_EN_COURS"),
  candidature(3, "Amiens", "VALIDEE"),
  candidature(4, "Évry", "PAIEMENT_ATTENDU"),
  candidature(5, "Brest", "DOSSIER_COMPLET"),
];

const nomsCartes = () =>
  screen
    .getAllByText(/^(Rouen|Cormeilles-en-Parisis|Amiens|Évry|Brest)$/, { selector: "span.font-semibold > span" })
    .map((el) => el.textContent);

const compteurReservees = () =>
  screen.getByText("Équipes réservées").parentElement!.querySelector("span:last-child")!.textContent;

const texteTotaux = () => screen.getByText(/Frais d'inscription :/).textContent;

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
    etape: "CLOTUREE",
    dateDebut: "2026-05-23T00:00:00",
    fraisInscription: 300,
    prixRepas: 12,
    nbPlacesMax: 16,
    affichagePlanningPublic: false,
    anneesAge: [2015],
  });
  mockFetchToutesCandidatures.mockResolvedValue(CANDIDATURES);
  mockFetchDossierParCandidature.mockResolvedValue({
    dossier: { id: 9, inscriptionId: 2, droitsImageAcceptes: true, droitsImageHorodatage: null },
    joueurs: [
      { id: 1, dossierId: 9, nom: "Lemieux", prenom: "Mario", numero: 66, poste: "ATT", licenceFFH: null, anneeNaissance: 2015, particularitesAlim: null },
    ],
    coachs: [{ id: 1, dossierId: 9, nom: "Bowman", prenom: "Scotty", presenceRepas: true }],
    statutInscription: "DOSSIER_EN_COURS",
  });

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("Liste admin des candidatures — recherche, filtre, tri (backlog 1)", () => {
  it("trie par défaut selon l'ordre du parcours", async () => {
    rendre();
    await screen.findByText("5 équipes sur 5");

    expect(nomsCartes()).toEqual(["Rouen", "Évry", "Amiens", "Cormeilles-en-Parisis", "Brest"]);
  });

  it("recherche sans tenir compte des accents ni de la casse, sans changer les totaux", async () => {
    rendre();
    await screen.findByText("5 équipes sur 5");
    const reserveesAvant = compteurReservees();
    const totauxAvant = texteTotaux();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "CORMEIL" } });

    expect(nomsCartes()).toEqual(["Cormeilles-en-Parisis"]);
    expect(screen.getByText("1 équipe sur 5")).toHaveAttribute("aria-live", "polite");
    expect(sonde.url).toContain("q=CORMEIL");
    expect(compteurReservees()).toBe(reserveesAvant);
    expect(texteTotaux()).toBe(totauxAvant);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "evry" } });
    expect(nomsCartes()).toEqual(["Évry"]);
  });

  it("filtre par un ou plusieurs statuts avec des compteurs sur la liste complète", async () => {
    rendre();
    await screen.findByText("5 équipes sur 5");
    const groupe = screen.getByRole("group", { name: "Filtrer par statut" });

    expect(within(groupe).getByRole("button", { name: /Tous \(5\)/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(groupe).getByRole("button", { name: /Validée \(1\)/ }));
    expect(nomsCartes()).toEqual(["Amiens"]);

    fireEvent.click(within(groupe).getByRole("button", { name: /Dossier complet \(1\)/ }));
    expect(nomsCartes()).toEqual(["Amiens", "Brest"]);
    expect(within(groupe).getByRole("button", { name: /Tous/ })).toHaveAttribute("aria-pressed", "false");
    expect(within(groupe).getByRole("button", { name: /En attente \(1\)/ })).toBeInTheDocument();
    expect(sonde.url).toContain("statut=VALIDEE%2CDOSSIER_COMPLET");
    expect(compteurReservees()).toBe("4 / 16");
  });

  it("restaure recherche, filtre et tri depuis l'URL (F5, lien partagé)", async () => {
    rendre("/inscription?statut=CANDIDATE,DOSSIER_COMPLET,VALIDEE&tri=nom-desc");
    await screen.findByText("3 équipes sur 5");

    expect(nomsCartes()).toEqual(["Rouen", "Brest", "Amiens"]);
    expect(screen.getByRole("combobox", { name: "Trier par" })).toHaveValue("nom-desc");
  });

  it("affiche un message et « Effacer les filtres » quand rien ne correspond", async () => {
    rendre("/inscription?q=zzz");
    expect(await screen.findByText("Aucune équipe ne correspond à ces filtres.")).toBeInTheDocument();
    expect(compteurReservees()).toBe("4 / 16");

    fireEvent.click(screen.getByRole("button", { name: "Effacer les filtres" }));

    expect(nomsCartes()).toHaveLength(5);
    expect(sonde.url).toBe("/inscription");
  });
});

describe("Liste admin — accès au dossier (backlog 2, lot A)", () => {
  it("propose « Voir le dossier » en premier à partir de VALIDEE uniquement", async () => {
    rendre();
    await screen.findByText("5 équipes sur 5");

    expect(screen.getAllByRole("button", { name: "Voir le dossier" })).toHaveLength(3);
    const carteCormeilles = screen.getByText("Cormeilles-en-Parisis").closest<HTMLElement>("div.bg-slate-800")!;
    const boutons = within(carteCormeilles).getAllByRole("button").map((b) => b.textContent);
    expect(boutons.indexOf("Voir le dossier")).toBeLessThan(boutons.indexOf("Valider le dossier"));
    const carteRouen = screen.getByText("Rouen").closest<HTMLElement>("div.bg-slate-800")!;
    expect(within(carteRouen).queryByRole("button", { name: "Voir le dossier" })).not.toBeInTheDocument();
  });

  it("ouvre le panneau avec ?dossier=<id>, conserve les filtres et les retrouve à la fermeture", async () => {
    rendre("/inscription?q=cor");
    await screen.findByText("1 équipe sur 5");

    fireEvent.click(screen.getByRole("button", { name: "Voir le dossier" }));

    const panneau = await screen.findByRole("dialog", { name: "Dossier — Cormeilles-en-Parisis" });
    expect(sonde.url).toContain("dossier=2");
    expect(sonde.url).toContain("q=cor");
    expect(mockFetchDossierParCandidature).toHaveBeenCalledWith(2, "fake-jwt-token");
    expect(await within(panneau).findByText("Lemieux")).toBeInTheDocument();
    expect(within(panneau).getByText(/Scotty Bowman/)).toBeInTheDocument();
    expect(within(panneau).getByRole("checkbox", { name: /Le référent accepte/ })).toBeChecked();

    fireEvent.click(within(panneau).getByRole("button", { name: "Fermer" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(sonde.url).toBe("/inscription?q=cor");
    expect(screen.getByText("1 équipe sur 5")).toBeInTheDocument();
  });

  it("rouvre le panneau directement depuis l'URL (F5) et permet de valider le dossier", async () => {
    mockValiderDossier.mockResolvedValue({ id: 2, statut: "DOSSIER_COMPLET" });
    rendre("/inscription?dossier=2");

    const panneau = await screen.findByRole("dialog", { name: "Dossier — Cormeilles-en-Parisis" });
    mockFetchToutesCandidatures.mockResolvedValue(
      CANDIDATURES.map((c) => (c.id === 2 ? { ...c, statut: "DOSSIER_COMPLET" } : c)),
    );
    fireEvent.click(await within(panneau).findByRole("button", { name: "Valider le dossier" }));

    await waitFor(() => expect(mockValiderDossier).toHaveBeenCalledWith(2, "fake-jwt-token"));
    expect(await within(panneau).findByRole("button", { name: "Rouvrir le dossier" })).toBeInTheDocument();
    // En DOSSIER_COMPLET, l'organisateur garde la main (formulaires visibles).
    expect(within(panneau).getByRole("button", { name: "Ajouter le joueur" })).toBeInTheDocument();
  });

  it("passe le panneau en lecture seule à partir de TOURNOI_DEMARRE", async () => {
    mockFetchEditionCourante.mockResolvedValue({
      id: 1,
      etape: "TOURNOI_DEMARRE",
      fraisInscription: 300,
      prixRepas: 12,
      nbPlacesMax: 16,
      anneesAge: [2015],
    });
    rendre("/inscription?dossier=2");

    const panneau = await screen.findByRole("dialog");
    await within(panneau).findByText("Lemieux");
    expect(within(panneau).getByText(/Le tournoi a démarré/)).toBeInTheDocument();
    expect(within(panneau).queryByRole("button", { name: "Ajouter le joueur" })).not.toBeInTheDocument();
    expect(within(panneau).getByRole("checkbox", { name: /Le référent accepte/ })).toBeDisabled();
  });

  it("ignore un ?dossier= qui ne désigne pas une candidature à partir de VALIDEE", async () => {
    rendre("/inscription?dossier=1");
    await screen.findByText("5 équipes sur 5");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockFetchDossierParCandidature).not.toHaveBeenCalled();
  });
});
