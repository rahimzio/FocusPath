// pages/api/trading/account/adjust.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, getTradingCollection } from "../../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    const { userId, accountId, amount, kind, note } = (req.body ?? {}) as {
      userId?: string; accountId?: string; amount?: any; kind?: "deposit"|"withdrawal"; note?: string;
    };

    const usr = String(userId || "").trim();
    const acc = String(accountId || "").trim();
    const amt = Number(amount);
    const knd = kind === "withdrawal" ? "withdrawal" : "deposit";

    if (!usr)  return res.status(400).json({ error: "userId ist erforderlich" });
    if (!acc)  return res.status(400).json({ error: "accountId ist erforderlich" });
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "amount > 0 erforderlich" });

    const account = await col.findOne({ _id: acc as any, type: "account", userId: usr, deleted: { $ne: true } });
    if (!account) return res.status(404).json({ error: "Account nicht gefunden" });

    const signed = knd === "deposit" ? amt : -amt;
    const now = new Date().toISOString();

    const upd = await col.updateOne(
      { _id: acc as any, type: "account", userId: usr },
      {
        $inc: { currentBalance: signed },
        $push: {
          transactions: {
            _id: `${now}-${knd}`,
            type: knd,
            amount: signed,       // Vorzeichen-enthaltend
            at: now,
            note: note ? String(note) : undefined,
          }
        },
        $set: { updatedAt: now }
      }
    );

    if (upd.matchedCount === 0) return res.status(404).json({ error: "Account nicht gefunden" });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("❌ /api/trading/account/adjust:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
