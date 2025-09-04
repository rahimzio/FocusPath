import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

async function getUsdToEur(db: any) {
  const fx = await db.collection(FINANCE_COLLECTION).findOne(
    { kind: "price_latest", class: "fx", symbol: "USD" },
    { projection: { price: 1 } }
  );
  return Number(fx?.price?.eur ?? 0) || 0; // 1 USD → EUR
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId, accountId } = req.query as { userId?: string; accountId?: string };
  if (!userId || !accountId) return res.status(400).json({ message: "Missing userId/accountId" });

  try {
    const { db } = await connectToDatabase();

    // Account (nicht archiviert)
    const acc = await db.collection(FINANCE_COLLECTION).findOne(
      { _id: new ObjectId(accountId), kind: "account", userId, archived: { $ne: true } },
      { projection: { name: 1, baseCurrency: 1 } }
    );
    if (!acc) return res.status(404).json({ message: "Account not found" });

    // Cash-Summen + Ein-/Auszahlungen (FIX: $switch uses 'then' not 'value')
    const cashAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId, archived: { $ne: true } } },
      {
        $group: {
          _id: null,
          cash: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $eq: ["$transactionKind", "cash_deposit"] }, then: "$cashAmount" },
                  { case: { $eq: ["$transactionKind", "cash_withdrawal"] }, then: { $multiply: ["$cashAmount", -1] } },
                  { case: { $eq: ["$transactionKind", "cash_transfer_in"] }, then: "$cashAmount" },
                  { case: { $eq: ["$transactionKind", "cash_transfer_out"] }, then: { $multiply: ["$cashAmount", -1] } },
                  { case: { $eq: ["$transactionKind", "asset_buy"] }, then: { $multiply: ["$cashAmount", -1] } },
                  { case: { $eq: ["$transactionKind", "asset_sell"] }, then: "$cashAmount" },
                ],
                default: 0
              }
            }
          },
          deposits: { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_deposit"] }, "$cashAmount", 0] } },
          withdrawals: { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_withdrawal"] }, "$cashAmount", 0] } },
        }
      },
      { $project: { _id: 0, cash: 1, deposits: 1, withdrawals: 1 } }
    ]).toArray();
    const cashRow = cashAgg[0] ?? { cash: 0, deposits: 0, withdrawals: 0 };
    const baseCurrency = (acc.baseCurrency || "EUR").toUpperCase();

    // Units je Asset (FIX: $switch uses 'then')
    const unitsAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId, asset: { $exists: true }, archived: { $ne: true } } },
      {
        $group: {
          _id: { sym: { $toUpper: "$asset.symbol" }, cls: "$asset.class", name: "$asset.name" },
          units: {
            $sum: {
              $switch: {
                branches: [
                  { case: { $in: ["$transactionKind", ["asset_buy", "asset_transfer_in"]] }, then: "$units" },
                  { case: { $in: ["$transactionKind", ["asset_sell", "asset_transfer_out"]] }, then: { $multiply: ["$units", -1] } },
                ],
                default: 0
              }
            }
          }
        }
      },
      { $match: { units: { $ne: 0 } } },
      { $project: { _id: 0, asset: { class: "$_id.cls", symbol: "$_id.sym", name: "$_id.name" }, units: 1 } }
    ]).toArray();

    // Ø-EK + totalInvestedLocal (nur Buys)
    const buyAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId, transactionKind: "asset_buy", archived: { $ne: true } } },
      {
        $group: {
          _id: { sym: { $toUpper: "$asset.symbol" }, cls: "$asset.class" },
          totalCost: { $sum: { $add: [{ $multiply: ["$units", "$pricePerUnit"] }, { $ifNull: ["$fee", 0] }] } },
          totalUnits: { $sum: "$units" }
        }
      },
      {
        $project: {
          _id: 0,
          key: { symbol: "$_id.sym", class: "$_id.cls" },
          avgCost: { $cond: [{ $gt: ["$totalUnits", 0] }, { $divide: ["$totalCost", "$totalUnits"] }, null] },
          totalInvestedLocal: "$totalCost"
        }
      }
    ]).toArray();

    // Letzte Preise (EUR)
    const symbols = unitsAgg.map((a: any) => ({ class: a.asset.class, symbol: a.asset.symbol }));
    const prices = symbols.length
      ? await db.collection(FINANCE_COLLECTION)
          .find({ kind: "price_latest", $or: symbols })
          .project({ class: 1, symbol: 1, price: 1, asOfDate: 1 })
          .toArray()
      : [];
    const priceMap = new Map<string, { eur?: number; asOfDate?: string }>();
    let priceAsOfMax: string | null = null;
    for (const p of prices) {
      const key = `${p.class}|${p.symbol}`;
      priceMap.set(key, { eur: Number(p?.price?.eur ?? 0), asOfDate: p?.asOfDate });
      if (p?.asOfDate && (!priceAsOfMax || p.asOfDate > priceAsOfMax)) priceAsOfMax = p.asOfDate;
    }

    const usdToEur = await getUsdToEur(db);

    // Cash in EUR
    let cashEUR: number | null = null;
    if (baseCurrency === "EUR") cashEUR = Number(cashRow.cash ?? 0);
    else if (baseCurrency === "USD" && usdToEur) cashEUR = Number(cashRow.cash ?? 0) * usdToEur;

    // Assets + PnL
    const assets = unitsAgg.map((a: any) => {
      const key = `${a.asset.class}|${a.asset.symbol}`;
      const priceEUR = priceMap.get(key)?.eur ?? 0;
      const units = Number(a.units ?? 0);
      const valueEUR = priceEUR * units;

      const buy = buyAgg.find(b => b.key.symbol === a.asset.symbol && b.key.class === a.asset.class);
      const avgCost = buy?.avgCost ?? null;                  // in Account-Währung
      const totalInvestedLocal = Number(buy?.totalInvestedLocal ?? 0);
      const investedEUR = baseCurrency === "EUR"
        ? totalInvestedLocal
        : (baseCurrency === "USD" && usdToEur ? totalInvestedLocal * usdToEur : null);

      const costBasisLocal = avgCost != null ? avgCost * units : null;
      const costBasisEUR = costBasisLocal != null
        ? (baseCurrency === "EUR" ? costBasisLocal : (baseCurrency === "USD" && usdToEur ? costBasisLocal * usdToEur : null))
        : null;

      const pnlAbsEUR = costBasisEUR != null ? valueEUR - costBasisEUR : null;
      const pnlPct = costBasisEUR && costBasisEUR !== 0 ? pnlAbsEUR! / costBasisEUR : null;

      return {
        asset: a.asset,
        units,
        avgCost,                // lokal
        investedEUR,            // Summe aller Käufe (historisch) in EUR
        priceEUR,
        valueEUR,
        costBasisEUR,           // aktuelle Position in EUR (Units × Ø-EK)
        pnlAbsEUR,
        pnlPct,
      };
    });

    const assetsValueEUR = assets.reduce((s: number, x: any) => s + (x.valueEUR ?? 0), 0);
    const totalEUR = (cashEUR ?? 0) + assetsValueEUR;

    return res.status(200).json({
      account: { accountId, name: acc.name, baseCurrency },
      cash: { amount: Number(cashRow.cash ?? 0), baseCurrency, amountEUR: cashEUR, deposits: cashRow.deposits, withdrawals: cashRow.withdrawals },
      priceAsOf: priceAsOfMax,
      assets,
      totals: { assetsValueEUR, totalEUR },
    });
  } catch (e) {
    console.error("accountSummary", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
