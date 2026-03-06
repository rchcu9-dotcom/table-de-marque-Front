import type { Match } from "../../api/match";

function hasValidScore(match: Match): boolean {
  return (
    typeof match.scoreA === "number" &&
    Number.isFinite(match.scoreA) &&
    typeof match.scoreB === "number" &&
    Number.isFinite(match.scoreB)
  );
}

function neutralLabel(a: string, b: string): string {
  return `${a} et ${b} se neutralisent.`;
}

export function getLiveCommentary(match: Match | null): string {
  if (!match) return "Le tournoi va commencer.";

  const teamA = match.teamA?.trim() || "Equipe A";
  const teamB = match.teamB?.trim() || "Equipe B";

  if (!hasValidScore(match)) return "Informations de score indisponibles.";

  const scoreA = match.scoreA as number;
  const scoreB = match.scoreB as number;

  if (match.status === "ongoing") {
    if (scoreA === scoreB) return neutralLabel(teamA, teamB);
    const leader = scoreA > scoreB ? teamA : teamB;
    const diff = Math.abs(scoreA - scoreB);
    if (diff === 1) return `${leader} est devant.`;
    if (diff === 2) return `${leader} se detache.`;
    return `${leader} s'envole.`;
  }

  if (match.status === "finished") {
    if (scoreA === scoreB) return neutralLabel(teamA, teamB);
    const winner = scoreA > scoreB ? teamA : teamB;
    return `${winner} s'impose.`;
  }

  return "Le tournoi va commencer.";
}
