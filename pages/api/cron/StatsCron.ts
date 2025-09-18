// pages/api/cron/StatsCron.ts
import cron from "node-cron";
import { TradeEntry, WeeklyStat } from "@/utils/interface";
import { connectToDatabase } from "../db/connectToDatabase";

/** Zeile, die aus der Aggregation zurückkommt */
interface AggRow {
  _id: { userId: string; symbol?: string };
  win: number;
  count: number;
  pnl: number;
}

/** Montag 00:00 UTC der aktuellen Woche */
function startOfUtcWeekMonday(d = new Date()): Date {
  const u = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = u.getUTCDay(); // 0=So..6=Sa
  const diff = (day + 6) % 7; // 0 wenn Montag, sonst Rücksprung
  u.setUTCDate(u.getUTCDate() - diff);
  u.setUTCHours(0, 0, 0, 0);
  return u;
}

export default async function computeStats() {
  const { db } = await connectToDatabase();
  const trades = db.collection<TradeEntry>("trading");
  const weekly = db.collection<WeeklyStat>("weekly_stats");

  // defensive indexes (idempotent)
  try {
    await Promise.all([
      trades.createIndex({ userId: 1, type: 1, date: 1 }),
      trades.createIndex({ userId: 1, type: 1, createdAt: 1 }),
      trades.createIndex({ userId: 1, archived: 1, deleted: 1 }),
      weekly.createIndex({ userId: 1, week_start: -1 }),
    ]);
  } catch {}

  // Vorherige volle Woche: [prevMonday, thisMonday)
  const thisMonday = startOfUtcWeekMonday(new Date());
  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);

  const start = prevMonday; // inkl.
  const end = thisMonday;   // exklusiv

  // Aggregation: robustes Datum + Result-Normalisierung + Summen
  const agg: AggRow[] = await trades
    .aggregate<AggRow>([
      {
        $match: {
          deleted: { $ne: true },
          archived: { $ne: true },
          $or: [{ type: "tradeEntry" }, { type: "trade" }, { type: { $exists: false } }],
        },
      },
      {
        $addFields: {
          _date: {
            $ifNull: [
              { $convert: { input: "$date", to: "date", onError: null, onNull: null } },
              { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
            ],
          },
          _pnl: { $convert: { input: "$pnl", to: "double", onError: 0, onNull: 0 } },
          _resultNorm: {
            $switch: {
              branches: [
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["win", "winner", "profit", "green"]] }, then: "win" },
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["loss", "loser", "red", "lose"]] }, then: "loss" },
                { case: { $in: [{ $toLower: { $ifNull: ["$result", ""] } }, ["be", "breakeven", "break-even", "break even"]] }, then: "BE" },
              ],
              default: "",
            },
          },
        },
      },
      { $match: { _date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { userId: "$userId", symbol: "$symbol" },
          win: { $sum: { $cond: [{ $eq: ["$_resultNorm", "win"] }, 1, 0] } },
          count: { $sum: 1 },
          pnl: { $sum: "$_pnl" },
        },
      },
    ])
    .toArray();

  // Aggregation pro User zusammenfassen
  const byUser: Record<string, AggRow[]> = {};
  for (const a of agg) {
    const uid = String(a._id?.userId ?? "");
    if (!uid) continue;
    (byUser[uid] ||= []).push(a);
  }

  const weekStartStr = prevMonday.toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  for (const userId of Object.keys(byUser)) {
    const rows = byUser[userId];

    // Schutz: keine Trades → leeres Weekly-Dokument upserten (optional)
    if (!rows.length) {
      await weekly.updateOne(
        { userId, week_start: weekStartStr },
        {
          $set: {
            week_start: weekStartStr,
            userId,
            best_pair: undefined,
            win_rate: 0,
            pct_change: 0,
            top_pairs: [],
            trades_count: 0,
            updatedAt: nowIso,
          },
          $setOnInsert: { createdAt: nowIso },
        },
        { upsert: true }
      );
      continue;
    }

    // Kennzahlen berechnen
    const totalWins = rows.reduce((s, r) => s + (Number(r.win) || 0), 0);
    const totalCnt = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
    const sumPnl = rows.reduce((s, r) => s + (Number(r.pnl) || 0), 0);

    const winRate = totalCnt > 0 ? totalWins / totalCnt : 0;

    // best_pair = Symbol mit höchstem PnL
    const bestRow = rows.reduce((p, c) => (Number(c.pnl) > Number(p.pnl) ? c : p));
    const bestPair = (bestRow?._id?.symbol ?? "") || undefined;

    // top_pairs = Liste Symbol → win_rate
    const topPairs = rows.map((x) => ({
      pair: (x._id?.symbol ?? "") || "-",
      win_rate: Number(x.count) > 0 ? Number(x.win) / Number(x.count) : 0,
    }));

    await weekly.updateOne(
      { userId, week_start: weekStartStr },
      {
        $set: {
          week_start: weekStartStr,
          userId,
          best_pair: bestPair,
          win_rate: winRate,
          pct_change: sumPnl,
          top_pairs: topPairs,
          trades_count: totalCnt,
          updatedAt: nowIso,
        },
        $setOnInsert: { createdAt: nowIso },
      },
      { upsert: true }
    );
  }
}

// Läuft jeden Montag 00:00 (Server-Zeit). Wir rechnen immer die VORHERIGE Woche ab.
cron.schedule("0 0 * * 1", () => {
  console.log("🕛 Running weekly stats cron…");
  computeStats().catch((e) => console.error("❌ weekly stats cron failed:", e));
});
