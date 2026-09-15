import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import EditionAnneesAgeForm from "../EditionAnneesAgeForm";

vi.mock("../../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/inscription")>();
  return { ...actual, ajouterAnneeAge: vi.fn(), retirerAnneeAge: vi.fn() };
});

import * as api from "../../../api/inscription";

function renderForm(anneesAge: number[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EditionAnneesAgeForm editionId={1} anneesAge={anneesAge} token="test-token" />
    </QueryClientProvider>,
  );
}

describe("EditionAnneesAgeForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche les années triées avec un bouton de retrait chacune", () => {
    renderForm([2016, 2014, 2015]);

    const chips = screen.getAllByRole("listitem").map((li) => li.textContent?.trim());
    expect(chips).toEqual(["2014×", "2015×", "2016×"]);
  });

  it("affiche un avertissement quand la liste est vide", () => {
    renderForm([]);

    expect(screen.getByText(/Aucune année configurée/)).toBeInTheDocument();
  });

  it("n'affiche pas l'avertissement quand au moins une année est configurée", () => {
    renderForm([2015]);

    expect(screen.queryByText(/Aucune année configurée/)).not.toBeInTheDocument();
  });

  it("ajoute une année au clic sur le bouton Ajouter et vide le champ après succès", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      anneesAge: [2014, 2015, 2016],
    });
    renderForm([2014, 2015]);

    const input = screen.getByPlaceholderText("Ex: 2015") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2016" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    await waitFor(() =>
      expect(api.ajouterAnneeAge).toHaveBeenCalledWith(1, 2016, "test-token"),
    );
    await waitFor(() => expect(input.value).toBe(""));
  });

  it("ajoute une année en appuyant sur Entrée dans le champ (pas de <form> imbriqué)", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      anneesAge: [2014, 2015, 2016],
    });
    renderForm([2014, 2015]);

    const input = screen.getByPlaceholderText("Ex: 2015");
    fireEvent.change(input, { target: { value: "2016" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() =>
      expect(api.ajouterAnneeAge).toHaveBeenCalledWith(1, 2016, "test-token"),
    );
  });

  it("n'appelle pas ajouterAnneeAge quand le champ est vide", () => {
    renderForm([2014]);

    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(api.ajouterAnneeAge).not.toHaveBeenCalled();
  });

  it("retire une année au clic sur son bouton ×", async () => {
    (api.retirerAnneeAge as ReturnType<typeof vi.fn>).mockResolvedValue({
      anneesAge: [2015],
    });
    renderForm([2014, 2015]);

    fireEvent.click(screen.getByRole("button", { name: "Retirer l'année 2014" }));

    await waitFor(() =>
      expect(api.retirerAnneeAge).toHaveBeenCalledWith(1, 2014, "test-token"),
    );
  });

  it("affiche un message d'erreur quand l'ajout échoue", async () => {
    (api.ajouterAnneeAge as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("boom"));
    renderForm([2014]);

    fireEvent.change(screen.getByPlaceholderText("Ex: 2015"), { target: { value: "2016" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(
      await screen.findByText("Impossible de mettre à jour les années d'âge. Réessaie."),
    ).toBeInTheDocument();
  });
});
