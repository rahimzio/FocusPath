// pages/api/trading/setups/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";

type DbSetup = Omit<TradingSetup, "_id"> & {
  _id: any;
  type: "trading_setup_v2";
  userId: string;
  deleted?: boolean;

  // legacy/optional fields
  linkedTradeId?: string | null;
  decision?: string;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  const str = String(s);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function toStrId(x: any) {
  if (!x) return "";
  try {
    if (typeof x === "string") return x;
    if (x?.toHexString) return x.toHexString();
    if (x?.toString) return x.toString();
    return String(x);
  } catch {
    return String(x);
  }
}

function normalizeStatus(status: any) {
  // legacy fallback: falls irgendwo "active" gespeichert wurde
  if (status === "active") return "open";
  return status;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  try {
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
    if (!userId) return res.status(400).json({ message: "userId required" });

    const executedOnly =
      String(req.query.executedOnly ?? "").toLowerCase() === "true" ||
      String(req.query.executedOnly ?? "") === "1";

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

    // ✅ executedOnly NICHT "active" benutzen (gibt es nicht in deinem Status-Enum)
    // Sinnvoll: Setup gilt als executed, wenn es linkedTradeId hat ODER decision === "entered"
    if (executedOnly) {
      q.$or = [
        { linkedTradeId: { $exists: true, $nin: [null, ""] } },
        { decision: "entered" },
        { status: "entered" },
        { status: "completed" },
      ];
    }

    const docs = await col.find(q).sort({ createdAt: -1 }).limit(limit).toArray();

    // optionaler Range-Filter (DateOnly) im Node-Code
    const filtered = docs.filter((s: any) => {
      if (!from && !to) return true;

      const dayKey = toDateOnly(s.date || s.createdAt);
      if (!dayKey) return false;
      if (from && dayKey < from) return false;
      if (to && dayKey > to) return false;
      return true;
    });

    const setups: TradingSetup[] = filtered.map((doc: any) => {
      const { _id, type, ...rest } = doc;
      return {
        ...rest,
        status: normalizeStatus(rest.status),
        _id: toStrId(_id),
      } as TradingSetup;
    });

    return res.status(200).json({ setups });
  } catch (err) {
    console.error("[API setups/list] Error listing setups:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
