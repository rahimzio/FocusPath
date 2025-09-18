// src/lib/fetcher.ts
export async function jsonFetcher(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, {
    // vermeidet oft 304 – und ist für interne API-Routen ok
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  // 204/304 haben keinen Body -> nichts parsen
  if (res.status === 204 || res.status === 304) return undefined;

  // andere Fehler explizit werfen (damit SWR korrekt reagiert)
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  // normaler JSON-Body
  return res.json();
}