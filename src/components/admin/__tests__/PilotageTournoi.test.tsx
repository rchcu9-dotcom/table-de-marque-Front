import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import PilotageTournoi from "../PilotageTournoi";
import { ServerError } from "../../../api/errors";
import { MESSAGE_RETOUR_AVEC_CANDIDATURES } from "../../../utils/editionRegles";
import type {
  CandidatureOrganisateur,
  Edition,
  EditionEtape,
  StatutInscription,
} from "../../../api/types/inscription.types";

const mockOuvrir = vi.fn();
const mockCloturer = vi.fn();
const mockDemarrer = vi.fn();
const mockRevenir = vi.fn();
const mockFetchCandidatures = vi.fn();
const mockExportTaDump = vi.fn();
vi.mock("../../../api/inscription", () => ({
  ouvrirInscriptions: (...a: unknown[]) => mockOuvrir(...a),
  cloturerInscriptions: (...a: unknown[]) => mockCloturer(...a),
  demarrerTournoi: (...a: unknown[]) => mockDemarrer(...a),
  revenirEnPreparation: (...a: unknown[]) => mockRevenir(...a),
  fetchToutesCandidatures: (...a: unknown[]) => mockFetchCandidatures(...a),
  exportTaDump: (...a: unknown[]) => mockExportTaDump(...a),
  createEditionEnPreparation: vi.fn(),
}));

const mockFetchParametresSportifs = vi.fn();
vi.mock("../../../api/parametresSportifs", () => ({
  fetchParametresSportifs: (...a: unknown[]) => mockFetchParametresSportifs(...a),
  updateParametresSportifs: vi.fn(),
}));

function edition(etape: EditionEtape, patch: Partial<Edition> = {}): Edition {
  return {
    id: 1,
    nom: "RCHC U11",
    categorie: "U11",
    annee: 2026,
    etape,
    dateDebut: "2026-05-23",
    dateFinDebut: "2026-05-24",
    fraisInscription: 120,
    prixRepas: 12,
    nbPlacesMax: 16,
    hasImageRib: false,
    affichagePlanningPublic: false,
    anneesAge: [2016],
    ...patch,
  };
}

function cand(equipeNom: string, statut: StatutInscription): CandidatureOrganisateur {
  return { id: equipeNom.length, equipeNom, statut } as CandidatureOrganisateur;
}

let qc: QueryClient;

function renderPilotage(active: Edition | null, preparation: Edition | null = null) {
  qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  vi.spyOn(qc, "invalidateQueries");
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <PilotageTournoi token="tok" editionActive={active} editionEnPreparation={preparation} />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function etapeCourante() {
  return screen
    .getAllByRole("listitem")
    .find((li) => li.getAttribute("aria-current") === "step")!;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchCandidatures.mockResolvedValue([]);
  mockFetchParametresSportifs.mockResolvedValue({
    editionId: 1,
    nbPatinoires: 2,
    nbPoules: 4,
    nbEquipesParPoule: 4,
  });
});

