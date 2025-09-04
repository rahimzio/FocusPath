import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

function isoWeekToRange(weekStr: string) {
  // "YYYY-WW" -> [startISO, endISO) ; Montag als Wochenstart (ISO)
  const [y, w] = weekStr.split("-").map((s) => parseInt(s, 10));
  const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  const isoMonday = new Date(simple);
  if (dayOfWeek !== 1) isoMonday.setUTCDate(simple.getUTCDate() + (1 - dayOfWeek));
  const start = isoMonday;
  const end = new Date(isoMonday);
  end.setUTCDate(isoMonday.getUTCDate() + 7);
  return [start.toISOString(), end.toISOString()] as const;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  const { userId, week } = req.query as { userId?: string; week?: string };
  if (!userId || !week) return res.status(400).json({ message: "Missing userId/week" });

  try {
    const { db } = await connectToDatabase();
    const budgetDoc = await db.collection(FINANCE_COLLECTION).findOne(
      { kind: "weekly_budget", userId, week },
      { projection: { budget: 1 } }
    );

    const [fromISO, toISO] = isoWeekToRange(week);
    const spentAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "expense", userId, dueDate: { $gte: fromISO, $lt: toISO } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray();

    return res.status(200).json({
      budget: budgetDoc ? { budget: budgetDoc.budget, week } : null,
      spent: spentAgg[0]?.sum ?? 0,
      range: { from: fromISO, to: toISO }
    });
  } catch (e) {
    console.error("getWeeklyBudget", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
