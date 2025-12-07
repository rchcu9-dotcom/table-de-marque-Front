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
  const isDevFlag = Boolean((env as any)?.DEV ?? env?.NODE_ENV === "development");
  const isLocalHost =
    typeof window !== "undefined" &&
    typeof window.location?.hostname === "string" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const isDev = isDevFlag || isLocalHost;
  const prodFallback = "https://match-service-1050044602376.europe-west9.run.app";
  const devFallback = "http://localhost:3000";

  const cleaned = envBaseUrl?.trim() ?? "";
  if (cleaned.length > 0) {
    // Si on est en prod mais que la valeur pointe sur localhost, on force la cible prod
    if (!isDev && cleaned.toLowerCase().includes("localhost")) {
      console.warn(
        `VITE_API_BASE_URL=${cleaned} ignorée en prod, fallback sur ${prodFallback}`,
      );
      return prodFallback;
    }
    return cleaned.replace(/\/+$/, "");
  }

  if (!envBaseUrl || envBaseUrl.trim().length === 0) {
    const fallback = isDev ? devFallback : prodFallback;
    console.warn(
      `VITE_API_BASE_URL manquante : fallback sur ${fallback} (${isDev ? "dev" : "prod"})`,
    );
    return fallback.replace(/\/+$/, "");
  }

  return devFallback.replace(/\/+$/, "");
}
