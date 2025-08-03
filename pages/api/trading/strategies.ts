import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/connectToDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  console.log("📥 Eingehende Anfrage an /api/trading/monthlyPnl", { method: req.method, userId });

  if (!userId || typeof userId !== "string") {
    console.error("❌ Ungültige userId übergeben:", userId);
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const { db } = await connectToDatabase();
    console.log("✅ Verbindung zur Datenbank erfolgreich hergestellt");

    const tradesCol = db.collection("trading");
    console.log("📦 Abruf der Trades für userId:", userId);

    const trades = await tradesCol
      .find({ userId })
      .sort({ date: 1 })
      .toArray();

    console.log(`🔍 Gefundene Trades: ${trades.length}`);

    const result: { day: string; cumPnl: number }[] = [];
    let cumulative = 0;

    for (const t of trades) {
      const date = t.date?.substring(0, 10);
      if (!date) {
        console.warn("⚠️ Trade ohne gültiges Datum:", t);
        continue;
      }

      const pnl = t.pnl ?? 0;
      cumulative += pnl;

      const existing = result.find((r) => r.day === date);
      if (existing) {
        existing.cumPnl += pnl;
      } else {
        result.push({ day: date, cumPnl: cumulative });
      }
    }

    console.log("✅ Kumuliertes Ergebnis berechnet:", result);
    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Fehler in /api/trading/monthlyPnl:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
