import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ConfirmModal from "../ConfirmModal";

function renderModal(overrides: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) {
  const props = {
    title: "Titre ?",
    message: "Corps du message",
    confirmingLabel: "En cours…",
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    submitting: false,
    ...overrides,
  };
  render(<ConfirmModal {...props} />);
  return props;
}

describe("ConfirmModal", () => {
  it("expose une boîte de dialogue nommée par son titre", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Titre ?" })).toBeInTheDocument();
    expect(screen.getByText("Corps du message")).toBeInTheDocument();
  });

  it("accepte un contenu riche (ReactNode) comme message", () => {
    renderModal({ message: <ul><li>Point A</li><li>Point B</li></ul> });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("appelle onConfirm / onClose au clic", () => {
    const props = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Confirmer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it("désactive les deux boutons et affiche confirmingLabel pendant l'envoi", () => {
    renderModal({ submitting: true });

    expect(screen.getByRole("button", { name: "En cours…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeDisabled();
  });
});
