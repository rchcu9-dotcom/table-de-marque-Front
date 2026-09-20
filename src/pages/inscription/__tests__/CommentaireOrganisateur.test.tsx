import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { CommentaireOrganisateur } from "../CommentaireOrganisateur";

describe("CommentaireOrganisateur", () => {
  it("affiche le commentaire enregistré et ne propose pas d'enregistrer tant qu'il n'est pas modifié", () => {
    render(
      <CommentaireOrganisateur candidatureId={4} commentaire="Chèque attendu" onSave={vi.fn()} />,
    );

    expect(screen.getByLabelText("Commentaire organisateur")).toHaveValue("Chèque attendu");
    expect(
      screen.queryByRole("button", { name: "Enregistrer le commentaire" }),
    ).not.toBeInTheDocument();
  });

  it("affiche un champ vide quand aucun commentaire n'existe", () => {
    render(<CommentaireOrganisateur candidatureId={4} commentaire={null} onSave={vi.fn()} />);

    expect(screen.getByLabelText("Commentaire organisateur")).toHaveValue("");
  });

  it("appelle onSave avec l'id et le texte saisi après modification", () => {
    const onSave = vi.fn();
    render(<CommentaireOrganisateur candidatureId={4} commentaire={null} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Commentaire organisateur"), {
      target: { value: "Relancer le coach" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le commentaire" }));

    expect(onSave).toHaveBeenCalledWith(4, "Relancer le coach");
  });

  it("permet d'effacer un commentaire existant (envoi d'une chaîne vide)", () => {
    const onSave = vi.fn();
    render(<CommentaireOrganisateur candidatureId={4} commentaire="À effacer" onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Commentaire organisateur"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer le commentaire" }));

    expect(onSave).toHaveBeenCalledWith(4, "");
  });
});