describe("PilotageTournoi — frise verticale", () => {
  it("affiche les 5 étapes libellées en français, l'étape courante marquée et seule dépliée", () => {
    renderPilotage(edition("CLOTUREE"));

    const items = within(screen.getByRole("list", { name: "Étapes de l'édition 2026" }))
      .getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(screen.getByText("Préparation")).toBeInTheDocument();
    expect(screen.getByText("Inscriptions ouvertes")).toBeInTheDocument();
    expect(screen.getByText("Tournoi en cours")).toBeInTheDocument();
    expect(screen.getByText("Saison suivante")).toBeInTheDocument();
    expect(etapeCourante()).toHaveTextContent("Inscriptions clôturées");
    expect(screen.getAllByText("(terminée)", { exact: false })).toHaveLength(2);
    // Seule l'étape courante porte des boutons.
    for (const li of items.filter((li) => li !== etapeCourante())) {
      expect(within(li).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("n'affiche aucun code technique d'étape", () => {
    const { container } = renderPilotage(edition("CLOTUREE"));

    expect(container.textContent).not.toMatch(
      /CLOTUREE|CREEE|INSCRIPTIONS_OUVERTES|TOURNOI_DEMARRE|CREATION_NOUVEAU_TOURNOI/,
    );
  });

  it("regroupe CREATION_NOUVEAU_TOURNOI sous Préparation", () => {
    renderPilotage(edition("CREATION_NOUVEAU_TOURNOI"));

    expect(etapeCourante()).toHaveTextContent("Préparation");
  });
});

describe("PilotageTournoi — Préparation", () => {
  it("état des lieux : paramètres d'inscription et sportifs remplis", async () => {
    renderPilotage(edition("CREEE"));

    expect(screen.getByText("Paramètres d'inscription remplis")).toBeInTheDocument();
    expect(await screen.findByText("Paramètres sportifs remplis")).toBeInTheDocument();
    expect(mockFetchParametresSportifs).toHaveBeenCalledWith(1, "tok");
  });

  it("état des lieux informatif : paramètres à compléter, bouton toujours actif", async () => {
    mockFetchParametresSportifs.mockResolvedValue({ editionId: 1, nbPatinoires: null, nbPoules: null, nbEquipesParPoule: null });
    renderPilotage(edition("CREEE", { anneesAge: [] }));

    expect(screen.getByText("Paramètres d'inscription à compléter")).toBeInTheDocument();
    expect(await screen.findByText("Paramètres sportifs à compléter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir les inscriptions" })).toBeEnabled();
  });

  it("« Ouvrir les inscriptions » appelle ouvrirInscriptions sans confirmation", async () => {
    mockOuvrir.mockResolvedValue(edition("INSCRIPTIONS_OUVERTES"));
    renderPilotage(edition("CREEE"));

    fireEvent.click(screen.getByRole("button", { name: "Ouvrir les inscriptions" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockOuvrir).toHaveBeenCalledWith(1, "tok"));
    await waitFor(() =>
      expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-courante"] }),
    );
  });

  it("propose les liens vers les deux pages de paramètres", () => {
    renderPilotage(edition("CREEE"));

    const li = etapeCourante();
    expect(within(li).getByRole("link", { name: "Paramètres d'inscription" })).toHaveAttribute(
      "href",
      "/admin/parametres-inscription",
    );
    expect(within(li).getByRole("link", { name: "Paramètres sportifs" })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs",
    );
  });
});

describe("PilotageTournoi — Inscriptions ouvertes", () => {
  beforeEach(() => {
    mockFetchCandidatures.mockResolvedValue([
      cand("A", "CANDIDATE"),
      cand("BB", "PAIEMENT_ATTENDU"),
      cand("CCC", "VALIDEE"),
      cand("DDDD", "DOSSIER_COMPLET"),
      cand("EEEEE", "REFUSEE"),
    ]);
  });

  it("état des lieux : candidatures, équipes retenues sur la capacité, paiements attendus", async () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    expect(await screen.findByText("Candidatures : 4")).toBeInTheDocument();
    expect(screen.getByText("Équipes retenues : 2/16")).toBeInTheDocument();
    expect(screen.getByText("Paiements attendus : 1")).toBeInTheDocument();
  });

  it("« Clôturer » demande une confirmation simple, puis appelle cloturerInscriptions", async () => {
    mockCloturer.mockResolvedValue(edition("CLOTUREE"));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));
    const dialog = screen.getByRole("dialog", { name: "Clôturer les inscriptions ?" });
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(mockCloturer).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(mockCloturer).toHaveBeenCalledWith(1, "tok"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("annuler la confirmation n'appelle rien", () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockCloturer).not.toHaveBeenCalled();
  });

  it("lien secondaire « Gérer les candidatures »", () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    expect(screen.getByRole("link", { name: "Gérer les candidatures →" })).toHaveAttribute(
      "href",
      "/inscription",
    );
  });

  it("409 : message « état changé » et resynchronisation des caches", async () => {
    mockCloturer.mockRejectedValue(new ServerError(409, "Transition interdite"));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "L'état des inscriptions a changé entre-temps",
    );
    expect(qc.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["inscription", "edition-en-preparation"],
    });
  });

  it("autre erreur : message générique", async () => {
    mockCloturer.mockRejectedValue(new ServerError(500, "boom"));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    fireEvent.click(screen.getByRole("button", { name: "Clôturer les inscriptions" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de changer d'étape.");
  });
});

describe("PilotageTournoi — Revenir en préparation (spec § 2.4, CA 9)", () => {
  it("désactivé avec son motif dès qu'il existe une candidature (même refusée)", async () => {
    mockFetchCandidatures.mockResolvedValue([cand("A", "REFUSEE")]);
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    const motif = await screen.findByText(MESSAGE_RETOUR_AVEC_CANDIDATURES);
    const bouton = screen.getByRole("button", { name: "Revenir en préparation" });
    expect(bouton).toBeDisabled();
    expect(bouton).toHaveAttribute("aria-describedby", motif.id);

    fireEvent.click(bouton);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockRevenir).not.toHaveBeenCalled();
  });

  it("désactivé tant que les candidatures ne sont pas chargées", () => {
    mockFetchCandidatures.mockReturnValue(new Promise(() => {}));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    expect(screen.getByRole("button", { name: "Revenir en préparation" })).toBeDisabled();
  });

  it("action secondaire, après « Clôturer les inscriptions »", () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    const boutons = within(etapeCourante()).getAllByRole("button").map((b) => b.textContent);
    expect(boutons).toEqual(["Clôturer les inscriptions", "Revenir en préparation"]);
  });

  it("sans candidature : confirmation simple, puis appel de revenirEnPreparation et resynchronisation", async () => {
    mockRevenir.mockResolvedValue(edition("CREEE"));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));

    const bouton = screen.getByRole("button", { name: "Revenir en préparation" });
    await waitFor(() => expect(bouton).toBeEnabled());
    expect(bouton).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText(MESSAGE_RETOUR_AVEC_CANDIDATURES)).not.toBeInTheDocument();

    fireEvent.click(bouton);
    const dialog = screen.getByRole("dialog", { name: "Revenir en préparation ?" });
    expect(dialog).toHaveTextContent(
      "Les équipes ne pourront plus candidater tant que les inscriptions ne sont pas rouvertes.",
    );
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(mockRevenir).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(mockRevenir).toHaveBeenCalledWith(1, "tok"));
    await waitFor(() =>
      expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-en-preparation"] }),
    );
    expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["inscription", "edition-courante"] });
    expect(mockCloturer).not.toHaveBeenCalled();
  });

  it("annuler la confirmation n'appelle rien", async () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));
    const bouton = screen.getByRole("button", { name: "Revenir en préparation" });
    await waitFor(() => expect(bouton).toBeEnabled());

    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockRevenir).not.toHaveBeenCalled();
  });

  it("409 : affiche le message du back (candidature arrivée entre-temps)", async () => {
    mockRevenir.mockRejectedValue(new ServerError(409, MESSAGE_RETOUR_AVEC_CANDIDATURES));
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));
    const bouton = screen.getByRole("button", { name: "Revenir en préparation" });
    await waitFor(() => expect(bouton).toBeEnabled());

    fireEvent.click(bouton);
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGE_RETOUR_AVEC_CANDIDATURES);
    expect(screen.getByRole("alert")).not.toHaveTextContent("L'état des inscriptions a changé entre-temps");
  });

  it.each(["CREEE", "CLOTUREE", "TOURNOI_DEMARRE"] as const)("absent à l'étape %s", (etape) => {
    renderPilotage(edition(etape));

    expect(screen.queryByRole("button", { name: "Revenir en préparation" })).not.toBeInTheDocument();
  });
});

