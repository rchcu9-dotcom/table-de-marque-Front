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

export function deriveTournamentDay(matches: Match[], now: Date = new Date()): TournamentDay {
  const [, j2, j3] = sortedTournamentDateKeys(matches);
  const todayKey = tournamentDateKey(now);

  if (!j2 || todayKey < j2) return 1;
  if (!j3 || todayKey < j3) return 2;
  return 3;
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
