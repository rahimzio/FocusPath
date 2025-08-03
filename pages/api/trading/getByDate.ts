// pages/api/trading/getByDate.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { TradeEntry } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("📥 /api/trading/getByDate aufgerufen", {
    method: req.method,
    query: req.query,
  });

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { date, userId, accountId } = req.query;

  if (!date || typeof date !== "string" || !userId || typeof userId !== "string") {
    console.error("❌ Fehlende Parameter:", { date, userId });
    return res.status(400).json({ message: "Missing or invalid parameters" });
  }

  try {
    const { db } = await connectToDatabase();
    console.log("✅ DB-Verbindung erfolgreich");

    const appData = db.collection("trading");

    const query: Record<string, unknown> = {
      type: "tradeEntry",
      userId,
      date, // exakter Stringvergleich
    };

    if (accountId && typeof accountId === "string" && accountId !== "all") {
      query.accountId = accountId;
    }

    console.log("🔍 Query:", query);

    const trades = await appData
      .find(query)
      .project({ type: 0 })
      .toArray() as TradeEntry[];

    console.log("📊 Gefundene Trades:", trades.length);

    return res.status(200).json({ trades });
  } catch (err) {
    console.error("❌ Fehler beim Abrufen der Trades:", err);
    return res.status(500).json({ message: "Serverfehler beim Laden der Trades" });
  }
}
