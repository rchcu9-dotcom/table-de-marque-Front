import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ChronoDisplay from "../ChronoDisplay";

describe("ChronoDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("format d'affichage", () => {
    it("affiche 00:00 pour 0 secondes écoulées avec chrono arrêté", () => {
      render(
        <ChronoDisplay
          tempsEcouleSecondes={0}
          chronoEnCours={false}
          chronoDerniereMajAt={null}
        />,
      );
      expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("affiche 05:00 pour 300 secondes avec chrono arrêté", () => {
      render(
        <ChronoDisplay
          tempsEcouleSecondes={300}
          chronoEnCours={false}
          chronoDerniereMajAt={null}
        />,
      );
      expect(screen.getByText("05:00")).toBeInTheDocument();
    });

    it("affiche 01:30 pour 90 secondes avec chrono arrêté", () => {
      render(
        <ChronoDisplay
          tempsEcouleSecondes={90}
          chronoEnCours={false}
          chronoDerniereMajAt={null}
        />,
      );
      expect(screen.getByText("01:30")).toBeInTheDocument();
    });

    it("affiche 10:05 pour 605 secondes avec chrono arrêté", () => {
      render(
        <ChronoDisplay
          tempsEcouleSecondes={605}
          chronoEnCours={false}
          chronoDerniereMajAt={null}
        />,
      );
      expect(screen.getByText("10:05")).toBeInTheDocument();
    });
  });

  describe("chrono en cours — recalcul côté client", () => {
    it("affiche le temps de base quand chronoEnCours est false même avec chronoDerniereMajAt", () => {
      render(
        <ChronoDisplay
          tempsEcouleSecondes={120}
          chronoEnCours={false}
          chronoDerniereMajAt={new Date(Date.now() - 10_000).toISOString()}
        />,
      );
      expect(screen.getByText("02:00")).toBeInTheDocument();
    });

    it("utilise la classe text-emerald-400 quand le chrono est en cours", () => {
      const majAt = new Date(Date.now()).toISOString();
      const { container } = render(
        <ChronoDisplay
          tempsEcouleSecondes={0}
          chronoEnCours={true}
          chronoDerniereMajAt={majAt}
        />,
      );
      const span = container.querySelector("span");
      expect(span?.className).toContain("text-emerald-400");
    });

    it("utilise la classe text-slate-300 quand le chrono est arrêté", () => {
      const { container } = render(
        <ChronoDisplay
          tempsEcouleSecondes={60}
          chronoEnCours={false}
          chronoDerniereMajAt={null}
        />,
      );
      const span = container.querySelector("span");
      expect(span?.className).toContain("text-slate-300");
    });
  });
});
