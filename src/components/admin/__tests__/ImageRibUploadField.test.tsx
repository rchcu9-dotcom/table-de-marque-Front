import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import ImageRibUploadField from "../ImageRibUploadField";

vi.mock("../../../api/inscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../api/inscription")>();
  return { ...actual, uploadImageRib: vi.fn(), deleteImageRib: vi.fn() };
});

import * as api from "../../../api/inscription";

function renderField(props: Partial<React.ComponentProps<typeof ImageRibUploadField>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ImageRibUploadField
        editionId={1}
        token="test-token"
        hasImageRib={false}
        imageRibUrlFallback={null}
        {...props}
      />
    </QueryClientProvider>,
  );
}

function makeFile(name = "rib.png", type = "image/png") {
  return new File(["fake-bytes"], name, { type });
}

describe("ImageRibUploadField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche l'aperçu de l'image et le bouton Supprimer quand hasImageRib est vrai (AC2)", () => {
    renderField({ hasImageRib: true, imageRibUpdatedAt: "2026-09-16T00:00:00.000Z" });

    const img = screen.getByAltText("Aperçu du RIB");
    expect(img).toHaveAttribute(
      "src",
      expect.stringContaining("/inscription/editions/1/image-rib?v="),
    );
    expect(screen.getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
  });

  it("affiche le repli URL legacy quand hasImageRib est faux mais qu'une URL existe déjà", () => {
    renderField({ hasImageRib: false, imageRibUrlFallback: "https://example.com/rib.pdf" });

    const link = screen.getByRole("link", { name: "https://example.com/rib.pdf" });
    expect(link).toHaveAttribute("href", "https://example.com/rib.pdf");
    expect(screen.queryByAltText("Aperçu du RIB")).not.toBeInTheDocument();
  });

  it("n'affiche ni aperçu ni repli quand aucune image n'est configurée (AC5)", () => {
    renderField({ hasImageRib: false, imageRibUrlFallback: null });

    expect(screen.queryByAltText("Aperçu du RIB")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("envoie le fichier sélectionné immédiatement (upload déclenché au onChange, AC2)", async () => {
    (api.uploadImageRib as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      hasImageRib: true,
    });
    renderField();

    const input = screen.getByLabelText("Choisir une image") as HTMLInputElement;
    const file = makeFile();
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(api.uploadImageRib).toHaveBeenCalledWith(1, file, "test-token"),
    );
  });

  it("affiche un message d'erreur explicite si l'upload échoue", async () => {
    (api.uploadImageRib as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));
    renderField();

    const input = screen.getByLabelText("Choisir une image") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });

    expect(
      await screen.findByText("Échec de l'envoi de l'image. Réessaie."),
    ).toBeInTheDocument();
  });

  it("appelle deleteImageRib au clic sur Supprimer (AC6)", async () => {
    (api.deleteImageRib as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      hasImageRib: false,
    });
    renderField({ hasImageRib: true, imageRibUpdatedAt: "2026-09-16T00:00:00.000Z" });

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(api.deleteImageRib).toHaveBeenCalledWith(1, "test-token"));
  });

  it("affiche un message d'erreur explicite si la suppression échoue", async () => {
    (api.deleteImageRib as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network"));
    renderField({ hasImageRib: true, imageRibUpdatedAt: "2026-09-16T00:00:00.000Z" });

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(
      await screen.findByText("Échec de la suppression de l'image. Réessaie."),
    ).toBeInTheDocument();
  });
});
