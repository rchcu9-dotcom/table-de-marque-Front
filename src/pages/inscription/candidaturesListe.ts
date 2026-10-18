import type { CandidatureOrganisateur } from '../../api/types/inscription.types';
import { collatorFr, type SearchKey } from '../../hooks/useListControls';
import { rangParcours } from './statutConfig';

export type TriCandidatures = 'nom' | 'nom-desc' | 'statut' | 'date';

export const OPTIONS_TRI_CANDIDATURES: { value: TriCandidatures; label: string }[] = [
  { value: 'nom', label: 'Nom A→Z' },
  { value: 'nom-desc', label: 'Nom Z→A' },
  { value: 'statut', label: 'Statut' },
  { value: 'date', label: 'Date de soumission (récente d’abord)' },
];

const parNom = (a: CandidatureOrganisateur, b: CandidatureOrganisateur) =>
  collatorFr.compare(a.equipeNom, b.equipeNom);

export const TRIS_CANDIDATURES: Record<
  TriCandidatures,
  (a: CandidatureOrganisateur, b: CandidatureOrganisateur) => number
> = {
  nom: parNom,
  'nom-desc': (a, b) => parNom(b, a),
  // Ordre du parcours, puis nom pour départager.
  statut: (a, b) => rangParcours(a.statut) - rangParcours(b.statut) || parNom(a, b),
  date: (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || parNom(a, b),
};

export const RECHERCHE_CANDIDATURES: readonly SearchKey<CandidatureOrganisateur>[] = [
  'equipeNom',
  'equipeNomComplet',
  'utilisateurDisplayName',
  'utilisateurEmail',
];

export const statutCandidature = (c: CandidatureOrganisateur) => c.statut;

/** Paramètres d'URL de la liste admin (`?q=…&statut=…&tri=…`). */
export const URL_LISTE_CANDIDATURES = { q: 'q', filter: 'statut', sort: 'tri' } as const;
