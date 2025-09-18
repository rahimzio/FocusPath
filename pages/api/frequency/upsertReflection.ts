import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo"; // <- an deinen Pfad anpassen
import { questionsByBlock } from "./questionBankBlocks";
import { computeBlockScore, computeDailyFrequency } from "./scooring";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, date, block, answers, note } = req.body as {
      userId?: string;
      date?: string; // YYYY-MM-DD
      block?: "morning" | "afternoon" | "evening";
      answers?: Record<string, number>;
      note?: string;
    };

    if (!userId || !date || !block || !answers) {
      return res.status(400).json({ error: "Missing fields (userId, date, block, answers)" });
    }

    const qs = questionsByBlock[block];
    if (!qs) return res.status(400).json({ error: "Invalid block" });

    const { blockScore, domains } = computeBlockScore(answers, qs);

    const { db } = await connectToDatabase();
    const col = db.collection("frequency");

    // Upsert den Block
    await col.updateOne(
      { userId, date, block },
      {
        $set: {
          userId, date, block,
          answers,
          note: note || "",
          blockScore,
          domainBreakdown: domains,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    // Tages-Snapshot aktualisieren (optional, aber praktisch für Charts)
    const blocks = await col
      .find({ userId, date })
      .project({ block: 1, blockScore: 1 })
      .toArray();

    const parts: Partial<Record<"morning"|"afternoon"|"evening", number>> = {};
    for (const b of blocks) parts[b.block as "morning"|"afternoon"|"evening"] = b.blockScore;

    const daily = computeDailyFrequency(parts);
    await db.collection("frequency").updateOne(
      { userId, date },
      { $set: {
          userId, date,
          morningFrequency: parts.morning ?? null,
          afternoonFrequency: parts.afternoon ?? null,
          eveningFrequency: parts.evening ?? null,
          dailyFrequency: daily,
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    return res.status(200).json({ ok: true, blockScore, domains, dailyFrequency: daily });
  } catch (err: any) {
    console.error("Error upserting reflection", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
