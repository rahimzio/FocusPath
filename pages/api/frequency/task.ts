import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { Task } from "@/utils/interfaces/task";

interface FrequencyRecommendation {
  title: string;
  description: string;
  category: "Mindset" | "Körper" | "Emotion" | "Verhalten";
  gapReason: string;
  basedOn: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST-Anfragen erlaubt" });
  }

  const { recommendation, userId } = req.body as { recommendation: FrequencyRecommendation; userId: string };

  if (!recommendation || !userId) {
    return res.status(400).json({ message: "Fehlende Daten" });
  }

  try {
    const {db} = await connectToDatabase();
    const taskCollection = db.collection("appData");

    const newTask: Partial<Task> = {
      name: recommendation.title,
      description: recommendation.description,
      category: recommendation.category,
      points: 5, // Standardpunkte für Frequenzaufgaben, später dynamisch anpassbar
      status: "incomplete",
      dueDate: new Date().toISOString().split("T")[0], // heute
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: userId,
      timebased: false,
      frequency: "once",
      progress: 0,
    };

    const result = await taskCollection.insertOne(newTask as any);

    return res.status(201).json({ message: "Aufgabe erfolgreich erstellt", taskId: result.insertedId });
  } catch (error) {
    console.error("Fehler beim Erstellen der Aufgabe:", error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}
