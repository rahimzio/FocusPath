import { MongoClient } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

const uri = process.env.MONGO_URI!;
const dbName = process.env.DB_NAME || "focuspath";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = await db.collection("users").find({}).toArray();
    const tasksCol = db.collection("tasks");
    const goalsCol = db.collection("goals");

    const today = new Date().toISOString().split("T")[0];

    for (const user of users) {
      const userId = user._id.toString();

      const tasks = await tasksCol.find({ userId, dueDate: today }).toArray();
      const goals = await goalsCol.find({ userId }).toArray();

      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const percent = total ? (completed / total) * 100 : 0;
      const allGoalTasksDone = tasks.filter(t => t.goalId).every(t => t.status === "completed");
      const allImportantDone = tasks.filter(t => t.points && t.points > 7).every(t => t.status === "completed");

      let rating = "L Day";
      if (percent === 100) rating = "W+ Day";
      else if (percent >= 85 && allGoalTasksDone && allImportantDone) rating = "W Day";
      else if (percent >= 50) rating = "M Day";

      await db.collection("dailyRatings").updateOne(
        { userId, date: today },
        { $set: { rating, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.status(200).json({ message: "✅ Tagesratings erfolgreich gespeichert." });
  } catch (err) {
    console.error("❌ Fehler beim Tagesrating:", err);
    res.status(500).json({ error: "Interner Fehler beim Speichern" });
  } finally {
    await client.close();
  }
}
