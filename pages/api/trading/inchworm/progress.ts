// pages/api/trading/inchworm/progress.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../../db/mongo";

const toDate = (s?: string) => (s ? new Date(s + "T00:00:00.000Z") : undefined);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ error: "userId erforderlich" });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // 1) Plan holen
    const plan = await col.findOne(
      { userId, type: "inchworm_plan", deleted: { $ne: true } },
      { sort: { updatedAt: -1 } }
    );

    if (!plan) {
      return res.status(200).json({
        plan: null,
        period: null,
        selected: { A: [], B: [], C: [] },
        targets: {},
        totals: { trades: 0, days: 0 },
        hitRate: { A: 0, B: 0, C: 0 },
        actual: { perDay: 0, perWeek: 0, perMonth: 0 },
        deltaToTarget: {},
      });
    }

    const start = plan?.period?.start as string | undefined;
    const end   = plan?.period?.end as string | undefined;
    const dStart = toDate(start);
    const dEnd   = toDate(end);

    // 2) Trades im Zeitraum
    const match: any = {
      userId,
      type: { $in: ["trade", "tradeEntry"] },
      deleted: { $ne: true },
    };
    if (dStart) match.date = { ...(match.date || {}), $gte: start };
    if (dEnd)   match.date = { ...(match.date || {}), $lte: end };

    const trades = await col
      .find(match)
      .project({ _id: 1, date: 1, gameItems: 1 })
      .toArray();

    // 3) Realität vs Plan
    const selA: string[] = Array.isArray(plan?.selected?.A) ? plan.selected.A.map(String) : [];
    const selB: string[] = Array.isArray(plan?.selected?.B) ? plan.selected.B.map(String) : [];
    const selC: string[] = Array.isArray(plan?.selected?.C) ? plan.selected.C.map(String) : [];

    // Für Label-Fallback: Library labelMap
    const libItems = await col
      .find({ userId, type: "game_library_item", active: { $ne: false } })
      .project({ _id: 1, label: 1 })
      .toArray();
    const idToLabel = new Map<string, string>(libItems.map((i:any) => [String(i._id), String(i.label || "")]));

    const totalTrades = trades.length;

    const hasAnyOf = (trade: any, wantedIds: string[]) => {
      const gi: string[] = Array.isArray(trade?.gameItems) ? trade.gameItems.map(String) : [];
      if (gi.length === 0 || wantedIds.length === 0) return false;

      // match gegen IDs ODER gegen Labels (Fallback)
      const labelsWanted = new Set(wantedIds.map(id => idToLabel.get(String(id)) || ""));
      for (const it of gi) {
        // it kann id, "A:Label" oder reines Label sein
        const raw = String(it);
        if (wantedIds.includes(raw)) return true;
        const lbl = raw.includes(":") ? raw.split(":").slice(1).join(":").trim() : raw;
        if (labelsWanted.has(lbl)) return true;
      }
      return false;
    };

    const hitsA = trades.filter(t => hasAnyOf(t, selA)).length;
    const hitsB = trades.filter(t => hasAnyOf(t, selB)).length;
    const hitsC = trades.filter(t => hasAnyOf(t, selC)).length;

    const hitRate = {
      A: totalTrades ? +(hitsA / totalTrades).toFixed(3) : 0,
      B: totalTrades ? +(hitsB / totalTrades).toFixed(3) : 0,
      C: totalTrades ? +(hitsC / totalTrades).toFixed(3) : 0,
    };

    // 4) Ø Trades per Day/Week/Month
    let days = 0;
    if (dStart && dEnd) {
      const ms = Math.max(0, (+dEnd - +dStart)) || 1;
      days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
    }
    const perDay   = days ? +(totalTrades / days).toFixed(2) : totalTrades;
    const perWeek  = +((perDay) * 7).toFixed(1);
    const perMonth = +((perDay) * 30).toFixed(1);

    const targets = {
      avgTradesPerDay:   Number(plan?.targets?.avgTradesPerDay)   || undefined,
      avgTradesPerWeek:  Number(plan?.targets?.avgTradesPerWeek)  || undefined,
      avgTradesPerMonth: Number(plan?.targets?.avgTradesPerMonth) || undefined,
      standardRR:        typeof plan?.targets?.standardRR === "string" ? plan.targets.standardRR : undefined,
    };

    const deltaToTarget: any = {};
    if (targets.avgTradesPerDay   != null) deltaToTarget.perDay   = +(perDay   - targets.avgTradesPerDay).toFixed(2);
    if (targets.avgTradesPerWeek  != null) deltaToTarget.perWeek  = +(perWeek  - targets.avgTradesPerWeek).toFixed(1);
    if (targets.avgTradesPerMonth != null) deltaToTarget.perMonth = +(perMonth - targets.avgTradesPerMonth).toFixed(1);

    return res.status(200).json({
      plan: { _id: String(plan._id), focus: plan.focus ?? "", period: plan.period ?? {} },
      period: plan.period ?? {},
      selected: { A: selA, B: selB, C: selC },
      targets,
      totals: { trades: totalTrades, days },
      hitRate,
      actual: { perDay, perWeek, perMonth },
      deltaToTarget,
    });
  } catch (e: any) {
    console.error("inchworm/progress error:", e);
    return res.status(500).json({ error: e?.message ?? "Internal Server Error" });
  }
}
