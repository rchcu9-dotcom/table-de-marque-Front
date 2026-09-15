import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import ChronoEditForm from "../ChronoEditForm";

vi.mock("../../../api/tableDeMarque", () => ({
  editerChrono: vi.fn(),
}));

import * as api from "../../../api/tableDeMarque";

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderForm(tempsActuel = 125) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ChronoEditForm numMatch={1} tempsActuel={tempsActuel} token="test-token" />, {
    wrapper: makeWrapper(qc),
  });
}

describe("ChronoEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pré-remplit le champ avec tempsActuel formaté en MM:SS", () => {
    renderForm(125);
    expect(screen.getByPlaceholderText("MM:SS")).toHaveValue("02:05");
  });

  it("soumet le chrono converti en secondes au format valide", async () => {
    renderForm(125);

    fireEvent.change(screen.getByPlaceholderText("MM:SS"), { target: { value: "05:30" } });
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

    await waitFor(() =>
      expect(api.editerChrono).toHaveBeenCalledWith(1, 330, "test-token"),
    );
  });

  it("n'appelle pas editerChrono pour une saisie invalide (secondes > 59)", () => {
    renderForm(125);

    fireEvent.change(screen.getByPlaceholderText("MM:SS"), { target: { value: "05:99" } });
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(api.editerChrono).not.toHaveBeenCalled();
  });

  it("n'appelle pas editerChrono pour une saisie sans séparateur", () => {
    renderForm(125);

    fireEvent.change(screen.getByPlaceholderText("MM:SS"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));

    expect(api.editerChrono).not.toHaveBeenCalled();
  });
});
