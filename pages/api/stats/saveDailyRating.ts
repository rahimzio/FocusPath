import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const { userId, date, rating } = req.body || {};

    // When called with explicit data, simply upsert that rating
    if (
      userId &&
      typeof userId === "string" &&
      date &&
      typeof date === "string" &&
      rating
    ) {
      await db.collection("stats").updateOne(
        { userId, date },
        { $set: { rating, updatedAt: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ message: "Rating saved" });
    }

    // Fallback cron-like behaviour: compute today's rating for all users
    const users = await db.collection("users").find({}).toArray();
    const tasksCol = db.collection("tasks");
    const goalsCol = db.collection("goals");

    const today = new Date().toISOString().split("T")[0];

    for (const user of users) {
     const id = user._id.toString();
      const tasks = await tasksCol.find({ userId: id, dueDate: today }).toArray();
      const goals = await goalsCol.find({ userId: id }).toArray();

      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === "completed").length;
      const percent = total ? (completed / total) * 100 : 0;
      const allGoalTasksDone = tasks
        .filter((t) => t.goalId)
        .every((t) => t.status === "completed");
      const allImportantDone = tasks
        .filter((t) => t.points && t.points > 7)
        .every((t) => t.status === "completed");

      
      let autoRating = "L Day";
      if (percent === 100) autoRating = "W+ Day";
      else if (percent >= 85 && allGoalTasksDone && allImportantDone)
        autoRating = "W Day";
      else if (percent >= 50) autoRating = "M Day";

      await db.collection("stats").updateOne(
        { userId: id, date: today },
        { $set: { rating: autoRating, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "✅ Tagesratings erfolgreich gespeichert." });
  } catch (err) {
    console.error("❌ Fehler beim Tagesrating:", err);
    res.status(500).json({ error: "Interner Fehler beim Speichern" });
  }
}
