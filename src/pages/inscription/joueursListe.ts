import type { JoueurDossier } from '../../api/types/inscription.types';
import { collatorFr, type SearchKey } from '../../hooks/useListControls';

export type ColonneTri = 'nom' | 'prenom' | 'numero';
export type TriJoueurs = ColonneTri | `${ColonneTri}-desc`;

const parNomPrenom = (a: JoueurDossier, b: JoueurDossier) =>
  collatorFr.compare(a.nom, b.nom) || collatorFr.compare(a.prenom, b.prenom);
const parPrenomNom = (a: JoueurDossier, b: JoueurDossier) =>
  collatorFr.compare(a.prenom, b.prenom) || collatorFr.compare(a.nom, b.nom);
const parNumero = (a: JoueurDossier, b: JoueurDossier) =>
  a.numero - b.numero || parNomPrenom(a, b);

export const TRIS_JOUEURS: Record<TriJoueurs, (a: JoueurDossier, b: JoueurDossier) => number> = {
  nom: parNomPrenom,
  'nom-desc': (a, b) => parNomPrenom(b, a),
  prenom: parPrenomNom,
  'prenom-desc': (a, b) => parPrenomNom(b, a),
  numero: parNumero,
  'numero-desc': (a, b) => parNumero(b, a),
};

export const RECHERCHE_JOUEURS: readonly SearchKey<JoueurDossier>[] = ['nom', 'prenom'];
