import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { modifierEquipeReferentiel } from "../inscription";
import { ServerError } from "../errors";

// docs/specs/recommandations-finales-contexte-la-mise-en-place-de-la-colo.md — §6, §7

const MESSAGE_VERROU =
  "Le nom court ne peut plus être modifié : une candidature fait référence à cette équipe";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("modifierEquipeReferentiel", () => {
  it("PATCH /inscription/equipes/:id avec le jeton Bearer et le corps JSON", async () => {
    const equipe = { id: 7, nom: "Courbevoie", nomComplet: "Coqs HC", active: true, nbCandidatures: 2 };
    fetchMock.mockResolvedValue(jsonResponse(equipe));

    const result = await modifierEquipeReferentiel(7, { nomComplet: "Coqs HC" }, "tok");

    expect(result).toEqual(equipe);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/inscription\/equipes\/7$/);
    expect(options.method).toBe("PATCH");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer tok",
    });
    expect(JSON.parse(options.body)).toEqual({ nomComplet: "Coqs HC" });
  });

  it("transmet nomComplet: null tel quel (effacement) et n'ajoute pas de clé nom", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7, nom: "Courbevoie", nomComplet: null }));

    await modifierEquipeReferentiel(7, { nomComplet: null }, "tok");

    const corps = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(corps).toEqual({ nomComplet: null });
    expect(corps).not.toHaveProperty("nom");
  });

  // fetchWithRetry (utilitaire partagé, hors périmètre) retente aussi les 4xx avec un
  // backoff exponentiel : un refus met plusieurs secondes à remonter et la requête part
  // plusieurs fois. On fige le temps pour ne pas ralentir la suite, et on ne fige pas le
  // nombre de tentatives (même parti pris que inscription.etape.test.ts).
  it.each([
    [409, MESSAGE_VERROU],
    [409, "Cette équipe existe déjà"],
    [400, "Le nom ne doit pas contenir d'emoji"],
    [404, "Équipe référentiel 7 introuvable"],
  ])("lève une ServerError %i portant le message du back", async (status, message) => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(async () =>
        jsonResponse({ statusCode: status, message }, status),
      );

      const pending = modifierEquipeReferentiel(7, { nom: "Rennes" }, "tok").catch(
        (e: unknown) => e,
      );
      await vi.runAllTimersAsync();
      const erreur = await pending;

      expect(erreur).toBeInstanceOf(ServerError);
      expect((erreur as ServerError).status).toBe(status);
      expect((erreur as ServerError).message).toBe(message);
      // Chaque tentative renvoie le même corps : un rejeu ne peut pas transformer un
      // refus en renommage partiel.
      for (const [, options] of fetchMock.mock.calls) {
        expect(JSON.parse(options.body)).toEqual({ nom: "Rennes" });
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
