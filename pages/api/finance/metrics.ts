// pages/api/finance/metrics.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

/**
 * Collections (ggf. anpassen):
 *  - incomeEntries:  { userId, month:"YYYY-MM", amount }
 *  - expenses:       { userId, dueDate: ISO string, amount }
 *  - savings:        { userId, month:"YYYY-MM", amount }   // falls bei dir "finance" heißt, unten umstellen
 *  - portfolioTransactions:
 *      { userId, accountId, kind:"cash_deposit"|..., date: ISO, cashAmount, ... }
 */

const SAVINGS_COLLECTION = "savings"; // <-- wenn deine Ersparnisse "finance" heißen, hier auf "finance" ändern

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function iso(d: Date) {
  return d.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  try {
    const { db } = await connectToDatabase();

    const now = new Date();
    const currYM = ym(now);
    const currStart = monthStart(now);
    const currEnd = monthStart(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYM = ym(prevDate);
    const prevStart = monthStart(prevDate);
    const prevEnd = monthStart(now);

    // 1) Einkommen (aktueller Monat)
    const incomeAgg = await db.collection("incomeEntries").aggregate([
      { $match: { userId, month: currYM } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
      { $project: { _id: 0, sum: 1 } },
    ]).toArray();
    const income = incomeAgg[0]?.sum ?? 0;

    // 2) Ersparnisse (klassische Collection)
    const savingAgg = await db.collection(SAVINGS_COLLECTION).aggregate([
      { $match: { userId, month: currYM } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
      { $project: { _id: 0, sum: 1 } },
    ]).toArray();
    const savingsMonth = savingAgg[0]?.sum ?? 0;

    // 3) NEU: Portfolio-Einzahlungen (cash_deposit) dieses Monats
    const depositsAgg = await db.collection("portfolioTransactions").aggregate([
      { $match: { userId, kind: "cash_deposit", date: { $gte: iso(currStart), $lt: iso(currEnd) } } },
      { $group: { _id: null, sum: { $sum: "$cashAmount" } } },
      { $project: { _id: 0, sum: 1 } }
    ]).toArray();
    const deposits = depositsAgg[0]?.sum ?? 0;

    // Kombinierte Monats-Ersparnis
    const saved = savingsMonth + deposits;

    // 4) Ausgaben (aktuell & Vormonat)
    const [expCurrAgg, expPrevAgg] = await Promise.all([
      db.collection("expenses").aggregate([
        { $match: { userId, dueDate: { $gte: iso(currStart), $lt: iso(currEnd) } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
        { $project: { _id: 0, sum: 1 } },
      ]).toArray(),
      db.collection("expenses").aggregate([
        { $match: { userId, dueDate: { $gte: iso(prevStart), $lt: iso(prevEnd) } } },
        { $group: { _id: null, sum: { $sum: "$amount" } } },
        { $project: { _id: 0, sum: 1 } },
      ]).toArray(),
    ]);
    const expCurr = expCurrAgg[0]?.sum ?? 0;
    const expPrev = expPrevAgg[0]?.sum ?? 0;

    // 5) Kennzahlen
    const savingRate = income > 0 ? saved / income : 0;
    const expenseGrowth = expPrev > 0 ? (expCurr - expPrev) / expPrev : 0;

    // 6) Notgroschen-Ziel = 3 × Durchschnitt der letzten 3 vollen Monate (ohne aktuellen Monat)
    const threeMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const avgAgg = await db.collection("expenses").aggregate([
      { $match: { userId, dueDate: { $gte: iso(threeMonthsStart), $lt: iso(prevEnd) } } },
      { $addFields: { ym: { $substr: ["$dueDate", 0, 7] } } }, // "YYYY-MM"
      { $group: { _id: "$ym", sum: { $sum: "$amount" } } },
      { $group: { _id: null, avg: { $avg: "$sum" } } },
      { $project: { _id: 0, avg: 1 } },
    ]).toArray();
    const avg3 = Number.isFinite(avgAgg[0]?.avg) ? avgAgg[0].avg : 0;
    const emergencyTarget = Math.round(avg3 * 3);

    // 7) Notgroschen-Stand = Summe aller "savings" historisch
    const totalSavingsAgg = await db.collection(SAVINGS_COLLECTION).aggregate([
      { $match: { userId } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
      { $project: { _id: 0, sum: 1 } },
    ]).toArray();
    const emergencyCurrent = totalSavingsAgg[0]?.sum ?? 0;

    // Platzhalter: Investment-ROI
    const investmentROI = 0;

    return res.status(200).json({
      savingRate,
      expenseGrowth,
      investmentROI,
      emergencyFundStatus: { current: emergencyCurrent, target: emergencyTarget },
    });
  } catch (e) {
    console.error("metrics", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
