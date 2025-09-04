import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";
import { AssetClass, FinanceTransaction, TransactionKind } from "@/utils/interface";
import { insertFinance } from "@/lib/api/finance";

const KINDS: TransactionKind[] = [
  "cash_deposit","cash_withdrawal","asset_buy","asset_sell",
  "asset_transfer_in","asset_transfer_out","cash_transfer_in","cash_transfer_out"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });

  try {
    const { db } = await connectToDatabase();
    const body = req.body as Partial<FinanceTransaction> & { kind?: TransactionKind };

    const userId = body.userId;
    const accountId = body.accountId;
    // akzeptiere beides: transactionKind (neu) oder kind (alt)
    const transactionKind = (body as any).transactionKind ?? (body as any).kind;

    if (!userId || !accountId || !transactionKind || !KINDS.includes(transactionKind)) {
      return res.status(400).json({ message: "Missing/invalid userId/accountId/transactionKind" });
    }

    // Account existiert & nicht archiviert?
    try {
      const acc = await db.collection("finance").findOne({
        _id: new ObjectId(accountId),
        kind: "account",
        userId,
        archived: { $ne: true },
      }, { projection: { _id: 1 } });
      if (!acc) return res.status(400).json({ message: "Account not found or archived" });
    } catch {
      return res.status(400).json({ message: "Invalid accountId" });
    }

    if (transactionKind.startsWith("asset_")) {
      if (!body.asset?.symbol || !body.asset?.class) {
        return res.status(400).json({ message: "Missing asset symbol/class" });
      }
    }
    if (transactionKind === "asset_buy" || transactionKind === "asset_sell") {
      if (!(typeof body.units === "number" && body.units > 0)) return res.status(400).json({ message: "Invalid units" });
      if (!(typeof body.pricePerUnit === "number" && body.pricePerUnit > 0)) return res.status(400).json({ message: "Invalid pricePerUnit" });
    }
    if (transactionKind.startsWith("cash_")) {
      if (!(typeof body.cashAmount === "number" && body.cashAmount > 0)) return res.status(400).json({ message: "Invalid cashAmount" });
    }

    const now = new Date().toISOString();
    const doc: Omit<FinanceTransaction, "createdAt" | "updatedAt"> = {
      kind: "transaction",
      userId,
      accountId,
      date: body.date ?? now,
      transactionKind,
      note: body.note?.trim() || undefined,
      asset: body.asset ? {
        class: body.asset.class as AssetClass,
        symbol: String(body.asset.symbol).toUpperCase(),
        name: body.asset.name?.trim() || undefined,
      } : undefined,
      units: body.units,
      pricePerUnit: body.pricePerUnit,
      fee: body.fee ?? 0,
      cashAmount: body.cashAmount ?? (
        (transactionKind === "asset_buy" && body.units && body.pricePerUnit) ? (body.units * body.pricePerUnit + (body.fee ?? 0)) :
        (transactionKind === "asset_sell" && body.units && body.pricePerUnit) ? (body.units * body.pricePerUnit - (body.fee ?? 0)) :
        undefined
      ),
    };

    const r = await insertFinance(db, doc);
    return res.status(201).json({ ok: true, id: r.id });
  } catch (e) {
    console.error("addTransaction", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
