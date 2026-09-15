import { NetworkError, ServerError, TimeoutError } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status >= 500;
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.clone().json();
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message: unknown }).message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.join(', ');
    }
  } catch {
    // Response body is not JSON (or already consumed) — fall back below.
  }
  return response.statusText;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  baseDelay = 500,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      DEFAULT_TIMEOUT_MS,
    );

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const message = await extractErrorMessage(response);
        if (isRetryableStatus(response.status) && attempt < retries) {
          lastError = new ServerError(response.status, message);
        } else {
          throw new ServerError(response.status, message);
        }
      } else {
        return response;
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof ServerError) {
        lastError = error;
      } else if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        lastError = new TimeoutError();
      } else if (error instanceof TypeError) {
        // TypeError is thrown for network failures (fetch failed)
        lastError = new NetworkError(
          error.message || 'Network request failed',
        );
      } else {
        throw error;
      }

      if (attempt >= retries) {
        break;
      }
    }

    // Exponential backoff with jitter
    const jitter = Math.random() * baseDelay;
    const delay = baseDelay * Math.pow(2, attempt) + jitter;
    await sleep(delay);
  }

  throw lastError;
}
