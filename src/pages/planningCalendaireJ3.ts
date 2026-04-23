import type { ClassementEquipe, PouleClassement } from "../api/classement";
import type { Match } from "../api/match";

type J3SquareCode = "I" | "J" | "K" | "L";
type J3TrajectoryType = "phase1" | "loser" | "winner";
type J3PoolCode = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
type J3SeedRank = 1 | 2 | 3 | 4;
type J3SeedCode = `${J3PoolCode}${J3SeedRank}`;
type J3StableSlot = 1 | 2 | 3 | 4;

type CanonicalSeedPair = {
  left: J3SeedCode;
  right: J3SeedCode;
  matchKey: string;
  squareCode: J3SquareCode;
  semiIndex: 1 | 2;
};

export type ParsedPlanningJ3Participant = {
  type: J3TrajectoryType;
  seed: J3SeedCode;
  sourceMatchKey: string | null;
  squareCode: J3SquareCode | null;
  slot: J3StableSlot | null;
  canonicalId: string;
  displayLabel: string;
};

export type PlanningJ3Line = {
  id: string;
  displayLabel: string;
  squareCode: J3SquareCode;
  slot: J3StableSlot;
  sourceMatch: Match | null;
  phase2Match: Match | null;
  mealTime: string | null;
};

type J3ClassementBySquare = Partial<Record<J3SquareCode, PouleClassement | undefined>>;

const MAX_ORDER = Number.MAX_SAFE_INTEGER;

// Real J3 layout observed in ta_classement / TA_MATCHS on the test DB.
const J3_PHASE2_BY_MATCH_NUMBER: Partial<
  Record<number, { squareCode: J3SquareCode; resultType: Exclude<J3TrajectoryType, "phase1"> }>
> = {
  71: { squareCode: "L", resultType: "loser" },
  72: { squareCode: "L", resultType: "winner" },
  73: { squareCode: "K", resultType: "loser" },
  74: { squareCode: "K", resultType: "winner" },
  76: { squareCode: "J", resultType: "loser" },
  77: { squareCode: "J", resultType: "winner" },
  81: { squareCode: "I", resultType: "loser" },
  83: { squareCode: "I", resultType: "winner" },
};

function normalizeTeamKey(value: string): string {
  return value.trim().toLowerCase();
}

function compareMatchOrder(a: Match, b: Match): number {
  const dateDelta = new Date(a.date).getTime() - new Date(b.date).getTime();
  if (dateDelta !== 0) return dateDelta;
  const numA = Number(a.id);
  const numB = Number(b.id);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.id.localeCompare(b.id, "fr-FR");
}

function inferSquareCodeFromPoolAndRank(
  pool: J3PoolCode,
  rank: J3SeedRank,
): J3SquareCode | null {
  const isTopBucket = rank <= 2;
  if (pool === "E" || pool === "F") {
    return isTopBucket ? "I" : "K";
  }
  if (pool === "G" || pool === "H") {
    return isTopBucket ? "J" : "L";
  }
  return null;
}

function parseSeed(value: string): {
  pool: J3PoolCode;
  rank: J3SeedRank;
  seed: J3SeedCode;
  squareCode: J3SquareCode | null;
} | null {
  const match = value.trim().toUpperCase().match(/^([A-H])\s*([1-4])$/);
  if (!match) return null;
  const pool = match[1] as J3PoolCode;
  const rank = Number(match[2]) as J3SeedRank;
  return {
    pool,
    rank,
    seed: `${pool}${rank}` as J3SeedCode,
    squareCode: inferSquareCodeFromPoolAndRank(pool, rank),
  };
}

function canonicalizeSeedPair(
  leftSeed: J3SeedCode,
  rightSeed: J3SeedCode,
): CanonicalSeedPair | null {
  const left = parseSeed(leftSeed);
  const right = parseSeed(rightSeed);
  if (!left || !right) return null;

  const ordered = [left, right].sort((a, b) =>
    a.pool.localeCompare(b.pool, "fr-FR"),
  );
  const first = ordered[0];
  const second = ordered[1];
  const poolsKey = `${first.pool}${second.pool}`;
  if (!["EF", "GH"].includes(poolsKey)) return null;

  const sameBucket =
    (first.rank <= 2 && second.rank <= 2) ||
    (first.rank >= 3 && second.rank >= 3);
  if (!sameBucket) return null;

  let semiIndex: 1 | 2 | null = null;
  if (first.rank === 2 && second.rank === 1) semiIndex = 1;
  if (first.rank === 1 && second.rank === 2) semiIndex = 2;
  if (first.rank === 4 && second.rank === 3) semiIndex = 1;
  if (first.rank === 3 && second.rank === 4) semiIndex = 2;
  if (!semiIndex || !first.squareCode) return null;

  return {
    left: first.seed,
    right: second.seed,
    matchKey: `${first.seed}-${second.seed}`,
    squareCode: first.squareCode,
    semiIndex,
  };
}

