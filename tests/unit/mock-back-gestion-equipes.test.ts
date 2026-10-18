// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — CA13
// Le scénario Playwright de l'écran de gestion des équipes repose sur le mode
// « organisateur » du faux back. Ces tests vérifient que ses règles « miroir » se
// comportent comme le vrai back (update-equipe-referentiel.usecase.ts) : sans eux, un
// faux back trop permissif ferait passer le scénario à tort.

const PORT = 4018;
const BASE = `http://localhost:${PORT}`;
const MESSAGE_VERROU =
  "Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe";

const EQUIPES = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", nbCandidatures: 2 },
  { id: 2, nom: "Rennes", nomComplet: null },
  { id: 7, nom: "Ancienne", active: false },
];

async function appel(methode: string, chemin: string, corps?: unknown) {
  const res = await fetch(`${BASE}${chemin}`, {
    method: methode,
    headers: { "Content-Type": "application/json", Authorization: "Bearer jeton" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const modifier = (id: number, corps: unknown) => appel("PATCH", `/inscription/equipes/${id}`, corps);
const toutes = async () =>
  (await (await fetch(`${BASE}/inscription/equipes/toutes`)).json()) as Record<string, unknown>[];

describe("Faux back — gestion des équipes (mode organisateur)", () => {
  let mock: MockBackHandle;

  beforeEach(async () => {
    mock = await startMockBack(PORT, {
      organisateur: true,
      editionEtape: "CLOTUREE",
      equipes: EQUIPES,
    });
  });

  afterEach(async () => {
    await mock.close();
  });

  it("GET /equipes/toutes : toutes les équipes, désactivées comprises, avec nbCandidatures", async () => {
    expect(await toutes()).toEqual([
      {
        id: 1,
        nom: "Courbevoie",
        nomComplet: "Les Coqs de Courbevoie",
        logoUrl: null,
        active: true,
        nbCandidatures: 2,
      },
      { id: 2, nom: "Rennes", nomComplet: null, logoUrl: null, active: true, nbCandidatures: 0 },
      { id: 7, nom: "Ancienne", nomComplet: null, logoUrl: null, active: false, nbCandidatures: 0 },
    ]);
  });

  it("modifie le nom complet d'une équipe verrouillée, sans toucher au nom court", async () => {
    const res = await modifier(1, { nomComplet: "  Coqs   HC " });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nom: "Courbevoie", nomComplet: "Coqs HC", nbCandidatures: 2 });
    expect((await toutes())[0]).toMatchObject({ nom: "Courbevoie", nomComplet: "Coqs HC" });
  });

  it.each([null, "", "   ", "Courbevoie"])("efface le nom complet (%p)", async (valeur) => {
    const res = await modifier(1, { nomComplet: valeur });

    expect(res.status).toBe(200);
    expect(res.body.nomComplet).toBeNull();
  });

  it("ne touche pas au nom complet quand la clé est absente", async () => {
    const res = await modifier(1, {});

    expect(res.status).toBe(200);
    expect(res.body.nomComplet).toBe("Les Coqs de Courbevoie");
  });

  it("refuse en 409 le renommage d'une équipe référencée, et ne modifie rien", async () => {
    const res = await modifier(1, { nom: "Rennes Coqs", nomComplet: "Autre" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(MESSAGE_VERROU);
    expect((await toutes())[0]).toMatchObject({
      nom: "Courbevoie",
      nomComplet: "Les Coqs de Courbevoie",
    });
  });

  it("accepte le nom court inchangé sur une équipe référencée", async () => {
    const res = await modifier(1, { nom: "Courbevoie", nomComplet: "Coqs HC" });

    expect(res.status).toBe(200);
    expect(res.body.nomComplet).toBe("Coqs HC");
  });

  it("bloque aussi un simple changement de casse sur une équipe référencée", async () => {
    expect((await modifier(1, { nom: "COURBEVOIE" })).status).toBe(409);
  });

  it("renomme une équipe sans candidature, espaces normalisés", async () => {
    const res = await modifier(2, { nom: "  Rennes   Cormorans " });

    expect(res.status).toBe(200);
    expect(res.body.nom).toBe("Rennes Cormorans");
  });

  it("refuse en 409 un nom court déjà porté par une autre équipe, casse ignorée", async () => {
    const res = await modifier(2, { nom: "courbevoie" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Cette équipe existe déjà");
    expect((await toutes())[1].nom).toBe("Rennes");
  });

  it("autorise un changement de casse sur la même ligne (pas un doublon avec elle-même)", async () => {
    expect((await modifier(2, { nom: "RENNES" })).status).toBe(200);
  });

  it("refuse un nom court vide et les emoji (400)", async () => {
    expect(await modifier(2, { nom: "   " })).toMatchObject({
      status: 400,
      body: { message: "Le nom est obligatoire" },
    });
    expect(await modifier(2, { nom: "Rennes \u{1F98A}" })).toMatchObject({
      status: 400,
      body: { message: "Le nom ne doit pas contenir d'emoji" },
    });
    expect(await modifier(2, { nomComplet: "Les Renards \u{1F98A}" })).toMatchObject({
      status: 400,
      body: { message: "Le nom ne doit pas contenir d'emoji" },
    });
  });

  it("renvoie 404 pour une équipe inconnue", async () => {
    expect((await modifier(99, { nomComplet: "X" })).status).toBe(404);
    expect((await appel("PATCH", "/inscription/equipes/99/activer")).status).toBe(404);
  });

  it("désactive puis réactive une équipe, sans toucher à ses noms", async () => {
    const off = await appel("PATCH", "/inscription/equipes/1/desactiver");
    expect(off).toMatchObject({ status: 200, body: { active: false, nom: "Courbevoie" } });
    expect(mock.getEquipes().find((e) => e.id === 1)?.active).toBe(false);

    const on = await appel("PATCH", "/inscription/equipes/1/activer");
    expect(on).toMatchObject({ status: 200, body: { active: true, nom: "Courbevoie" } });
    expect((await toutes())[0]).toMatchObject({
      active: true,
      nomComplet: "Les Coqs de Courbevoie",
    });
  });
});

describe("Faux back — gestion des équipes hors mode organisateur", () => {
  it("le mode responsable ne sert ni la liste complète ni la modification", async () => {
    const mock = await startMockBack(PORT, { responsable: true, equipes: EQUIPES });
    try {
      expect((await fetch(`${BASE}/inscription/equipes/toutes`)).status).toBe(404);
      expect((await modifier(1, { nomComplet: "X" })).status).toBe(404);
      // La route publique n'expose pas nbCandidatures.
      const publiques = (await (await fetch(`${BASE}/inscription/equipes`)).json()) as Record<
        string,
        unknown
      >[];
      expect(publiques[0]).not.toHaveProperty("nbCandidatures");
    } finally {
      await mock.close();
    }
  });
});
