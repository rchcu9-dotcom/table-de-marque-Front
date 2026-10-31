// Bouton « Mail au porteur » sur la vraie page : carte de l'organisateur, et comparaison du mail
// avec le texte réellement affiché au responsable (critère 4).
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../api/env", () => ({
  getApiBaseUrl: () => "http://localhost:3000",
}));

const mockUser = { uid: "uid-1" } as unknown as import("../../auth/types").AuthUser;

const mockUseAuth = vi.fn();
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFetchEditionCourante = vi.fn();
const mockFetchEquipesReferentiel = vi.fn();
const mockFetchProfilInscription = vi.fn();
const mockFetchMaCandidature = vi.fn();
const mockFetchToutesCandidatures = vi.fn();
const mockChangerStatutTriage = vi.fn();
const mockValiderDossier = vi.fn();
const mockRouvrirDossier = vi.fn();

vi.mock("../../api/inscription", () => ({
  fetchEditionCourante: (...args: unknown[]) => mockFetchEditionCourante(...args),
  fetchEquipesReferentiel: (...args: unknown[]) => mockFetchEquipesReferentiel(...args),
  createEquipeDemande: vi.fn(),
  fetchProfilInscription: (...args: unknown[]) => mockFetchProfilInscription(...args),
  updatePseudo: vi.fn(),
  fetchMaCandidature: (...args: unknown[]) => mockFetchMaCandidature(...args),
  soumettreCanditature: vi.fn(),
  fetchToutesCandidatures: (...args: unknown[]) => mockFetchToutesCandidatures(...args),
  changerStatutTriage: (...args: unknown[]) => mockChangerStatutTriage(...args),
  validerPaiement: vi.fn(),
  validerDossier: (...args: unknown[]) => mockValiderDossier(...args),
  rouvrirDossier: (...args: unknown[]) => mockRouvrirDossier(...args),
  marquerPaiementRepas: vi.fn(),
  definirCommentaireOrganisateur: vi.fn(),
}));

let InscriptionPage: typeof import("../InscriptionPage").default;

const STATUTS = [
  "CANDIDATE",
  "LISTE_ATTENTE",
  "RESERVEE",
  "PAIEMENT_ATTENDU",
  "VALIDEE",
  "DOSSIER_EN_COURS",
  "DOSSIER_COMPLET",
  "REFUSEE",
] as const;

const MESSAGES = {
  msgDemandeSoumise: "Demande bien reçue.\nÀ très vite !",
  msgListeAttente: "Liste d'attente : on te prévient.",
  msgPaiementAttendu: "Règle {{frais}} sous 8 jours.\nMerci.",
  msgChequeInfo1: "Chèque à l'ordre du RCHC.",
  msgChequeInfo2: "Envoi au trésorier.",
  msgInscriptionConfirmee: "Inscription confirmée, bravo.",
  msgRenseigneJoueurs: "Renseigne tes joueurs.",
  msgInscriptionValidee: "Dossier validé, merci.",
  msgEquipeRefusee: "Pas de place cette année.",
};

function baseEdition(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nom: "RCHC U11 2026",
    categorie: "U11",
    annee: 2026,
    etape: "INSCRIPTIONS_OUVERTES",
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-01T23:59:59",
    fraisInscription: 300,
    prixRepas: 12,
    nbPlacesMax: 16,
    hasImageRib: false,
    contactEmail: "responsable@tournoi.fr",
    affichagePlanningPublic: false,
    ...MESSAGES,
    ...overrides,
  };
}

function baseCandidature(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    equipeNom: "Rennes",
    equipeLogoUrl: null,
    utilisateurEmail: "coach@example.com",
    utilisateurDisplayName: "Coach Dupont",
    statut: "CANDIDATE",
    createdAt: "2026-04-01T00:00:00.000Z",
    nbJoueurs: 0,
    fraisInscriptionPaye: false,
    repasPaiementRecu: false,
    commentaireOrganisateur: null,
    ...overrides,
  };
}

function rendrePage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <InscriptionPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function role(valeur: string) {
  mockFetchProfilInscription.mockResolvedValue({ id: 1, pseudo: "Quelqu'un", role: valeur });
}

const trouverLien = () => screen.findByRole("link", { name: /Mail au porteur/ });

/** Texte du mail, tel qu'une messagerie le lit. */
function texteDuMail(lien: HTMLElement): string {
  const href = lien.getAttribute("href")!;
  return decodeURIComponent(href.split("body=")[1]).replace(/\r\n/g, "\n");
}

/** Vrai si un paragraphe affiche exactement ce texte. */
function paragrapheExact(texte: string) {
  return (_: string, element: Element | null) =>
    element?.tagName === "P" && element.textContent === texte;
}

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  mockUseAuth.mockReturnValue({
    user: mockUser,
    token: "fake-jwt-token",
    loading: false,
    configured: true,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    logout: vi.fn(),
  });
  mockFetchEquipesReferentiel.mockResolvedValue([]);
  mockFetchEditionCourante.mockResolvedValue(baseEdition());
  mockFetchMaCandidature.mockResolvedValue(null);
  mockFetchToutesCandidatures.mockResolvedValue([baseCandidature()]);
  role("ORGANISATEUR");

  ({ default: InscriptionPage } = await import("../InscriptionPage"));
});

