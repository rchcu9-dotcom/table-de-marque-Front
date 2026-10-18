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
   * POST ouvrir-inscriptions / cloturer-inscriptions / demarrer-tournoi font évoluer `etape` selon la même
   * table de transitions que le backend (409 sinon).
   */
  organisateur?: boolean;
  /**
   * Candidatures renvoyées par GET /inscription/candidatures (organisateur) et
   * dossiers associés (GET/PATCH /inscription/dossier/candidature/:id/...).
   * PATCH candidatures/:id/valider-dossier fait passer DOSSIER_EN_COURS →
   * DOSSIER_COMPLET, comme le backend.
   */
  candidatures?: MockCandidature[];
  dossiers?: Record<number, MockDossier>;
  /**
   * Simule un responsable d'équipe authentifié : GET /inscription/auth/me renvoie le
   * rôle RESPONSABLE_EQUIPE, GET /inscription/edition/courante une édition complète,
   * et les routes equipes / candidatures tiennent un état en mémoire (création
   * d'équipe, dépôt de candidature). Toute autre route /inscription/* répond 404.
   */
  responsable?: boolean;
  /** Référentiel renvoyé par GET /inscription/equipes (modes responsable et organisateur). */
  equipes?: MockEquipeRef[];
};

export type MockEquipeRef = {
  id: number;
  nom: string;
  nomComplet?: string | null;
  logoUrl?: string | null;
  /** Par défaut : true. */
  active?: boolean;
  /** Inscriptions qui référencent l'équipe (route organisateur) ; au-dessus de zéro, nom court verrouillé. */
  nbCandidatures?: number;
};

export type MockCandidature = {
  id: number;
  equipeNom: string;
  statut: string;
  utilisateurEmail: string;
  utilisateurDisplayName?: string | null;
  createdAt: string;
  /** Nom complet du club, en lecture, dans la liste de l'organisateur. */
  equipeNomComplet?: string | null;
};

export type MockJoueur = {
  id: number;
  nom: string;
  prenom: string;
  numero: number;
  poste: string;
  anneeNaissance: number | null;
};

export type MockDossier = {
  joueurs: MockJoueur[];
  coachs: Array<{ id: number; nom: string; prenom: string; presenceRepas: boolean }>;
  droitsImageAcceptes: boolean;
};

export type MockBackHandle = ServerHandle & {
  /** Étape courante de l'édition simulée (mutable via les endpoints POST). */
  getEtape: () => string | null;
  /** Journal des appels POST reçus (méthode + chemin + en-tête Authorization). */
  posts: Array<{ url: string; authorization: string | undefined }>;
  /** Journal des appels PATCH reçus (chemin + corps JSON). */
  patches: Array<{ url: string; body: unknown }>;
  /** Journal des appels PUT reçus (chemin + corps JSON + statut renvoyé). */
  puts: Array<{ url: string; body: unknown; status: number }>;
  getCandidatures: () => MockCandidature[];
  /** Corps JSON des POST du mode responsable, dans l'ordre (chemin + corps + statut renvoyé). */
  postBodies: Array<{ url: string; body: unknown; status: number }>;
  getEquipes: () => MockEquipeRef[];
};

function lireCorps(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : undefined));
  });
}

// Miroir de back/src/inscription/domain/edition-transitions.ts.
const TRANSITIONS: Record<string, string[]> = {
  CREEE: ["INSCRIPTIONS_OUVERTES"],
  CREATION_NOUVEAU_TOURNOI: ["INSCRIPTIONS_OUVERTES"],
  INSCRIPTIONS_OUVERTES: ["CLOTUREE", "CREEE", "CREATION_NOUVEAU_TOURNOI"],
  CLOTUREE: ["INSCRIPTIONS_OUVERTES", "TOURNOI_DEMARRE"],
  TOURNOI_DEMARRE: [],
};

