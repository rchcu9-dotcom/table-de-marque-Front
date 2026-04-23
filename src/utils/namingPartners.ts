import type { Partenaire } from "../api/partenaire";

/** Mapping code de poule → NAMING_GROUP */
const POOL_CODE_TO_GROUP: Record<string, "A" | "B" | "C" | "D"> = {
  // J1
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  // J2
  E: "A",
  F: "B",
  G: "C",
  H: "D",
  // Legacy aliases still accepted
  Alpha: "A",
  Beta: "B",
  Gamma: "C",
  Delta: "D",
  // J3
  I: "A",
  J: "B",
  K: "C",
  L: "D",
};

/** Retourne le partenaire naming associé à un code de poule, ou null */
export function getNamingPartnerForCode(
  code: string,
  namingPartners: Partenaire[],
): Partenaire | null {
  const group = POOL_CODE_TO_GROUP[code];
  if (!group) return null;
  return (
    namingPartners.find((p) => p.type === "naming" && p.namingGroup === group) ??
    null
  );
}

/** Enrichit un titre de poule avec le nom du partenaire naming. */
export function buildNamingTitle(
  code: string,
  baseTitle: string,
  namingPartners: Partenaire[],
): string {
  const partner = getNamingPartnerForCode(code, namingPartners);
  if (!partner) return baseTitle;

  const j1 = baseTitle.match(/^(.*?Poule\s+)([A-D])(.*)$/);
  if (j1) return `${j1[1]}${partner.nom} ${j1[2]}${j1[3]}`;

  const j2Or = baseTitle.match(/^(.*?)(?:Tournoi\s+)?Or\s*[- ]\s*(E|F)(.*)$/);
  if (j2Or) return `${j2Or[1]}Or ${partner.nom}${j2Or[3]}`;

  const j2Arg = baseTitle.match(/^(.*?)(?:Tournoi\s+)?Argent\s*[- ]\s*(G|H)(.*)$/);
  if (j2Arg) return `${j2Arg[1]}Argent ${partner.nom}${j2Arg[3]}`;

  const legacyJ2Or = baseTitle.match(/^(.*?)(?:Tournoi\s+)?Or\s*[- ]\s*(Alpha|Beta)(.*)$/i);
  if (legacyJ2Or) return `${legacyJ2Or[1]}Or ${partner.nom}${legacyJ2Or[3]}`;

  const legacyJ2Arg = baseTitle.match(/^(.*?)(?:Tournoi\s+)?Argent\s*[- ]\s*(Gamma|Delta)(.*)$/i);
  if (legacyJ2Arg) return `${legacyJ2Arg[1]}Argent ${partner.nom}${legacyJ2Arg[3]}`;

  const j3Square = baseTitle.match(
    /^(Carr[ée]?\s+)(Or|Argent)\s+(1|5|9|13)(.*)$/i,
  );
  if (j3Square) {
    return `${j3Square[1]}${j3Square[2]} ${partner.nom} ${j3Square[3]}${j3Square[4]}`;
  }

  const legacyJ3OrRange = baseTitle.match(/^(Or\s+)(1-4|5-8)(.*)$/);
  if (legacyJ3OrRange) {
    return `${legacyJ3OrRange[1]}${partner.nom} ${legacyJ3OrRange[2]}${legacyJ3OrRange[3]}`;
  }

  const legacyJ3ArgRange = baseTitle.match(/^(Argent\s+)(9-12|13-16)(.*)$/);
  if (legacyJ3ArgRange) {
    return `${legacyJ3ArgRange[1]}${partner.nom} ${legacyJ3ArgRange[2]}${legacyJ3ArgRange[3]}`;
  }

  const legacyJ3Or = baseTitle.match(/^(Carr[ée]\s+Or\s+)(A|B)(.*)$/i);
  if (legacyJ3Or) return `${legacyJ3Or[1]}${partner.nom}${legacyJ3Or[3]}`;

  const legacyJ3Arg = baseTitle.match(/^(Carr[ée]\s+Argent\s+)(C|D)(.*)$/i);
  if (legacyJ3Arg) return `${legacyJ3Arg[1]}${partner.nom}${legacyJ3Arg[3]}`;

  return baseTitle;
}
