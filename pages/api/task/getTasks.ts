// pages/api/task/getTasks.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase, disconnectFromDatabase } from "../db/mongo";
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
    const { db } = await connectToDatabase();
    const tasksColl = db.collection<Task>("tasks");
    const completionsColl = db.collection<Completion>("completions");

    // 1) Lade alle Tasks
    const allTasks = await tasksColl.find({}).toArray();
    console.log("Alle Tasks:", allTasks);

    // 2) Lade completions für dieses Datum
    const allCompletions = await completionsColl.find({ date }).toArray();
    console.log("Alle Completions für das Datum:", allCompletions);

    // 3) Frequenz-Filter: Welche Tasks sind heute "relevant"?
    const selectedDate = new Date(date);
    const relevantTasks = allTasks.filter((task) =>
      checkFrequency(task, selectedDate)
    );
    console.log("Relevante Tasks:", relevantTasks);

    // 4) Mische completions-Status ein
    const tasksWithStatus = relevantTasks.map((task) => {
      // Konvertiere task._id zu String für den Vergleich
      const taskIdStr = task._id ? task._id.toString() : null;
      const completion = allCompletions.find((c) => c.taskId === taskIdStr);
      const status = completion?.status === "completed" ? "completed" : "incomplete";
      return { ...task, status };
    });
    console.log("Tasks mit Status:", tasksWithStatus);

    await disconnectFromDatabase();
    return res.status(200).json({ tasks: tasksWithStatus });
  } catch (error) {
    console.error("Fehler bei getTasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/** checkFrequency = einfache Wiederholungslogik (Server-seitig).
 *  Z. B. daily => ab dueDate jeden Tag
 */
function checkFrequency(task: Task, selectedDate: Date): boolean {
  const dueDate = new Date(task.dueDate);
  const diff = dayDiff(dueDate, selectedDate);
  if (diff < 0) return false;

  switch (task.frequency) {
    case "once":
      return isSameDay(dueDate, selectedDate);
    case "daily":
      return true;
    case "weekly":
      return diff % 7 === 0;
    case "monthly":
      return selectedDate.getDate() === dueDate.getDate();
    case "yearly":
      return (
        selectedDate.getMonth() === dueDate.getMonth() &&
        selectedDate.getDate() === dueDate.getDate()
      );
    default:
      return false;
  }
}

function dayDiff(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}
