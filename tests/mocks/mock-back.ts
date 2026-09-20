import http from "node:http";

type Match = {
  id: string;
  date: string;
  teamA: string;
  teamB: string;
  status: "planned" | "ongoing" | "finished";
  scoreA: number | null;
  scoreB: number | null;
};

type ServerHandle = {
  close: () => Promise<void>;
  port: number;
};

export type MockBackOptions = {
  /**
   * Etape de l'édition renvoyée par GET /inscription/edition/courante.
   * `undefined`/`null` reproduit le comportement "aucune édition connue"
   * (404), que le front interprète comme etape=null (cf. fetchEditionCourante).
   */
  editionEtape?: string | null;
  /** Corps renvoyé par GET /presentation. Par défaut : tableau vide. */
  presentationGroupes?: unknown[];
  /**
   * Simule un organisateur authentifié : GET /inscription/auth/me renvoie le rôle
   * ORGANISATEUR, GET /inscription/edition/courante renvoie une édition complète,
   * GET /inscription/edition/en-preparation renvoie 404 (aucun cycle annuel) et les
   * POST ouvrir-inscriptions / cloturer-inscriptions font évoluer `etape` selon la même
   * table de transitions que le backend (409 sinon).
   */
  organisateur?: boolean;
};

export type MockBackHandle = ServerHandle & {
  /** Étape courante de l'édition simulée (mutable via les endpoints POST). */
  getEtape: () => string | null;
  /** Journal des appels POST reçus (méthode + chemin + en-tête Authorization). */
  posts: Array<{ url: string; authorization: string | undefined }>;
};

// Miroir de back/src/inscription/domain/edition-transitions.ts (cibles du switch uniquement).
const TRANSITIONS: Record<string, string[]> = {
  CREEE: ["INSCRIPTIONS_OUVERTES"],
  CREATION_NOUVEAU_TOURNOI: ["INSCRIPTIONS_OUVERTES"],
  INSCRIPTIONS_OUVERTES: ["CLOTUREE"],
  CLOTUREE: ["INSCRIPTIONS_OUVERTES", "TOURNOI_DEMARRE"],
  TOURNOI_DEMARRE: [],
};

export async function startMockBack(
  port = 4000,
  options: MockBackOptions = {},
): Promise<MockBackHandle> {
  let editionEtape = options.editionEtape ?? null;
  const posts: MockBackHandle["posts"] = [];
  const presentationGroupes = options.presentationGroupes ?? [];
  const matches: Match[] = [
    {
      id: "1",
      date: new Date().toISOString(),
      teamA: "Mock A",
      teamB: "Mock B",
      status: "ongoing",
      scoreA: 0,
      scoreB: 0,
    },
  ];

  const server = http.createServer((req, res) => {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/matches" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(matches));
      return;
    }

    if (req.url === "/matches/stream" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });

      const send = (data: unknown) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // event initial
      setTimeout(() => {
        send({
          type: "matches",
          matches,
          diff: { changed: true, added: ["1"], updated: [], removed: [] },
          timestamp: Date.now(),
        });
      }, 50);

      // but après 1s
      setTimeout(() => {
        matches[0] = { ...matches[0], scoreA: 1, scoreB: 0 };
        send({
          type: "matches",
          matches,
          diff: { changed: true, added: [], updated: ["1"], removed: [] },
          timestamp: Date.now(),
        });
      }, 1000);

      // keep-alive ping
      const ping = setInterval(() => send({ type: "ping", timestamp: Date.now() }), 25000);

      req.on("close", () => {
        clearInterval(ping);
      });
      return;
    }

    if (req.url === "/inscription/edition/courante" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      if (!editionEtape) {
        res.writeHead(404);
        res.end(JSON.stringify({ message: "Not found" }));
        return;
      }
      res.writeHead(200);
      res.end(
        JSON.stringify(
          options.organisateur
            ? {
                id: 1,
                nom: "RCHC U11 2026",
                categorie: "U11",
                annee: 2026,
                etape: editionEtape,
                dateDebut: "2026-05-23T00:00:00.000Z",
                dateFinDebut: "2026-05-24T23:59:59.000Z",
                fraisInscription: 120,
                prixRepas: 12,
                nbPlacesMax: 16,
                hasImageRib: false,
                affichagePlanningPublic: false,
                anneesAge: [2015, 2016],
              }
            : { id: 1, etape: editionEtape },
        ),
      );
      return;
    }

    if (options.organisateur) {
      res.setHeader("Content-Type", "application/json");

      if (req.url === "/inscription/auth/me" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 1, pseudo: "orga", role: "ORGANISATEUR" }));
        return;
      }

      if (req.url === "/inscription/edition/en-preparation" && req.method === "GET") {
        res.writeHead(404);
        res.end(JSON.stringify({ message: "Not found" }));
        return;
      }

      const transition = req.url?.match(
        /^\/inscription\/editions\/1\/(ouvrir|cloturer)-inscriptions$/,
      );
      if (transition && req.method === "POST") {
        posts.push({ url: req.url!, authorization: req.headers.authorization });
        const cible = transition[1] === "ouvrir" ? "INSCRIPTIONS_OUVERTES" : "CLOTUREE";
        if (!editionEtape || !TRANSITIONS[editionEtape]?.includes(cible)) {
          res.writeHead(409);
          res.end(
            JSON.stringify({
              message: `Transition d'étape interdite : ${editionEtape} → ${cible}`,
            }),
          );
          return;
        }
        editionEtape = cible;
        res.writeHead(201);
        res.end(JSON.stringify({ id: 1, etape: editionEtape }));
        return;
      }
    }

    if (req.url === "/presentation" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(JSON.stringify(presentationGroupes));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  });

  await new Promise<void>((resolve) => server.listen(port, resolve));

  return {
    port,
    getEtape: () => editionEtape,
    posts,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        // Les connexions keep-alive du navigateur bloqueraient sinon la fermeture (et
        // donc le hook afterEach) jusqu'au timeout.
        server.closeAllConnections();
      }),
  };
}