function slotFromPair(
  type: Exclude<J3TrajectoryType, "phase1">,
  pair: CanonicalSeedPair,
): J3StableSlot {
  if (type === "loser") {
    return pair.semiIndex === 1 ? 1 : 2;
  }
  return pair.semiIndex === 1 ? 3 : 4;
}

export function parsePlanningJ3Participant(
  value: string,
): ParsedPlanningJ3Participant | null {
  const seed = parseSeed(value);
  if (seed) {
    return {
      type: "phase1",
      seed: seed.seed,
      sourceMatchKey: null,
      squareCode: seed.squareCode,
      slot: null,
      canonicalId: `seed:${seed.seed}`,
      displayLabel: seed.seed,
    };
  }

  const trimmed = value.trim();
  const primary = trimmed.match(
    /^(Perd|Vain)\.?\s*([A-H][1-4])\s*-\s*([A-H][1-4])$/i,
  );
  const legacy = trimmed.match(/^([PV])([A-H][1-4])([A-H][1-4])$/i);
  if (!primary && !legacy) return null;

  const type: Exclude<J3TrajectoryType, "phase1"> =
    primary?.[1].toLowerCase() === "perd" || legacy?.[1].toLowerCase() === "p"
      ? "loser"
      : "winner";
  const pair = canonicalizeSeedPair(
    (primary?.[2] ?? legacy?.[2] ?? "").toUpperCase() as J3SeedCode,
    (primary?.[3] ?? legacy?.[3] ?? "").toUpperCase() as J3SeedCode,
  );
  if (!pair) return null;

  return {
    type,
    seed: pair.left,
    sourceMatchKey: pair.matchKey,
    squareCode: pair.squareCode,
    slot: slotFromPair(type, pair),
    canonicalId: `${type === "loser" ? "loss" : "win"}:${pair.matchKey}`,
    displayLabel: `${type === "loser" ? "Perd." : "Vain."} ${pair.matchKey}`,
  };
}

function resolveOutcomeIds(match: Match): Record<string, string> {
  if (match.status !== "finished") return {};
  const scoreA = match.scoreA ?? 0;
  const scoreB = match.scoreB ?? 0;
  const winnerName = scoreA >= scoreB ? match.teamA : match.teamB;
  const loserName = scoreA >= scoreB ? match.teamB : match.teamA;
  const pair = canonicalizeSeedPair(match.teamA as J3SeedCode, match.teamB as J3SeedCode);
  if (!pair) return {};
  return {
    [normalizeTeamKey(winnerName)]: `win:${pair.matchKey}`,
    [normalizeTeamKey(loserName)]: `loss:${pair.matchKey}`,
  };
}

function extractPhase1Descriptor(match: Match): {
  match: Match;
  pair: CanonicalSeedPair;
} | null {
  const seedA = parseSeed(match.teamA);
  const seedB = parseSeed(match.teamB);
  if (!seedA || !seedB) return null;
  const pair = canonicalizeSeedPair(seedA.seed, seedB.seed);
  if (!pair) return null;
  return { match, pair };
}

function classementRowsBySlot(classement?: PouleClassement): ClassementEquipe[] {
  return [...(classement?.equipes ?? [])].sort((a, b) => {
    const orderDelta = (a.ordre ?? MAX_ORDER) - (b.ordre ?? MAX_ORDER);
    if (orderDelta !== 0) return orderDelta;
    return (a.rang ?? MAX_ORDER) - (b.rang ?? MAX_ORDER);
  });
}

function inferTrajectoryIdsFromPhase2MatchNumber(
  match: Match,
  phase1Descriptors: Array<{ match: Match; pair: CanonicalSeedPair }>,
): { teamA: string | null; teamB: string | null } | null {
  const matchNum = Number(match.id);
  if (Number.isNaN(matchNum)) return null;

  const fallback = J3_PHASE2_BY_MATCH_NUMBER[matchNum];
  if (!fallback) return null;

  const { squareCode, resultType } = fallback;
  const squareSemis = phase1Descriptors
    .filter((descriptor) => descriptor.pair.squareCode === squareCode)
    .sort((a, b) => compareMatchOrder(a.match, b.match));
  if (!squareSemis.length) return null;

  return {
    teamA: squareSemis[0]
      ? `${resultType === "loser" ? "loss" : "win"}:${squareSemis[0].pair.matchKey}`
      : null,
    teamB: squareSemis[1]
      ? `${resultType === "loser" ? "loss" : "win"}:${squareSemis[1].pair.matchKey}`
      : null,
  };
}

