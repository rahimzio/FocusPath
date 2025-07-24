// pages/api/stats/weekMonthRatings.ts
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
  console.log("🔍 API CALL: /api/stats/weekMonthRatings", userId);

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Missing userId" });
  }
    try {
    const { db } = await connectToDatabase();
    const statsCol = db.collection("stats");
    const stats = await statsCol
      .find({ userId })
      .project({ _id: 0, date: 1, rating: 1 })
      .toArray();

    const ratingByDate: Record<string, string> = {};
    stats.forEach((s: any) => {
      if (s.date && s.rating) ratingByDate[s.date] = s.rating;
    })
    const weekRatings: { weekStart: string; score: number; rating: string }[] = [];
  // Datumshilfe
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

    for (let w = 0; w < 4; w++) {
      const weekDates = getPastDates(7 + w * 7).slice(w * 7, w * 7 + 7);
      const dayScores = weekDates.map((d) => ratingToScore(ratingByDate[d]));
      const weekTotal = dayScores.reduce((sum, p) => sum + p, 0);
      const weekStart = weekDates[0];
      const rating = getWeekRating(weekTotal);
          weekRatings.unshift({ weekStart, score: weekTotal, rating });
        }
    
        const recentMonthRatings = [
          weekRatings.slice(0, 4),
          weekRatings.slice(4, 8),
          weekRatings.slice(8, 12),
        ].map((weeks) => ({
          weeks: weeks.map((w) => w.weekStart),
          rating: getMonthRating(weeks.map((w) => w.rating)),
        }));
    
        // You may want to return the result
        res.status(200).json({ weekRatings, recentMonthRatings });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
