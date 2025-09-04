import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Use GET." });
  const { userId, includeArchived } = req.query as { userId?: string; includeArchived?: string };
  if (!userId) return res.status(400).json({ message: "Missing userId" });

  const RID = Math.random().toString(36).slice(2, 8);
  const DEBUG = String(process.env.DEBUG_FINANCE) === "1" || String((req.query as any).debug) === "1";
  const log = (...args: any[]) => DEBUG && console.log(`[accounts:${RID}]`, ...args);

  try {
    const { db } = await connectToDatabase();
    const q: any = { kind: "account", userId };
    if (!includeArchived) q.archived = { $ne: true };

    log("Query", q);
    const docs = await db.collection(FINANCE_COLLECTION)
      .find(q, { projection: { name: 1, baseCurrency: 1, archived: 1, archivedAt: 1 } })
      .sort({ name: 1 })
      .toArray();

    log("Result count", docs.length, "sample", docs.slice(0, 5).map(d => ({ id: String(d._id), name: d.name, cur: d.baseCurrency, archived: !!d.archived })));

    const accounts = docs.map((d: any) => ({
      accountId: String(d._id),
      name: d.name,
      baseCurrency: d.baseCurrency ?? "EUR",
      archived: !!d.archived,
      archivedAt: d.archivedAt || null,
    }));

    res.status(200).json({ accounts });
  } catch (e) {
    console.error(`[accounts:${RID}] ERROR`, e);
    res.status(500).json({ message: "Internal server error" });
  }
}
