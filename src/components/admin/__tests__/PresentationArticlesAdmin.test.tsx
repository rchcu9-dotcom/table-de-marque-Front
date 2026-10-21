import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import PresentationArticlesAdmin from "../PresentationArticlesAdmin";
import type { PresentationArticle } from "../../../api/presentation";
import { ServerError } from "../../../api/errors";

const ARTICLES: PresentationArticle[] = [
  {
    id: 1, groupe: "Présentation", groupeEn: "Presentation",
    titre: "Résumé", titreEn: "Summary",
    description: "d1", descriptionEn: "d1en",
    surtitre: "", surtitreEn: "", faits: "", faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null, lienUrl: null, lieu: null, mapsQuery: null, ordre: 0,
    groupeOrdre: 0, groupeDureeMs: 5000, groupeImageUrl: null,
  },
  {
    id: 2, groupe: "Présentation", groupeEn: "Presentation",
    titre: "Informations", titreEn: "Informations",
    description: "d2", descriptionEn: "d2en",
    surtitre: "", surtitreEn: "", faits: "", faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null, lienUrl: null, lieu: null, mapsQuery: null, ordre: 1,
    groupeOrdre: 0, groupeDureeMs: 5000, groupeImageUrl: null,
  },
  {
    id: 3, groupe: "Règlement", groupeEn: "Rules",
    titre: "Arbitrages", titreEn: "Arbitrages",
    description: "d3", descriptionEn: "d3en",
    surtitre: "", surtitreEn: "", faits: "", faitsEn: "",
    titreAccroche: "", titreAccrocheEn: "", descriptionCourte: "", descriptionCourteEn: "",
    imageUrl: null, lienUrl: null, lieu: null, mapsQuery: null, ordre: 2,
    groupeOrdre: 1, groupeDureeMs: 7000, groupeImageUrl: "https://x/reglement.png",
  },
];

function renderAdmin(overrides: Partial<React.ComponentProps<typeof PresentationArticlesAdmin>> = {}) {
  const onCreate = vi.fn();
  const onUpdate = vi.fn();
  const onDelete = vi.fn();
  const onDeplacerArticle = vi.fn();
  // Contrat : onUpdateGroupe renvoie une Promise (mutateAsync côté page).
  const onUpdateGroupe = vi.fn().mockResolvedValue(undefined);
  const onDeplacerGroupe = vi.fn();
  const onDeleteGroupe = vi.fn();
  render(
    <PresentationArticlesAdmin
      articles={ARTICLES}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onDelete={onDelete}
      onDeplacerArticle={onDeplacerArticle}
      onUpdateGroupe={onUpdateGroupe}
      onDeplacerGroupe={onDeplacerGroupe}
      onDeleteGroupe={onDeleteGroupe}
      isSaving={false}
      {...overrides}
    />,
  );
  return { onCreate, onUpdate, onDelete, onDeplacerArticle, onUpdateGroupe, onDeplacerGroupe, onDeleteGroupe };
}

