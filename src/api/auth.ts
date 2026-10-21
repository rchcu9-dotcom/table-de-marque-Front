import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

export async function devLogin(
  email: string,
  displayName: string,
): Promise<{ token: string }> {
  // retries = 0 : un refus (403) est définitif, inutile de le rejouer avec backoff.
  const res = await fetchWithRetry(
    `${getApiBaseUrl()}/auth/dev-login`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, displayName }),
    },
    0,
  );
  return res.json() as Promise<{ token: string }>;
}
