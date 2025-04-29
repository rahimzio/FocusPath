import type { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/utils/db";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "userId fehlt" });
  }

  try {
    const db = await connectDB();
    const reflections = await db
      .collection("frequencyReflections")
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1, timeOfDay: 1 })
      .toArray();

    return res.status(200).json({ reflections });
  } catch (error) {
    console.error("Fehler beim Abrufen der Reflexionen:", error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}
