/**
 * Returns API base URL from build-time injection.
 * Fails if missing to avoid silent fallbacks.
 */
declare const __APP_API_BASE_URL__: string | undefined;

export function getApiBaseUrl(): string {
  const raw =
    typeof __APP_API_BASE_URL__ !== "undefined" ? __APP_API_BASE_URL__ : "";
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      "VITE_API_BASE_URL manquante : definis-la dans .env/.env.local avant build.",
    );
  }
  return raw.trim().replace(/\/+$/, "");
}
