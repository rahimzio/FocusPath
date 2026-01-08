// pages/api/trading/setups/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";

type Grade = "A" | "B" | "C";
type DbSetup = Omit<TradingSetup, "_id"> & {
  _id: any;
  type: "trading_setup_v2";
  userId: string;
  deleted?: boolean;

  // Improve/Inchworm Felder (optional)
  setupSelectedIds?: string[];
  setupAvgScore?: number;
  setupGrade?: Grade;

  // executed mapping
  activatedAt?: string; // ISO
  endResult?: "finished" | "not_finished";
};

function toDateOnly(s?: string) {
  if (!s) return "";
  const str = String(s);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) return res.status(400).json({ message: "userId required" });

    // Optional filters
    const executedOnly =
      String(req.query.executedOnly ?? "").toLowerCase() === "true" ||
      String(req.query.executedOnly ?? "") === "1";

    // Zeitraum: YYYY-MM-DD
    const from = typeof req.query.from === "string" ? toDateOnly(req.query.from) : "";
    const to = typeof req.query.to === "string" ? toDateOnly(req.query.to) : "";

    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 500;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 500;

    const { db } = await connectToDatabase();
    const col = db.collection<DbSetup>("trading");

    const q: any = {
      type: "trading_setup_v2",
      userId,
      deleted: { $ne: true },
    };

    // ✅ executed mapping = status === "active"
    // Optional: activatedAt range (besser für executed Setups)
    if (executedOnly) {
      q.status = "active";

      // Wenn from/to gesetzt, filtern wir über activatedAt (fallback: createdAt)
      if (from || to) {
        // Wir filtern lexicographically auf YYYY-MM-DD, daher dateOnly.
        // Mongo kann nicht direkt slice(0,10) – deshalb ziehen wir eher nach JS,
        // ABER für Performance lassen wir erstmal serverseitig grob über activatedAt ISO.
        // Minimal: wir filtern im Code nach dem Query nochmal sauber.
      }
    }

    const docs = await col
      .find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    // ✅ optionaler sauberer Range-Filter (dateOnly) im Node-Code
    const filtered = docs.filter((s) => {
      if (!from && !to) return true;

      const dayKey = executedOnly
        ? toDateOnly((s as any).activatedAt || (s as any).createdAt)
        : toDateOnly((s as any).createdAt || (s as any).date);

      if (!dayKey) return false;
      if (from && dayKey < from) return false;
      if (to && dayKey > to) return false;
      return true;
    });

    const setups: TradingSetup[] = filtered.map((doc) => {
      const { _id, type, ...rest } = doc as any;
      return {
        ...rest,
        _id: String(_id),
      } as TradingSetup;
    });

    return res.status(200).json({ setups });
  } catch (err) {
    console.error("Error listing setups", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