describe("PresentationArticlesAdmin", () => {
  it("groups articles by groupe and shows each article's titre", () => {
    renderAdmin();

    expect(screen.getByText("Présentation")).toBeInTheDocument();
    expect(screen.getByText("Règlement")).toBeInTheDocument();
    expect(screen.getByText("Résumé")).toBeInTheDocument();
    expect(screen.getByText("Informations")).toBeInTheDocument();
    expect(screen.getByText("Arbitrages")).toBeInTheDocument();
  });

  it("orders groups by groupeOrdre rather than order of appearance in the flat article list", () => {
    // "Règlement" (groupeOrdre 1) appears after "Présentation" (groupeOrdre 0) in ARTICLES already,
    // so exercise the sort by reversing groupeOrdre to make sure it actually drives the order.
    const reordered = ARTICLES.map((a) =>
      a.groupe === "Présentation" ? { ...a, groupeOrdre: 5 } : a,
    );
    renderAdmin({ articles: reordered });

    const headings = screen.getAllByRole("heading", { level: 4 }).map((el) => el.textContent);
    expect(headings).toEqual(["Règlement", "Présentation"]);
  });

  it("deletes an article by id when Supprimer is clicked", () => {
    const { onDelete } = renderAdmin();

    const row = screen.getByText("Arbitrages").closest("div")!;
    fireEvent.click(within(row).getByText("Supprimer"));

    expect(onDelete).toHaveBeenCalledWith(3);
  });

  it("opens an edit form pre-filled with the article's values on Modifier, and submits the update", () => {
    const { onUpdate } = renderAdmin();

    const row = screen.getByText("Résumé").closest("div")!;
    fireEvent.click(within(row).getByText("Modifier"));

    const titreInput = screen.getByDisplayValue("Résumé");
    fireEvent.change(titreInput, { target: { value: "Résumé modifié" } });
    fireEvent.click(screen.getByText("Enregistrer"));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [id, payload] = onUpdate.mock.calls[0];
    expect(id).toBe(1);
    expect(payload.titre).toBe("Résumé modifié");
    expect(payload.groupe).toBe("Présentation");
  });

  it("creates a new article inside an existing group via its + button", () => {
    const { onCreate } = renderAdmin();

    fireEvent.click(screen.getByText('+ Ajouter un article dans « Règlement »'));
    const titreInputs = screen.getAllByRole("textbox");
    // Le champ Titre du formulaire d'ajout est vide — on cible via le label associé.
    const form = screen.getByText("Créer").closest("form")!;
    const titreField = within(form).getAllByLabelText(/^Titre$/i)[0];
    fireEvent.change(titreField, { target: { value: "Nouvel article" } });
    fireEvent.click(within(form).getByText("Créer"));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toMatchObject({ groupe: "Règlement", titre: "Nouvel article" });
    expect(titreInputs.length).toBeGreaterThan(0);
  });

  it("creates a brand new group via the global add button", () => {
    const { onCreate } = renderAdmin();

    fireEvent.click(screen.getByText("+ Ajouter un nouveau groupe"));
    const form = screen.getByText("Créer").closest("form")!;
    fireEvent.change(within(form).getAllByLabelText(/^Groupe$/i)[0], { target: { value: "Médias" } });
    fireEvent.change(within(form).getAllByLabelText(/^Titre$/i)[0], { target: { value: "Instagram" } });
    fireEvent.click(within(form).getByText("Créer"));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0]).toMatchObject({ groupe: "Médias", titre: "Instagram" });
  });

  describe("group ordering and article ordering controls", () => {
    it("disables the 'up' button on the first group and the 'down' button on the last group", () => {
      renderAdmin();

      expect(screen.getAllByLabelText("Monter le chapitre")[0]).toBeDisabled();
      expect(screen.getAllByLabelText("Descendre le chapitre").at(-1)).toBeDisabled();
    });

    it("moves a group down when its down button is clicked", () => {
      const { onDeplacerGroupe } = renderAdmin();

      const presentationHeading = screen.getByText("Présentation").closest("div")!;
      fireEvent.click(within(presentationHeading).getByLabelText("Descendre le chapitre"));

      expect(onDeplacerGroupe).toHaveBeenCalledWith("Présentation", "bas");
    });

    it("disables per-article up/down buttons at the boundaries of their group", () => {
      renderAdmin();

      const resumeRow = screen.getByText("Résumé").closest("div")!;
      expect(within(resumeRow).getByLabelText("Monter l'article")).toBeDisabled();

      const infoRow = screen.getByText("Informations").closest("div")!;
      expect(within(infoRow).getByLabelText("Descendre l'article")).toBeDisabled();
    });

    it("moves an article up within its group", () => {
      const { onDeplacerArticle } = renderAdmin();

      const infoRow = screen.getByText("Informations").closest("div")!;
      fireEvent.click(within(infoRow).getByLabelText("Monter l'article"));

      expect(onDeplacerArticle).toHaveBeenCalledWith(2, "haut");
    });
  });

  describe("group meta editing", () => {
    it("opens the group meta form pre-filled with the current duree/image, and submits the update", async () => {
      const { onUpdateGroupe } = renderAdmin();

      const reglementHeading = screen.getByText("Règlement").closest("div")!;
      fireEvent.click(within(reglementHeading).getByText("Modifier le chapitre"));

      expect(screen.getByDisplayValue("Règlement")).toBeInTheDocument();
      expect(screen.getByDisplayValue("7000")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://x/reglement.png")).toBeInTheDocument();

      fireEvent.change(screen.getByDisplayValue("7000"), { target: { value: "9000" } });
      fireEvent.click(screen.getByText("Enregistrer le chapitre"));

      expect(onUpdateGroupe).toHaveBeenCalledWith("Règlement", {
        nom: "Règlement",
        nomEn: "Rules",
        dureeMs: 9000,
        imageUrl: "https://x/reglement.png",
      });
      // Le formulaire ne se ferme qu'une fois la Promise d'enregistrement résolue.
      await waitFor(() => expect(screen.queryByText("Enregistrer le chapitre")).not.toBeInTheDocument());
    });

    it("closes the group meta form on Annuler without calling onUpdateGroupe", () => {
      const { onUpdateGroupe } = renderAdmin();

      const reglementHeading = screen.getByText("Règlement").closest("div")!;
      fireEvent.click(within(reglementHeading).getByText("Modifier le chapitre"));
      fireEvent.click(screen.getByText("Annuler"));

      expect(onUpdateGroupe).not.toHaveBeenCalled();
      expect(screen.queryByText("Enregistrer le chapitre")).not.toBeInTheDocument();
    });
  });

  describe("contrôle de l'image de chapitre", () => {
    const API = "http://localhost:3000"; // __APP_API_BASE_URL__ (tests/unit/setup.ts)
    const SCHEME_MESSAGE = "L'URL de l'image doit commencer par http:// ou https://.";
    const LENGTH_MESSAGE = "L'URL de l'image ne doit pas dépasser 500 caractères.";

    function openReglementForm(overrides: Parameters<typeof renderAdmin>[0] = {}) {
      const handlers = renderAdmin(overrides);
      const reglementHeading = screen.getByText("Règlement").closest("div")!;
      fireEvent.click(within(reglementHeading).getByText("Modifier le chapitre"));
      return handlers;
    }

    const imageInput = () => screen.getByTestId("groupe-image-input");
    const setImage = (value: string) => fireEvent.change(imageInput(), { target: { value } });
    const submit = () => fireEvent.click(screen.getByText("Enregistrer le chapitre"));

    it("renders the image field as a URL input capped at the column length", () => {
      openReglementForm();

      expect(imageInput()).toHaveAttribute("type", "url");
      expect(imageInput()).toHaveAttribute("maxLength", "500");
      expect(imageInput()).not.toHaveAttribute("aria-invalid");
    });

    it("closes the form only once the update has succeeded", async () => {
      const { onUpdateGroupe } = openReglementForm();

      submit();

      expect(onUpdateGroupe).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(screen.queryByText("Enregistrer le chapitre")).not.toBeInTheDocument());
    });

    it("sends null when the image field is cleared (removes the chapter image)", async () => {
      const { onUpdateGroupe } = openReglementForm();

      setImage("   ");
      submit();

      await waitFor(() =>
        expect(onUpdateGroupe).toHaveBeenCalledWith("Règlement", expect.objectContaining({ imageUrl: null })),
      );
    });

    it("blocks a non-http(s) URL locally, without calling the API, and flags the field", () => {
      const { onUpdateGroupe } = openReglementForm();

      setImage("javascript:alert(1)");
      submit();

      expect(onUpdateGroupe).not.toHaveBeenCalled();
      const error = screen.getByTestId("groupe-image-error");
      expect(error).toHaveTextContent(SCHEME_MESSAGE);
      expect(error).toHaveAttribute("role", "alert");
      expect(imageInput()).toHaveAttribute("aria-invalid", "true");
      expect(imageInput()).toHaveAttribute("aria-describedby", error.id);
      expect(screen.getByText("Enregistrer le chapitre")).toBeInTheDocument();
    });

    it("blocks an URL longer than 500 characters locally", () => {
      const { onUpdateGroupe } = openReglementForm();

      setImage(`https://cdn.example.com/${"a".repeat(480)}`);
      submit();

      expect(onUpdateGroupe).not.toHaveBeenCalled();
      expect(screen.getByTestId("groupe-image-error")).toHaveTextContent(LENGTH_MESSAGE);
    });

    it("clears the local error as soon as the field is edited", () => {
      openReglementForm();

      setImage("javascript:alert(1)");
      submit();
      expect(screen.getByTestId("groupe-image-error")).toBeInTheDocument();

      setImage("https://cdn.example.com/ok.jpg");

      expect(screen.queryByTestId("groupe-image-error")).not.toBeInTheDocument();
      expect(imageInput()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps the form open and shows the server message when the update is rejected (400)", async () => {
      const onUpdateGroupe = vi
        .fn()
        .mockRejectedValue(new ServerError(400, "L'URL de l'image ne doit pas dépasser 500 caractères."));
      openReglementForm({ onUpdateGroupe });

      submit();

      expect(await screen.findByTestId("groupe-image-error")).toHaveTextContent(LENGTH_MESSAGE);
      expect(screen.getByText("Enregistrer le chapitre")).toBeInTheDocument();
      // La saisie n'est pas perdue : l'organisateur peut corriger.
      expect(imageInput()).toHaveValue("https://x/reglement.png");
    });

    it("shows a generic message when the update fails for a non-server reason", async () => {
      const onUpdateGroupe = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
      openReglementForm({ onUpdateGroupe });

      submit();

      expect(await screen.findByTestId("groupe-image-error")).toHaveTextContent(
        "Enregistrement impossible, réessayez.",
      );
    });

    it("clears the server error when the form is closed and reopened", async () => {
      const onUpdateGroupe = vi.fn().mockRejectedValue(new ServerError(400, "refusé"));
      openReglementForm({ onUpdateGroupe });
      submit();
      await screen.findByTestId("groupe-image-error");

      fireEvent.click(screen.getByText("Annuler"));
      fireEvent.click(within(screen.getByText("Règlement").closest("div")!).getByText("Modifier le chapitre"));

      expect(screen.queryByTestId("groupe-image-error")).not.toBeInTheDocument();
    });

    it("succeeds on a second attempt after a server error, then closes", async () => {
      const onUpdateGroupe = vi
        .fn()
        .mockRejectedValueOnce(new ServerError(400, "refusé"))
        .mockResolvedValueOnce(undefined);
      openReglementForm({ onUpdateGroupe });

      submit();
      await screen.findByTestId("groupe-image-error");
      submit();

      await waitFor(() => expect(screen.queryByText("Enregistrer le chapitre")).not.toBeInTheDocument());
      expect(onUpdateGroupe).toHaveBeenCalledTimes(2);
    });

    describe("aperçu", () => {
      it("previews a plain http(s) URL as is", () => {
        openReglementForm();

        const preview = screen.getByTestId("groupe-image-preview");
        expect(preview).toHaveAttribute("src", "https://x/reglement.png");
        expect(preview).toHaveAttribute("alt", "Aperçu de l'image du chapitre");
      });

      it("previews a Drive share link through the back relay", () => {
        openReglementForm();

        setImage("https://drive.google.com/file/d/DRIVE_ID/view?usp=sharing");

        expect(screen.getByTestId("groupe-image-preview")).toHaveAttribute(
          "src",
          `${API}/presentation/image/DRIVE_ID?w=400`,
        );
      });

      it.each([
        ["vide", ""],
        ["invalide", "javascript:alert(1)"],
      ])("shows no preview for an %s URL", (_label, value) => {
        openReglementForm();

        setImage(value);

        expect(screen.queryByTestId("groupe-image-preview")).not.toBeInTheDocument();
      });

      it("replaces a preview that fails to load by a Drive sharing hint, re-armed when the URL changes", () => {
        openReglementForm();

        fireEvent.error(screen.getByTestId("groupe-image-preview"));
        expect(screen.queryByTestId("groupe-image-preview")).not.toBeInTheDocument();
        expect(screen.getByTestId("groupe-image-preview-error")).toHaveTextContent(/partagé/);

        setImage("https://cdn.example.com/autre.jpg");

        expect(screen.queryByTestId("groupe-image-preview-error")).not.toBeInTheDocument();
        expect(screen.getByTestId("groupe-image-preview")).toHaveAttribute("src", "https://cdn.example.com/autre.jpg");
      });
    });
  });

  describe("group deletion", () => {
    it("deletes a non-empty group only after confirmation", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const { onDeleteGroupe } = renderAdmin();

      const reglementHeading = screen.getByText("Règlement").closest("div")!;
      fireEvent.click(within(reglementHeading).getByText("Supprimer le chapitre"));

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining("Règlement"),
      );
      expect(onDeleteGroupe).toHaveBeenCalledWith("Règlement");
      confirmSpy.mockRestore();
    });

    it("does not delete a non-empty group when the confirmation is dismissed", () => {
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
      const { onDeleteGroupe } = renderAdmin();

      const reglementHeading = screen.getByText("Règlement").closest("div")!;
      fireEvent.click(within(reglementHeading).getByText("Supprimer le chapitre"));

      expect(onDeleteGroupe).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
});
