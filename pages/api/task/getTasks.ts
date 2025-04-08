// pages/api/tasks/getTasks.ts

import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Task, Completion } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { date } = req.query;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ message: "Missing or invalid 'date' parameter" });
  }

  try {
    console.log("🟢 API getTasks wurde aufgerufen mit Datum:", date);
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");
    const completionsColl = db.collection<Completion>("completions");

    // 1) Nur relevante Felder laden
    const allTasks = await tasksColl.find({}, {
      projection: {
        _id: 1,
        name: 1,
        points: 1,
        dueDate: 1,
        frequency: 1,
        timebased: 1,
        time: 1,
        category: 1,
        subTasks: 1,
        excludedDates: 1,
        color: 1,
        duration: 1,
        goalId: 1,
      }
    }).toArray();

    const allCompletions = await completionsColl.find({ date }).toArray();

    const selectedDate = new Date(date);
    const relevantTasks = allTasks.filter((task) => {
      const isRelevant = checkFrequency(task, selectedDate);
      const isExcluded = task.excludedDates?.includes(selectedDate.toISOString().slice(0, 10));
      return isRelevant && !isExcluded;
    });

    const tasksWithStatus = relevantTasks.map((task) => {
      const completion = allCompletions.find((c) => c.taskId === task._id?.toString());
      const status = completion?.status === "completed" ? "completed" : "incomplete";
      return { ...task, status };
    });

    // 5) Gruppieren
    const goalTasks = tasksWithStatus.filter((t) => !!t.goalId);
    const otherTasks = tasksWithStatus.filter((t) => !t.goalId);

    console.log(`📌 Aufgaben total: ${tasksWithStatus.length}, Ziel-gebunden: ${goalTasks.length}, sonstige: ${otherTasks.length}`);

    return res.status(200).json({
      groupedTasks: {
        goalTasks,
        otherTasks,
      }
    });

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Aufgaben:", error);
    return res.status(500).json({ message: "Fehler beim Abrufen der Aufgaben", error });
  }
}

// Wiederholungslogik
function checkFrequency(task: Task, selectedDate: Date): boolean {
  const dueDate = new Date(task.dueDate);
  const diff = dayDiff(dueDate, selectedDate);
  if (diff < 0) return false;

  switch (task.frequency) {
    case "once": return isSameDay(dueDate, selectedDate);
    case "daily": return true;
    case "weekly": return diff % 7 === 0;
    case "monthly": return selectedDate.getDate() === dueDate.getDate();
    case "yearly": return selectedDate.getMonth() === dueDate.getMonth() && selectedDate.getDate() === dueDate.getDate();
    default: return false;
  }
}

function dayDiff(a: Date, b: Date): number {
  return Math.floor((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
    (24 * 60 * 60 * 1000));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}
