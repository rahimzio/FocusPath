import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/connectToDatabase";
import { ObjectId } from "mongodb";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
dayjs.extend(weekOfYear);

const getRatingValue = (rating: string): number => {
  switch (rating) {
    case "L Day": return 0;
    case "M Day": return 1;
    case "W Day": return 2;
    case "W+ Day": return 2.5;
    default: return 0;
  }
};

const getRatingLetterFromValue = (value: number): string => {
  if (value >= 2.25) return "W+ Day";
  if (value >= 1.5) return "W Day";
  if (value >= 0.75) return "M Day";
  return "L Day";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("🔔 API Call: saveDailyRating → Methode:", req.method);
  
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    console.log("🧩 Starte Verbindung zur Datenbank...");
    const { db } = await connectToDatabase();
    const statsCol = db.collection("stats");
    const usersCol = db.collection("users");
    const tasksCol = db.collection("appData");

    const { userId, date, rating } = req.body || {};
    console.log("📦 Eingehende Daten:", { userId, date, rating });

    // 1) Check-Only-Modus
    if (userId && date && !rating) {
      console.log("🔎 Prüfe, ob Rating bereits existiert...");
      const existing = await statsCol.findOne({ userId, date });
      console.log("✅ Bereits vorhanden:", !!existing);
      return res.status(200).json({ alreadyExists: !!existing });
    }

    // 2) Explizites Upsert
    if (userId && date && rating) {
      console.log("📨 Speichere Rating manuell...");
      const existing = await statsCol.findOne({ userId, date });
      if (existing) {
        console.log("⚠️ Rating existiert bereits → keine Änderung");
        return res.status(200).json({ alreadyExists: true });
      }

      const result = await statsCol.updateOne(
        { userId, date },
        { $set: { rating, updatedAt: new Date() } },
        { upsert: true }
      );

      console.log("✅ Manuelles Rating gespeichert:", result);
      return res.status(200).json({ alreadyExists: false });
    }

    // 3) Cron-Modus
    console.log("⏱ Starte Cron-Modus...");
    const users = await usersCol.find({}).toArray();
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = yesterday.toISOString().split("T")[0];
    console.log("📆 Berechne für:", dateKey);

    for (const user of users) {
      const id = user._id.toString();
      console.log("👤 Nutzer:", id);

      const tasks = await tasksCol.find({ userId: id, type: "task", dueDate: dateKey }).toArray();
      console.log(`📋 Aufgaben für ${id}:`, tasks.length);

      const total = tasks.length;
      const completed = tasks.filter(t => t.status === "completed").length;
      const percent = total ? (completed / total) * 100 : 0;
      const allGoalDone = tasks.filter(t => t.goalId).every(t => t.status === "completed");
      const allImportantDone = tasks.filter(t => t.points && t.points > 7).every(t => t.status === "completed");

      let dayRating = "L Day";
      if (percent === 100) dayRating = "W+ Day";
      else if (percent >= 85 && allGoalDone && allImportantDone) dayRating = "W Day";
      else if (percent >= 50) dayRating = "M Day";

      console.log(`📊 Bewertung für ${id}: ${dayRating} (${completed}/${total})`);

      await statsCol.updateOne(
        { userId: id, date: dateKey },
        { $set: { rating: dayRating, updatedAt: new Date() } },
        { upsert: true }
      );

      const dailyAvgNum = getRatingValue(dayRating);
      const dailyAvgLetter = dayRating;

      const weekId = `${dayjs(dateKey).year()}-W${String(dayjs(dateKey).week()).padStart(2, "0")}`;
      const weekStart = dayjs(dateKey).startOf("week").format("YYYY-MM-DD");
      const weekEnd = dayjs(dateKey).endOf("week").format("YYYY-MM-DD");
      const weekStats = await statsCol.find({ userId: id, date: { $gte: weekStart, $lte: weekEnd } }).toArray();
      const weekAvgNum = weekStats.reduce((sum, d) => sum + getRatingValue(d.rating), 0) / (weekStats.length || 1);
      const weekAvgLetter = getRatingLetterFromValue(weekAvgNum);

      const monthId = dayjs(dateKey).format("YYYY-MM");
      const monthStart = dayjs(dateKey).startOf("month").format("YYYY-MM-DD");
      const monthEnd = dayjs(dateKey).endOf("month").format("YYYY-MM-DD");
      const monthStats = await statsCol.find({ userId: id, date: { $gte: monthStart, $lte: monthEnd } }).toArray();
      const completedGoals = monthStats.filter(d => d.rating === "W+ Day").length;
      const monthAvgNum = monthStats.reduce((sum, d) => sum + getRatingValue(d.rating), 0) / (monthStats.length || 1);
      const monthAvgLetter = getRatingLetterFromValue(monthAvgNum);

      console.log("📅 Woche:", { weekId, weekAvgLetter, weekAvgNum });
      console.log("🗓 Monat:", { monthId, monthAvgLetter, monthAvgNum, completedGoals });

      const userDoc = await usersCol.findOne({ _id: new ObjectId(id) });
      const currentTrust = userDoc?.trustReserveTank ?? 50;
      const delta = (dayRating === "W+ Day" || dayRating === "W Day") ? 2.5 : (dayRating === "M Day" ? 0.5 : -4);
      const newTrust = Math.min(100, Math.max(0, currentTrust + delta));

      console.log("🧠 Trust Reserve Update:", { currentTrust, delta, newTrust });

      const userUpdateResult = await usersCol.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            trustReserveTank: newTrust,
            [`dailyRatingsAverage.${dateKey}`]: {
              avg: dailyAvgNum,
              rating: dailyAvgLetter
            },
            [`weeklyRatingsAverage.${weekId}`]: {
              avg: parseFloat(weekAvgNum.toFixed(2)),
              rating: weekAvgLetter
            },
            [`monthlyRatingsAverage.${monthId}`]: {
              completedGoals,
              avg: parseFloat(monthAvgNum.toFixed(2)),
              rating: monthAvgLetter
            }
          }
        }
      );

      console.log("✅ User-Daten aktualisiert:", userUpdateResult);
    }

    console.log("🎉 Alle Tagesbewertungen und Averages erfolgreich gespeichert.");
    res.status(200).json({ message: "✅ Ratings, Averages und Trust Reserve aktualisiert." });

  } catch (err) {
    console.error("❌ Fehler beim Tagesrating:", err);
    res.status(500).json({ error: "Interner Fehler beim Speichern", details: err });
  }
}
