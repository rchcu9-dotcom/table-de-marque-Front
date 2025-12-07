/**
 * Returns the API base URL or throws with a clear message if missing.
 * This prevents silent fallbacks and forces .env.local/.env to define the value.
 */
export function requireBaseUrl(): string {
  const env =
    (typeof import.meta !== "undefined" ? (import.meta as any)?.env : undefined) ??
    (globalThis as any)?.process?.env ??
    {};
  const envBaseUrl = env?.VITE_API_BASE_URL;

  if (!envBaseUrl || envBaseUrl.trim().length === 0) {
    const fallback =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : undefined;
    if (fallback) {
      console.warn(
        "VITE_API_BASE_URL manquante : utilisation du fallback window.location.origin =",
        fallback,
      );
      return fallback;
    }

    console.error(
      "VITE_API_BASE_URL is missing; available env keys =",
      env ? Object.keys(env) : "none",
    );
    throw new Error(
      "VITE_API_BASE_URL manquante : definis-la dans .env.local (ex: http://localhost:3000).",
    );
  }

  return envBaseUrl.trim().replace(/\/+$/, "");
}
