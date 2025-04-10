import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Nur POST erlaubt" });

  const { date, score, userId } = req.body;

  if (!date || !score || !userId) {
    return res.status(400).json({ message: "Fehlende Parameter: date, score oder userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const existing = await appData.findOne({ type: "evaluation", userId, date });

    if (existing) {
      await appData.updateOne(
        { type: "evaluation", userId, date },
        { $set: { score, updatedAt: new Date().toISOString() } }
      );
    } else {
      await appData.insertOne({
        type: "evaluation",
        userId,
        date,
        score,
        createdAt: new Date().toISOString()
      });
    }

    return res.status(200).json({ message: "Bewertung erfolgreich gespeichert" });
  } catch (err) {
    console.error("Fehler beim Speichern der Bewertung:", err);
    return res.status(500).json({ message: "Interner Serverfehler" });
  }
}
