import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

function isCosmosOrderByIndexError(e: any) {
  const msg = String(e?.message || "");
  return (e?.code === 2 || e?.codeName === "BadValue") && msg.includes("does not have a corresponding composite index");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId } = req.query as { userId?: string };
  if (!userId) return res.status(400).json({ message: "Missing userId" });

  const DEBUG = String(process.env.DEBUG_FINANCE) === "1" || String((req.query as any).debug) === "1";
  const log = (...a: any[]) => DEBUG && console.log("[getSavingGoals]", ...a);
  try {
    const { db } = await connectToDatabase();
    const col = db.collection(FINANCE_COLLECTION);
    const q = { kind: "saving_goal", userId, archived: { $ne: true } };

    // gewünschte Sortierung (anpassen, falls bei dir anders)
    const sort = { deadline: 1, createdAt: -1 };

    log("Query", q, "Sort", sort);
    let docs: any[] = [];
    try {
      docs = await col.find(q).sort(sort as any).toArray();
    } catch (e: any) {
      if (isCosmosOrderByIndexError(e)) {
        console.warn("[getSavingGoals] Cosmos ORDER BY ohne Index – liefere unsortiert. Lege Composite Index an, siehe README.");
        docs = await col.find(q).toArray();
      } else {
        throw e;
      }
    }

    const goals = docs.map(d => ({
      id: String(d._id),
      title: d.title,
      targetAmount: d.targetAmount,
      currentAmount: d.currentAmount ?? 0,
      monthlyContribution: d.monthlyContribution ?? 0,
      deadline: d.deadline ?? null,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    res.status(200).json({ goals });
  } catch (e) {
    console.error("getSavingGoals", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
