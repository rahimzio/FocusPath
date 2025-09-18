// pages/api/trading/account/adjust.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // defensive indexes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1 }),
        col.createIndex({ type: 1, userId: 1, archived: 1, deleted: 1 }),
      ]);
    } catch {}

    const { userId, accountId, amount, kind, note } = (req.body ?? {}) as {
      userId?: string;
      accountId?: string;
      amount?: any;
      kind?: "deposit" | "withdrawal";
      note?: string;
    };

    const usr = String(userId || "").trim();
    const accStr = String(accountId || "").trim();
    const amt = Number(amount);
    const knd: "deposit" | "withdrawal" = kind === "withdrawal" ? "withdrawal" : "deposit";

    if (!usr) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!accStr) return res.status(400).json({ error: "accountId ist erforderlich" });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "amount > 0 erforderlich" });

    // accountId als ObjectId interpretieren (falls möglich)
    let accId: ObjectId | string = accStr;
    try { accId = new ObjectId(accStr); } catch {}

    // Account laden (archivierte/gelöschte ausschließen)
    const account = await col.findOne({
      _id: accId as any,
      type: "account",
      userId: usr,
      deleted: { $ne: true },
      archived: { $ne: true },
    }, { projection: { _id: 1, userId: 1, currentBalance: 1, startingBalance: 1 } });

    if (!account) return res.status(404).json({ error: "Account nicht gefunden" });

    const now = new Date().toISOString();
    const signed = knd === "deposit" ? amt : -amt;

    // Falls currentBalance fehlt, einmalig auf startingBalance/0 initialisieren
    if (typeof (account as any).currentBalance !== "number") {
      const initBalance = Number((account as any).startingBalance ?? 0) || 0;
      await col.updateOne(
        { _id: accId as any, type: "account", userId: usr },
        { $set: { currentBalance: initBalance, updatedAt: now } }
      );
    }

    // Transaktionseintrag vorbereiten
    const tx: any = {
      _id: `${now}-${knd}`,
      type: knd,
      amount: signed, // mit Vorzeichen
      at: now,
    };
    if (note && String(note).trim()) tx.note = String(note).trim();

    // Atomar: Kontostand erhöhen/verringern und Transaktion anhängen
    const upd = await col.findOneAndUpdate(
      { _id: accId as any, type: "account", userId: usr, deleted: { $ne: true }, archived: { $ne: true } },
      {
        $inc: { currentBalance: signed },
        $push: { transactions: tx },
        $set: { updatedAt: now },
      },
      { returnDocument: "after", projection: { currentBalance: 1 } }
    );

    if (!upd.value) return res.status(404).json({ error: "Account nicht gefunden (während Update)" });

    return res.status(200).json({ ok: true, currentBalance: Number(upd.value.currentBalance) });
  } catch (err: any) {
    console.error("❌ /api/trading/account/adjust:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
