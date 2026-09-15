const STORAGE_KEY = 'postLoginRedirect';

/**
 * Mémorise le chemin courant avant de naviguer vers /connexion.
 * sessionStorage (pas le state react-router) car le flux Google fait sortir
 * du SPA (redirection serveur -> Google -> /auth/callback).
 */
export function rememberCurrentPath(): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    window.location.pathname + window.location.search,
  );
}

export function consumeRedirectPath(fallback: string): string {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  return stored || fallback;
}
