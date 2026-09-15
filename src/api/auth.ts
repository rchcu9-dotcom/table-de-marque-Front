import { getApiBaseUrl } from './env';
import { fetchWithRetry } from './fetchWithRetry';

export async function devLogin(
  email: string,
  displayName: string,
): Promise<{ token: string }> {
  const res = await fetchWithRetry(`${getApiBaseUrl()}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, displayName }),
  });
  return res.json() as Promise<{ token: string }>;
}
