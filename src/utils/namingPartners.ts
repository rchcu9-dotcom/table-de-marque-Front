import type { Partenaire } from "../api/partenaire";

/** Mapping code de poule → NAMING_GROUP */
const POOL_CODE_TO_GROUP: Record<string, "A" | "B" | "C" | "D"> = {
  // J1
  A: "A", B: "B", C: "C", D: "D",
  // J2
  Alpha: "A", Beta: "B", Gamma: "C", Delta: "D",
  // J3 (dbCode)
  E: "A", F: "B", G: "C", H: "D",
};

/** Retourne le partenaire naming associé à un code de poule, ou null */
export function getNamingPartnerForCode(
  code: string,
  namingPartners: Partenaire[],
): Partenaire | null {
  const group = POOL_CODE_TO_GROUP[code];
  if (!group) return null;
  return namingPartners.find((p) => p.type === "naming" && p.namingGroup === group) ?? null;
}

/** Enrichit un titre de poule avec le nom du partenaire naming.
 *  Fonctionne avec ou sans préfixe "Sam / Dim - " (API vs affichage statique).
 */
export function buildNamingTitle(
  code: string,
  baseTitle: string,
  namingPartners: Partenaire[],
): string {
  const partner = getNamingPartnerForCode(code, namingPartners);
  if (!partner) return baseTitle;

  // J1 : "(Sam ?)Poule A" → "(Sam ?)Poule [Nom] A"
  const j1 = baseTitle.match(/^(.*?Poule\s+)([A-D])(.*)$/);
  if (j1) return `${j1[1]}${partner.nom} ${j1[2]}${j1[3]}`;

  // J2 Or : "(Dim - ?)Tournoi Or - Alpha/Beta" → "(Dim - ?)Or [Nom]"
  const j2Or = baseTitle.match(/^(.*?)Tournoi Or\s*-\s*(Alpha|Beta)(.*)$/);
  if (j2Or) return `${j2Or[1]}Or ${partner.nom}${j2Or[3]}`;

  // J2 Argent : "(Dim - ?)Tournoi Argent - Gamma/Delta" → "(Dim - ?)Argent [Nom]"
  const j2Arg = baseTitle.match(/^(.*?)Tournoi Argent\s*-\s*(Gamma|Delta)(.*)$/);
  if (j2Arg) return `${j2Arg[1]}Argent ${partner.nom}${j2Arg[3]}`;

  // J3 Carré Or
  const j3Or = baseTitle.match(/^(Carré Or\s+)[A-D](.*)$/);
  if (j3Or) return `${j3Or[1]}${partner.nom}${j3Or[2]}`;

  // J3 Carré Argent
  const j3Arg = baseTitle.match(/^(Carré Argent\s+)[A-D](.*)$/);
  if (j3Arg) return `${j3Arg[1]}${partner.nom}${j3Arg[2]}`;

  return baseTitle;
}
