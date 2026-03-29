import type { Match } from "../api/match";

const PARIS_DATE_KEY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type TournamentDay = 1 | 2 | 3;

export function tournamentDateKey(value: string | Date) {
  return PARIS_DATE_KEY_FORMATTER.format(new Date(value));
}

export function sortedTournamentDateKeys(matches: Match[]) {
  return [...new Set(
    matches
      .filter((match) => match.status !== "deleted")
      .map((match) => tournamentDateKey(match.date)),
  )].sort();
}

function hasStarted(dayMatches: Match[]) {
  return dayMatches.some((m) => m.status === "ongoing" || m.status === "finished");
}

function allFinished(dayMatches: Match[]) {
  return dayMatches.length > 0 && dayMatches.every((m) => m.status === "finished");
}

export function deriveTournamentDay(matches: Match[], now: Date = new Date()): TournamentDay {
  const nonDeleted = matches.filter((m) => m.status !== "deleted");
  const [j1Key, j2Key, j3Key] = sortedTournamentDateKeys(matches);
  const todayKey = tournamentDateKey(now);

  if (j3Key) {
    const j3Matches = nonDeleted.filter((m) => tournamentDateKey(m.date) === j3Key);
    if (hasStarted(j3Matches) || todayKey >= j3Key) return 3;
  }
  if (j2Key) {
    const j1Matches = nonDeleted.filter((m) => tournamentDateKey(m.date) === j1Key);
    if (allFinished(j1Matches) || todayKey >= j2Key) return 2;
  }
  return 1;
}

export function formatTournamentDayKey(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("fr-FR", {
    ...options,
    timeZone: "Europe/Paris",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}
