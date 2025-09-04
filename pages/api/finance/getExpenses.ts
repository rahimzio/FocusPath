import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

const DEBUG = String(process.env.DEBUG_FINANCE) === "1";
const CATEGORY_LABELS: Record<string, string> = {
  invest: "Invest",
  funmoney: "Funmoney",
  bills: "Bills",
  ungeplante_rechnung: "Ungeplante Rechnung",
};

function isCosmosOrderByIndexError(e: any) {
  const msg = String(e?.message || "");
  return (e?.code === 2 || e?.codeName === "BadValue") && msg.includes("composite index");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });

  try {
    const { userId, category, from, to, q, limit } = req.query as {
      userId?: string;
      category?: string;
      from?: string;
      to?: string;
      q?: string;
      limit?: string;
    };
    if (!userId) return res.status(400).json({ message: "Missing userId" });

    const { db } = await connectToDatabase();
    const col = db.collection(FINANCE_COLLECTION);

    const filter: any = { kind: "expense", userId, archived: { $ne: true } };
    if (category && category !== "all") filter.category = String(category);

    if (from || to) {
      filter.dueDate = {};
      if (from) filter.dueDate.$gte = new Date(from).toISOString();
      if (to) filter.dueDate.$lte = new Date(to).toISOString();
    }
    if (q && q.trim()) {
      filter.note = { $regex: String(q).trim(), $options: "i" };
    }

    const proj = { amount: 1, category: 1, dueDate: 1, note: 1, createdAt: 1 };
    const sort = { dueDate: -1, createdAt: -1 }; // bevorzugt

    const max = Math.max(1, Math.min(500, Number(limit ?? 200)));

    let docs: any[] = [];
    try {
      docs = await col.find(filter).project(proj).sort(sort as any).limit(max).toArray();
    } catch (e: any) {
      if (isCosmosOrderByIndexError(e)) {
        console.warn("[getExpenses] Cosmos ORDER BY ohne Index – liefere unsortiert. Lege Composite Index an.");
        docs = await col.find(filter).project(proj).limit(max).toArray();
      } else {
        throw e;
      }
    }

    const items = docs.map(d => ({
      id: String(d._id),
      amount: Number(d.amount || 0),
      category: String(d.category || ""),
      categoryLabel: CATEGORY_LABELS[d.category] || d.category,
      dueDate: d.dueDate,
      note: d.note || null,
      createdAt: d.createdAt,
    }));

    return res.status(200).json({ items });
  } catch (e) {
    console.error("[getExpenses] ERROR", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
