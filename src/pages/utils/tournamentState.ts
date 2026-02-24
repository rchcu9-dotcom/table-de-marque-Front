import type { Match } from "../../api/match";

export type TournamentState = "avant" | "pendant" | "apres";

export function pickTournamentState(matches: Match[]): TournamentState {
  const relevant = matches.filter((match) => match.status !== "deleted");
  if (relevant.length === 0) return "avant";
  if (relevant.some((match) => match.status === "ongoing")) return "pendant";
  if (relevant.every((match) => match.status === "finished")) return "apres";
  if (relevant.some((match) => match.status === "finished") && relevant.some((match) => match.status === "planned")) {
    return "pendant";
  }
  return "avant";
}

export function tournamentStateLabel(state: TournamentState): string {
  if (state === "avant") return "Prêts à jouer !";
  if (state === "pendant") return "Ça joue !";
  return "Clap de fin !";
}
