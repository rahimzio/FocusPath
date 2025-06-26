// pages/api/stats/dailyRatings.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { Task } from "@/utils/interface";
import { connectToDatabase } from "../db/mongo";

function getDayRating(taskList: Task[]): string {
  const total = taskList.length;
  const completed = taskList.filter((t) => t.status === "completed").length;
  const percent = total ? (completed / total) * 100 : 0;
  const allGoalTasksDone = taskList.filter((t) => t.goalId).every((t) => t.status === "completed");
  const allImportantDone = taskList.filter((t) => t.points && t.points > 7).every((t) => t.status === "completed");

  if (percent === 100) return "W+ Day";
  if (percent >= 85 && allGoalTasksDone && allImportantDone) return "W Day";
  if (percent >= 50) return "M Day";
  return "L Day";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  console.log("📥 API CALL: /api/stats/dailyRatings", userId);

  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Missing userId" });

  const { db } = await connectToDatabase();
  const taskCollection = db.collection("task");

  const allTasks = await taskCollection.find({ userId }).toArray();
  const typedTasks = allTasks as unknown as Task[];

  const byDate: { [date: string]: Task[] } = {};
  typedTasks.forEach((t) => {
    if (!t.dueDate) return;
    if (!byDate[t.dueDate]) byDate[t.dueDate] = [];
    byDate[t.dueDate].push(t);
  });

  const dailyRatings = Object.entries(byDate)
    .map(([date, tasks]) => ({ date, rating: getDayRating(tasks) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.status(200).json({ dailyRatings });
}
