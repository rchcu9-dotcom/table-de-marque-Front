import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { fetchEditionEnPreparation, fetchMaCandidature } from "../inscription";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// NestJS répond 200 avec un corps vide quand le handler retourne null : c'est ce qui
// figeait le bloc Pilotage sur « en préparation » après l'ouverture des inscriptions.
describe.each([
  ["fetchEditionEnPreparation", fetchEditionEnPreparation],
  ["fetchMaCandidature", fetchMaCandidature],
] as const)("%s", (_name, fn) => {
  it("retourne null sur un 200 au corps vide", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 200 }));

    await expect(fn("tok")).resolves.toBeNull();
  });

  it("retourne l'objet JSON quand le corps est renseigné", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 3 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fn("tok")).resolves.toEqual({ id: 3 });
  });
});
