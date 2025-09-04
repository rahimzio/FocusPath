// pages/api/frequency/saveFrequencyReflection.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { userId, date, timeOfDay, reflection, influence, dos, donts } = req.body;

  // Basis-Validierung
  if (!userId || !date || !timeOfDay || !reflection || !influence) {
    return res.status(400).json({ message: "Fehlende Felder im Request" });
  }

  try {
    const { db } = await connectToDatabase();
    const reflections = db.collection("frequencyReflections");

    const newReflection = {
      userId,
      date: new Date(date),
      timeOfDay,         // z. B. "morning", "afternoon", "evening"
      reflection,        // Freitext
      influence,         // z. B. Zahl oder Auswahl
      dos: Array.isArray(dos) ? dos : [],   // Liste der Do's
      donts: Array.isArray(donts) ? donts : [], // Liste der Don'ts
      createdAt: new Date()
    };

    await reflections.insertOne(newReflection);

    res.status(201).json({ message: "Reflexion gespeichert", data: newReflection });
  } catch (error) {
    console.error("Fehler beim Speichern der Reflexion:", error);
    res.status(500).json({ message: "Interner Serverfehler" });
  }
}