describe("Mail au porteur — carte de l'organisateur", () => {
  it.each(STATUTS)("le bouton est présent pour %s (critère 3)", async (statut) => {
    mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut })]);

    rendrePage();
    const lien = await trouverLien();

    expect(lien.getAttribute("href")).toContain("mailto:coach@example.com?");
    expect(lien.getAttribute("href")).toContain("cc=responsable@tournoi.fr");
  });

  it("chaque carte porte le mail de son propre porteur", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([
      baseCandidature({ id: 1, utilisateurEmail: "a@club.fr", statut: "LISTE_ATTENTE" }),
      baseCandidature({ id: 2, equipeNom: "Brest", utilisateurEmail: "b@club.fr", statut: "REFUSEE" }),
    ]);

    rendrePage();
    const liens = await screen.findAllByRole("link", { name: /Mail au porteur/ });
    const adresses = liens.map((l) => l.getAttribute("href")!.split("?")[0]).sort();

    expect(adresses).toEqual(["mailto:a@club.fr", "mailto:b@club.fr"]);
  });

  it("n'affiche pas le bouton si l'édition est absente", async () => {
    mockFetchEditionCourante.mockResolvedValue(null);

    rendrePage();
    await screen.findByText("Gestion des candidatures");
    await screen.findAllByText(/coach@example.com/);

    expect(screen.queryByRole("link", { name: /Mail au porteur/ })).not.toBeInTheDocument();
  });

  it("porte l'étape de l'édition : verrouillage à TOURNOI_DEMARRE (critère 5)", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ etape: "TOURNOI_DEMARRE" }));
    mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut: "VALIDEE" })]);

    rendrePage();
    const lien = await trouverLien();

    expect(texteDuMail(lien)).toBe("Le tournoi a démarré, les dossiers ne sont plus modifiables.");
    expect(lien).toHaveAttribute(
      "title",
      "Les dossiers du tournoi RCHC U11 ne sont plus modifiables",
    );
  });

  it("après « Liste d'attente », le bouton porte le nouveau mail (critères 1 et 6)", async () => {
    mockFetchToutesCandidatures
      .mockResolvedValueOnce([baseCandidature({ statut: "CANDIDATE" })])
      .mockResolvedValue([baseCandidature({ statut: "LISTE_ATTENTE" })]);
    mockChangerStatutTriage.mockResolvedValue({ id: 1, statut: "LISTE_ATTENTE" });

    rendrePage();
    expect(await trouverLien()).toHaveAttribute(
      "title",
      "Votre demande d'inscription au tournoi RCHC U11 a bien été reçue",
    );

    fireEvent.click(screen.getByRole("button", { name: "Liste d'attente" }));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /Mail au porteur/ })).toHaveAttribute(
        "title",
        "Vous êtes sur liste d'attente du tournoi RCHC U11",
      ),
    );
    expect(texteDuMail(screen.getByRole("link", { name: /Mail au porteur/ }))).toBe(
      MESSAGES.msgListeAttente,
    );
  });

  it("changer un statut n'ouvre aucun mail : aucun lien cliqué, le lien reste à portée", async () => {
    mockChangerStatutTriage.mockResolvedValue({ id: 1, statut: "LISTE_ATTENTE" });
    const clic = vi.fn();

    rendrePage();
    (await trouverLien()).addEventListener("click", clic);
    fireEvent.click(screen.getByRole("button", { name: "Liste d'attente" }));

    await waitFor(() => expect(mockChangerStatutTriage).toHaveBeenCalled());
    expect(clic).not.toHaveBeenCalled();
  });

  it("un clic n'émet aucun appel à l'API et ne change pas le statut (critère 18)", async () => {
    mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut: "LISTE_ATTENTE" })]);

    rendrePage();
    const lien = await trouverLien();
    const appelsAvant = mockFetchToutesCandidatures.mock.calls.length;

    fireEvent.click(lien);

    expect(mockChangerStatutTriage).not.toHaveBeenCalled();
    expect(mockFetchToutesCandidatures).toHaveBeenCalledTimes(appelsAvant);
    expect(await trouverLien()).toBeInTheDocument();
  });
});

describe("Mail au porteur — accès (critère 17)", () => {
  it.each(["RESPONSABLE_EQUIPE", "TABLE_DE_MARQUE"])("%s ne voit aucun bouton", async (valeur) => {
    role(valeur);
    mockFetchMaCandidature.mockResolvedValue(baseCandidature({ statut: "LISTE_ATTENTE" }));

    rendrePage();
    await screen.findByText(MESSAGES.msgListeAttente);

    expect(screen.queryByRole("link", { name: /Mail au porteur/ })).not.toBeInTheDocument();
    expect(mockFetchToutesCandidatures).not.toHaveBeenCalled();
  });
});

