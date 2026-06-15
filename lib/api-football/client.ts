import "server-only";

import { API_FOOTBALL_HOST, API_FOOTBALL_KEY } from "./env";

/** Shape of every API-Football v3 envelope. */
export interface ApiFootballResponse<T> {
  get: string;
  results: number;
  // API returns 200 with a populated `errors` field for auth/quota problems.
  errors: string[] | Record<string, string>;
  response: T[];
}

/**
 * Low-level GET against api-sports.io. Uses the `x-apisports-key` header
 * (direct access, not RapidAPI). `revalidate` controls Next's data cache —
 * important because the free plan is rate-limited (≈100 req/day, 10/min).
 */
export async function apiFootballGet<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = 60,
): Promise<T[]> {
  const url = new URL(`https://${API_FOOTBALL_HOST}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { "x-apisports-key": API_FOOTBALL_KEY ?? "" },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`API-Football ${path} → HTTP ${res.status}`);
  }

  const data = (await res.json()) as ApiFootballResponse<T>;
  const errs = data.errors;
  const hasErrors = Array.isArray(errs) ? errs.length > 0 : Object.keys(errs).length > 0;
  if (hasErrors) {
    throw new Error(`API-Football ${path} → ${JSON.stringify(errs)}`);
  }

  return data.response ?? [];
}