export function buildPlanningJ3Lines(
  matches: Match[],
  classementsBySquare: J3ClassementBySquare,
): PlanningJ3Line[] {
  const phase1Descriptors = matches
    .map((match) => extractPhase1Descriptor(match))
    .filter((value): value is { match: Match; pair: CanonicalSeedPair } => value !== null)
    .sort((a, b) => compareMatchOrder(a.match, b.match));

  const outcomeIdsByTeam = new Map<string, string>();
  for (const descriptor of phase1Descriptors) {
    const outcomeIds = resolveOutcomeIds(descriptor.match);
    Object.entries(outcomeIds).forEach(([teamName, trajectoryId]) => {
      outcomeIdsByTeam.set(teamName, trajectoryId);
    });
  }

  const phase2MatchByTrajectoryId = new Map<string, Match>();
  for (const match of matches) {
    if (extractPhase1Descriptor(match)) continue;
    const byMatchNumber = inferTrajectoryIdsFromPhase2MatchNumber(
      match,
      phase1Descriptors,
    );
    const participants = [
      { label: match.teamA, fallbackId: byMatchNumber?.teamA ?? null },
      { label: match.teamB, fallbackId: byMatchNumber?.teamB ?? null },
    ];
    for (const participant of participants) {
      const parsed = parsePlanningJ3Participant(participant.label);
      const trajectoryId =
        (parsed && parsed.type !== "phase1" ? parsed.canonicalId : null) ??
        outcomeIdsByTeam.get(normalizeTeamKey(participant.label)) ??
        participant.fallbackId ??
        null;
      if (trajectoryId && !phase2MatchByTrajectoryId.has(trajectoryId)) {
        phase2MatchByTrajectoryId.set(trajectoryId, match);
      }
    }
  }

  const mealByTrajectoryId = new Map<string, string>();
  (["I", "J", "K", "L"] as const).forEach((squareCode) => {
    const squareSemis = phase1Descriptors
      .filter((descriptor) => descriptor.pair.squareCode === squareCode)
      .sort((a, b) => compareMatchOrder(a.match, b.match));
    if (!squareSemis.length) return;

    const trajectoryIds = [
      squareSemis[0] ? `loss:${squareSemis[0].pair.matchKey}` : null,
      squareSemis[1] ? `loss:${squareSemis[1].pair.matchKey}` : null,
      squareSemis[0] ? `win:${squareSemis[0].pair.matchKey}` : null,
      squareSemis[1] ? `win:${squareSemis[1].pair.matchKey}` : null,
    ];
    const classementRows = classementRowsBySlot(classementsBySquare[squareCode]);
    classementRows.forEach((row, index) => {
      const trajectoryId = trajectoryIds[index];
      if (trajectoryId && row.repasLundi) {
        mealByTrajectoryId.set(trajectoryId, row.repasLundi);
      }
    });
  });

  const lines = phase1Descriptors.flatMap((descriptor) => {
    const lossId = `loss:${descriptor.pair.matchKey}`;
    const winId = `win:${descriptor.pair.matchKey}`;
    return [
      {
        id: lossId,
        displayLabel: `Perd. ${descriptor.pair.matchKey}`,
        squareCode: descriptor.pair.squareCode,
        slot: slotFromPair("loser", descriptor.pair),
        sourceMatch: descriptor.match,
        phase2Match: phase2MatchByTrajectoryId.get(lossId) ?? null,
        mealTime: mealByTrajectoryId.get(lossId) ?? null,
      },
      {
        id: winId,
        displayLabel: `Vain. ${descriptor.pair.matchKey}`,
        squareCode: descriptor.pair.squareCode,
        slot: slotFromPair("winner", descriptor.pair),
        sourceMatch: descriptor.match,
        phase2Match: phase2MatchByTrajectoryId.get(winId) ?? null,
        mealTime: mealByTrajectoryId.get(winId) ?? null,
      },
    ] satisfies PlanningJ3Line[];
  });

  return lines.sort((a, b) => {
    const squareOrder: Record<J3SquareCode, number> = { I: 0, J: 1, K: 2, L: 3 };
    const squareDelta = squareOrder[a.squareCode] - squareOrder[b.squareCode];
    if (squareDelta !== 0) return squareDelta;
    return a.slot - b.slot;
  });
}
