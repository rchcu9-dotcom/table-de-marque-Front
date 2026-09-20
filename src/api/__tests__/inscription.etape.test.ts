import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ouvrirInscriptions, cloturerInscriptions } from "../inscription";
import { ServerError } from "../errors";

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

describe.each([
  ["ouvrirInscriptions", ouvrirInscriptions, "ouvrir-inscriptions"],
  ["cloturerInscriptions", cloturerInscriptions, "cloturer-inscriptions"],
] as const)("%s", (_name, fn, route) => {
  it(`POST /inscription/editions/:id/${route} avec le jeton Bearer, sans corps`, async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 7, etape: "CLOTUREE" }));

    const result = await fn(7, "tok");

    expect(result).toEqual({ id: 7, etape: "CLOTUREE" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/inscription/editions/7/${route}$`));
    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ Authorization: "Bearer tok" });
    expect(options.body).toBeUndefined();
  });

  // fetchWithRetry (utilitaire partagé, hors périmètre) retente aussi les 4xx avec un
  // backoff exponentiel : un 409 met donc plusieurs secondes à remonter. On fige le temps
  // pour ne pas ralentir la suite, et on ne fige pas le nombre de tentatives.
  it("remonte un ServerError 409 avec le message du backend (transition interdite)", async () => {
    vi.useFakeTimers();
    try {
      fetchMock.mockImplementation(async () =>
        jsonResponse({ message: "Transition d'étape interdite : A → B" }, 409),
      );

      const pending = fn(7, "tok").catch((e: unknown) => e);
      await vi.runAllTimersAsync();
      const error = await pending;

      expect(error).toBeInstanceOf(ServerError);
      expect((error as ServerError).status).toBe(409);
      expect((error as ServerError).message).toBe("Transition d'étape interdite : A → B");
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