// Miroir de back/src/inscription/domain/edition-regles.ts.
const ETAPES_PARAMETRES_INSCRIPTION_MODIFIABLES = ["CREEE", "CREATION_NOUVEAU_TOURNOI"];
const ETAPES_FORMULE_SPORTIVE_MODIFIABLE = ["CREEE", "CREATION_NOUVEAU_TOURNOI", "INSCRIPTIONS_OUVERTES", "CLOTUREE"];
const MESSAGE_INSCRIPTION_FIGEE =
  "Les paramètres d'inscription ne sont plus modifiables une fois les inscriptions ouvertes. Revenez en Préparation depuis l'accueil admin pour les changer.";
const MESSAGE_FORMULE_FIGEE = "La formule sportive n'est plus modifiable une fois le tournoi lancé.";
const MESSAGE_RETOUR_AVEC_CANDIDATURES =
  "Des équipes ont déjà candidaté sur ces paramètres : ils ne peuvent plus être modifiés.";

// Miroir de back/src/inscription/domain/equipe-referentiel-noms.ts.
const MESSAGE_NOM_SANS_EMOJI = "Le nom ne doit pas contenir d'emoji";
const MESSAGE_NOM_OBLIGATOIRE = "Le nom est obligatoire";
const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
const normaliserEspaces = (valeur: string) => valeur.replace(/\s+/g, " ").trim();
function normaliserNomComplet(nom: string, nomComplet: string | null | undefined): string | null {
  const valeur = normaliserEspaces(nomComplet ?? "");
  if (!valeur || valeur.toLowerCase() === nom.toLowerCase()) return null;
  return valeur;
}
// Miroir de back/src/inscription/application/equipe/create-equipe-referentiel.usecase.ts.
const MESSAGE_EQUIPE_EXISTE = "Cette équipe existe déjà";
const MESSAGE_NOM_COURT_VERROUILLE =
  "Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe";

