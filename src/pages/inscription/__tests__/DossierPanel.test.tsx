import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render as rtlRender, screen, waitFor, fireEvent, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

// Le tableau des joueurs s'appuie sur useListControls (useSearchParams) : le
// panneau est toujours rendu sous le routeur de l'application.
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

const mockFetchMonDossier = vi.fn();
const mockAjouterJoueur = vi.fn();
const mockModifierJoueur = vi.fn();
const mockSupprimerJoueur = vi.fn();
const mockAjouterCoach = vi.fn();
const mockModifierCoach = vi.fn();
const mockSupprimerCoach = vi.fn();
const mockAccepterDroitsImage = vi.fn();
const mockFetchDossierParCandidature = vi.fn();
const mockSupprimerJoueurCandidature = vi.fn();
const mockAjouterCoachCandidature = vi.fn();

vi.mock("../../../api/inscription", () => ({
  fetchMonDossier: (...args: unknown[]) => mockFetchMonDossier(...args),
  ajouterJoueur: (...args: unknown[]) => mockAjouterJoueur(...args),
  modifierJoueur: (...args: unknown[]) => mockModifierJoueur(...args),
  supprimerJoueur: (...args: unknown[]) => mockSupprimerJoueur(...args),
  ajouterCoach: (...args: unknown[]) => mockAjouterCoach(...args),
  modifierCoach: (...args: unknown[]) => mockModifierCoach(...args),
  supprimerCoach: (...args: unknown[]) => mockSupprimerCoach(...args),
  accepterDroitsImage: (...args: unknown[]) => mockAccepterDroitsImage(...args),
  fetchDossierParCandidature: (...args: unknown[]) => mockFetchDossierParCandidature(...args),
  ajouterJoueurCandidature: vi.fn(),
  modifierJoueurCandidature: vi.fn(),
  supprimerJoueurCandidature: (...args: unknown[]) => mockSupprimerJoueurCandidature(...args),
  ajouterCoachCandidature: (...args: unknown[]) => mockAjouterCoachCandidature(...args),
  modifierCoachCandidature: vi.fn(),
  supprimerCoachCandidature: vi.fn(),
  accepterDroitsImageCandidature: vi.fn(),
}));

const mockUseInscriptionSession = vi.fn();
vi.mock("../../../hooks/useInscriptionSession", () => ({
  useInscriptionSession: () => mockUseInscriptionSession(),
}));

import DossierPanel from "../DossierPanel";

const DOSSIER_VIDE = {
  dossier: { id: 1, inscriptionId: 100, droitsImageAcceptes: false, droitsImageHorodatage: null },
  joueurs: [],
  coachs: [],
  statutInscription: "DOSSIER_EN_COURS",
};

