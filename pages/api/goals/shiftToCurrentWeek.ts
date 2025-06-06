import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { goalId, userId } = req.body;

  if (!goalId || !userId) {
    return res.status(400).json({ message: "Missing goalId or userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const originalGoal = await appData.findOne({ _id: new ObjectId(goalId), userId, type: "goal" });

    if (!originalGoal) {
      return res.status(404).json({ message: "Original goal not found" });
    }

    // Neue Woche berechnen
    const now = new Date();
    const newStart = startOfWeek(now, { weekStartsOn: 1 });
    const newEnd = endOfWeek(now, { weekStartsOn: 1 });

    // _id und __v entfernen durch Destructuring
    const { _id, __v, ...goalWithoutId } = originalGoal;

    const newGoal = {
      ...goalWithoutId,
      title: originalGoal.title + " (kopiert)",
      startDate: newStart.toISOString(),
      endDate: newEnd.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: 0,
      completedAt: null,
      type: "goal",
    };

    const insertResult = await appData.insertOne(newGoal);

    return res.status(200).json({
      message: "Ziel erfolgreich kopiert",
      newGoal: { ...newGoal, _id: insertResult.insertedId },
    });
  } catch (err) {
    console.error("Fehler beim Kopieren:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
