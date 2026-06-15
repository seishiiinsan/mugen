import "server-only";

import { BZZOIRO_API_KEY, BZZOIRO_BASE } from "./env";

/** Standard DRF pagination envelope used by list endpoints. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Low-level GET against the Bzzoiro API (Django REST Framework).
 * Auth is a header token; the free plan is throttled (HTTP 429) rather than
 * capped daily. `revalidate` feeds Next's data cache to spare requests.
 */
export async function bzzoiroGet<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = 60,
): Promise<T> {
  const url = new URL(`${BZZOIRO_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    headers: { Authorization: `Token ${BZZOIRO_API_KEY ?? ""}` },
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Bzzoiro ${path} → HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET a paginated list endpoint and return just the `results`. */
export async function bzzoiroList<T>(
  path: string,
  params: Record<string, string | number> = {},
  revalidate = 60,
): Promise<T[]> {
  const data = await bzzoiroGet<Paginated<T>>(path, params, revalidate);
  return data.results ?? [];
}
