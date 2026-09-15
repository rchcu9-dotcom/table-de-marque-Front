import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";

const mockFetchMonDossier = vi.fn();
const mockAjouterJoueur = vi.fn();
const mockModifierJoueur = vi.fn();
const mockSupprimerJoueur = vi.fn();
const mockAjouterCoach = vi.fn();
const mockModifierCoach = vi.fn();
const mockSupprimerCoach = vi.fn();
const mockAccepterDroitsImage = vi.fn();

vi.mock("../../../api/inscription", () => ({
  fetchMonDossier: (...args: unknown[]) => mockFetchMonDossier(...args),
  ajouterJoueur: (...args: unknown[]) => mockAjouterJoueur(...args),
  modifierJoueur: (...args: unknown[]) => mockModifierJoueur(...args),
  supprimerJoueur: (...args: unknown[]) => mockSupprimerJoueur(...args),
  ajouterCoach: (...args: unknown[]) => mockAjouterCoach(...args),
  modifierCoach: (...args: unknown[]) => mockModifierCoach(...args),
  supprimerCoach: (...args: unknown[]) => mockSupprimerCoach(...args),
  accepterDroitsImage: (...args: unknown[]) => mockAccepterDroitsImage(...args),
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

    expect(await screen.findByText("#99 — Wayne Gretzky (ATT)")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nom")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter le joueur" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /j'accepte/i })).toBeDisabled();
  });
});
