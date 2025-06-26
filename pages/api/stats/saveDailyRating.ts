import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Only POST method allowed" });
  }

  const { userId, date, rating } = req.body;
  if (!userId || !date || !rating) {
    return res.status(400).json({ message: "Missing userId, date, or rating" });
  }

  try {
    const {db} = await connectToDatabase();
    const collection = db.collection("stats");

    // Prüfen, ob für dieses Datum bereits ein Rating existiert
    const existing = await collection.findOne({ userId, date });
    if (existing) {
      return res.status(200).json({ message: "Rating already exists", alreadyExists: true });
    }

    // Neues Rating einfügen
    await collection.insertOne({ userId, date, rating, createdAt: new Date() });
    return res.status(201).json({ message: "Rating saved" });

  } catch (error) {
    console.error("Fehler beim Speichern des Ratings:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