describe("PilotageTournoi — Inscriptions clôturées", () => {
  beforeEach(() => {
    mockFetchCandidatures.mockResolvedValue([
      cand("Rennes", "DOSSIER_COMPLET"),
      cand("Cormeilles", "DOSSIER_EN_COURS"),
      cand("Brest", "VALIDEE"),
      cand("Nantes", "PAIEMENT_ATTENDU"),
    ]);
  });

  it("état des lieux : dossiers complets X/Y et paiements en attente", async () => {
    renderPilotage(edition("CLOTUREE"));

    expect(await screen.findByText("Dossiers complets : 1/3")).toBeInTheDocument();
    expect(screen.getByText("Paiements en attente : 1")).toBeInTheDocument();
  });

  it("état des lieux : la formule sportive reste ajustable jusqu'au lancement (CA 10)", async () => {
    renderPilotage(edition("CLOTUREE"));

    const ligne = (await screen.findByText(/La formule sportive reste ajustable jusqu'au lancement/)).closest("li")!;
    expect(within(ligne).getByRole("link", { name: "Paramètres sportifs" })).toHaveAttribute(
      "href",
      "/admin/parametres-sportifs",
    );
  });

  it("la ligne « formule ajustable » n'apparaît pas en Inscriptions ouvertes", async () => {
    renderPilotage(edition("INSCRIPTIONS_OUVERTES"));
    await screen.findByText(/Candidatures :/);

    expect(screen.queryByText(/La formule sportive reste ajustable/)).not.toBeInTheDocument();
  });

  it("« Lancer le tournoi » est le bouton principal, « Rouvrir » l'action secondaire", () => {
    renderPilotage(edition("CLOTUREE"));

    const boutons = within(etapeCourante()).getAllByRole("button").map((b) => b.textContent);
    expect(boutons).toEqual(["Lancer le tournoi", "Rouvrir les inscriptions"]);
  });

  it("confirmation forte : liste les dossiers incomplets, Confirmer inactif tant que la case n'est pas cochée", async () => {
    mockDemarrer.mockResolvedValue(edition("TOURNOI_DEMARRE"));
    renderPilotage(edition("CLOTUREE"));
    await screen.findByText("Dossiers complets : 1/3");

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));
    const dialog = screen.getByRole("dialog", { name: "Lancer le tournoi ?" });
    const liste = within(dialog).getByRole("list", { name: "Dossiers incomplets" });
    expect(within(liste).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Cormeilles",
      "Brest",
    ]);
    const confirmer = within(dialog).getByRole("button", { name: "Confirmer" });
    expect(confirmer).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("checkbox"));
    expect(confirmer).toBeEnabled();
    fireEvent.click(confirmer);

    await waitFor(() => expect(mockDemarrer).toHaveBeenCalledWith(1, "tok"));
  });

  it("confirmation forte sans dossier incomplet : « Tous les dossiers sont complets. »", async () => {
    mockFetchCandidatures.mockResolvedValue([cand("Rennes", "DOSSIER_COMPLET")]);
    renderPilotage(edition("CLOTUREE"));
    await screen.findByText("Dossiers complets : 1/1");

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));

    expect(screen.getByText("Tous les dossiers sont complets.")).toBeInTheDocument();
  });

  it("échec du lancement : message dédié", async () => {
    mockDemarrer.mockRejectedValue(new ServerError(400, "x"));
    renderPilotage(edition("CLOTUREE"));

    fireEvent.click(screen.getByRole("button", { name: "Lancer le tournoi" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de lancer le tournoi.");
  });

  it("« Rouvrir » demande une confirmation simple puis appelle ouvrirInscriptions", async () => {
    mockOuvrir.mockResolvedValue(edition("INSCRIPTIONS_OUVERTES"));
    renderPilotage(edition("CLOTUREE"));

    fireEvent.click(screen.getByRole("button", { name: "Rouvrir les inscriptions" }));
    const dialog = screen.getByRole("dialog", { name: "Rouvrir les inscriptions ?" });
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(mockOuvrir).toHaveBeenCalledWith(1, "tok"));
    expect(mockDemarrer).not.toHaveBeenCalled();
  });
});

