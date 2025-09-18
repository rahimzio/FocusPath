// pages/api/trading/dayGameStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type Counts = { A: number; B: number; C: number };

function yyyymmdd(d = new Date()) {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
function daysAgoIso(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return yyyymmdd(d);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const { userId, range = "week" } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const match: any = { userId, type: "day_reflection", deleted: { $ne: true } };

    // Range: filter per date string "YYYY-MM-DD"
    if (range === "week") {
      match.date = { $gte: daysAgoIso(6), $lte: yyyymmdd() }; // inkl. heute, 7 Tage
    } else if (range === "month") {
      match.date = { $gte: daysAgoIso(29), $lte: yyyymmdd() }; // 30 Tage
    } // "all" ⇒ kein zusätzliches Filter

    const cursor = col.find(match, { projection: { dayGrade: 1 } });

    let counts: Counts = { A: 0, B: 0, C: 0 };
    let total = 0;
    for await (const doc of cursor) {
      const g = doc?.dayGrade;
      if (g === "A" || g === "B" || g === "C") {
        counts[g as keyof Counts] += 1;
        total += 1;
      }
    }

    return res.status(200).json({ total, counts });
  } catch (err: any) {
    console.error("dayGameStats error:", err);
    return res.status(500).json({ message: "server error", error: err?.message });
  }
}