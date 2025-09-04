import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive
  return { start, end };
}
function isoWeek(d: Date) { // ISO week: returns YYYY-Www
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Thursday in current week decides the year.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const yr = date.getUTCFullYear();
  return `${yr}-W${String(weekNo).padStart(2,"0")}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });
  const { userId, month } = req.body || {};
  if (!userId || !month || !/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: "Missing userId/month" });

  try {
    const { db } = await connectToDatabase();
    const plan = await db.collection(FINANCE_COLLECTION).findOne({ kind: "plan_monthly", userId, month });
    if (!plan) return res.status(404).json({ message: "Kein Plan für diesen Monat" });

    const total: number = Number(plan.total || 0);
    let fun = typeof plan.funmoneyAmount === "number" ? plan.funmoneyAmount :
              typeof plan.funmoneyPct === "number" ? total * (plan.funmoneyPct / 100) : 0;
    if (!(fun > 0)) return res.status(400).json({ message: "Funmoney im Plan ist 0" });

    // Wochen-Anteile: gleiche Verteilung auf alle ISO-Wochen, die den Monat schneiden
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

    // Upsert weekly_budget
    const col = db.collection(FINANCE_COLLECTION);
    for (const b of budgets) {
      await col.updateOne(
        { kind: "weekly_budget", userId, week: b.week },
        { $set: { budget: b.amount, source: `plan:${month}`, updatedAt: new Date().toISOString() },
          $setOnInsert: { createdAt: new Date().toISOString() } },
        { upsert: true }
      );
    }

    // Markiere Plan als aktiviert
    await col.updateOne(
      { kind: "plan_monthly", userId, month },
      { $set: { activatedAt: new Date().toISOString(), funmoneyFinal: fun } }
    );

    res.status(200).json({ ok: true, budgets });
  } catch (e) {
    console.error("plan/activate", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