describe("PilotageTournoi — Tournoi en cours", () => {
  it("« Préparer la saison suivante » : aucun bouton de transition, flux sauvegarde puis création", () => {
    renderPilotage(edition("TOURNOI_DEMARRE"));

    const li = etapeCourante();
    expect(li).toHaveTextContent("Tournoi en cours");
    expect(within(li).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Préparer la saison suivante",
    ]);
    expect(mockFetchCandidatures).not.toHaveBeenCalled();
  });
});

describe("PilotageTournoi — deux éditions", () => {
  it("pilote l'édition en préparation et résume l'édition en cours", async () => {
    mockOuvrir.mockResolvedValue(edition("INSCRIPTIONS_OUVERTES", { id: 2 }));
    renderPilotage(
      edition("TOURNOI_DEMARRE"),
      edition("CREATION_NOUVEAU_TOURNOI", { id: 2, annee: 2027 }),
    );

    const preparation = screen.getByRole("region", { name: "Édition 2027 — en préparation" });
    const enCours = screen.getByRole("region", { name: "Édition 2026 — en cours" });
    expect(
      preparation.compareDocumentPosition(enCours) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(within(enCours).queryByRole("button")).not.toBeInTheDocument();
    expect(within(enCours).queryByRole("list")).not.toBeInTheDocument();
    expect(within(enCours).getByText("Tournoi en cours")).toBeInTheDocument();

    fireEvent.click(within(preparation).getByRole("button", { name: "Ouvrir les inscriptions" }));
    await waitFor(() => expect(mockOuvrir).toHaveBeenCalledWith(2, "tok"));
  });

  it("une seule édition : carte titrée par l'année", () => {
    renderPilotage(edition("CREEE"));

    expect(screen.getByRole("region", { name: "Édition 2026" })).toBeInTheDocument();
  });
});
