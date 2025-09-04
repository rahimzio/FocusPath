import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type Trade = {
  date?: string | Date;
  createdAt?: string | Date;
  pnl?: number | string;
  accountId?: string;
  strategy?: string;
  strategy_name?: string;
  archived?: boolean;
  deleted?: boolean;
  type?: string;
  userId?: string;
};

function toNum(v: any, def = 0) {
  const n = Number(
    typeof v === "string" ? v.trim().replace(/\s+/g, "").replace(",", ".") : v
  );
  return Number.isFinite(n) ? n : def;
}

function dayKey(d: string | Date | undefined) {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  try {
    const dt = new Date(d as any);
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

const sortAsc = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const d10 = (s?: string | null) => (s ? String(s).slice(0, 10) : undefined);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const userId =
    typeof req.query.userId === "string" ? req.query.userId : undefined;
  const accountId =
    typeof req.query.accountId === "string" && req.query.accountId.trim() !== ""
      ? req.query.accountId
      : undefined;
  const strategyParam =
    typeof req.query.strategy === "string" && req.query.strategy.trim() !== ""
      ? req.query.strategy
      : undefined;

  const fromQ = d10(typeof req.query.from === "string" ? req.query.from : undefined);
  const toQ = d10(typeof req.query.to === "string" ? req.query.to : undefined);

  if (!userId) return res.status(400).json({ message: "Missing userId" });

  try {
    const { db } = await connectToDatabase();

    // Collection vereinheitlicht: "trades" (wie die übrigen Endpoints)
    const col = db.collection<Trade>("trading");

    // Match aufbauen (inkl. Archiv/Lösch-Filter)
    const match: any = {
      userId,
      type: "tradeEntry",
      archived: { $ne: true },
      deleted: { $ne: true },
    };
    if (accountId) match.accountId = accountId;
    if (strategyParam) {
      match.$or = [{ strategy: strategyParam }, { strategy_name: strategyParam }];
    }
    if (fromQ || toQ) {
      // Wir filtern vorrangig über das Stringfeld "date" (YYYY-MM-DD).
      match.date = {};
      if (fromQ) match.date.$gte = fromQ;
      if (toQ) match.date.$lte = toQ;
    }

    const trades = (await col
      .find(match, {
        projection: {
          date: 1,
          createdAt: 1,
          pnl: 1,
          accountId: 1,
          strategy: 1,
          strategy_name: 1,
          _id: 0,
        },
      })
      .sort({ date: 1, createdAt: 1 })
      .toArray()) as Trade[];

    // Tagesweise aufsummieren (fallback auf createdAt, falls date fehlt)
    const byDay = new Map<string, number>();
    for (const t of trades) {
      const key = dayKey(t.date) ?? dayKey(t.createdAt);
      if (!key) continue;
      byDay.set(key, (byDay.get(key) ?? 0) + toNum(t.pnl, 0));
    }

    const days = Array.from(byDay.keys()).sort(sortAsc);

    // Kumulierte Equity-Kurve
    let equity = 0;
    const series: { day: string; cumPnl: number }[] = [];
    for (const d of days) {
      equity += toNum(byDay.get(d), 0);
      series.push({ day: d, cumPnl: equity });
    }

    return res.status(200).json({ series });
  } catch (e) {
    console.error("monthlyPnl error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
