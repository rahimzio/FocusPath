import type { NextApiRequest, NextApiResponse } from "next";

// Optional: Free-Key bei Alpha Vantage (für Stocks/ETFs)
// .env.local -> ALPHAVANTAGE_KEY=xxxxx
const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_KEY || "";

type Suggestion = {
  class: "crypto" | "stock" | "etf";
  symbol: string;          // unser kanonisches Symbol (z.B. "BTC", "AAPL")
  name?: string;           // Display Name
  provider: "coingecko" | "alphavantage";
  providerId?: string;     // CoinGecko-ID (z.B. "bitcoin")
  market?: string;         // AlphaVantage: Region/Börse sofern verfügbar
};

// kleine Rate-Limit-Schonung
const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

function dedupe(items: Suggestion[]): Suggestion[] {
  const map = new Map<string, Suggestion>();
  for (const it of items) {
    const key = `${it.class}|${it.symbol.toUpperCase()}`;
    if (!map.has(key)) map.set(key, { ...it, symbol: it.symbol.toUpperCase() });
  }
  return Array.from(map.values());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  const q = String(req.query.q || "").trim();
  const type = String(req.query.type || "all").toLowerCase(); // "crypto" | "stock" | "etf" | "all"
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 25)));

  if (!q) return res.status(400).json({ message: "Missing q" });

  try {
    const out: Suggestion[] = [];

    // --- 1) Crypto: CoinGecko (kein Key nötig) ---
    if (type === "crypto" || type === "all") {
      try {
        const r = await fetch(`${COINGECKO_BASE}/search?query=${encodeURIComponent(q)}`, {
          headers: { accept: "application/json" },
          // einfache Cache-Hinweise (Next.js kann daraus profitieren)
          next: { revalidate: 300 }
        });
        if (r.ok) {
          const j = await r.json();
          for (const c of (j?.coins ?? [])) {
            // CoinGecko-Symbol ist oft lowercase → uppercased vereinheitlichen
            out.push({
              class: "crypto",
              symbol: String(c.symbol || "").toUpperCase(),
              name: c.name,
              provider: "coingecko",
              providerId: c.id, // wichtig für Preisabruf
            });
          }
        }
      } catch (e) {
        console.warn("[searchAsset] coingecko error", e);
      }
    }

    // --- 2) Stocks/ETFs: Alpha Vantage (Free Key) ---
    if (ALPHAVANTAGE_KEY && (type === "stock" || type === "etf" || type === "all")) {
      try {
        const r = await fetch(
          `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&apikey=${ALPHAVANTAGE_KEY}&keywords=${encodeURIComponent(q)}`,
          { headers: { accept: "application/json" } }
        );
        if (r.ok) {
          const j = await r.json();
          for (const m of (j?.bestMatches ?? [])) {
            const symbol = (m["1. symbol"] || "").toUpperCase();
            const name = m["2. name"];
            const region = m["4. region"];       // e.g. "United States"
            // ETF-Erkennung ist nicht zuverlässig in AV; wenn du willst, füge später Heuristiken hinzu
            out.push({
              class: "stock",
              symbol,
              name,
              provider: "alphavantage",
              market: region,
            });
          }
        }
      } catch (e) {
        console.warn("[searchAsset] alphavantage error", e);
      }
    }

    // Duplikate entfernen & limitieren
    const results = dedupe(out).slice(0, limit);

    return res.status(200).json({ results });
  } catch (e) {
    console.error("searchAsset", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
