import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

function monthStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function iso(d: Date) { return d.toISOString(); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ message: "Missing userId" });

  try {
    const { db } = await connectToDatabase();
    const now = new Date();
    const start = monthStart(now);
    const end = monthStart(new Date(now.getFullYear(), now.getMonth() + 1, 1));

    const agg = await db.collection(FINANCE_COLLECTION).aggregate([
      { $match: { kind: "expense", userId, dueDate: { $gte: iso(start), $lt: iso(end) } } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]).toArray();

    return res.status(200).json({ totalExpenses: agg[0]?.sum ?? 0 });
  } catch (e) {
    console.error("monthly", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
