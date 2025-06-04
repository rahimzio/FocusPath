// pages/api/stats/trustReserve.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { Task } from "@/utils/interface";

function calculateDayScore(tasks: Task[]): number {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const percent = total ? (completed / total) * 100 : 0;
  const allGoalTasksDone = tasks.filter((t) => t.goalId).every((t) => t.status === "completed");
  const allImportantDone = tasks.filter((t) => t.points && t.points > 7).every((t) => t.status === "completed");

  if (percent === 100) return 2.5;
  if (percent >= 85 && allGoalTasksDone && allImportantDone) return 2;
  if (percent >= 50) return 1;
  return 0;
}

function getStatus(trust: number): string {
  if (trust >= 85) return "Top Form – volle Selbstwirksamkeit!";
  if (trust >= 60) return "Stabile Phase – dranbleiben.";
  if (trust >= 30) return "Aufpassen – Vertrauen schwankt.";
  return "Achtung – Tank fast leer.";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "Missing userId" });

  const { db } = await connectToDatabase();
  const taskCollection = db.collection("task");
  const raw = await taskCollection.find({ userId }).toArray();
  const tasks = raw as unknown as Task[];

  const grouped: { [date: string]: Task[] } = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    if (!grouped[t.dueDate]) grouped[t.dueDate] = [];
    grouped[t.dueDate].push(t);
  });

  const today = new Date();
  const past30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  let trust = 50;
  past30Days.forEach((date) => {
    const score = calculateDayScore(grouped[date] || []);
    if (score === 2.5 || score === 2) trust += 2.5;
    else if (score === 1) trust += 0.5;
    else if (score === 0) trust -= 4;
  });

  trust = Math.min(Math.max(trust, 0), 100);
  res.status(200).json({ trustLevel: trust, status: getStatus(trust) });
}
