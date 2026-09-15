import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import EditionMessagesAccordion from "../EditionMessagesAccordion";

function renderOpen() {
  const onChange = vi.fn();
  render(<EditionMessagesAccordion values={{}} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: /Messages du parcours d'inscription/ }));
  return { onChange };
}

describe("EditionMessagesAccordion — hint {{frais}} (CA8)", () => {
  it("affiche un texte d'aide sous le champ « Message paiement attendu » mentionnant {{frais}}", () => {
    renderOpen();

    expect(
      screen.getByText(/Le jeton \{\{frais\}\} sera remplacé par le tarif d'inscription/),
    ).toBeInTheDocument();
  });

  it("n'affiche pas de texte d'aide pour les autres champs (ex. « Message liste d'attente »)", () => {
    renderOpen();

    const labelListeAttente = screen.getByText("Message liste d'attente");
    const label = labelListeAttente.closest("label");
    expect(label?.querySelector("span.italic")).toBeNull();
  });
});
