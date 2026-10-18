// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startMockBack, type MockBackHandle } from "../mocks/mock-back";

// docs/specs/-mise-jour-du-parcours-dinscription-contexte-dans-le-cadre-d.md — critère 7
// Le scénario Playwright du parcours repose sur le mode « responsable » du faux back.
// Ces tests vérifient que ses trois règles « miroir » se comportent comme le vrai back
// (create-equipe-referentiel.usecase.ts, equipe-referentiel-noms.ts) : sans eux, un faux
// back trop permissif ferait passer le scénario à tort.

const PORT = 4017;
const BASE = `http://localhost:${PORT}`;

const EQUIPES = [
  { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie" },
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

const creer = (corps: unknown) => appel("POST", "/inscription/equipes", corps);

describe("Faux back — mode responsable", () => {
  let mock: MockBackHandle;

  beforeEach(async () => {
    mock = await startMockBack(PORT, {
      responsable: true,
      editionEtape: "INSCRIPTIONS_OUVERTES",
      equipes: EQUIPES,
    });
  });

  afterEach(async () => {
    await mock.close();
  });

  describe("lecture", () => {
    it("identifie l'utilisateur comme responsable d'équipe", async () => {
      const { status, body } = await appel("GET", "/inscription/auth/me");

      expect(status).toBe(200);
      expect(body.role).toBe("RESPONSABLE_EQUIPE");
      expect(body.pseudo).toBeTruthy();
    });

    it("renvoie une édition complète, à l'étape demandée", async () => {
      const { status, body } = await appel("GET", "/inscription/edition/courante");

      expect(status).toBe(200);
      expect(body).toMatchObject({ id: 1, etape: "INSCRIPTIONS_OUVERTES", nom: "RCHC U11 2026" });
    });

    it("liste les équipes actives avec nomComplet, sans information de candidature", async () => {
      const res = await fetch(`${BASE}/inscription/equipes`);
      const equipes = (await res.json()) as Record<string, unknown>[];

      expect(equipes).toEqual([
        { id: 1, nom: "Courbevoie", nomComplet: "Les Coqs de Courbevoie", logoUrl: null, active: true },
        { id: 2, nom: "Rennes", nomComplet: null, logoUrl: null, active: true },
      ]);
      for (const equipe of equipes) expect(equipe).not.toHaveProperty("candidatureEnCours");
    });

    it("répond 404 (jamais 5xx) pour « ma candidature » tant qu'aucune n'est déposée", async () => {
      const { status } = await appel("GET", "/inscription/candidatures/ma-candidature");

      expect(status).toBe(404);
    });

    it.each(["/inscription/dossier/moi", "/inscription/equipes/toutes", "/inscription/inconnue"])(
      "répond 404 en JSON pour la route non prévue %s",
      async (chemin) => {
        const { status, body } = await appel("GET", chemin);

        expect(status).toBe(404);
        expect(body).toHaveProperty("message");
      },
    );
  });

  describe("création d'équipe — miroir du vrai back", () => {
    it("crée une équipe avec ses deux noms, active tout de suite", async () => {
      const { status, body } = await creer({ nom: "San Jose", nomComplet: "Les Sharks de San Jose" });

      expect(status).toBe(201);
      expect(body).toEqual({
        id: 8,
        nom: "San Jose",
        nomComplet: "Les Sharks de San Jose",
        logoUrl: null,
        active: true,
      });
      expect(mock.getEquipes().map((e) => e.nom)).toContain("San Jose");
    });

    it.each([
      ["absent", { nom: "San Jose" }],
      ["null", { nom: "San Jose", nomComplet: null }],
      ["vide", { nom: "San Jose", nomComplet: "" }],
      ["composé d'espaces", { nom: "San Jose", nomComplet: "   " }],
      ["égal au nom court", { nom: "San Jose", nomComplet: "San Jose" }],
      ["égal au nom court à la casse près", { nom: "San Jose", nomComplet: "  SAN JOSE " }],
    ])("enregistre nomComplet null quand il est %s", async (_cas, corps) => {
      const { status, body } = await creer(corps);

      expect(status).toBe(201);
      expect(body.nomComplet).toBeNull();
    });

    it("retire les espaces de bord et réduit les espaces doubles des deux noms", async () => {
      const { body } = await creer({ nom: "  San   Jose ", nomComplet: " Les  Sharks de San Jose  " });

      expect(body.nom).toBe("San Jose");
      expect(body.nomComplet).toBe("Les Sharks de San Jose");
    });

    it.each([
      ["même nom", "Rennes"],
      ["casse différente", "RENNES"],
      ["espaces autour", "  Rennes "],
    ])("refuse un nom déjà pris en 409 « Cette équipe existe déjà » (%s)", async (_cas, nom) => {
      const { status, body } = await creer({ nom, nomComplet: "Autre club" });

      expect(status).toBe(409);
      expect(body.message).toBe("Cette équipe existe déjà");
      expect(mock.getEquipes()).toHaveLength(EQUIPES.length);
    });

    it("le doublon porte sur le nom court seul : un nom complet déjà utilisé reste permis", async () => {
      const { status } = await creer({ nom: "Courbevoie 2", nomComplet: "Les Coqs de Courbevoie" });

      expect(status).toBe(201);
    });

    it.each([
      ["le nom court", { nom: "Les \u{1F98A} Renards" }],
      ["le nom complet", { nom: "Renards", nomComplet: "Les \u{1F98A} Renards" }],
      ["un drapeau", { nom: "Renards \u{1F1EB}\u{1F1F7}" }],
    ])("refuse un emoji dans %s en 400, sans rien créer", async (_cas, corps) => {
      const { status, body } = await creer(corps);

      expect(status).toBe(400);
      expect(body.message).toBe("Le nom ne doit pas contenir d'emoji");
      expect(mock.getEquipes()).toHaveLength(EQUIPES.length);
    });

    it.each([[{}], [{ nom: "" }], [{ nom: "    " }], [{ nom: 42 }]])(
      "refuse un nom court manquant ou vide en 400 (%j)",
      async (corps) => {
        const { status } = await creer(corps);

        expect(status).toBe(400);
        expect(mock.getEquipes()).toHaveLength(EQUIPES.length);
      },
    );

    it("journalise chaque tentative avec son corps et son statut", async () => {
      await creer({ nom: "Rennes" });
      await creer({ nom: "San Jose" });

      expect(mock.postBodies).toEqual([
        { url: "/inscription/equipes", body: { nom: "Rennes" }, status: 409 },
        { url: "/inscription/equipes", body: { nom: "San Jose" }, status: 201 },
      ]);
    });
  });

  describe("candidature", () => {
    it("recopie le nom court de l'équipe, jamais le nom complet", async () => {
      const { status, body } = await appel("POST", "/inscription/candidatures", { equipeRefId: 1 });

      expect(status).toBe(201);
      expect(body).toMatchObject({ equipeNom: "Courbevoie", statut: "CANDIDATE" });
      expect(JSON.stringify(body)).not.toContain("Les Coqs de Courbevoie");
    });

    it("rend ensuite « ma candidature », toujours sans nom complet", async () => {
      await appel("POST", "/inscription/candidatures", { equipeRefId: 1 });

      const { status, body } = await appel("GET", "/inscription/candidatures/ma-candidature");

      expect(status).toBe(200);
      expect(body).toMatchObject({ equipeNom: "Courbevoie", statut: "CANDIDATE", nbJoueurs: 0 });
      expect(body).not.toHaveProperty("equipeNomComplet");
      expect(JSON.stringify(body)).not.toContain("Les Coqs de Courbevoie");
    });

    it.each([
      ["équipe inconnue", { equipeRefId: 999 }],
      ["équipe désactivée", { equipeRefId: 7 }],
      ["corps vide", {}],
    ])("refuse en 404 une candidature sur une %s", async (_cas, corps) => {
      const { status } = await appel("POST", "/inscription/candidatures", corps);

      expect(status).toBe(404);
      expect((await appel("GET", "/inscription/candidatures/ma-candidature")).status).toBe(404);
    });

    it("permet de candidater sur une équipe créée à l'instant", async () => {
      const creee = await creer({ nom: "San Jose", nomComplet: "Les Sharks de San Jose" });

      const { status, body } = await appel("POST", "/inscription/candidatures", {
        equipeRefId: creee.body.id,
      });

      expect(status).toBe(201);
      expect(body.equipeNom).toBe("San Jose");
    });
  });
});

describe("Faux back — mode organisateur (non-régression)", () => {
  let mock: MockBackHandle;

  afterEach(async () => {
    await mock.close();
  });

  it("renvoie un référentiel vide par défaut, comme avant", async () => {
    mock = await startMockBack(PORT, { organisateur: true, editionEtape: "CLOTUREE" });

    const res = await fetch(`${BASE}/inscription/equipes`);

    expect(await res.json()).toEqual([]);
  });

  it("reste organisateur et transmet equipeNomComplet dans les candidatures", async () => {
    mock = await startMockBack(PORT, {
      organisateur: true,
      editionEtape: "CLOTUREE",
      candidatures: [
        {
          id: 1,
          equipeNom: "Courbevoie",
          equipeNomComplet: "Les Coqs de Courbevoie",
          statut: "CANDIDATE",
          utilisateurEmail: "a@club.fr",
          createdAt: "2026-03-01T10:00:00.000Z",
        },
      ],
    });

    const moi = await (await fetch(`${BASE}/inscription/auth/me`)).json();
    const liste = (await (await fetch(`${BASE}/inscription/candidatures`)).json()) as Record<
      string,
      unknown
    >[];

    expect(moi.role).toBe("ORGANISATEUR");
    expect(liste[0]).toMatchObject({
      equipeNom: "Courbevoie",
      equipeNomComplet: "Les Coqs de Courbevoie",
    });
  });
});

describe("Faux back — sans rôle simulé", () => {
  it("ne sert aucune route de responsable", async () => {
    const mock = await startMockBack(PORT, { editionEtape: "INSCRIPTIONS_OUVERTES" });
    try {
      const res = await fetch(`${BASE}/inscription/candidatures/ma-candidature`);

      expect(res.status).toBe(404);
    } finally {
      await mock.close();
    }
  });
});
