import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FinanceIncome } from "@/utils/interface";
import { insertFinance } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });
  const { userId, month, amount, source, note } = req.body as Partial<FinanceIncome>;
  if (!userId || !month || !(typeof amount === "number" && amount > 0)) {
    return res.status(400).json({ message: "Missing userId/month/amount" });
  }
  try {
    const { db } = await connectToDatabase();
    const doc: Omit<FinanceIncome, "createdAt"|"updatedAt"> = {
      kind: "income", userId, month, amount, source, note: note?.trim() || undefined
    };
    const r = await insertFinance(db, doc);
    res.status(201).json({ ok: true, id: r.id });
  } catch (e) {
    console.error("addIncome", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
