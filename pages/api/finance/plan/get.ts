import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId, month } = req.query as { userId?: string; month?: string };
  if (!userId || !month) return res.status(400).json({ message: "Missing userId/month" });

  try {
    const { db } = await connectToDatabase();
    const plan = await db.collection(FINANCE_COLLECTION).findOne({ kind: "plan_monthly", userId, month });
    res.status(200).json({ plan });
  } catch (e) {
    console.error("plan/get", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
