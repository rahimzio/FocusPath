import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo"; // Pfad anpassen

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { userId, date } = req.query;
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "userId fehlt" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("frequency");

    const filter: any = { userId };
    if (date && typeof date === "string") filter.date = date;

    const reflections = await col.find(filter).sort({ date: 1, block: 1 }).toArray();
    return res.status(200).json({ reflections });
  } catch (error) {
    console.error("Fehler beim Abrufen der Reflexionen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
}
