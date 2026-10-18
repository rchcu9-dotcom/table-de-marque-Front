import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ServerError } from "../../../api/errors";
import type { EquipeRef } from "../../../api/types/inscription.types";
import GestionEquipesReferentiel from "../GestionEquipesReferentiel";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md
// — §2 à §5, §8 ; CA2 à CA6, CA9, CA12

const mockFetchToutes = vi.fn();
const mockModifier = vi.fn();
const mockActiver = vi.fn();
const mockDesactiver = vi.fn();

vi.mock("../../../api/inscription", () => ({
  fetchEquipesReferentielToutes: (...args: unknown[]) => mockFetchToutes(...args),
  modifierEquipeReferentiel: (...args: unknown[]) => mockModifier(...args),
  activerEquipeReferentiel: (...args: unknown[]) => mockActiver(...args),
  desactiverEquipeReferentiel: (...args: unknown[]) => mockDesactiver(...args),
  createEquipeDemande: vi.fn(),
}));

const MESSAGE_VERROU =
  "Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe";

const COURBEVOIE: EquipeRef = {
  id: 1,
  nom: "Courbevoie",
  nomComplet: "Les Coqs de Courbevoie",
  active: true,
  nbCandidatures: 2,
};
const RENNES: EquipeRef = { id: 2, nom: "Rennes", nomComplet: null, active: true, nbCandidatures: 0 };
const ORLEANS: EquipeRef = {
  id: 3,
  nom: "Orléans",
  nomComplet: "Les Renards d'Orléans",
  active: false,
  nbCandidatures: 0,
};
const MEUDON: EquipeRef = {
  id: 4,
  nom: "Meudon",
  nomComplet: "Les Comètes de Meudon",
  logoUrl: "https://exemple.test/meudon.png",
  active: true,
  nbCandidatures: 1,
};
const EQUIPES = [COURBEVOIE, MEUDON, ORLEANS, RENNES];

function renderEcran() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GestionEquipesReferentiel token="fake-token" />
    </QueryClientProvider>,
  );
}

/** Attend la liste et renvoie la ligne (<li>) d'une équipe. */
async function ligne(nom: string) {
  const bouton = await screen.findByRole("button", { name: `Modifier ${nom}` });
  return bouton.closest("li") as HTMLElement;
}

async function ouvrirEdition(nom: string) {
  fireEvent.click(await screen.findByRole("button", { name: `Modifier ${nom}` }));
}

const champNom = () => screen.getByLabelText("Nom court");
const champNomComplet = () => screen.getByLabelText("Nom complet (optionnel)");
const boutonEnregistrer = () => screen.getByRole("button", { name: /Enregistre/ });
const nomsAffiches = () =>
  screen.getAllByRole("button", { name: /^Modifier / }).map((b) => b.getAttribute("aria-label")!.slice(9));

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchToutes.mockResolvedValue(EQUIPES);
});