function mockEdition(anneesAge: number[]) {
  mockUseInscriptionSession.mockReturnValue({
    edition: { id: 1, anneesAge },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchMonDossier.mockResolvedValue(DOSSIER_VIDE);
  mockEdition([2014, 2015, 2016]);
});

describe("DossierPanel", () => {
  it("loads and displays the dossier on mount", async () => {
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);

    await waitFor(() => {
      expect(mockFetchMonDossier).toHaveBeenCalledWith("tok");
    });
    expect(await screen.findByText("Joueurs (0)")).toBeInTheDocument();
    expect(screen.getByText("Coachs (0)")).toBeInTheDocument();
  });

  it("submits the joueur form (poste radio + année d'âge select) and reloads the dossier", async () => {
    mockAjouterJoueur.mockResolvedValue({
      id: 1,
      dossierId: 1,
      nom: "Gretzky",
      prenom: "Wayne",
      numero: 99,
      poste: "ATT",
      licenceFFH: null,
      anneeNaissance: 2015,
      particularitesAlim: null,
    });

    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    fireEvent.change(within(joueurSection).getByPlaceholderText("Nom"), {
      target: { value: "Gretzky" },
    });
    fireEvent.change(within(joueurSection).getByPlaceholderText("Prénom"), {
      target: { value: "Wayne" },
    });
    fireEvent.change(within(joueurSection).getByPlaceholderText("Numéro"), {
      target: { value: "99" },
    });
    fireEvent.click(within(joueurSection).getByRole("radio", { name: "ATT" }));
    fireEvent.change(within(joueurSection).getByRole("combobox"), {
      target: { value: "2015" },
    });
    fireEvent.click(
      within(joueurSection).getByRole("button", { name: "Ajouter le joueur" }),
    );

    await waitFor(() => {
      expect(mockAjouterJoueur).toHaveBeenCalledWith(
        {
          nom: "Gretzky",
          prenom: "Wayne",
          numero: 99,
          poste: "ATT",
          licenceFFH: null,
          anneeNaissance: 2015,
          particularitesAlim: null,
        },
        "tok",
      );
    });
    // La liste est rechargée après l'ajout.
    expect(mockFetchMonDossier).toHaveBeenCalledTimes(2);
  });

  it("only allows a single poste to be checked at a time (radio behavior — CA5)", async () => {
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    const radioD = within(joueurSection).getByRole("radio", { name: "D" });
    const radioDef = within(joueurSection).getByRole("radio", { name: "DEF" });
    const radioAtt = within(joueurSection).getByRole("radio", { name: "ATT" });

    fireEvent.click(radioD);
    expect(radioD).toBeChecked();
    expect(radioDef).not.toBeChecked();
    expect(radioAtt).not.toBeChecked();

    fireEvent.click(radioDef);
    expect(radioD).not.toBeChecked();
    expect(radioDef).toBeChecked();
    expect(radioAtt).not.toBeChecked();
  });

  it("populates the année d'âge select from the edition's configured years", async () => {
    mockEdition([2013, 2014]);
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    const select = within(joueurSection).getByRole("combobox");
    const options = within(select).getAllByRole("option").map((o) => o.textContent);

    expect(options).toEqual(["Année d'âge…", "2013", "2014"]);
  });

  it("rejects joueur submission when a required field is missing (nom seul renseigné)", async () => {
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    fireEvent.change(within(joueurSection).getByPlaceholderText("Nom"), {
      target: { value: "Gretzky" },
    });
    fireEvent.click(
      within(joueurSection).getByRole("button", { name: "Ajouter le joueur" }),
    );

    expect(
      await screen.findByText("Nom, prénom, numéro, poste et année d'âge sont obligatoires."),
    ).toBeInTheDocument();
    expect(mockAjouterJoueur).not.toHaveBeenCalled();
  });

  it("rejects joueur submission when nom/prénom/numéro/poste are filled but no année d'âge is selected (CA3)", async () => {
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    fireEvent.change(within(joueurSection).getByPlaceholderText("Nom"), {
      target: { value: "Gretzky" },
    });
    fireEvent.change(within(joueurSection).getByPlaceholderText("Prénom"), {
      target: { value: "Wayne" },
    });
    fireEvent.change(within(joueurSection).getByPlaceholderText("Numéro"), {
      target: { value: "99" },
    });
    fireEvent.click(within(joueurSection).getByRole("radio", { name: "D" }));
    fireEvent.click(
      within(joueurSection).getByRole("button", { name: "Ajouter le joueur" }),
    );

    expect(
      await screen.findByText("Nom, prénom, numéro, poste et année d'âge sont obligatoires."),
    ).toBeInTheDocument();
    expect(mockAjouterJoueur).not.toHaveBeenCalled();
  });

  it("disables submission and warns when no année d'âge is configured for the edition (CA2)", async () => {
    mockEdition([]);
    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const joueurSection = screen.getByText("Joueurs (0)").closest("section")!;
    expect(
      within(joueurSection).getByText(/Aucune année d'âge configurée par l'organisateur/),
    ).toBeInTheDocument();
    expect(
      within(joueurSection).getByRole("button", { name: "Ajouter le joueur" }),
    ).toBeDisabled();
  });

  it("toggles droits à l'image via the checkbox", async () => {
    mockAccepterDroitsImage.mockResolvedValue({
      id: 1,
      inscriptionId: 100,
      droitsImageAcceptes: true,
      droitsImageHorodatage: "2026-01-01T00:00:00.000Z",
    });

    render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
    await screen.findByText("Joueurs (0)");

    const checkbox = screen.getByRole("checkbox", {
      name: /j'accepte/i,
    });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockAccepterDroitsImage).toHaveBeenCalledWith(true, "tok");
    });
  });

  it("hides the forms and disables the checkbox in readOnly mode", async () => {
    mockFetchMonDossier.mockResolvedValue({
      dossier: { id: 1, inscriptionId: 100, droitsImageAcceptes: true, droitsImageHorodatage: "2026-01-01" },
      joueurs: [
        {
          id: 1,
          dossierId: 1,
          nom: "Gretzky",
          prenom: "Wayne",
          numero: 99,
          poste: "ATT",
          licenceFFH: null,
          anneeNaissance: 2015,
          particularitesAlim: null,
        },
      ],
      coachs: [],
      statutInscription: "DOSSIER_COMPLET",
    });

    render(<DossierPanel token="tok" readOnly={true} onClose={() => {}} />);

    const ligne = (await screen.findByText("Gretzky")).closest("tr")!;
    expect(within(ligne).getByText("99")).toBeInTheDocument();
    expect(within(ligne).getByText("Wayne")).toBeInTheDocument();
    expect(within(ligne).getByText("ATT")).toBeInTheDocument();
    expect(within(ligne).queryByRole("button", { name: /Modifier/ })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nom")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter le joueur" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /j'accepte/i })).toBeDisabled();
  });

  describe("tableau des joueurs (backlog 1)", () => {
    const joueur = (id: number, nom: string, prenom: string, numero: number) => ({
      id,
      dossierId: 1,
      nom,
      prenom,
      numero,
      poste: "ATT",
      licenceFFH: null,
      anneeNaissance: 2015,
      particularitesAlim: null,
    });
    const DOSSIER_3_JOUEURS = {
      ...DOSSIER_VIDE,
      joueurs: [
        joueur(1, "Émery", "Zoé", 7),
        joueur(2, "Bossy", "Mike", 22),
        joueur(3, "Bossy", "Adam", 10),
      ],
    };
    // « Nom Prénom » de chaque ligne, dans l'ordre affiché.
    const nomsAffiches = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((r) => r.children[1].firstChild?.textContent + " " + r.children[2].textContent);
    const entete = (libelle: string) =>
      screen.getAllByRole("columnheader").find((th) => th.textContent?.startsWith(libelle))!;
    const cliquerEntete = (libelle: string) =>
      fireEvent.click(within(entete(libelle)).getByRole("button"));

    async function rendre() {
      mockFetchMonDossier.mockResolvedValue(DOSSIER_3_JOUEURS);
      render(<DossierPanel token="tok" readOnly={false} onClose={() => {}} />);
      await screen.findByText("Joueurs (3)");
    }

    it("trie par défaut par nom puis prénom, avec aria-sort sur la colonne Nom", async () => {
      await rendre();

      expect(nomsAffiches()).toEqual(["Bossy Adam", "Bossy Mike", "Émery Zoé"]);
      expect(entete("Nom")).toHaveAttribute("aria-sort", "ascending");
      expect(entete("Prénom")).toHaveAttribute("aria-sort", "none");
      expect(entete("N°")).toHaveAttribute("aria-sort", "none");
    });

    it("trie par Nom dans les deux sens", async () => {
      await rendre();

      cliquerEntete("Nom");
      expect(entete("Nom")).toHaveAttribute("aria-sort", "descending");
      expect(nomsAffiches()).toEqual(["Émery Zoé", "Bossy Mike", "Bossy Adam"]);

      cliquerEntete("Nom");
      expect(entete("Nom")).toHaveAttribute("aria-sort", "ascending");
      expect(nomsAffiches()).toEqual(["Bossy Adam", "Bossy Mike", "Émery Zoé"]);
    });

    it("trie par Prénom dans les deux sens", async () => {
      await rendre();

      cliquerEntete("Prénom");
      expect(entete("Prénom")).toHaveAttribute("aria-sort", "ascending");
      expect(entete("Nom")).toHaveAttribute("aria-sort", "none");
      expect(nomsAffiches()).toEqual(["Bossy Adam", "Bossy Mike", "Émery Zoé"]);

      cliquerEntete("Prénom");
      expect(entete("Prénom")).toHaveAttribute("aria-sort", "descending");
      expect(nomsAffiches()).toEqual(["Émery Zoé", "Bossy Mike", "Bossy Adam"]);
    });

    it("trie par N° dans les deux sens (numérique, pas alphabétique)", async () => {
      await rendre();

      cliquerEntete("N°");
      expect(entete("N°")).toHaveAttribute("aria-sort", "ascending");
      expect(nomsAffiches()).toEqual(["Émery Zoé", "Bossy Adam", "Bossy Mike"]);

      cliquerEntete("N°");
      expect(entete("N°")).toHaveAttribute("aria-sort", "descending");
      expect(nomsAffiches()).toEqual(["Bossy Mike", "Bossy Adam", "Émery Zoé"]);
    });

    it("filtre sur nom et prénom sans tenir compte des accents et affiche « Joueurs (x sur y) »", async () => {
      await rendre();

      fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher un joueur" }), {
        target: { value: "emery" },
      });

      expect(screen.getByText("Joueurs (1 sur 3)")).toBeInTheDocument();
      expect(nomsAffiches()).toEqual(["Émery Zoé"]);
    });

    it("demande une confirmation avant de supprimer un joueur", async () => {
      mockSupprimerJoueur.mockResolvedValue(undefined);
      await rendre();

      fireEvent.click(screen.getByRole("button", { name: "Supprimer Zoé Émery" }));
      expect(mockSupprimerJoueur).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Confirmer la suppression" }));

      await waitFor(() => expect(mockSupprimerJoueur).toHaveBeenCalledWith(1, "tok"));
    });

    it("« Modifier » pré-remplit le formulaire et y place le focus", async () => {
      await rendre();

      fireEvent.click(screen.getByRole("button", { name: "Modifier Mike Bossy" }));

      const nom = screen.getAllByPlaceholderText("Nom")[0] as HTMLInputElement;
      expect(nom.value).toBe("Bossy");
      await waitFor(() => expect(nom).toHaveFocus());
      expect(screen.getByText("Modification de Mike Bossy")).toBeInTheDocument();
    });
  });

  describe("source candidature (vue organisateur, backlog 2)", () => {
    it("charge le dossier de la candidature et écrit via les routes organisateur", async () => {
      mockFetchDossierParCandidature.mockResolvedValue({
        ...DOSSIER_VIDE,
        statutInscription: "DOSSIER_COMPLET",
      });
      mockAjouterCoachCandidature.mockResolvedValue({ id: 9 });
      const onChange = vi.fn();

      render(
        <DossierPanel
          token="tok"
          readOnly={false}
          source={{ type: "candidature", id: 42 }}
          titre="Joueurs & coachs"
          onChange={onChange}
          onClose={() => {}}
        />,
      );

      await screen.findByText("Joueurs & coachs");
      expect(mockFetchDossierParCandidature).toHaveBeenCalledWith(42, "tok");
      expect(mockFetchMonDossier).not.toHaveBeenCalled();
      expect(screen.queryByText(/n'est plus modifiable/)).not.toBeInTheDocument();

      const coachSection = screen.getByText("Coachs (0)").closest("section")!;
      fireEvent.change(within(coachSection).getByPlaceholderText("Nom"), { target: { value: "Bowman" } });
      fireEvent.change(within(coachSection).getByPlaceholderText("Prénom"), { target: { value: "Scotty" } });
      fireEvent.click(within(coachSection).getByRole("button", { name: "Ajouter le coach" }));

      await waitFor(() =>
        expect(mockAjouterCoachCandidature).toHaveBeenCalledWith(
          42,
          { nom: "Bowman", prenom: "Scotty", presenceRepas: false },
          "tok",
        ),
      );
      expect(mockAjouterCoach).not.toHaveBeenCalled();
      await waitFor(() => expect(onChange).toHaveBeenCalled());
    });
  });
});
