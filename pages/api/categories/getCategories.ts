import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "userId ist erforderlich." });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const categories = await appData
      .find({ type: "category", userId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ categories });
  } catch (error: any) {
    console.error("❌ Fehler beim Abrufen der Kategorien:", error);
    return res.status(500).json({ message: "Interner Serverfehler", error: error.message });
  }
}
