// pages/api/trading/trades/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradeEntry } from "../../../../components/trading1/interface";
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res
      .status(400)
      .json({ message: "Missing or invalid userId." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("trading");

    // 🔹 Trades aus appData laden (V2-Typ)
    const docs = await appData
      .find({
        userId,
        type: "trading_trade_v1",
      })
      .toArray();

    // 🔹 Sortierung in JS (damit Cosmos kein Composite-Index braucht)
    docs.sort((a: any, b: any) => {
      const da = new Date(a.date ?? a.createdAt ?? 0).getTime();
      const dbt = new Date(b.date ?? b.createdAt ?? 0).getTime();
      return dbt - da; // neueste zuerst
    });

    const trades: TradeEntry[] = docs.map((doc: any) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        _id: _id.toString(),
      } as TradeEntry;
    });

    return res.status(200).json({ trades });
  } catch (err) {
    console.error("Error listing trades", err);
    return res
      .status(500)
      .json({ message: "Internal server error" });
  }
}
