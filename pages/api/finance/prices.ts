import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  try {
    const { db } = await connectToDatabase();
    const { symbols = "", cls } = req.query as { symbols?: string; cls?: string };

    const q: any = { kind: "price_latest" };
    if (cls && typeof cls === "string") q.class = cls.toLowerCase();

    let list: string[] | null = null;
    if (symbols) {
      list = String(symbols)
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (list.length) q.symbol = { $in: list };
    }

    const docs = await db
      .collection(FINANCE_COLLECTION)
      .find(q, { projection: { class: 1, symbol: 1, price: 1, asOfDate: 1, provider: 1 } })
      .toArray();

    return res.status(200).json({ prices: docs });
  } catch (e) {
    console.error("prices", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
