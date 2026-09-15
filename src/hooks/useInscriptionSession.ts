import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  fetchEditionCourante,
  fetchProfilInscription,
  fetchMaCandidature,
} from '../api/inscription';
import type {
  Edition,
  EditionEtape,
  ProfilInscription,
  ProfilRole,
  StatutInscription,
} from '../api/types/inscription.types';

export const EDITION_QUERY_KEY = ['inscription', 'edition-courante'] as const;
export const PROFIL_QUERY_KEY = (uid: string | null) =>
  ['inscription', 'profil', uid] as const;
export const MA_CANDIDATURE_QUERY_KEY = (uid: string | null) =>
  ['inscription', 'ma-candidature', uid] as const;

/**
 * Miroir de STATUTS_DOSSIER_ACCESSIBLE (back: dossier-access.service.ts:9-13).
 * Dupliqué côté front faute de partage de constantes entre back/front.
 */
export const STATUTS_DOSSIER_ACCESSIBLE_FRONT: StatutInscription[] = [
  'VALIDEE',
  'DOSSIER_EN_COURS',
  'DOSSIER_COMPLET',
];

export interface InscriptionSession {
  edition: Edition | null;
  etape: EditionEtape | null;
  profil: ProfilInscription | null;
  role: ProfilRole | null;
  hasDossierAccess: boolean;
  token: string | null;
  isLoading: boolean;
}

/**
 * Source partagée (rôle + étape) pour la coquille de navigation et
 * InscriptionPage — dédup via le cache TanStack Query, pas de nouveau
 * Provider/Context.
 * Le token vient directement de useAuth() (JWT stocké en localStorage),
 * plus de getIdToken() async Firebase.
 */
export function useInscriptionSession(): InscriptionSession {
  const { user, token, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;

  const editionQuery = useQuery({
    queryKey: EDITION_QUERY_KEY,
    queryFn: fetchEditionCourante,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const profilQuery = useQuery({
    queryKey: PROFIL_QUERY_KEY(uid),
    queryFn: () => fetchProfilInscription(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const maCandidatureQuery = useQuery({
    queryKey: MA_CANDIDATURE_QUERY_KEY(uid),
    queryFn: () => fetchMaCandidature(token!),
    enabled: !!token,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const statutInscription = maCandidatureQuery.data?.statut ?? null;
  const hasDossierAccess = statutInscription
    ? STATUTS_DOSSIER_ACCESSIBLE_FRONT.includes(statutInscription)
    : false;

  return {
    edition: editionQuery.data ?? null,
    etape: editionQuery.data?.etape ?? null,
    profil: profilQuery.data ?? null,
    role: profilQuery.data?.role ?? null,
    hasDossierAccess,
    token,
    isLoading:
      authLoading ||
      editionQuery.isLoading ||
      (!!user && profilQuery.isLoading),
  };
}
