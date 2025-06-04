// pages/api/stats/weekMonthRatings.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Task } from "@/utils/interface";

function getDayScore(taskList: Task[]): number {
  const total = taskList.length;
  const completed = taskList.filter((t) => t.status === "completed").length;
  const percent = total ? (completed / total) * 100 : 0;
  const allGoalTasksDone = taskList.filter((t) => t.goalId).every((t) => t.status === "completed");
  const allImportantDone = taskList.filter((t) => t.points && t.points > 7).every((t) => t.status === "completed");

  if (percent === 100) return 2.5;
  if (percent >= 85 && allGoalTasksDone && allImportantDone) return 2;
  if (percent >= 50) return 1;
  return 0;
}

function getWeekRating(total: number): string {
  if (total >= 14.5) return "S-Week";
  if (total >= 11.5) return "W-Week";
  if (total >= 7) return "M-Week";
  return "L-Week";
}

function getMonthRating(weekRatings: string[]): string {
  const points = weekRatings.reduce((sum, r) => {
    if (r === "S-Week") return sum + 3;
    if (r === "W-Week") return sum + 2;
    if (r === "M-Week") return sum + 1;
    return sum;
  }, 0);

  if (points >= 11) return "S-Monat";
  if (points >= 8) return "W-Monat";
  if (points >= 4) return "M-Monat";
  return "L-Monat";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Missing userId" });

  const { db } = await connectToDatabase();
  const taskCollection = db.collection("task");

  const allTasksRaw = await taskCollection.find({ userId }).toArray();
  const allTasks = allTasksRaw as unknown as Task[];

  const byDate: { [date: string]: Task[] } = {};
  allTasks.forEach((t) => {
    if (!t.dueDate) return;
    if (!byDate[t.dueDate]) byDate[t.dueDate] = [];
    byDate[t.dueDate].push(t);
  });

  const today = new Date();
  const getPastDates = (days: number) => {
    const arr = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      arr.push(d.toISOString().split("T")[0]);
    }
    return arr;
  };

  const weekRatings: { weekStart: string; score: number; rating: string }[] = [];
  for (let w = 0; w < 4; w++) {
    const weekDates = getPastDates(7 + w * 7).slice(w * 7, w * 7 + 7);
    const weekTasks = weekDates.flatMap((d) => byDate[d] || []);
    const dayPoints = weekDates.map((d) => getDayScore(byDate[d] || []));
    const weekTotal = dayPoints.reduce((sum, p) => sum + p, 0);
    const weekStart = weekDates[0];
    weekRatings.unshift({ weekStart, score: weekTotal, rating: getWeekRating(weekTotal) });
  }

  const recentMonthRatings = [
    weekRatings.slice(0, 4),
    weekRatings.slice(4, 8),
    weekRatings.slice(8, 12),
  ].map((weeks) => {
    const rating = getMonthRating(weeks.map((w) => w.rating));
    return { weeks: weeks.map((w) => w.weekStart), rating };
  });

  res.status(200).json({ weekRatings, recentMonthRatings });
}
