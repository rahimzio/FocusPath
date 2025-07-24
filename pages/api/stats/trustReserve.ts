// pages/api/stats/trustReserve.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
function ratingToScore(rating: string): number {
  switch (rating) {
    case "W+ Day":
      return 2.5;
    case "W Day":
      return 2;
    case "M Day":
      return 1;
    default:
      return 0;
  }
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
    const statsCol = db.collection("stats");
  const stats = await statsCol
    .find({ userId })
    .project({ _id: 0, date: 1, rating: 1 })
    .toArray();

  const ratingByDate: Record<string, string> = {};
  stats.forEach((s: any) => {
    if (s.date && s.rating) ratingByDate[s.date] = s.rating;
  });

  const today = new Date();
  const past30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  let trust = 50;
  past30Days.forEach((date) => {
const score = ratingToScore(ratingByDate[date]);    if (score === 2.5 || score === 2) trust += 2.5;
    else if (score === 1) trust += 0.5;
    else if (score === 0) trust -= 4;
  });

  trust = Math.min(Math.max(trust, 0), 100);
  res.status(200).json({ trustLevel: trust, status: getStatus(trust) });
}
