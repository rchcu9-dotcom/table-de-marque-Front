/**
 * AuthUser — utilisateur authentifié côté front.
 * Le champ `uid` est mappé sur `providerUid` du backend pour ne pas casser
 * `useInscriptionSession`/`InscriptionPage` qui indexent déjà dessus.
 */
export interface AuthUser {
  uid: string;       // = providerUid (Google OAuth ID ou "dev-..." pour dev-login)
  email?: string;
  displayName?: string;
}
