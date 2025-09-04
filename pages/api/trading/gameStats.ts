// pages/api/trading/gameStats.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type Grade = "A" | "B" | "C";
type Result = "win" | "loss" | "BE";

function parseRange(range?: string) {
  const now = new Date();
  if (range === "all") return undefined;
  if (range === "month") return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  // default week
  return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });
  const { userId, range = "week" } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const since = parseRange(typeof range === "string" ? range : undefined);

    const q: any = { userId, type: "tradeEntry" };
    if (since) q.createdAt = { $gte: since };

    const cursor = db.collection("trading").find(q, {
      projection: { _id: 0, gameComputed: 1, result: 1 },
      sort: { createdAt: -1 },
    });

    let total = 0;
    const counts: Record<Grade, number> = { A: 0, B: 0, C: 0 };
    const byResult: Record<Grade, Record<Result, number>> = {
      A: { win: 0, loss: 0, BE: 0 },
      B: { win: 0, loss: 0, BE: 0 },
      C: { win: 0, loss: 0, BE: 0 },
    };

    for await (const t of cursor) {
      const g = (t.gameComputed as Grade) || "C";
      const r = (t.result as Result) || "BE";
      counts[g] += 1;
      byResult[g][r] += 1;
      total += 1;
    }

    const proportions = total
      ? { A: counts.A / total, B: counts.B / total, C: counts.C / total }
      : { A: 0, B: 0, C: 0 };

    return res.status(200).json({ total, counts, proportions, byResult });
  } catch (err) {
    console.error("gameStats error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
