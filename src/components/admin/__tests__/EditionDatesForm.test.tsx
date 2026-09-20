import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import EditionDatesForm from "../EditionDatesForm";

describe("EditionDatesForm", () => {
  const values = {
    dateDebut: "2026-05-23T00:00:00",
    dateFinDebut: "2026-05-24T23:59:59",
  };

  it("s'intitule « Dates du tournoi » et n'expose plus « Fin des inscriptions »", () => {
    render(<EditionDatesForm values={values} errors={[]} onChange={vi.fn()} />);

    expect(screen.getByText("Dates du tournoi")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fin des inscriptions")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Début du tournoi")).toHaveValue("2026-05-23");
    expect(screen.getByLabelText("Fin du tournoi")).toHaveValue("2026-05-24");
  });

  it("propage les modifications de dates avec l'heure attendue", () => {
    const onChange = vi.fn();
    render(<EditionDatesForm values={values} errors={[]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Début du tournoi"), {
      target: { value: "2026-05-30" },
    });
    fireEvent.change(screen.getByLabelText("Fin du tournoi"), {
      target: { value: "2026-05-31" },
    });

    expect(onChange).toHaveBeenCalledWith("dateDebut", "2026-05-30T00:00:00");
    expect(onChange).toHaveBeenCalledWith("dateFinDebut", "2026-05-31T23:59:59");
  });

  it("affiche l'erreur de validation de la fin du tournoi", () => {
    render(
      <EditionDatesForm
        values={values}
        errors={[{ field: "dateFinDebut", message: "Fin avant début." }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Fin avant début.")).toBeInTheDocument();
  });
});
