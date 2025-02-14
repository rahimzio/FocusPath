// pages/api/task/updateTask.ts

import { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { TaskDocument } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed. Use PUT." });
  }

  try {
    // 1) taskId
    const { taskId } = req.query;
    if (!taskId || typeof taskId !== "string") {
      return res.status(400).json({ message: "Missing or invalid taskId parameter" });
    }

    // 2) Neue Felder aus dem Body holen
    //    Wir machen hier ein Partial, damit nicht alle Felder Pflicht sind
    const updateFields = req.body as Partial<Omit<TaskDocument, "_id">>;
    updateFields.updatedAt = new Date().toISOString();

    // 3) DB-Verbindung
    const { db } = await connectToDatabase();
    // Collection mit TaskDocument typisieren
    const tasksColl = db.collection<TaskDocument>("tasks");

    // 4) Update mit echter ObjectId
    const result = await tasksColl.updateOne(
      { _id: new ObjectId(taskId) },      // <-- jetzt passt ObjectId zum DB-Interface
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      // Keine Änderung oder kein Dokument gefunden
      await disconnectFromDatabase();
      return res.status(404).json({ message: "Task not found or not updated" });
    }

    await disconnectFromDatabase();
    return res.status(200).json({ message: "Task updated successfully" });

  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