describe("GestionEquipesReferentiel — liste (CA2)", () => {
  it("charge le référentiel complet avec le jeton de l'organisateur", async () => {
    renderEcran();

    await ligne("Courbevoie");
    expect(mockFetchToutes).toHaveBeenCalledWith("fake-token");
  });

  it("affiche toutes les équipes, actives et désactivées, dans l'ordre reçu", async () => {
    renderEcran();
    await ligne("Courbevoie");

    expect(nomsAffiches()).toEqual(["Courbevoie", "Meudon", "Orléans", "Rennes"]);
    expect(screen.getByText("4 équipes")).toBeInTheDocument();
  });

  it("affiche le nom court en ligne principale et le nom complet en dessous", async () => {
    renderEcran();
    const li = await ligne("Courbevoie");

    expect(within(li).getByText("Courbevoie")).toBeInTheDocument();
    const complet = within(li).getByText("Les Coqs de Courbevoie");
    expect(complet).toHaveClass("text-xs");
  });

  it("affiche une équipe sans nom complet sur une seule ligne", async () => {
    renderEcran();
    const li = await ligne("Rennes");

    const noms = within(li).getByText("Rennes").parentElement as HTMLElement;
    expect(noms.children).toHaveLength(1);
  });

  it("indique l'état de chaque équipe", async () => {
    renderEcran();

    expect(within(await ligne("Courbevoie")).getByText("Active")).toBeInTheDocument();
    expect(within(await ligne("Orléans")).getByText("Désactivée")).toBeInTheDocument();
  });

  it("indique le nombre de candidatures quand il est supérieur à zéro, accordé", async () => {
    renderEcran();

    expect(within(await ligne("Courbevoie")).getByText("2 candidatures")).toBeInTheDocument();
    expect(within(await ligne("Meudon")).getByText("1 candidature")).toBeInTheDocument();
    expect(within(await ligne("Rennes")).queryByText(/candidature/)).not.toBeInTheDocument();
  });

  it("affiche le logo seulement quand l'équipe en a un", async () => {
    renderEcran();

    const logo = (await ligne("Meudon")).querySelector("img");
    expect(logo).toHaveAttribute("src", "https://exemple.test/meudon.png");
    expect((await ligne("Rennes")).querySelector("img")).toBeNull();
  });

  it("propose l'action correspondant à l'état : Désactiver ou Activer", async () => {
    renderEcran();
    await ligne("Courbevoie");

    expect(screen.getByRole("button", { name: "Désactiver Courbevoie" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activer Courbevoie" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activer Orléans" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Désactiver Orléans" })).not.toBeInTheDocument();
  });

  it("tronque les noms pour qu'un nom complet très long n'élargisse pas la page", async () => {
    mockFetchToutes.mockResolvedValue([{ ...RENNES, nomComplet: "X".repeat(150) }]);
    renderEcran();
    const li = await ligne("Rennes");

    const noms = within(li).getByText("Rennes").parentElement as HTMLElement;
    expect(noms.className).toContain("[&>span]:truncate");
    expect(noms).toHaveClass("min-w-0");
    expect(li).toHaveClass("min-w-0");
  });

  it("affiche un message quand le référentiel est vide", async () => {
    mockFetchToutes.mockResolvedValue([]);
    renderEcran();

    expect(await screen.findByText("Aucune équipe trouvée.")).toBeInTheDocument();
    expect(screen.getByText("0 équipe")).toBeInTheDocument();
  });

  it("affiche un indicateur pendant le chargement", () => {
    mockFetchToutes.mockReturnValue(new Promise(() => {}));
    renderEcran();

    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("propose de réessayer quand le chargement échoue", async () => {
    mockFetchToutes.mockRejectedValueOnce(new Error("réseau"));
    renderEcran();

    expect(await screen.findByText("Impossible de charger les équipes.")).toBeInTheDocument();

    mockFetchToutes.mockResolvedValue(EQUIPES);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    await ligne("Courbevoie");
    expect(mockFetchToutes).toHaveBeenCalledTimes(2);
  });
});

describe("GestionEquipesReferentiel — recherche et filtre (CA3)", () => {
  const chercher = (texte: string) =>
    fireEvent.change(screen.getByLabelText("Rechercher une équipe"), { target: { value: texte } });
  const filtre = (label: string) =>
    within(screen.getByRole("group", { name: "Filtrer par état" })).getByRole("button", { name: label });

  it("trouve une équipe par son nom complet ou son nom court", async () => {
    renderEcran();
    await ligne("Courbevoie");

    chercher("coqs");
    expect(nomsAffiches()).toEqual(["Courbevoie"]);
    expect(screen.getByText("1 sur 4 équipes")).toBeInTheDocument();

    chercher("courb");
    expect(nomsAffiches()).toEqual(["Courbevoie"]);
  });

  it("ignore la casse et les accents", async () => {
    renderEcran();
    await ligne("Courbevoie");

    chercher("ORLEANS");
    expect(nomsAffiches()).toEqual(["Orléans"]);

    chercher("cometes");
    expect(nomsAffiches()).toEqual(["Meudon"]);
  });

  it("affiche « Aucune équipe trouvée. » pour un texte sans correspondance", async () => {
    renderEcran();
    await ligne("Courbevoie");

    chercher("strasbourg");

    expect(screen.getByText("Aucune équipe trouvée.")).toBeInTheDocument();
    expect(screen.getByText("0 sur 4 équipes")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Modifier / })).not.toBeInTheDocument();
  });

  it("restreint la liste à un état, « Toutes » étant sélectionné par défaut", async () => {
    renderEcran();
    await ligne("Courbevoie");
    expect(filtre("Toutes")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(filtre("Désactivées"));
    expect(nomsAffiches()).toEqual(["Orléans"]);
    expect(filtre("Désactivées")).toHaveAttribute("aria-pressed", "true");
    expect(filtre("Toutes")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(filtre("Actives"));
    expect(nomsAffiches()).toEqual(["Courbevoie", "Meudon", "Rennes"]);
    expect(screen.getByText("3 sur 4 équipes")).toBeInTheDocument();

    fireEvent.click(filtre("Toutes"));
    expect(nomsAffiches()).toHaveLength(4);
  });

  it("combine recherche et filtre d'état", async () => {
    renderEcran();
    await ligne("Courbevoie");

    chercher("les");
    fireEvent.click(filtre("Désactivées"));

    expect(nomsAffiches()).toEqual(["Orléans"]);
  });
});

describe("GestionEquipesReferentiel — modification des noms (CA4, CA5)", () => {
  it("ouvre l'édition d'une équipe avec ses deux champs préremplis et leurs longueurs maximales", async () => {
    renderEcran();
    await ouvrirEdition("Rennes");

    expect(champNom()).toHaveValue("Rennes");
    expect(champNom()).toHaveAttribute("maxLength", "100");
    expect(champNom()).not.toHaveAttribute("readonly");
    expect(champNomComplet()).toHaveValue("");
    expect(champNomComplet()).toHaveAttribute("maxLength", "150");
  });

  it("n'édite qu'une équipe à la fois", async () => {
    renderEcran();
    await ouvrirEdition("Rennes");
    expect(screen.getAllByLabelText("Nom court")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Modifier Meudon" }));

    expect(screen.getAllByLabelText("Nom court")).toHaveLength(1);
    expect(champNom()).toHaveValue("Meudon");
    // Rennes est revenue en lecture.
    expect(screen.getByRole("button", { name: "Modifier Rennes" })).toBeInTheDocument();
  });

  it("garde « Enregistrer » inactif tant que rien n'a changé ou que le nom court est vide", async () => {
    renderEcran();
    await ouvrirEdition("Rennes");
    expect(boutonEnregistrer()).toBeDisabled();

    fireEvent.change(champNom(), { target: { value: "   " } });
    expect(boutonEnregistrer()).toBeDisabled();

    fireEvent.change(champNom(), { target: { value: "Rennes " } });
    expect(boutonEnregistrer()).toBeDisabled();

    fireEvent.change(champNom(), { target: { value: "Rennes Cormorans" } });
    expect(boutonEnregistrer()).toBeEnabled();
  });

  it("enregistre le nom complet seul, sans envoyer le nom court, et met la ligne à jour", async () => {
    mockModifier.mockResolvedValue({ ...RENNES, nomComplet: "Les Cormorans de Rennes" });
    renderEcran();
    await ouvrirEdition("Rennes");
    mockFetchToutes.mockResolvedValue([
      COURBEVOIE,
      MEUDON,
      ORLEANS,
      { ...RENNES, nomComplet: "Les Cormorans de Rennes" },
    ]);

    fireEvent.change(champNomComplet(), { target: { value: "  Les Cormorans de Rennes " } });
    fireEvent.click(boutonEnregistrer());

    await waitFor(() =>
      expect(mockModifier).toHaveBeenCalledWith(
        2,
        { nomComplet: "Les Cormorans de Rennes" },
        "fake-token",
      ),
    );
    // Édition refermée, liste rechargée : la ligne est à jour sans rechargement de page.
    expect(await within(await ligne("Rennes")).findByText("Les Cormorans de Rennes")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nom court")).not.toBeInTheDocument();
    expect(mockFetchToutes).toHaveBeenCalledTimes(2);
  });

  it("envoie nomComplet: null quand le champ est vidé", async () => {
    mockModifier.mockResolvedValue({ ...ORLEANS, nomComplet: null });
    renderEcran();
    await ouvrirEdition("Orléans");

    fireEvent.change(champNomComplet(), { target: { value: "" } });
    fireEvent.click(boutonEnregistrer());

    await waitFor(() =>
      expect(mockModifier).toHaveBeenCalledWith(3, { nomComplet: null }, "fake-token"),
    );
  });

  it("renomme une équipe sans candidature", async () => {
    mockModifier.mockResolvedValue({ ...RENNES, nom: "Rennes Cormorans" });
    renderEcran();
    await ouvrirEdition("Rennes");
    mockFetchToutes.mockResolvedValue([COURBEVOIE, MEUDON, ORLEANS, { ...RENNES, nom: "Rennes Cormorans" }]);

    fireEvent.change(champNom(), { target: { value: "Rennes Cormorans" } });
    fireEvent.click(boutonEnregistrer());

    await waitFor(() =>
      expect(mockModifier).toHaveBeenCalledWith(2, { nom: "Rennes Cormorans" }, "fake-token"),
    );
    expect(await screen.findByRole("button", { name: "Modifier Rennes Cormorans" })).toBeInTheDocument();
  });

  it("« Annuler » referme l'édition sans rien envoyer", async () => {
    renderEcran();
    await ouvrirEdition("Rennes");
    fireEvent.change(champNom(), { target: { value: "Autre" } });

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByLabelText("Nom court")).not.toBeInTheDocument();
    expect(within(await ligne("Rennes")).getByText("Rennes")).toBeInTheDocument();
    expect(mockModifier).not.toHaveBeenCalled();
  });

  it.each([
    [new ServerError(409, "Cette équipe existe déjà"), "Cette équipe existe déjà"],
    [
      new ServerError(400, "Le nom ne doit pas contenir d'emoji"),
      "Le nom ne doit pas contenir d'emoji",
    ],
    [new ServerError(404, "introuvable"), "Cette équipe n'existe plus."],
    [new Error("réseau"), "Erreur lors de l'enregistrement. Réessaie."],
  ])("affiche le motif du refus et conserve la saisie (%s)", async (erreur, message) => {
    mockModifier.mockRejectedValue(erreur);
    renderEcran();
    await ouvrirEdition("Rennes");

    fireEvent.change(champNom(), { target: { value: "Meudon" } });
    fireEvent.change(champNomComplet(), { target: { value: "Saisie à garder" } });
    fireEvent.click(boutonEnregistrer());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(champNom()).toHaveValue("Meudon");
    expect(champNomComplet()).toHaveValue("Saisie à garder");
  });

  it("efface le message d'erreur quand on rouvre une édition", async () => {
    mockModifier.mockRejectedValue(new ServerError(409, "Cette équipe existe déjà"));
    renderEcran();
    await ouvrirEdition("Rennes");
    fireEvent.change(champNom(), { target: { value: "Meudon" } });
    fireEvent.click(boutonEnregistrer());
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    await ouvrirEdition("Meudon");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("suspend les champs et les actions des autres lignes pendant l'enregistrement", async () => {
    mockModifier.mockReturnValue(new Promise(() => {}));
    renderEcran();
    await ouvrirEdition("Rennes");

    fireEvent.change(champNomComplet(), { target: { value: "Les Cormorans" } });
    fireEvent.click(boutonEnregistrer());

    await waitFor(() => expect(boutonEnregistrer()).toHaveTextContent("Enregistrement..."));
    expect(boutonEnregistrer()).toBeDisabled();
    expect(champNom()).toBeDisabled();
    expect(champNomComplet()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Modifier Meudon" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Désactiver Meudon" })).toBeDisabled();
  });
});

describe("GestionEquipesReferentiel — verrou du nom court (CA6)", () => {
  it("met le nom court en lecture seule et explique pourquoi, avec le nombre de candidatures", async () => {
    renderEcran();
    await ouvrirEdition("Courbevoie");

    expect(champNom()).toHaveAttribute("readonly");
    expect(champNom()).toHaveValue("Courbevoie");
    const explication = screen.getByText(
      "Nom court non modifiable : 2 candidatures font référence à cette équipe.",
    );
    expect(champNom()).toHaveAttribute("aria-describedby", explication.id);
  });

  it("accorde l'explication au singulier", async () => {
    renderEcran();
    await ouvrirEdition("Meudon");

    expect(
      screen.getByText("Nom court non modifiable : 1 candidature fait référence à cette équipe."),
    ).toBeInTheDocument();
  });

  it("n'affiche aucune explication de verrou pour une équipe sans candidature", async () => {
    renderEcran();
    await ouvrirEdition("Rennes");

    expect(screen.queryByText(/Nom court non modifiable/)).not.toBeInTheDocument();
    expect(champNom()).not.toHaveAttribute("aria-describedby");
  });

  it("laisse le nom complet modifiable et l'enregistre sans la clé nom", async () => {
    mockModifier.mockResolvedValue({ ...COURBEVOIE, nomComplet: "Coqs HC" });
    renderEcran();
    await ouvrirEdition("Courbevoie");
    expect(champNomComplet()).not.toHaveAttribute("readonly");
    expect(boutonEnregistrer()).toBeDisabled();

    fireEvent.change(champNomComplet(), { target: { value: "Coqs HC" } });
    expect(boutonEnregistrer()).toBeEnabled();
    fireEvent.click(boutonEnregistrer());

    await waitFor(() => expect(mockModifier).toHaveBeenCalledTimes(1));
    const [id, corps] = mockModifier.mock.calls[0];
    expect(id).toBe(1);
    expect(corps).toEqual({ nomComplet: "Coqs HC" });
    expect(corps).not.toHaveProperty("nom");
  });

  it("candidature arrivée pendant l'édition : affiche le refus, recharge la liste, verrouille la ligne et garde la saisie du nom complet", async () => {
    mockModifier.mockRejectedValue(new ServerError(409, MESSAGE_VERROU));
    renderEcran();
    await ouvrirEdition("Rennes");
    // Entre-temps, une candidature a été déposée sur Rennes.
    mockFetchToutes.mockResolvedValue([COURBEVOIE, MEUDON, ORLEANS, { ...RENNES, nbCandidatures: 1 }]);

    fireEvent.change(champNom(), { target: { value: "Rennes Cormorans" } });
    fireEvent.change(champNomComplet(), { target: { value: "Les Cormorans de Rennes" } });
    fireEvent.click(boutonEnregistrer());

    expect(await screen.findByRole("alert")).toHaveTextContent(MESSAGE_VERROU);
    await waitFor(() => expect(champNom()).toHaveAttribute("readonly"));
    expect(mockFetchToutes).toHaveBeenCalledTimes(2);
    // Le nom court revient à sa valeur réelle ; le nom complet saisi n'est pas perdu.
    expect(champNom()).toHaveValue("Rennes");
    expect(champNomComplet()).toHaveValue("Les Cormorans de Rennes");
    expect(
      screen.getByText("Nom court non modifiable : 1 candidature fait référence à cette équipe."),
    ).toBeInTheDocument();

    // Il suffit d'enregistrer à nouveau : seul le nom complet part.
    mockModifier.mockResolvedValue({ ...RENNES, nomComplet: "Les Cormorans de Rennes" });
    fireEvent.click(boutonEnregistrer());
    await waitFor(() =>
      expect(mockModifier).toHaveBeenLastCalledWith(
        2,
        { nomComplet: "Les Cormorans de Rennes" },
        "fake-token",
      ),
    );
  });
});

describe("GestionEquipesReferentiel — activation et désactivation (CA9)", () => {
  it("demande confirmation avant de désactiver, en rappelant l'effet", async () => {
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Rennes" }));

    const dialogue = screen.getByRole("dialog", { name: "Désactiver « Rennes » ?" });
    expect(dialogue).toHaveTextContent(
      "L'équipe ne sera plus proposée aux responsables dans le parcours d'inscription.",
    );
    expect(dialogue).not.toHaveTextContent(/candidature/);
    expect(mockDesactiver).not.toHaveBeenCalled();
  });

  it("mentionne les candidatures, et qu'elles ne sont pas modifiées, quand l'équipe en a", async () => {
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Courbevoie" }));

    const dialogue = screen.getByRole("dialog");
    expect(dialogue).toHaveTextContent("2 candidatures font référence à cette équipe.");
    expect(dialogue).toHaveTextContent("La désactivation ne les modifie pas");
  });

  it("désactive après confirmation, referme le dialogue et recharge la liste", async () => {
    mockDesactiver.mockResolvedValue({ ...RENNES, active: false });
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Rennes" }));
    mockFetchToutes.mockResolvedValue([COURBEVOIE, MEUDON, ORLEANS, { ...RENNES, active: false }]);

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(mockDesactiver).toHaveBeenCalledWith(2, "fake-token"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // L'équipe reste visible dans l'écran, à l'état « Désactivée ».
    expect(await screen.findByRole("button", { name: "Activer Rennes" })).toBeInTheDocument();
    expect(within(await ligne("Rennes")).getByText("Désactivée")).toBeInTheDocument();
  });

  it("annuler la confirmation ne change rien", async () => {
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Rennes" }));

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockDesactiver).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Désactiver Rennes" })).toBeInTheDocument();
  });

  it("active immédiatement, sans confirmation", async () => {
    mockActiver.mockResolvedValue({ ...ORLEANS, active: true });
    renderEcran();
    const bouton = await screen.findByRole("button", { name: "Activer Orléans" });
    mockFetchToutes.mockResolvedValue([COURBEVOIE, MEUDON, { ...ORLEANS, active: true }, RENNES]);

    fireEvent.click(bouton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(mockActiver).toHaveBeenCalledWith(3, "fake-token"));
    expect(await screen.findByRole("button", { name: "Désactiver Orléans" })).toBeInTheDocument();
  });

  it("signale un échec de changement d'état", async () => {
    mockDesactiver.mockRejectedValue(new Error("réseau"));
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Rennes" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le changement d'état n'a pas pu être enregistré. Réessaie.",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("n'appelle jamais la route de modification pour changer l'état", async () => {
    mockDesactiver.mockResolvedValue({ ...RENNES, active: false });
    renderEcran();
    fireEvent.click(await screen.findByRole("button", { name: "Désactiver Rennes" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(mockDesactiver).toHaveBeenCalled());
    expect(mockModifier).not.toHaveBeenCalled();
  });
});

describe("GestionEquipesReferentiel — aide de l'écran (CA12)", () => {
  it("propose une aide repliée par défaut qui explique chaque notion de l'écran", async () => {
    renderEcran();
    await ligne("Courbevoie");

    const resume = screen.getByText("Comment fonctionne cet écran ?");
    const aide = resume.closest("details") as HTMLDetailsElement;
    expect(aide.open).toBe(false);
    for (const titre of [
      "Nom court",
      "Nom complet",
      "Pourquoi un nom court est verrouillé",
      "Désactiver une équipe",
    ]) {
      expect(within(aide).getByText(titre)).toBeInTheDocument();
    }
    expect(aide).toHaveTextContent("sert à retrouver son logo");
    expect(aide).toHaveTextContent("pris en compte par la recherche");
    expect(aide).toHaveTextContent("même refusée");
    expect(aide).toHaveTextContent("script de corrections");
    expect(aide).toHaveTextContent("Les candidatures déjà déposées ne sont pas modifiées");
  });
});
