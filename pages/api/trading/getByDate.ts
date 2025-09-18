// pages/api/trading/getByDate.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

const toNum = (v: any, def?: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def ?? undefined;
};

const needsCompositeIndex = (err: any) => {
  const msg = String(err?.message || "");
  return /composite index/i.test(msg) || /order by query/i.test(msg);
};

const s10 = (d?: string) => (d || "").slice(0, 10);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    // ⚠️ Holt nur eine bestehende Collection. Kein createIndex/auto create!
    const col = db.collection("trading");

    const {
      userId,
      date: dateRaw,
      accountId,
      strategy,
      status,           // optional: 'draft' | 'final' | 'all'
      includeArchived,  // optional: 'true' | 'false' (default false)
      limit: limitRaw,  // optional
    } = req.query as Record<string, string | undefined>;

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!dateRaw) return res.status(400).json({ error: "date ist erforderlich (YYYY-MM-DD)" });

    const date = s10(String(dateRaw));
    const lim = Math.max(1, Math.min(1000, Number(limitRaw) || 200));

    // Basis-Match (ohne Sort-Felder)
    const match: any = {
      userId,
      deleted: { $ne: true },
    };

    // Archiv standardmäßig ausblenden
    const allowArchived = includeArchived === "true";
    if (!allowArchived) match.archived = { $ne: true };

    // Sauber kombinierte Bedingungen
    const andConds: any[] = [];

    // Toleranter type-Guard
    andConds.push({ $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }] });

    // Datum: Entweder 'date' == YYYY-MM-DD ODER (Fallback) createdAt beginnt mit YYYY-MM-DD
    andConds.push({
      $or: [
        { date }, // nutzt Index, wenn vorhanden
        { $expr: { $eq: [{ $substrCP: ["$createdAt", 0, 10] }, date] } },
      ],
    });

    if (accountId) andConds.push({ accountId });
    if (strategy) andConds.push({ $or: [{ strategy }, { strategy_name: strategy }] });

    if (status === "draft") {
      andConds.push({ $or: [{ status: "draft" }, { completed: { $ne: true } }] });
    } else if (status === "final") {
      andConds.push({ $or: [{ status: "final" }, { completed: true }] });
    }

    if (andConds.length) match.$and = andConds;

    // bevorzugte Sortierung (chronologisch): startTime ↑, dann _id ↑
    const sortSpec: Record<string, 1 | -1> = { startTime: 1, _id: 1 };

    try {
      const docs = await col.find(match).sort(sortSpec).limit(lim).toArray();
      const trades = docs.map(mapDocToTrade);
      return res.status(200).json({ trades });
    } catch (err: any) {
      // Cosmos: fehlender Composite-Index → Fallback ohne ORDER BY + Sort in JS
      if (!needsCompositeIndex(err)) {
        console.error("❌ Fehler in /api/trading/getByDate (unbekannt):", err);
        return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
      }

      const raw = await col.find(match).limit(Math.max(lim, 1000)).toArray();

      // JS-Sort wie oben: startTime ↑, dann createdAt ↓ fallback, dann _id ↑
      raw.sort((a: any, b: any) => {
        const sa = typeof a?.startTime === "string" ? a.startTime : "\uffff";
        const sb = typeof b?.startTime === "string" ? b.startTime : "\uffff";
        const t = sa.localeCompare(sb);
        if (t !== 0) return t;

        // createdAt desc als sekundärer Anhaltspunkt (falls vorhanden)
        const ca = String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
        if (ca !== 0) return ca;

        // zuletzt _id asc (stabil)
        return String(a?._id || "").localeCompare(String(b?._id || ""));
      });

      const trades = raw.slice(0, lim).map(mapDocToTrade);
      return res.status(200).json({
        trades,
        note: "fallback: sorted in application (add composite index for ORDER BY)",
      });
    }
  } catch (err: any) {
    console.error("❌ Fehler in /api/trading/getByDate:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}

/** Mapping eines DB-Dokuments auf das API-Shape */
function mapDocToTrade(d: any) {
  const rawResult = typeof d.result === "string" ? d.result : undefined;
  const mappedStatus =
    typeof d.status === "string"
      ? d.status
      : (d.completed ? "final" : (rawResult ? "final" : "draft"));

  return {
    _id: String(d._id),
    userId: d.userId,
    date: String(d.date ?? "").slice(0, 10),
    type: d.type,

    symbol: d.symbol ?? "",
    accountId: d.accountId ?? undefined,

    entry: toNum(d.entry),
    exit: toNum(d.exit),
    pnl: toNum(d.pnl, 0),
    lotSize: toNum(d.lotSize),
    potentialLoss: toNum(d.potentialLoss),
    rating: toNum(d.rating),

    // ❗ Kein Default mehr – Drafts behalten undefined:
    result: rawResult,
    tradeType: d.tradeType === "sell" ? "sell" : "buy",

    // Setup wurde in der UI entfernt, lassen wir hier neutral durch
    setup: d.setup ?? "",
    strategy: d.strategy ?? d.strategy_name ?? undefined,
    strategy_name: d.strategy_name ?? d.strategy ?? undefined,
    riskReward: typeof d.riskReward === "string" && d.riskReward.trim() ? d.riskReward.trim() : undefined,

    notes: d.notes ?? "",

    startTime: d.startTime ?? undefined,
    endTime: d.endTime ?? undefined,
    durationMin: toNum(d.durationMin, 0),
    session: d.session ?? undefined,
    outcomeFlags: {
      breakEven: !!(d.outcomeFlags?.breakEven),
      stopHit: !!(d.outcomeFlags?.stopHit),
    },
    biasExecution: d.biasExecution ?? undefined,
    tradingMistakes: Array.isArray(d.tradingMistakes) ? d.tradingMistakes : [],

    rangeDefined: !!d.rangeDefined,
    rangeNote: d.rangeNote ?? "",
    viewTimeframes: Array.isArray(d.viewTimeframes) ? d.viewTimeframes : [],
    entryTimeframe: d.entryTimeframe ?? "",
    concepts: Array.isArray(d.concepts) ? d.concepts : [],
    location: d.location ?? "",

    // Game / Game-Katalog
    gameComputed: d.gameComputed ?? undefined,
    gameSelf: d.gameSelf ?? undefined,
    gameItems: Array.isArray(d.gameItems) ? d.gameItems.map(String) : [],
    gameCatalogScore: toNum(d.gameCatalogScore, 0) ?? 0,
    gameCatalogGrade: d.gameCatalogGrade ?? undefined,

    // SL/TP
    stopPrice: toNum(d.stopPrice),
    targetPrice: toNum(d.targetPrice),

    // Status (aus echten Feldern abgeleitet)
    status: mappedStatus,
    completed: mappedStatus === "final",
    missing: Array.isArray(d.missing) ? d.missing : [],

    createdAt: d.createdAt ?? undefined,
    updatedAt: d.updatedAt ?? undefined,
  };
}
