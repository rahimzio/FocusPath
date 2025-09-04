// pages/api/_lib/prices.ts
import { FINANCE_COLLECTION, nowISO } from "@/lib/api/finance";
import type { Db } from "mongodb";

export type AssetClass = "crypto" | "stock" | "etf";

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// "YYYY-MM-DD" in Europe/Berlin
export function berlinDateYYYYMMDD(d = new Date()) {
  const fmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.format(d).split(".");
  const day = parts[0]!.padStart(2, "0");
  const month = parts[1]!.padStart(2, "0");
  const year = parts[2]!;
  return `${year}-${month}-${day}`;
}

// ISO-KW wie "2025-33"
export function getISOWeekString(d = new Date()) {
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  if (dayNum !== 1) utc.setUTCDate(utc.getUTCDate() + (1 - dayNum));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

/** Symbole aus EINER Collection `finance` ziehen:
 *  - mapping-Dokumente: kind:"symbol"
 *  - fallback: aus Transaktionen vorhandene Assets (nur wenn Mappings vorhanden sind, sonst skip)
 */
export async function gatherSymbols(db: Db) {
  const symDocs = await db.collection(FINANCE_COLLECTION)
    .find({ kind: "symbol" }, { projection: { class: 1, symbol: 1, providers: 1 } })
    .toArray();

  const crypto = new Map<string, { symbol: string; coingeckoId: string }>();
  const stocksEtfs = new Map<string, { symbol: string; alphaTicker: string; class: AssetClass }>();

  for (const s of symDocs) {
    const sym = String(s.symbol).toUpperCase();
    if (s.class === "crypto" && s.providers?.coingeckoId) {
      crypto.set(sym, { symbol: sym, coingeckoId: s.providers.coingeckoId });
    }
    if ((s.class === "stock" || s.class === "etf") && s.providers?.alphaTicker) {
      stocksEtfs.set(sym, { symbol: sym, alphaTicker: s.providers.alphaTicker, class: s.class });
    }
  }

  // Optionaler Blick in Transaktionen (nur um Lücken zu entdecken/loggen)
  const txSymbols = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "transaction", asset: { $exists: true } } },
    { $group: { _id: { cls: "$asset.class", sym: { $toUpper: "$asset.symbol" } } } },
  ]).toArray();

  for (const t of txSymbols) {
    const cls: AssetClass = t._id.cls;
    const sym: string = t._id.sym;
    if (cls === "crypto" && !crypto.has(sym)) {
      // kein Mapping → CoinGecko-ID unbekannt → skip (Mapping in kind:"symbol" anlegen)
    }
    if ((cls === "stock" || cls === "etf") && !stocksEtfs.has(sym)) {
      // kein Mapping → Alpha-Ticker unbekannt → skip
    }
  }

  return {
    crypto: Array.from(crypto.values()),
    stocksEtfs: Array.from(stocksEtfs.values()),
  };
}

export async function fetchCoinGeckoEUR(ids: string[]) {
  const out: Record<string, { eur?: number; usd?: number }> = {};
  const chunkSize = 150;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(chunk.join(","))}&vs_currencies=eur,usd`;
    const r = await fetch(url, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`CoinGecko error ${r.status}`);
    const data = await r.json();
    Object.assign(out, data);
    await sleep(600);
  }
  return out; // { bitcoin: { eur, usd }, ... }
}

export async function fetchAlphaVantageQuote(symbol: string, apiKey: string) {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`AlphaVantage quote error ${r.status}`);
  const data = await r.json();
  const q = data?.["Global Quote"];
  const priceStr = q?.["05. price"] ?? q?.["05. Price"];
  const price = priceStr ? Number(priceStr) : NaN;
  if (!Number.isFinite(price)) throw new Error(`AlphaVantage: no price for ${symbol}`);
  return { priceUSD: price };
}

export async function fetchAlphaFxUsdEur(apiKey: string) {
  // returns USD->EUR rate (1 USD equals X EUR)
  const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=EUR&apikey=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`AlphaVantage FX error ${r.status}`);
  const data = await r.json();
  const rateStr = data?.["Real Time Currency Exchange Rate"]?.["5. Exchange Rate"];
  const rate = rateStr ? Number(rateStr) : NaN;
  if (!Number.isFinite(rate)) throw new Error(`AlphaVantage FX: no EUR rate`);
  return rate; // EUR per 1 USD
}

/** Upserts in DER EINEN Collection `finance` */
export async function upsertPriceSnapshot(
  db: Db,
  {
    date, cls, symbol, eur, usd, provider, meta,
  }: { date: string; cls: AssetClass | "fx"; symbol: string; eur?: number; usd?: number; provider: string; meta?: any; }
) {
  // Tages-Snapshot
  await db.collection(FINANCE_COLLECTION).updateOne(
    { kind: "price_snapshot", date, class: cls, symbol },
    {
      $setOnInsert: { createdAt: nowISO() },
      $set: {
        kind: "price_snapshot",
        date,
        class: cls,
        symbol,
        price: { ...(eur != null ? { eur } : {}), ...(usd != null ? { usd } : {}) },
        provider,
        meta: meta ?? {},
        updatedAt: nowISO(),
      },
    },
    { upsert: true }
  );

  // Letzter Preis
  await db.collection(FINANCE_COLLECTION).updateOne(
    { kind: "price_latest", class: cls, symbol },
    {
      $setOnInsert: { createdAt: nowISO() },
      $set: {
        kind: "price_latest",
        class: cls,
        symbol,
        price: { ...(eur != null ? { eur } : {}), ...(usd != null ? { usd } : {}) },
        asOfDate: date,
        provider,
        updatedAt: nowISO(),
      },
    },
    { upsert: true }
  );
}
