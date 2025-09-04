// pages/api/admin/createIndexes.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

const REQUIRED_TOKEN = process.env.ADMIN_MIGRATE_TOKEN || "SET_ME";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const token = (req.query.token as string) || (req.headers["x-admin-token"] as string);
  if (!token || token !== REQUIRED_TOKEN) return res.status(401).json({ message: "Unauthorized" });

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // häufige Query-Pfade
    const results = await Promise.all([
      col.createIndex({ userId: 1, type: 1, date: 1 }, { name: "user_type_date" }),
      col.createIndex({ userId: 1, type: 1, accountId: 1, date: 1 }, { name: "user_type_account_date" }),
      col.createIndex({ userId: 1, type: 1, strategy_name: 1 }, { name: "user_type_strategy" }),
      col.createIndex({ userId: 1, type: 1, "tradingMistakes": 1 }, { name: "user_type_mistakes" }),
    ]);

    return res.status(200).json({ ok: true, indexes: results });
  } catch (e) {
    console.error("createIndexes error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
