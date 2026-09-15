export type PresentationFait = {
  valeur: string;
  libelle: string;
};

/**
 * Les chiffres-clés (.facts de la maquette) sont saisis en admin dans un simple
 * textarea, une ligne par fait au format `valeur|libellé` — format texte plutôt
 * que colonne JSON pour rester éditable sans UI de répéteur dédiée.
 * Une ligne sans séparateur est traitée comme une valeur sans libellé.
 */
export function parseFaits(raw: string | null | undefined): PresentationFait[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne !== "")
    .map((ligne) => {
      const [valeur, ...reste] = ligne.split("|");
      return { valeur: valeur.trim(), libelle: reste.join("|").trim() };
    })
    .filter((fait) => fait.valeur !== "");
}
