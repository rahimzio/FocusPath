import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION, nowISO } from "@/lib/api/finance";
import { berlinDateYYYYMMDD, getISOWeekString } from "./daily-prices";

const CRON_SECRET = process.env.CRON_SECRET || "";

function ym(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function monthStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function iso(d: Date) { return d.toISOString(); }

async function computeMetricsForUser(db: any, userId: string) {
  const now = new Date();
  const currYM = ym(now);
  const currStart = monthStart(now);
  const currEnd = monthStart(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevStart = monthStart(prevDate);
  const prevEnd = monthStart(now);

  const [incomeAgg, savingAgg, expCurrAgg, expPrevAgg] = await Promise.all([
    db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "income", userId, month: currYM } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray(),
    db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "saving", userId, month: currYM } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray(),
    db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "expense", userId, dueDate: { $gte: iso(currStart), $lt: iso(currEnd) }, archived: { $ne: true } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray(),
    db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "expense", userId, dueDate: { $gte: iso(prevStart), $lt: iso(prevEnd) }, archived: { $ne: true } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray(),
  ]);

  const income = incomeAgg[0]?.sum ?? 0;
  const savingsMonth = savingAgg[0]?.sum ?? 0;

  // cash_deposit im Monat
  const depositsAgg = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "transaction", userId, archived: { $ne: true }, transactionKind: "cash_deposit", date: { $gte: iso(currStart), $lt: iso(currEnd) } } },
    { $group: { _id: null, sum: { $sum: { $ifNull: ["$cashAmount", 0] } } } }
  ]).toArray();
  const deposits = depositsAgg[0]?.sum ?? 0;

  const saved = savingsMonth + deposits;
  const expCurr = expCurrAgg[0]?.sum ?? 0;
  const expPrev = expPrevAgg[0]?.sum ?? 0;

  const savingRate = income > 0 ? saved / income : 0;
  const expenseGrowth = expPrev > 0 ? (expCurr - expPrev) / expPrev : 0;

  // Notgroschen-Ziel (3-Monats-Schnitt ohne aktuellen Monat)
  const threeMonthsStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const avgAgg = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "expense", userId, dueDate: { $gte: iso(threeMonthsStart), $lt: iso(prevEnd) }, archived: { $ne: true } } },
    { $addFields: { ym: { $substr: ["$dueDate", 0, 7] } } },
    { $group: { _id: "$ym", sum: { $sum: "$amount" } } },
    { $group: { _id: null, avg: { $avg: "$sum" } } },
  ]).toArray();
  const avg3 = Number.isFinite(avgAgg[0]?.avg) ? avgAgg[0].avg : 0;
  const emergencyTarget = Math.round(avg3 * 3);

  const totalSavingsAgg = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "saving", userId } },
    { $group: { _id: null, sum: { $sum: "$amount" } } },
  ]).toArray();
  const emergencyCurrent = totalSavingsAgg[0]?.sum ?? 0;

  // Nettovermögen (Cash + Assets × EUR-Preis), archivierte Transaktionen ignorieren
  const cashAgg = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "transaction", userId, archived: { $ne: true } } },
    {
      $group: {
        _id: "$accountId",
        cash: {
          $sum: {
            $switch: {
              branches: [
                { case: { $eq: ["$transactionKind", "cash_deposit"] }, then: { $ifNull: ["$cashAmount", 0] } },
                { case: { $eq: ["$transactionKind", "cash_withdrawal"] }, then: { $multiply: [{ $ifNull: ["$cashAmount", 0] }, -1] } },
                { case: { $eq: ["$transactionKind", "cash_transfer_in"] }, then: { $ifNull: ["$cashAmount", 0] } },
                { case: { $eq: ["$transactionKind", "cash_transfer_out"] }, then: { $multiply: [{ $ifNull: ["$cashAmount", 0] }, -1] } },
                { case: { $eq: ["$transactionKind", "asset_buy"] }, then: { $multiply: [{ $ifNull: ["$cashAmount", 0] }, -1] } },
                { case: { $eq: ["$transactionKind", "asset_sell"] }, then: { $ifNull: ["$cashAmount", 0] } },
              ],
              default: 0
            }
          }
        }
      }
    },
    { $project: { _id: 0, cash: 1 } }
  ]).toArray();
  const cashTotal = cashAgg.reduce((s: number, r: any) => s + (r.cash ?? 0), 0);

  const assetsAgg = await db.collection(FINANCE_COLLECTION).aggregate([
    { $match: { kind: "transaction", userId, asset: { $exists: true }, archived: { $ne: true } } },
    {
      $group: {
        _id: { symbol: { $toUpper: "$asset.symbol" }, class: "$asset.class" },
        units: {
          $sum: {
            $switch: {
              branches: [
                { case: { $in: ["$transactionKind", ["asset_buy", "asset_transfer_in"]] }, then: { $ifNull: ["$units", 0] } },
                { case: { $in: ["$transactionKind", ["asset_sell", "asset_transfer_out"]] }, then: { $multiply: [{ $ifNull: ["$units", 0] }, -1] } },
              ],
              default: 0
            }
          }
        }
      }
    },
    { $match: { units: { $ne: 0 } } }
  ]).toArray();

  let netWorth = cashTotal;
  for (const a of assetsAgg) {
    const cls = a._id.class;
    const sym = a._id.symbol;
    const latest = await db.collection(FINANCE_COLLECTION).findOne(
      { kind: "price_latest", class: cls, symbol: sym },
      { projection: { price: 1 } }
    );
    const eur = latest?.price?.eur ?? 0;
    netWorth += (a.units ?? 0) * eur;
  }

  return {
    savingRate, expenseGrowth, investmentROI: 0,
    emergencyFund: { current: emergencyCurrent, target: emergencyTarget },
    netWorth,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  if (!CRON_SECRET || req.query.key !== CRON_SECRET) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { db } = await connectToDatabase();
    const week = getISOWeekString();
    const runDate = berlinDateYYYYMMDD();

    const userIds = await db.collection(FINANCE_COLLECTION).distinct("userId", {
      kind: { $in: ["income","expense","saving","saving_goal","account","transaction"] }
    });

    let count = 0;
    for (const userId of userIds) {
      if (!userId) continue;
      const m = await computeMetricsForUser(db, String(userId));
      await db.collection(FINANCE_COLLECTION).updateOne(
        { kind: "weekly_metrics", userId: String(userId), week },
        {
          $setOnInsert: { createdAt: nowISO() },
          $set: {
            kind: "weekly_metrics",
            userId: String(userId),
            week,
            savingRate: m.savingRate,
            expenseGrowth: m.expenseGrowth,
            investmentROI: m.investmentROI,
            emergencyFund: m.emergencyFund,
            netWorth: m.netWorth,
            runDate,
            updatedAt: nowISO(),
          }
        },
        { upsert: true }
      );
      count++;
    }

    return res.status(200).json({ ok: true, week, users: count });
  } catch (e) {
    console.error("weekly-metrics", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
