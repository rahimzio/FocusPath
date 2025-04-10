import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH" && req.method !== "POST") {
    return res.status(405).json({ message: "Only PATCH or POST allowed" });
  }

  const { taskId, status, userId } = req.body;

  if (!taskId || !status || !userId) {
    return res.status(400).json({ message: "Missing taskId, status, or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("appData");

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId), type: "task", userId },
      { $set: { status } }
    );

    if (result.modifiedCount === 1) {
      return res.status(200).json({ message: "Status erfolgreich aktualisiert" });
    } else {
      return res.status(404).json({ message: "Aufgabe nicht gefunden oder nicht geändert" });
    }
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Status:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren des Status" });
  }
}