export async function startMockBack(
  port = 4000,
  options: MockBackOptions = {},
): Promise<MockBackHandle> {
  let editionEtape = options.editionEtape ?? null;
  const posts: MockBackHandle["posts"] = [];
  const patches: MockBackHandle["patches"] = [];
  const puts: MockBackHandle["puts"] = [];
  let parametresSportifs: Record<string, unknown> = {
    editionId: 1,
    dureeSurfacageMin: 20,
    dureeMatchPouleMin: 27,
    dureeMatchFinalMin: 33,
    dureeInterMatchMin: null,
    delaiMinActivite: null,
    nbPatinoires: 2,
    nbPoules: 4,
    nbEquipesParPoule: 4,
    nbEquipesQualifieesParPoule: null,
    formatPhaseFinale: null,
    reglesTieBreak: null,
    nbPlacesMax: 16,
  };
  const candidatures = (options.candidatures ?? []).map((c) => ({ ...c }));
  const postBodies: MockBackHandle["postBodies"] = [];
  const equipes: MockEquipeRef[] = (options.equipes ?? []).map((e) => ({ ...e }));
  let maCandidature: Record<string, unknown> | null = null;
  const dossiers = structuredClone(options.dossiers ?? {});
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

  const server = http.createServer(async (req, res) => {
    // Pas de keep-alive : chaque test relance un faux back sur le même port, et un
    // client (undici, Node 20) réutiliserait sinon un socket du serveur précédent.
    res.shouldKeepAlive = false;
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
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
          options.organisateur || options.responsable
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

    if (options.responsable && req.url?.startsWith("/inscription/")) {
      res.setHeader("Content-Type", "application/json");
      const repondre = (status: number, corps: unknown) => {
        res.writeHead(status);
        res.end(JSON.stringify(corps));
      };

      if (req.url === "/inscription/auth/me" && req.method === "GET") {
        repondre(200, { id: 2, pseudo: "resp", role: "RESPONSABLE_EQUIPE" });
        return;
      }

      // Route publique : liste blanche du contrôleur, sans information de candidature.
      if (req.url === "/inscription/equipes" && req.method === "GET") {
        repondre(
          200,
          equipes
            .filter((e) => e.active !== false)
            .map((e) => ({
              id: e.id,
              nom: e.nom,
              nomComplet: e.nomComplet ?? null,
              logoUrl: e.logoUrl ?? null,
              active: true,
            })),
        );
        return;
      }

      if (req.url === "/inscription/equipes" && req.method === "POST") {
        const url = req.url;
        const body = ((await lireCorps(req)) ?? {}) as { nom?: unknown; nomComplet?: unknown };
        const refuser = (status: number, message: string) => {
          postBodies.push({ url, body, status });
          repondre(status, { message });
        };
        const nom = normaliserEspaces(typeof body.nom === "string" ? body.nom : "");
        const nomCompletBrut = typeof body.nomComplet === "string" ? body.nomComplet : null;
        if (!nom) return refuser(400, MESSAGE_NOM_OBLIGATOIRE);
        if (EMOJI.test(nom) || EMOJI.test(nomCompletBrut ?? "")) {
          return refuser(400, MESSAGE_NOM_SANS_EMOJI);
        }
        // L'index unique compare sans tenir compte de la casse (collation de la base).
        if (equipes.some((e) => e.nom.toLowerCase() === nom.toLowerCase())) {
          return refuser(409, MESSAGE_EQUIPE_EXISTE);
        }
        const equipe = {
          id: Math.max(0, ...equipes.map((e) => e.id)) + 1,
          nom,
          nomComplet: normaliserNomComplet(nom, nomCompletBrut),
          logoUrl: null,
          active: true,
        };
        equipes.push(equipe);
        postBodies.push({ url, body, status: 201 });
        repondre(201, equipe);
        return;
      }

      if (req.url === "/inscription/candidatures/ma-candidature" && req.method === "GET") {
        if (maCandidature) repondre(200, maCandidature);
        else repondre(404, { message: "Not found" });
        return;
      }

      if (req.url === "/inscription/candidatures" && req.method === "POST") {
        const url = req.url;
        const body = ((await lireCorps(req)) ?? {}) as { equipeRefId?: unknown };
        const equipe = equipes.find((e) => e.id === body.equipeRefId && e.active !== false);
        if (!equipe) {
          postBodies.push({ url, body, status: 404 });
          repondre(404, { message: "Équipe non trouvée" });
          return;
        }
        // Le back recopie le nom COURT dans l'inscription, jamais le nom complet.
        const candidature = {
          id: 1,
          equipeNom: equipe.nom,
          statut: "CANDIDATE",
          createdAt: "2026-04-01T10:00:00.000Z",
        };
        maCandidature = {
          ...candidature,
          equipeLogoUrl: equipe.logoUrl ?? null,
          nbJoueurs: 0,
          fraisInscriptionPaye: false,
          repasPaiementRecu: false,
        };
        postBodies.push({ url, body, status: 201 });
        repondre(201, candidature);
        return;
      }

      // 404 et non 500 : le front rejoue les 5xx.
      repondre(404, { message: "Not found" });
      return;
    }

    if (options.organisateur) {
      res.setHeader("Content-Type", "application/json");

      if (req.url === "/inscription/auth/me" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify({ id: 1, pseudo: "orga", role: "ORGANISATEUR" }));
        return;
      }

      if (req.url === "/inscription/equipes" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify(equipes));
        return;
      }

      // Écran de gestion des équipes : mêmes règles que le back
      // (UpdateEquipeReferentielUseCase), état tenu en mémoire.
      const equipeVue = (e: MockEquipeRef) => ({
        id: e.id,
        nom: e.nom,
        nomComplet: e.nomComplet ?? null,
        logoUrl: e.logoUrl ?? null,
        active: e.active !== false,
        nbCandidatures: e.nbCandidatures ?? 0,
      });

      if (req.url === "/inscription/equipes/toutes" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify(equipes.map(equipeVue)));
        return;
      }

      const routeEquipe = /^\/inscription\/equipes\/(\d+)(\/activer|\/desactiver)?$/.exec(
        req.url ?? "",
      );
      if (routeEquipe && req.method === "PATCH") {
        const repondreEquipe = (status: number, corps: unknown) => {
          res.writeHead(status);
          res.end(JSON.stringify(corps));
        };
        const equipe = equipes.find((e) => e.id === Number(routeEquipe[1]));
        if (!equipe) return repondreEquipe(404, { message: "Équipe référentiel introuvable" });

        if (routeEquipe[2]) {
          equipe.active = routeEquipe[2] === "/activer";
          return repondreEquipe(200, equipeVue(equipe));
        }

        const body = ((await lireCorps(req)) ?? {}) as { nom?: unknown; nomComplet?: unknown };
        const nom = typeof body.nom === "string" ? normaliserEspaces(body.nom) : equipe.nom;
        const nomCompletBrut =
          body.nomComplet === undefined
            ? (equipe.nomComplet ?? null)
            : typeof body.nomComplet === "string"
              ? body.nomComplet
              : null;
        if (!nom) return repondreEquipe(400, { message: MESSAGE_NOM_OBLIGATOIRE });
        if (EMOJI.test(nom) || EMOJI.test(nomCompletBrut ?? "")) {
          return repondreEquipe(400, { message: MESSAGE_NOM_SANS_EMOJI });
        }
        if (nom !== equipe.nom) {
          if ((equipe.nbCandidatures ?? 0) > 0) {
            return repondreEquipe(409, { message: MESSAGE_NOM_COURT_VERROUILLE });
          }
          if (equipes.some((e) => e.id !== equipe.id && e.nom.toLowerCase() === nom.toLowerCase())) {
            return repondreEquipe(409, { message: MESSAGE_EQUIPE_EXISTE });
          }
        }
        equipe.nom = nom;
        equipe.nomComplet = normaliserNomComplet(nom, nomCompletBrut);
        return repondreEquipe(200, equipeVue(equipe));
      }

      if (req.url === "/inscription/candidatures" && req.method === "GET") {
        res.writeHead(200);
        res.end(
          JSON.stringify(
            candidatures.map((c) => ({
              equipeLogoUrl: null,
              utilisateurDisplayName: null,
              commentaireOrganisateur: null,
              fraisInscriptionPaye: true,
              repasPaiementRecu: false,
              ...c,
            })),
          ),
        );
        return;
      }

      const dossierGet = req.url?.match(/^\/inscription\/dossier\/candidature\/(\d+)$/);
      if (dossierGet && req.method === "GET") {
        const id = Number(dossierGet[1]);
        const c = candidatures.find((x) => x.id === id);
        const d = dossiers[id];
        res.writeHead(c ? 200 : 404);
        res.end(
          JSON.stringify({
            dossier: d
              ? { id, inscriptionId: id, droitsImageAcceptes: d.droitsImageAcceptes, droitsImageHorodatage: null }
              : null,
            joueurs: (d?.joueurs ?? []).map((j) => ({ dossierId: id, licenceFFH: null, particularitesAlim: null, ...j })),
            coachs: (d?.coachs ?? []).map((co) => ({ dossierId: id, ...co })),
            statutInscription: c?.statut,
          }),
        );
        return;
      }

      const joueurPatch = req.url?.match(/^\/inscription\/dossier\/candidature\/(\d+)\/joueurs\/(\d+)$/);
      if (joueurPatch && req.method === "PATCH") {
        const body = (await lireCorps(req)) as Partial<MockJoueur>;
        patches.push({ url: req.url!, body });
        const joueur = dossiers[Number(joueurPatch[1])]?.joueurs.find((j) => j.id === Number(joueurPatch[2]));
        if (!joueur) {
          res.writeHead(404);
          res.end(JSON.stringify({ message: "Joueur non trouvé" }));
          return;
        }
        Object.assign(joueur, body);
        res.writeHead(200);
        res.end(JSON.stringify(joueur));
        return;
      }

      const validerDossier = req.url?.match(/^\/inscription\/candidatures\/(\d+)\/valider-dossier$/);
      if (validerDossier && req.method === "PATCH") {
        patches.push({ url: req.url!, body: undefined });
        const c = candidatures.find((x) => x.id === Number(validerDossier[1]));
        if (!c || c.statut !== "DOSSIER_EN_COURS") {
          res.writeHead(400);
          res.end(JSON.stringify({ message: "Seul un dossier en cours peut être validé" }));
          return;
        }
        c.statut = "DOSSIER_COMPLET";
        res.writeHead(200);
        res.end(JSON.stringify({ id: c.id, statut: c.statut }));
        return;
      }

      if (req.url === "/inscription/edition/en-preparation" && req.method === "GET") {
        res.writeHead(404);
        res.end(JSON.stringify({ message: "Not found" }));
        return;
      }

      if (req.url === "/parametres-sportifs/1" && req.method === "GET") {
        res.writeHead(200);
        res.end(JSON.stringify(parametresSportifs));
        return;
      }

      // Formule sportive modifiable jusqu'au lancement du tournoi (409 ensuite).
      if (req.url === "/parametres-sportifs/1" && req.method === "PUT") {
        const body = (await lireCorps(req)) as Record<string, unknown>;
        if (!editionEtape || !ETAPES_FORMULE_SPORTIVE_MODIFIABLE.includes(editionEtape)) {
          puts.push({ url: req.url, body, status: 409 });
          res.writeHead(409);
          res.end(JSON.stringify({ message: MESSAGE_FORMULE_FIGEE }));
          return;
        }
        puts.push({ url: req.url, body, status: 200 });
        parametresSportifs = { ...parametresSportifs, ...body };
        res.writeHead(200);
        res.end(JSON.stringify(parametresSportifs));
        return;
      }

      if (
        req.method === "GET" &&
        /^\/parametres-sportifs\/1\/(jours|activites-catalogue|creneaux-activite)$/.test(req.url ?? "")
      ) {
        res.writeHead(200);
        res.end(JSON.stringify([]));
        return;
      }

      // Paramètres d'inscription figés dès l'ouverture des inscriptions (409 ensuite).
      if (req.url === "/inscription/editions/1" && req.method === "PATCH") {
        const body = await lireCorps(req);
        patches.push({ url: req.url, body });
        if (!editionEtape || !ETAPES_PARAMETRES_INSCRIPTION_MODIFIABLES.includes(editionEtape)) {
          res.writeHead(409);
          res.end(JSON.stringify({ message: MESSAGE_INSCRIPTION_FIGEE }));
          return;
        }
        res.writeHead(200);
        res.end(JSON.stringify({ id: 1, etape: editionEtape, ...(body as object) }));
        return;
      }

      if (req.url === "/inscription/editions/1/revenir-en-preparation" && req.method === "POST") {
        posts.push({ url: req.url, authorization: req.headers.authorization });
        if (editionEtape !== "INSCRIPTIONS_OUVERTES") {
          res.writeHead(409);
          res.end(JSON.stringify({ message: `Transition d'étape interdite : ${editionEtape} → Préparation` }));
          return;
        }
        if (candidatures.length > 0) {
          res.writeHead(409);
          res.end(JSON.stringify({ message: MESSAGE_RETOUR_AVEC_CANDIDATURES }));
          return;
        }
        // Aucune édition antérieure simulée : retour à CREEE.
        editionEtape = "CREEE";
        res.writeHead(201);
        res.end(JSON.stringify({ id: 1, etape: editionEtape }));
        return;
      }

      const transition = req.url?.match(
        /^\/inscription\/editions\/1\/(ouvrir-inscriptions|cloturer-inscriptions|demarrer-tournoi)$/,
      );
      if (transition && req.method === "POST") {
        posts.push({ url: req.url!, authorization: req.headers.authorization });
        const cible =
          transition[1] === "ouvrir-inscriptions"
            ? "INSCRIPTIONS_OUVERTES"
            : transition[1] === "cloturer-inscriptions"
              ? "CLOTUREE"
              : "TOURNOI_DEMARRE";
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
    patches,
    puts,
    getCandidatures: () => candidatures,
    postBodies,
    getEquipes: () => equipes,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
        // Les connexions keep-alive du navigateur bloqueraient sinon la fermeture (et
        // donc le hook afterEach) jusqu'au timeout.
        server.closeAllConnections();
      }),
  };
}
