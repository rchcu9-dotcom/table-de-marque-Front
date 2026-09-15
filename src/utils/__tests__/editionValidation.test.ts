import { describe, it, expect } from "vitest";
import { validateEditionForm } from "../editionValidation";
import type { UpdateEditionPayload } from "../../api/inscription";

describe("validateEditionForm", () => {
  it("ne renvoie aucune erreur pour un payload valide", () => {
    const payload: UpdateEditionPayload = {
      dateDebut: "2026-04-01T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
      dateFinFin: "2026-05-10T23:59:59",
      fraisInscription: 120,
      prixRepas: 12,
      nbPlacesMax: 16,
    };
    expect(validateEditionForm(payload)).toEqual([]);
  });

  it("ne renvoie aucune erreur quand les champs optionnels sont absents", () => {
    expect(validateEditionForm({})).toEqual([]);
  });

  it.each([
    ["fraisInscription", { fraisInscription: -1 }],
    ["prixRepas", { prixRepas: -0.5 }],
    ["nbPlacesMax", { nbPlacesMax: -1 }],
  ] as const)("signale %s négatif", (field, partial) => {
    const errors = validateEditionForm(partial as UpdateEditionPayload);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe(field);
  });

  it.each([
    ["nom", { nom: "  " }, "Le nom du tournoi ne peut pas être vide."],
    ["categorie", { categorie: "" }, "La catégorie ne peut pas être vide."],
  ] as const)("signale %s vide (ou uniquement des espaces)", (field, partial, message) => {
    const errors = validateEditionForm(partial as UpdateEditionPayload);
    expect(errors).toEqual([{ field, message }]);
  });

  it("accepte un nom et une catégorie non vides", () => {
    expect(validateEditionForm({ nom: "RCHC U11 2026", categorie: "U11" })).toEqual([]);
  });

  it("accepte un montant à zéro (limite basse valide)", () => {
    expect(
      validateEditionForm({ fraisInscription: 0, prixRepas: 0, nbPlacesMax: 0 }),
    ).toEqual([]);
  });

  it("signale dateFinDebut antérieure à dateDebut", () => {
    const errors = validateEditionForm({
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
    });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("dateFinDebut");
  });

  // Contraintes croisées impliquant dateFinFin retirées (décision : ne garder que
  // dateDebut ≤ dateFinDebut) — cf. docs/specs. Les deux cas ci-dessous vérifient que ce
  // retrait est bien effectif, pas une régression vers l'ancien comportement.
  it("n'signale plus dateFinFin antérieure à dateFinDebut (contrainte retirée)", () => {
    const errors = validateEditionForm({
      dateFinDebut: "2026-05-10T23:59:59",
      dateFinFin: "2026-05-05T23:59:59",
    });
    expect(errors).toEqual([]);
  });

  it("n'signale plus dateFinFin antérieure à dateDebut (contrainte retirée)", () => {
    const errors = validateEditionForm({
      dateDebut: "2026-05-23T00:00:00",
      dateFinFin: "2026-05-01T23:59:59",
    });
    expect(errors).toEqual([]);
  });

  it("accepte des dates égales (fenêtre d'un seul jour)", () => {
    expect(
      validateEditionForm({
        dateDebut: "2026-05-23T00:00:00",
        dateFinDebut: "2026-05-23T00:00:00",
        dateFinFin: "2026-05-23T00:00:00",
      }),
    ).toEqual([]);
  });

  it("cumule plusieurs erreurs indépendantes", () => {
    const errors = validateEditionForm({
      fraisInscription: -10,
      nbPlacesMax: -1,
      dateDebut: "2026-05-23T00:00:00",
      dateFinDebut: "2026-05-01T23:59:59",
    });
    const fields = errors.map((e) => e.field).sort();
    expect(fields).toEqual(["dateFinDebut", "fraisInscription", "nbPlacesMax"]);
  });
});
