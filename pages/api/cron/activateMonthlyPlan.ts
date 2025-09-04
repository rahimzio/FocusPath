// pages/api/cron/activateMonthlyPlan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

// ---- Helpers (gleich wie in /api/finance/plan/activate) ----
function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive
  return { start, end };
}
function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yr = date.getUTCFullYear();
  return `${yr}-W${String(weekNo).padStart(2,"0")}`;
}
function ymNowUTC() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function activateForUserMonth(db: any, userId: string, month: string) {
  const col = db.collection(FINANCE_COLLECTION);
  const plan = await col.findOne({ kind: "plan_monthly", userId, month });
  if (!plan) return { userId, month, ok: false, reason: "no-plan" };

  const total: number = Number(plan.total || 0);
  const fun = typeof plan.funmoneyAmount === "number"
    ? plan.funmoneyAmount
    : typeof plan.funmoneyPct === "number" ? total * (plan.funmoneyPct / 100) : 0;
  if (!(fun > 0)) return { userId, month, ok: false, reason: "funmoney-zero" };

  const { start, end } = monthBounds(month);
  const days: Record<string, number> = {};
  for (let t = new Date(start); t < end; t.setUTCDate(t.getUTCDate() + 1)) {
    const w = isoWeek(t);
    days[w] = (days[w] || 0) + 1;
  }
  const totalDays = Object.values(days).reduce((s, n) => s + n, 0);
  const budgets = Object.entries(days).map(([week, dcount]) => ({
    week,
    amount: (fun * dcount) / totalDays,
  }));

  for (const b of budgets) {
    await col.updateOne(
      { kind: "weekly_budget", userId, week: b.week },
      {
        $set: { budget: b.amount, source: `plan:${month}`, updatedAt: new Date().toISOString() },
        $setOnInsert: { createdAt: new Date().toISOString() }
      },
      { upsert: true }
    );
  }

  await col.updateOne(
    { kind: "plan_monthly", userId, month },
    { $set: { activatedAt: new Date().toISOString(), funmoneyFinal: fun } }
  );

  return { userId, month, ok: true, weeks: budgets.length, funmoney: fun };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sicherheit: nur GET/POST
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Use GET or POST." });
  }

  const runTodayEvenIfNotFirst = req.query.force === "1" || (req.body && req.body.force);
  const userIdParam = (req.query.userId as string) || (req.body?.userId as string) || null;
  const monthParam = (req.query.month as string) || (req.body?.month as string) || ymNowUTC();

  // nur am 1. (UTC) laufen, außer force=1
  const todayUTC = new Date().getUTCDate();
  if (!runTodayEvenIfNotFirst && todayUTC !== 1) {
    return res.status(204).json({ ok: true, skipped: "not-first-of-month-utc" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection(FINANCE_COLLECTION);

    if (userIdParam) {
      const result = await activateForUserMonth(db, userIdParam, monthParam);
      return res.status(200).json(result);
    }

    // alle Nutzer mit Plan für current month und ohne activatedAt
    const cursor = col.find({
      kind: "plan_monthly",
      month: monthParam,
      $or: [{ activatedAt: { $exists: false } }, { activatedAt: null }]
    }, { projection: { userId: 1 } });

    const userIds = new Set<string>();
    for await (const doc of cursor) userIds.add(String(doc.userId));

    const results: any[] = [];
    for (const uid of userIds) {
      const r = await activateForUserMonth(db, uid, monthParam).catch(e => ({ userId: uid, month: monthParam, ok: false, error: String(e) }));
      results.push(r);
    }

    return res.status(200).json({ ok: true, month: monthParam, count: userIds.size, results });
  } catch (e) {
    console.error("[cron] activateMonthlyPlan error", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
