import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId, month } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  try {
    const { db } = await connectToDatabase();
    const q: any = { kind: "income", userId };
    if (typeof month === "string" && month) q.month = month;
    const docs = await db.collection(FINANCE_COLLECTION)
      .find(q, { projection: { month: 1, amount: 1, source: 1 } })
      .sort({ month: 1 })
      .toArray();

    res.status(200).json({ incomes: docs.map(d => ({ month: d.month, amount: d.amount, source: d.source })) });
  } catch (e) {
    console.error("getIncome", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
