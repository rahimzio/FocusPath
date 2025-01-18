// pages/api/task/updateStatus.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // DB-Verbindung aufbauen
    const { db } = await connectToDatabase();
    const collection = db.collection("tasks");

    const { taskId, status } = req.body;
    if (!taskId || !status) {
      return res.status(400).json({ message: "Fehlende taskId oder Status" });
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { status } }
    );

    if (result.modifiedCount === 1) {
      await disconnectFromDatabase();
      return res.status(200).json({ message: "Status erfolgreich aktualisiert" });
    } else {
      await disconnectFromDatabase();
      return res.status(404).json({ message: "Aufgabe nicht gefunden" });
    }
  } catch (error) {
    console.error("Fehler beim Aktualisieren des Status:", error);
    return res.status(500).json({ message: "Fehler beim Aktualisieren des Status" });
  }
}
