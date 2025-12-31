// pages/api/trading/setups/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "@/utils/interface";

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

    const docs = await appData
      .find({
        userId,
        type: { $in: ["trading_setup_v1", "trading_setup_v2"] },
      })
      .toArray();

    // Neueste zuerst (createdAt, fallback: updatedAt)
    docs.sort((a: any, b: any) => {
      const da = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
      const dbt = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
      return dbt - da;
    });

    const setups: TradingSetup[] = docs.map((doc: any) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        _id: _id.toString(),
      } as TradingSetup;
    });

    return res.status(200).json({ setups });
  } catch (err) {
    console.error("Error loading setups", err);
    return res
      .status(500)
      .json({ message: "Internal server error" });
  }
}
