import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import TournoiInfosHeader from "../TournoiInfosHeader";
import TournoiInfosPdfButton from "../TournoiInfosPdfButton";
import TournoiInfosPrintFooter from "../TournoiInfosPrintFooter";
import { TOURNOI_INFOS_LABELS } from "../../../utils/tournoiInfosLabels";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TournoiInfosPdfButton", () => {
  it("ouvre la boîte d'impression du navigateur (CA5)", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<TournoiInfosPdfButton label="Télécharger en PDF" disabled={false} />);

    const bouton = screen.getByTestId("tournoi-infos-pdf");
    expect(bouton).toHaveClass("no-print");
    fireEvent.click(bouton);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("n'imprime pas quand il est désactivé", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<TournoiInfosPdfButton label="Télécharger en PDF" disabled />);

    const bouton = screen.getByTestId("tournoi-infos-pdf");
    expect(bouton).toBeDisabled();
    fireEvent.click(bouton);
    expect(print).not.toHaveBeenCalled();
  });
});

describe("TournoiInfosHeader", () => {
  function renderHeader(props: Partial<React.ComponentProps<typeof TournoiInfosHeader>> = {}) {
    const onLangChange = vi.fn();
    render(
      <TournoiInfosHeader
        title="Tournoi RCHC U11"
        subtitle="23 mai - 24 mai · Le Blizz"
        lang="fr"
        onLangChange={onLangChange}
        labels={TOURNOI_INFOS_LABELS.fr}
        printDisabled={false}
        {...props}
      />,
    );
    return { onLangChange };
  }

  it("affiche le titre en h1 et la ligne dates · lieu", () => {
    renderHeader();

    expect(screen.getByRole("heading", { level: 1, name: "Tournoi RCHC U11" })).toBeInTheDocument();
    expect(screen.getByText("23 mai - 24 mai · Le Blizz")).toBeInTheDocument();
  });

  it("n'affiche pas de sous-titre vide", () => {
    renderHeader({ subtitle: "" });
    expect(document.querySelector(".tournoi-infos-subtitle")).toBeNull();
  });

  it("place le toggle de langue, le bouton PDF et son aide dans un bloc .no-print (CA5)", () => {
    renderHeader();

    const toggle = screen.getByTestId("presentation-language-toggle");
    const actions = toggle.closest(".no-print") as HTMLElement;
    expect(actions).not.toBeNull();
    expect(within(actions).getByTestId("tournoi-infos-pdf")).toHaveTextContent("Télécharger en PDF");
    expect(within(actions).getByTestId("tournoi-infos-pdf-help")).toHaveTextContent(
      "Enregistrer au format PDF",
    );
  });

  it("transmet le changement de langue", () => {
    const { onLangChange } = renderHeader();

    fireEvent.click(screen.getByTestId("presentation-language-en"));
    expect(onLangChange).toHaveBeenCalledWith("en");
  });

  it("désactive le bouton PDF quand demandé", () => {
    renderHeader({ printDisabled: true });
    expect(screen.getByTestId("tournoi-infos-pdf")).toBeDisabled();
  });

  it("utilise les libellés anglais", () => {
    renderHeader({ lang: "en", labels: TOURNOI_INFOS_LABELS.en });
    expect(screen.getByTestId("tournoi-infos-pdf")).toHaveTextContent("Download PDF");
    expect(screen.getByTestId("presentation-language-en")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("TournoiInfosPrintFooter", () => {
  const now = new Date("2026-10-20T12:00:00Z");

  it("indique la source et la date du document, en français", () => {
    render(
      <TournoiInfosPrintFooter
        lang="fr"
        labels={TOURNOI_INFOS_LABELS.fr}
        sourceUrl="https://tournoi.rchc.fr/tournoi/infos"
        now={now}
      />,
    );

    expect(screen.getByTestId("tournoi-infos-print-footer")).toHaveTextContent(
      "Document issu de https://tournoi.rchc.fr/tournoi/infos — informations à jour au 20 octobre 2026.",
    );
  });

  it("indique la source et la date du document, en anglais", () => {
    render(
      <TournoiInfosPrintFooter lang="en" labels={TOURNOI_INFOS_LABELS.en} sourceUrl="https://x.fr/tournoi/infos" now={now} />,
    );

    expect(screen.getByTestId("tournoi-infos-print-footer")).toHaveTextContent(
      "Document from https://x.fr/tournoi/infos — information as of 20 October 2026.",
    );
  });

  it("prend par défaut l'adresse publique de la page", () => {
    render(<TournoiInfosPrintFooter lang="fr" labels={TOURNOI_INFOS_LABELS.fr} now={now} />);

    expect(screen.getByTestId("tournoi-infos-print-footer")).toHaveTextContent(
      `${window.location.origin}/tournoi/infos`,
    );
  });
});
