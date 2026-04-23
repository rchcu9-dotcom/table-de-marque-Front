import { describe, expect, it } from "vitest";
import type { PouleClassement } from "../../api/classement";
import type { Match } from "../../api/match";
import {
  buildPlanningJ3Lines,
  parsePlanningJ3Participant,
} from "../planningCalendaireJ3";

function buildMatch(partial: Partial<Match> & Pick<Match, "id" | "teamA" | "teamB" | "date">): Match {
  return {
    id: partial.id,
    date: partial.date,
    teamA: partial.teamA,
    teamB: partial.teamB,
    status: partial.status ?? "planned",
    scoreA: partial.scoreA ?? null,
    scoreB: partial.scoreB ?? null,
    competitionType: partial.competitionType ?? "5v5",
    surface: partial.surface ?? "GG",
    pouleCode: partial.pouleCode ?? null,
    pouleName: partial.pouleName ?? null,
    jour: partial.jour ?? "J3",
  };
}

function buildClassement(code: "I" | "J" | "K" | "L", equipes: PouleClassement["equipes"]): PouleClassement {
  return {
    pouleCode: code,
    pouleName: code,
    equipes,
  };
}

describe("planningCalendaireJ3", () => {
  it("parses Perd. G3-H4 and Vain. G3-H4 into stable J3 trajectory identities", () => {
    expect(parsePlanningJ3Participant("Perd. G3-H4")).toEqual({
      type: "loser",
      seed: "G3",
      sourceMatchKey: "G3-H4",
      squareCode: "L",
      slot: 2,
      canonicalId: "loss:G3-H4",
      displayLabel: "Perd. G3-H4",
    });

    expect(parsePlanningJ3Participant("Vain. G3-H4")).toEqual({
      type: "winner",
      seed: "G3",
      sourceMatchKey: "G3-H4",
      squareCode: "L",
      slot: 4,
      canonicalId: "win:G3-H4",
      displayLabel: "Vain. G3-H4",
    });
  });

  it("realigns E3-F4 / E4-F3 on square K and G2-H1 / G1-H2 on square J", () => {
    expect(parsePlanningJ3Participant("Perd. E3-F4")).toMatchObject({
      squareCode: "K",
      slot: 2,
      canonicalId: "loss:E3-F4",
    });
    expect(parsePlanningJ3Participant("Vain. E4-F3")).toMatchObject({
      squareCode: "K",
      slot: 3,
      canonicalId: "win:E4-F3",
    });
    expect(parsePlanningJ3Participant("Perd. G2-H1")).toMatchObject({
      squareCode: "J",
      slot: 1,
      canonicalId: "loss:G2-H1",
    });
    expect(parsePlanningJ3Participant("Vain. G1-H2")).toMatchObject({
      squareCode: "J",
      slot: 4,
      canonicalId: "win:G1-H2",
    });
  });

  it("generates a stable line for Perd. G3-H4", () => {
    const matches: Match[] = [
      buildMatch({ id: "51", date: "2026-05-25T08:00:00.000Z", teamA: "G4", teamB: "H3" }),
      buildMatch({ id: "52", date: "2026-05-25T08:00:00.000Z", teamA: "G3", teamB: "H4" }),
      buildMatch({
        id: "61",
        date: "2026-05-25T13:00:00.000Z",
        teamA: "Perd. G4-H3",
        teamB: "Perd. G3-H4",
      }),
      buildMatch({
        id: "62",
        date: "2026-05-25T13:30:00.000Z",
        teamA: "Vain. G4-H3",
        teamB: "Vain. G3-H4",
      }),
    ];
    const classementsBySquare = {
      L: buildClassement("L", [
        { id: "l1", name: "slot1", rang: 3, ordre: 1, ordreFinal: 3, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:00:00" },
        { id: "l2", name: "slot2", rang: 4, ordre: 2, ordreFinal: 4, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:40:00" },
        { id: "l3", name: "slot3", rang: 1, ordre: 3, ordreFinal: 1, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T12:20:00" },
        { id: "l4", name: "slot4", rang: 2, ordre: 4, ordreFinal: 2, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T13:00:00" },
      ]),
    };

    const line = buildPlanningJ3Lines(matches, classementsBySquare).find(
      (entry) => entry.id === "loss:G3-H4",
    );

    expect(line?.displayLabel).toBe("Perd. G3-H4");
    expect(line?.sourceMatch?.id).toBe("52");
    expect(line?.mealTime).toBe("2026-05-25T11:40:00");
    expect(line?.phase2Match?.id).toBe("61");
  });

  it("maps Vain. G3-H4 to square L slot 4 and reads REPAS_LUNDI from ORDRE 4", () => {
    const matches: Match[] = [
      buildMatch({ id: "51", date: "2026-05-25T08:00:00.000Z", teamA: "G4", teamB: "H3" }),
      buildMatch({ id: "52", date: "2026-05-25T08:00:00.000Z", teamA: "G3", teamB: "H4" }),
      buildMatch({
        id: "61",
        date: "2026-05-25T13:00:00.000Z",
        teamA: "Perd. G4-H3",
        teamB: "Perd. G3-H4",
      }),
      buildMatch({
        id: "62",
        date: "2026-05-25T13:30:00.000Z",
        teamA: "Vain. G4-H3",
        teamB: "Vain. G3-H4",
      }),
    ];
    const classementsBySquare = {
      L: buildClassement("L", [
        { id: "l1", name: "slot1", rang: 3, ordre: 1, ordreFinal: 3, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:00:00" },
        { id: "l2", name: "slot2", rang: 4, ordre: 2, ordreFinal: 4, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:40:00" },
        { id: "l3", name: "slot3", rang: 1, ordre: 3, ordreFinal: 1, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T12:20:00" },
        { id: "l4", name: "slot4", rang: 2, ordre: 4, ordreFinal: 2, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T13:00:00" },
      ]),
    };

    const line = buildPlanningJ3Lines(matches, classementsBySquare).find(
      (entry) => entry.id === "win:G3-H4",
    );

    expect(line?.displayLabel).toBe("Vain. G3-H4");
    expect(line?.squareCode).toBe("L");
    expect(line?.slot).toBe(4);
    expect(line?.mealTime).toBe("2026-05-25T13:00:00");
    expect(line?.phase2Match?.id).toBe("62");
  });

  it("maps square L slots to Monday meals via ORDRE without team-name joins", () => {
    const matches: Match[] = [
      buildMatch({ id: "51", date: "2026-05-25T08:00:00.000Z", teamA: "G4", teamB: "H3" }),
      buildMatch({ id: "52", date: "2026-05-25T08:05:00.000Z", teamA: "G3", teamB: "H4" }),
    ];
    const classementsBySquare = {
      L: buildClassement("L", [
        { id: "resolved-a", name: "Equipe deja resolue A", rang: 3, ordre: 1, ordreFinal: 3, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:00:00" },
        { id: "resolved-b", name: "Equipe deja resolue B", rang: 4, ordre: 2, ordreFinal: 4, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:40:00" },
        { id: "resolved-c", name: "Equipe deja resolue C", rang: 1, ordre: 3, ordreFinal: 1, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T12:20:00" },
        { id: "resolved-d", name: "Equipe deja resolue D", rang: 2, ordre: 4, ordreFinal: 2, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T13:00:00" },
      ]),
    };

    const lines = buildPlanningJ3Lines(matches, classementsBySquare);

    expect(lines.map((line) => [line.id, line.mealTime])).toEqual([
      ["loss:G4-H3", "2026-05-25T11:00:00"],
      ["loss:G3-H4", "2026-05-25T11:40:00"],
      ["win:G4-H3", "2026-05-25T12:20:00"],
      ["win:G3-H4", "2026-05-25T13:00:00"],
    ]);
  });

  it("reads K Monday meals for Perd. E3-F4 and Vain. E3-F4 from ORDRE slots 2 and 4", () => {
    const matches: Match[] = [
      buildMatch({ id: "63", date: "2026-05-25T08:54:00.000Z", teamA: "E4", teamB: "F3" }),
      buildMatch({ id: "64", date: "2026-05-25T09:21:00.000Z", teamA: "E3", teamB: "F4" }),
      buildMatch({
        id: "73",
        date: "2026-05-25T13:10:00.000Z",
        teamA: "Perd. E4-F3",
        teamB: "Perd. E3-F4",
      }),
      buildMatch({
        id: "74",
        date: "2026-05-25T13:37:00.000Z",
        teamA: "Vain. E4-F3",
        teamB: "Vain. E3-F4",
      }),
    ];
    const classementsBySquare = {
      K: buildClassement("K", [
        { id: "k1", name: "slot1", rang: 3, ordre: 1, ordreFinal: 3, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:15:00" },
        { id: "k2", name: "slot2", rang: 4, ordre: 2, ordreFinal: 4, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:25:00" },
        { id: "k3", name: "slot3", rang: 1, ordre: 3, ordreFinal: 1, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:35:00" },
        { id: "k4", name: "slot4", rang: 2, ordre: 4, ordreFinal: 2, joues: 0, victoires: 0, nuls: 0, defaites: 0, points: 0, bp: 0, bc: 0, diff: 0, repasLundi: "2026-05-25T11:45:00" },
      ]),
    };

    const lines = buildPlanningJ3Lines(matches, classementsBySquare);

    expect(lines.find((line) => line.id === "loss:E3-F4")).toMatchObject({
      displayLabel: "Perd. E3-F4",
      squareCode: "K",
      slot: 2,
      mealTime: "2026-05-25T11:25:00",
    });
    expect(lines.find((line) => line.id === "loss:E3-F4")?.phase2Match?.id).toBe("73");

    expect(lines.find((line) => line.id === "win:E3-F4")).toMatchObject({
      displayLabel: "Vain. E3-F4",
      squareCode: "K",
      slot: 4,
      mealTime: "2026-05-25T11:45:00",
    });
    expect(lines.find((line) => line.id === "win:E3-F4")?.phase2Match?.id).toBe("74");
  });

  it("keeps the legacy pG3H4 / vG3H4 aliases supported on the front", () => {
    expect(parsePlanningJ3Participant("pG3H4")?.canonicalId).toBe("loss:G3-H4");
    expect(parsePlanningJ3Participant("vG3H4")?.canonicalId).toBe("win:G3-H4");
  });

  it("keeps J3 phase 2 mapped even when TA_MATCHS already contains resolved team names", () => {
    const matches: Match[] = [
      buildMatch({ id: "63", date: "2026-05-25T08:54:00.000Z", teamA: "E4", teamB: "F3" }),
      buildMatch({ id: "64", date: "2026-05-25T09:21:00.000Z", teamA: "E3", teamB: "F4" }),
      buildMatch({
        id: "73",
        date: "2026-05-25T13:10:00.000Z",
        teamA: "Champigny",
        teamB: "Tours",
      }),
      buildMatch({
        id: "74",
        date: "2026-05-25T13:37:00.000Z",
        teamA: "Meyrin",
        teamB: "Aulnay",
      }),
    ];

    const lines = buildPlanningJ3Lines(matches, {});

    expect(lines.find((line) => line.id === "loss:E4-F3")?.phase2Match?.id).toBe("73");
    expect(lines.find((line) => line.id === "loss:E3-F4")?.phase2Match?.id).toBe("73");
    expect(lines.find((line) => line.id === "win:E4-F3")?.phase2Match?.id).toBe("74");
    expect(lines.find((line) => line.id === "win:E3-F4")?.phase2Match?.id).toBe("74");
  });
});
