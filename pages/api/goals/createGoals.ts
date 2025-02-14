// pages/api/goal/createGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
import { Goal } from "@/utils/interface"; 
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { title, description, type, startDate, endDate } = req.body;

  // Grundlegende Validierung
  if (!title || !type || !startDate || !endDate) {
    return res.status(400).json({
      message: "Missing required fields: 'title', 'type', 'startDate', or 'endDate'.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const goalsColl = db.collection<Goal>("goals");

    // Neues Ziel-Objekt
    const newGoal: Goal = {
      _id: new ObjectId().toHexString(),
      title,
      description,
      type,
      startDate,
      endDate,
      progress: 0,
      tasks: [],
      subGoals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Ziel in der Datenbank einfügen
    const result = await goalsColl.insertOne(newGoal);

    if (result.acknowledged) {
      console.log(`Neues Ziel erstellt: ${result.insertedId}`);
      await disconnectFromDatabase();
      return res.status(201).json({ message: "Ziel erfolgreich erstellt", goalId: result.insertedId });
    } else {
      throw new Error("Ziel konnte nicht eingefügt werden");
    }
  } catch (error) {
    console.error("Fehler beim Erstellen des Ziels:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
