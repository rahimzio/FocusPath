// pages/api/goal/createGoals.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo"; // disconnectFromDatabase entfernt
import { Goal } from "@/utils/interface";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  const { title, description, type, startDate, endDate } = req.body;

  if (!title || !type || !startDate || !endDate) {
    return res.status(400).json({
      message: "Missing required fields: 'title', 'type', 'startDate', or 'endDate'.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    const collectionNames = await db.listCollections({}, { nameOnly: true }).toArray();
    const collectionExists = collectionNames.some((col) => col.name === "goals");

    if (!collectionExists) {
      return res.status(500).json({
        message:
          "Die Collection 'goals' existiert nicht. Bitte manuell in CosmosDB anlegen, um Throughput-Probleme zu vermeiden.",
      });
    }

    const goalsColl = db.collection<Goal>("goals");

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

    const result = await goalsColl.insertOne(newGoal);

    if (result.acknowledged) {
      console.log(`✅ Neues Ziel erstellt: ${result.insertedId}`);
      return res
        .status(201)
        .json({ message: "Ziel erfolgreich erstellt", goalId: result.insertedId });
    } else {
      throw new Error("Ziel konnte nicht eingefügt werden");
    }
  } catch (error: any) {
    console.error("❌ Fehler beim Erstellen des Ziels:", error);
    if (
      typeof error.message === "string" &&
      error.message.includes("throughput")
    ) {
      return res.status(429).json({
        message: "Throughput-Limit erreicht. Bitte manuell Collection erstellen oder RU erhöhen.",
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}
