/**
 * Returns the API base URL or throws with a clear message if missing.
 */
declare const __APP_API_BASE_URL__: string | undefined;

export function requireBaseUrl(): string {
  const injected = typeof __APP_API_BASE_URL__ !== "undefined" ? __APP_API_BASE_URL__ : undefined;
  const metaEnv =
    typeof import.meta !== "undefined" && typeof import.meta === "object" && "env" in import.meta
      ? (import.meta as { env?: Record<string, unknown> }).env
      : undefined;
  const processEnv =
    (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env ?? undefined;
  const env = metaEnv ?? processEnv ?? {};
  const rawEnv = typeof env.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL : undefined;
  const processRaw =
    typeof processEnv?.VITE_API_BASE_URL === "string" ? processEnv.VITE_API_BASE_URL : undefined;
  const raw = (injected ?? rawEnv ?? processRaw ?? "").trim();

  if (!raw) {
    // Diagnostic logs to inspect loaded environments when missing
    console.error("__APP_API_BASE_URL__ =", injected);
    console.error("import.meta.env =", metaEnv);
    console.error("process.env.VITE_API_BASE_URL =", processEnv?.VITE_API_BASE_URL);
    throw new Error(
      "VITE_API_BASE_URL manquante : definis-la dans un fichier .env a la racine du projet (ou .env.local) puis relance pnpm dev/build.",
    );
  }

  return raw.replace(/\/+$/, "");
}
