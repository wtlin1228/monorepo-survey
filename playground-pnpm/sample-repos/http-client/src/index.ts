import { createLogger } from "@acme/logger";

const log = createLogger("warn");

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
}

export function backoffDelays({ retries, baseDelayMs }: RetryOptions): number[] {
  return Array.from({ length: retries }, (_, i) => baseDelayMs * 2 ** i);
}

export async function fetchWithRetry(url: string, options: RetryOptions): Promise<Response> {
  let lastError: unknown;
  for (const delay of [0, ...backoffDelays(options)]) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      return await fetch(url);
    } catch (err) {
      lastError = err;
      log.warn("request failed, retrying", { url, delay });
    }
  }
  throw lastError;
}
