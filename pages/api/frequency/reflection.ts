import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/utils/db"; // deine bestehende DB-Verbindung
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { userId, date, timeOfDay, reflection, influence } = req.body;

  if (!userId || !date || !timeOfDay || !reflection || !influence) {
    return res.status(400).json({ message: "Fehlende Felder im Request" });
  }

  try {
    const db = await connectDB();
    const reflections = db.collection("frequencyReflections");

    const doc = {
      userId: new ObjectId(userId),
      date,
      timeOfDay,
      reflection,
      influence,
      createdAt: new Date().toISOString(),
    };

    await reflections.insertOne(doc);

    return res.status(201).json({ message: "Reflexion gespeichert" });
  } catch (error) {
    console.error("Fehler beim Speichern der Reflexion:", error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}