describe("Mail identique à l'écran du responsable (critère 4)", () => {
  it.each(STATUTS)("%s : chaque paragraphe du mail est affiché au responsable", async (statut) => {
    mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut })]);
    rendrePage();
    const texte = texteDuMail(await trouverLien());
    cleanup();

    role("RESPONSABLE_EQUIPE");
    mockFetchMaCandidature.mockResolvedValue(baseCandidature({ statut }));
    rendrePage();

    await screen.findByText(paragrapheExact(texte.split("\n\n")[0]));
    for (const paragraphe of texte.split("\n\n")) {
      expect(screen.getByText(paragrapheExact(paragraphe))).toBeInTheDocument();
    }
  });

  it.each(STATUTS)("%s : même résultat avec les replis (édition sans messages)", async (statut) => {
    const sansMessages = Object.fromEntries(Object.keys(MESSAGES).map((c) => [c, ""]));
    mockFetchEditionCourante.mockResolvedValue(baseEdition(sansMessages));
    mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut })]);
    rendrePage();
    const texte = texteDuMail(await trouverLien());
    cleanup();

    role("RESPONSABLE_EQUIPE");
    mockFetchMaCandidature.mockResolvedValue(baseCandidature({ statut }));
    rendrePage();

    expect(await screen.findByText(paragrapheExact(texte))).toBeInTheDocument();
  });

  it.each(["VALIDEE", "DOSSIER_EN_COURS"])(
    "%s à TOURNOI_DEMARRE : même message des deux côtés",
    async (statut) => {
      mockFetchEditionCourante.mockResolvedValue(baseEdition({ etape: "TOURNOI_DEMARRE" }));
      mockFetchToutesCandidatures.mockResolvedValue([baseCandidature({ statut })]);
      rendrePage();
      const texte = texteDuMail(await trouverLien());
      cleanup();

      role("RESPONSABLE_EQUIPE");
      mockFetchMaCandidature.mockResolvedValue(baseCandidature({ statut }));
      rendrePage();

      expect(await screen.findByText(paragrapheExact(texte))).toBeInTheDocument();
    },
  );
});

describe("VueResponsable après le passage à messagesParcours (critère 19)", () => {
  function monterResponsable(statut: string) {
    role("RESPONSABLE_EQUIPE");
    mockFetchMaCandidature.mockResolvedValue(baseCandidature({ statut }));
    return rendrePage();
  }

  it.each<[string, string, string]>([
    ["CANDIDATE", MESSAGES.msgDemandeSoumise, "text-slate-300"],
    ["LISTE_ATTENTE", MESSAGES.msgListeAttente, "text-orange-300"],
    ["VALIDEE", MESSAGES.msgInscriptionConfirmee, "text-green-300"],
    ["DOSSIER_EN_COURS", MESSAGES.msgRenseigneJoueurs, "text-cyan-300"],
    ["DOSSIER_COMPLET", MESSAGES.msgInscriptionValidee, "text-emerald-300"],
    ["REFUSEE", MESSAGES.msgEquipeRefusee, "text-red-300"],
  ])("%s garde son message et sa couleur", async (statut, texte, couleur) => {
    monterResponsable(statut);

    const paragraphe = await screen.findByText(paragrapheExact(texte));

    expect(paragraphe).toHaveClass(couleur, "whitespace-pre-line");
  });

  it("le paiement garde ses trois paragraphes et leurs classes", async () => {
    monterResponsable("PAIEMENT_ATTENDU");

    const principal = await screen.findByText(/Règle .* sous 8 jours/);
    const cheque = screen.getByText(MESSAGES.msgChequeInfo1);

    expect(principal).toHaveClass("text-slate-200", "whitespace-pre-line");
    expect(principal.textContent).toMatch(/300,00.€/);
    expect(cheque).toHaveClass("text-slate-300");
    expect(cheque).not.toHaveClass("whitespace-pre-line");
    expect(screen.getByText(MESSAGES.msgChequeInfo2)).toBeInTheDocument();
  });

  it("deux messages chèque identiques s'affichent tous les deux", async () => {
    mockFetchEditionCourante.mockResolvedValue(
      baseEdition({ msgChequeInfo1: "Même texte", msgChequeInfo2: "Même texte" }),
    );
    monterResponsable("PAIEMENT_ATTENDU");

    expect(await screen.findAllByText("Même texte")).toHaveLength(2);
  });

  it("le verrouillage masque toujours le bouton de dossier", async () => {
    mockFetchEditionCourante.mockResolvedValue(baseEdition({ etape: "TOURNOI_DEMARRE" }));
    const { container } = monterResponsable("VALIDEE");

    await screen.findByText("Le tournoi a démarré, les dossiers ne sont plus modifiables.");

    expect(within(container).queryByRole("button", { name: "Renseigner mon dossier" })).toBeNull();
  });
});
