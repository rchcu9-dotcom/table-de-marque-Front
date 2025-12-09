/**
 * Returns the API base URL or throws with a clear message if missing.
 */
export function requireBaseUrl(): string {
  const injected = (globalThis as any).__APP_API_BASE_URL__ as string | undefined;
  const env =
    (typeof import.meta !== "undefined" ? (import.meta as any)?.env : undefined) ??
    (globalThis as any)?.process?.env ??
    {};
  const rawEnv = env?.VITE_API_BASE_URL;
  const raw = (injected ?? rawEnv ?? (globalThis as any)?.process?.env?.VITE_API_BASE_URL ?? "").trim();

  if (!raw) {
    // Diagnostic logs to inspect loaded environments when missing
    console.error("globalThis.__APP_API_BASE_URL__ =", injected);
    console.error("import.meta.env =", (import.meta as any)?.env);
    console.error(
      "process.env.VITE_API_BASE_URL =",
      (globalThis as any)?.process?.env?.VITE_API_BASE_URL,
    );
    throw new Error(
      "VITE_API_BASE_URL manquante : definis-la dans un fichier .env a la racine du projet (ou .env.local) puis relance pnpm dev/build.",
    );
  }

  return raw.replace(/\/+$/, "");
}
