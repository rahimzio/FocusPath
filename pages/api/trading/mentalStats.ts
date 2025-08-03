import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("trading");
    const trades = await collection
      .find({ userId, type: "tradeEntry" })
      .project({ performanceState: 1, disciplineScore: 1, mentalMistake: 1, tiltDetected: 1 })
      .toArray();

    const perfCounts: Record<string, number> = { A: 0, B: 0, C: 0 };
    let disciplineSum = 0;
    let disciplineCount = 0;
    const mistakes: Record<string, number> = {};
    let tilt = 0;

    trades.forEach((t: any) => {
      if (t.performanceState) perfCounts[t.performanceState] = (perfCounts[t.performanceState] || 0) + 1;
      if (typeof t.disciplineScore === "number") {
        disciplineSum += t.disciplineScore;
        disciplineCount++;
      }
      if (t.mentalMistake) mistakes[t.mentalMistake] = (mistakes[t.mentalMistake] || 0) + 1;
      if (t.tiltDetected) tilt++;
    });

    const avgDiscipline = disciplineCount ? disciplineSum / disciplineCount : 0;

    const mistakeList = Object.entries(mistakes).map(([name, count]) => ({ name, count }));

    return res.status(200).json({ performance: perfCounts, avgDiscipline, mistakes: mistakeList, tiltCount: tilt });
  } catch (err) {
    console.error("mental stats error", err);
    return res.status(500).json({ message: "server error" });
  }
}