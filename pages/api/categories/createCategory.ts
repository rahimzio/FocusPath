import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { name, userId } = req.body;

  if (!name || !userId) {
    return res.status(400).json({ message: "Name und userId sind erforderlich." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    // Prüfen, ob die Kategorie für diesen User schon existiert
    const existing = await appData.findOne({ type: "category", name, userId });
    if (existing) {
      return res.status(409).json({ message: "Kategorie existiert bereits." });
    }

    const newCategory = {
      type: "category",
      userId,
      name,
      createdAt: new Date().toISOString(),
    };

    await appData.insertOne(newCategory);

    return res.status(201).json({ message: "Kategorie erfolgreich erstellt", category: newCategory });
  } catch (error: any) {
    console.error("❌ Fehler beim Erstellen der Kategorie:", error);
    return res.status(500).json({ message: "Interner Serverfehler", error: error.message });
  }
}
