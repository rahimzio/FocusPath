import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Description } from "@radix-ui/react-dialog";
import { Task, Completion } from "@/utils/interfaces/task";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { date, userId } = req.query;

  if (!date || typeof date !== "string") {
    return res.status(400).json({ message: "Missing or invalid 'date' parameter" });
  }

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing or invalid 'userId' parameter" });
  }

  try {
    console.log("🟢 API getTasks:", { date, userId });
    const { db } = await connectToDatabase();

    const appData = db.collection("appData");

    // 1) Nur Tasks dieses Nutzers laden
    const allTasks = await appData.find(
      { type: "task", userId },
      {
        projection: {
          userId:1,
          _id: 1,
          name: 1,
          description: 1,
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
          daysOfWeek: 1,
          interval: 1,
        }
      }
    ).toArray() as unknown as Task[];
    

    const allCompletions = await appData.find({
      type: "completion",
      userId,
      date
    }).toArray() as Completion[];

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

    const goalTasks = tasksWithStatus.filter((t) => !!t.goalId);
    const otherTasks = tasksWithStatus.filter((t) => !t.goalId);

    console.log(`📌 Total: ${tasksWithStatus.length}, Ziel: ${goalTasks.length}, Sonstige: ${otherTasks.length}`);

    return res.status(200).json({
      groupedTasks: {
        goalTasks,
        otherTasks
      }
    });
  } catch (error) {
    console.error("❌ Fehler bei getTasks:", error);
    return res.status(500).json({ message: "Fehler beim Abrufen der Aufgaben", error });
  }
}

// Wiederholungslogik
function checkFrequency(task: Task, selectedDate: Date): boolean {
  const dueDate = new Date(task.dueDate);
  const diff = dayDiff(dueDate, selectedDate);
    console.log("🔎 checkFrequency", {
    taskId: task._id,
    name: task.name,
    frequency: task.frequency,
    dueDate: task.dueDate,
    selected: selectedDate.toISOString().slice(0, 10),
    diff,
    daysOfWeek: task.daysOfWeek,
    interval: task.interval,
  });

  if (diff < 0) {
    console.log("⛔ diff < 0");
    return false;
  }

  if (isSameDay(dueDate, selectedDate)) {
    console.log("✅ selected date is due date");
    return true;
  }

  if (task.frequency === "weekly" && task.daysOfWeek && task.daysOfWeek.length > 0) {
    const dayMatch = task.daysOfWeek.includes(selectedDate.getDay());
    console.log("📅 weekly day check", { dayMatch });
    return dayMatch;
  }

  if (task.interval && task.interval > 1) {
    const byInterval = diff % task.interval === 0;
    console.log("ℹ️ interval check", { byInterval });
    return byInterval;
  }
if (task.daysOfWeek && task.daysOfWeek.length > 0) {
    if (!task.daysOfWeek.includes(selectedDate.getDay())) return false;
  }

  if (task.interval && task.interval > 1) {
    return diff % task.interval === 0;
  }

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
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / (24 * 60 * 60 * 1000));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}
