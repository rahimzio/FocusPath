import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/connectToDatabase";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });

  const { userId, month, total, funmoneyPct, funmoneyAmount, bills = [], investments = [], extras = [], note } = req.body || {};
  if (!userId || !month || !/^\d{4}-\d{2}$/.test(month) || !(Number(total) > 0)) {
    return res.status(400).json({ message: "Missing/invalid userId/month/total" });
  }

  try {
    const { db } = await connectToDatabase();
    const doc = {
      kind: "plan_monthly",
      userId,
      month,
      total: Number(total),
      funmoneyPct: typeof funmoneyPct === "number" ? funmoneyPct : undefined,
      funmoneyAmount: typeof funmoneyAmount === "number" ? funmoneyAmount : undefined,
      bills: (bills || []).map((b: any) => ({ label: String(b.label || "").trim(), amount: Number(b.amount || 0) })).filter((b: { label: any; amount: number; }) => b.label && b.amount > 0),
      investments: (investments || []).map((i: any) => ({ label: String(i.label || "").trim(), pct: typeof i.pct==="number"? i.pct: undefined, amount: typeof i.amount==="number"? i.amount: undefined })),
      extras: (extras || []).map((x: any) => ({ label: String(x.label || "").trim(), pct: typeof x.pct==="number"? x.pct: undefined, amount: typeof x.amount==="number"? x.amount: undefined })),
      note: (note ?? "").toString().trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    await db.collection(FINANCE_COLLECTION).updateOne(
      { kind: "plan_monthly", userId, month },
      { $set: doc, $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("plan/upsert", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
