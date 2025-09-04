import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

async function getUsdToEur(db: any) {
  const fx = await db.collection(FINANCE_COLLECTION).findOne(
    { kind: "price_latest", class: "fx", symbol: "USD" },
    { projection: { price: 1 } }
  );
  return Number(fx?.price?.eur ?? 0) || 0; // 1 USD -> EUR
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  const RID = Math.random().toString(36).slice(2, 8);
  const DEBUG = String(process.env.DEBUG_FINANCE) === "1" || String((req.query as any).debug) === "1";
  const log = (...args: any[]) => DEBUG && console.log(`[holdings:${RID}]`, ...args);
  const warn = (...args: any[]) => DEBUG && console.warn(`[holdings:${RID}]`, ...args);

  try {
    const { db } = await connectToDatabase();
    log("START", { userId });

    // 1) aktive Accounts
    const accounts = await db.collection(FINANCE_COLLECTION)
      .find({ kind: "account", userId, archived: { $ne: true } })
      .project({ name: 1, baseCurrency: 1 })
      .sort({ name: 1 })
      .toArray();

    const byId: Record<string, { name: string; baseCurrency: string }> = {};
    for (const a of accounts) byId[String(a._id)] = { name: a.name, baseCurrency: a.baseCurrency ?? "EUR" };
    const accountIds = Object.keys(byId);
    log("Accounts", { count: accountIds.length, sample: accountIds.slice(0, 5).map(id => ({ id, ...byId[id] })) });

    if (accountIds.length === 0) {
      warn("Keine aktiven Accounts gefunden");
      return res.status(200).json({
        accounts: [],
        cashByAccount: [],
        assetsByAccount: [],
        totalsByAccount: [],
        netWorthEUR: 0,
        priceAsOf: null,
        fxMissing: [],
        valuationIncomplete: false,
        missingPrices: [],
      });
    }

    // 2) Cash je Account — ohne $switch, per $cond-Teilsummen
    const cashAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId: { $in: accountIds }, archived: { $ne: true } } },
      {
        $group: {
          _id: "$accountId",
          dep: { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_deposit"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
          wd:  { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_withdrawal"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
          cti: { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_transfer_in"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
          cto: { $sum: { $cond: [{ $eq: ["$transactionKind", "cash_transfer_out"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
          buy: { $sum: { $cond: [{ $eq: ["$transactionKind", "asset_buy"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
          sell:{ $sum: { $cond: [{ $eq: ["$transactionKind", "asset_sell"] }, { $ifNull: ["$cashAmount", 0] }, 0] } },
        }
      },
      {
        $project: {
          _id: 0,
          accountId: "$_id",
          cash: {
            $add: [
              "$dep", "$cti", "$sell",
              { $multiply: ["$wd", -1] },
              { $multiply: ["$cto", -1] },
              { $multiply: ["$buy", -1] },
            ]
          }
        }
      }
    ]).toArray();
    log("cashAgg", { count: cashAgg.length, sample: cashAgg.slice(0, 5) });

    // 3) Units je Account+Asset — ebenfalls nur $cond
    const unitsAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId: { $in: accountIds }, asset: { $exists: true }, archived: { $ne: true } } },
      {
        $group: {
          _id: { accountId: "$accountId", sym: { $toUpper: "$asset.symbol" }, cls: "$asset.class", name: "$asset.name" },
          pos: { $sum: { $cond: [{ $in: ["$transactionKind", ["asset_buy", "asset_transfer_in"]] }, { $ifNull: ["$units", 0] }, 0] } },
          neg: { $sum: { $cond: [{ $in: ["$transactionKind", ["asset_sell", "asset_transfer_out"]] }, { $ifNull: ["$units", 0] }, 0] } },
        }
      },
      {
        $project: {
          _id: 0,
          accountId: "$_id.accountId",
          asset: { class: "$_id.cls", symbol: "$_id.sym", name: "$_id.name" },
          units: { $add: ["$pos", { $multiply: ["$neg", -1] }] }
        }
      },
      { $match: { units: { $ne: 0 } } },
    ]).toArray();
    log("unitsAgg", { count: unitsAgg.length, sample: unitsAgg.slice(0, 5) });

    // 4) Ø-EK (nur Buys)
    const avgCostAgg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "transaction", userId, accountId: { $in: accountIds }, transactionKind: "asset_buy", archived: { $ne: true } } },
      {
        $group: {
          _id: { accountId: "$accountId", sym: { $toUpper: "$asset.symbol" }, cls: "$asset.class" },
          totalCost: { $sum: { $add: [{ $multiply: [{ $ifNull: ["$units", 0] }, { $ifNull: ["$pricePerUnit", 0] }] }, { $ifNull: ["$fee", 0] }] } },
          totalUnits: { $sum: { $ifNull: ["$units", 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          accountId: "$_id.accountId",
          key: { symbol: "$_id.sym", class: "$_id.cls" },
          avgCost: { $cond: [{ $gt: ["$totalUnits", 0] }, { $divide: ["$totalCost", "$totalUnits"] }, null] }
        }
      }
    ]).toArray();
    log("avgCostAgg", { count: avgCostAgg.length, sample: avgCostAgg.slice(0, 5) });

    // 5) Preise
    const symbolsSet = new Set<string>();
    for (const a of unitsAgg) symbolsSet.add(`${a.asset.class}|${a.asset.symbol}`);
    const priceQueries = Array.from(symbolsSet).map(k => {
      const [cls, sym] = k.split("|");
      return { class: cls, symbol: sym };
    });
    const prices = priceQueries.length
      ? await db.collection(FINANCE_COLLECTION)
          .find({ kind: "price_latest", $or: priceQueries })
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
    const missingPrices = priceQueries.filter(q => !priceMap.has(`${q.class}|${q.symbol}`));
    if (missingPrices.length) warn("Fehlende Preise", missingPrices.slice(0, 10));

    // 6) FX & Cash in EUR
    const usdToEur = await getUsdToEur(db);
    log("FX", { usdToEur });
    const cashByAccount = cashAgg.map((c: any) => {
      const acc = byId[c.accountId];
      const cur = (acc?.baseCurrency || "EUR").toUpperCase();
      let cashEUR: number | null = null;
      if (cur === "EUR") cashEUR = Number(c.cash ?? 0);
      else if (cur === "USD" && usdToEur) cashEUR = Number(c.cash ?? 0) * usdToEur;
      return { accountId: c.accountId, cash: Number(c.cash ?? 0), currency: cur, cashEUR };
    });
    log("cashByAccount", { sample: cashByAccount.slice(0, 5) });

    const fxMissing: string[] = [];
    for (const row of cashByAccount) {
      if (row.currency !== "EUR" && row.cashEUR == null) {
        if (!fxMissing.includes(row.currency)) fxMissing.push(row.currency);
      }
    }
    if (fxMissing.length) warn("Fehlende FX-Kurse (Cash in EUR=0):", fxMissing);

    // 7) Assets bewerten + PnL (robust bei fehlenden Preisen)
    let valuationIncomplete = false;
    const assetsByAccount = unitsAgg.map((a: any) => {
      const key = `${a.asset.class}|${a.asset.symbol}`;
      const priceEntry = priceMap.get(key);
      const hasPrice = priceEntry && typeof priceEntry.eur === "number" && priceEntry.eur > 0;

      const units = Number(a.units ?? 0);
      const priceEUR: number | null = hasPrice ? Number(priceEntry!.eur) : null;
      const valueEUR: number | null = hasPrice ? (priceEUR! * units) : null;

      const avg = avgCostAgg.find(x =>
        x.accountId === a.accountId &&
        x.key.symbol === a.asset.symbol &&
        x.key.class === a.asset.class
      )?.avgCost ?? null;

      const baseCur = (byId[a.accountId]?.baseCurrency || "EUR").toUpperCase();
      let costBasisEUR: number | null = null;
      if (avg != null) {
        const costLocal = avg * units;
        costBasisEUR =
          baseCur === "EUR" ? costLocal :
          (baseCur === "USD" && usdToEur ? costLocal * usdToEur : null);
      }

      // PnL nur, wenn Preis existiert
      const pnlAbsEUR = (hasPrice && costBasisEUR != null) ? (valueEUR! - costBasisEUR) : null;
      const pnlPct = (pnlAbsEUR != null && costBasisEUR && costBasisEUR !== 0) ? (pnlAbsEUR / costBasisEUR) : null;

      if (!hasPrice) valuationIncomplete = true;

      return {
        accountId: a.accountId,
        asset: a.asset,
        units,
        avgCost: avg,          // lokal
        priceEUR,              // kann null sein
        valueEUR,              // kann null sein
        costBasisEUR,          // kann null sein
        pnlAbsEUR,             // null falls kein Preis
        pnlPct,                // null falls kein Preis
        priceMissing: !hasPrice,
      };
    });
    log("assetsByAccount", { count: assetsByAccount.length, sample: assetsByAccount.slice(0, 5) });

    // 8) Totals + Net Worth
    const totalsByAccount = accounts.map((acc: any) => {
      const id = String(acc._id);
      const cash = cashByAccount.find(c => c.accountId === id);
      const assetsVal = assetsByAccount
        .filter(x => x.accountId === id)
        .reduce((s, x) => s + (x.valueEUR ?? 0), 0);
      const cashEUR = cash?.cashEUR ?? (acc.baseCurrency?.toUpperCase() === "EUR" ? Number(cash?.cash ?? 0) : 0);
      const totalEUR = Number(cashEUR ?? 0) + assetsVal;
      return {
        accountId: id,
        name: acc.name,
        baseCurrency: acc.baseCurrency ?? "EUR",
        cash: cash?.cash ?? 0,
        cashEUR,
        assetsValueEUR: assetsVal,
        totalEUR,
      };
    });
    const netWorthEUR = totalsByAccount.reduce((s, t) => s + (t.totalEUR ?? 0), 0);
    log("totalsByAccount", { count: totalsByAccount.length, sample: totalsByAccount.slice(0, 5) });
    log("netWorthEUR", netWorthEUR);

    if (!netWorthEUR) {
      warn("Net Worth = 0 – Checkliste:", {
        noCashRows: cashAgg.length === 0,
        allCashZero: cashByAccount.every(c => (c.cashEUR ?? 0) === 0),
        noAssets: unitsAgg.length === 0,
        missingPrices: missingPrices.length,
        fxMissing
      });
    }

    return res.status(200).json({
      accounts: Object.entries(byId).map(([accountId, v]) => ({ accountId, name: v.name, baseCurrency: v.baseCurrency })),
      cashByAccount,
      assetsByAccount,
      totalsByAccount,
      netWorthEUR,
      priceAsOf: priceAsOfMax,
      fxMissing,
      valuationIncomplete,
      missingPrices: missingPrices.map(p => `${p.class}|${p.symbol}`),
    });
  } catch (e) {
    console.error(`[holdings:${RID}] ERROR`, e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
