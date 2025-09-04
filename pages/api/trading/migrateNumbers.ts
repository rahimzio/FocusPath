// pages/api/admin/migrateNumbers.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

const REQUIRED_TOKEN = process.env.ADMIN_MIGRATE_TOKEN || "SET_ME";

const NUMERIC_FIELDS = [
  "pnl",
  "entry",
  "exit",
  "size",
  "risk",
  "potentialLoss",
  "fees",
  "rr",
  "durationMin",
  "equityBefore",
  "equityAfter",
] as const;

function toNumberHard(v: any): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/\s+/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function normDate(d: any): string | undefined {
  if (!d) return undefined;
  if (typeof d === "string") return d.slice(0, 10);
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString().slice(0, 10);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const token = (req.query.token as string) || (req.headers["x-admin-token"] as string);
  if (!token || token !== REQUIRED_TOKEN) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const dryRun = String(req.query.dryRun || "").toLowerCase() === "true";

  try {
    const { db } = await connectToDatabase();
    const filter: any = { type: "tradeEntry" };
    if (userId) filter.userId = userId;

    const cursor = db.collection("trading").find(filter, { sort: { _id: 1 } });

    let scanned = 0;
    let changed = 0;
    const ops: any[] = [];

    while (await cursor.hasNext()) {
      const doc: any = await cursor.next();
      if (!doc) break;
      scanned++;

      const set: Record<string, any> = {};
      const unset: Record<string, "" | 1> = {};
      let touched = false;

      // Zahlen casten
      for (const key of NUMERIC_FIELDS) {
        if (key in doc) {
          const casted = toNumberHard(doc[key]);
          if (casted === undefined) {
            // optional: inkonsistente Strings entfernen
            // unset[key] = "";
          } else if (doc[key] !== casted) {
            set[key] = casted;
            touched = true;
          }
        }
      }

      // Datum normalisieren (string YYYY-MM-DD)
      if ("date" in doc) {
        const d = normDate(doc.date);
        if (d && d !== doc.date) {
          set.date = d;
          touched = true;
        }
      }

      // outcomeFlags → Booleans
      if (doc.outcomeFlags && typeof doc.outcomeFlags === "object") {
        const be = Boolean(doc.outcomeFlags.breakEven);
        const sh = Boolean(doc.outcomeFlags.stopHit);
        if (
          !doc.outcomeFlags ||
          doc.outcomeFlags.breakEven !== be ||
          doc.outcomeFlags.stopHit !== sh
        ) {
          set.outcomeFlags = { breakEven: be, stopHit: sh };
          touched = true;
        }
      }

      // Arrays absichern
      if ("tradingMistakes" in doc && !Array.isArray(doc.tradingMistakes)) {
        set.tradingMistakes = [String(doc.tradingMistakes)];
        touched = true;
      }
      if ("viewTimeframes" in doc && !Array.isArray(doc.viewTimeframes)) {
        set.viewTimeframes = [String(doc.viewTimeframes)];
        touched = true;
      }

      // strategy_name als String
      if ("strategy_name" in doc && doc.strategy_name != null && typeof doc.strategy_name !== "string") {
        set.strategy_name = String(doc.strategy_name);
        touched = true;
      }

      if (touched) {
        changed++;
        if (!dryRun) {
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(doc._id) },
              update: {
                ...(Object.keys(set).length ? { $set: set } : {}),
                ...(Object.keys(unset).length ? { $unset: unset } : {}),
              },
            },
          });
          if (ops.length >= 500) {
            await db.collection("trading").bulkWrite(ops, { ordered: false });
            ops.length = 0;
          }
        }
      }
    }

    if (!dryRun && ops.length) {
      await db.collection("trading").bulkWrite(ops, { ordered: false });
    }

    return res.status(200).json({
      ok: true,
      dryRun,
      userId: userId ?? null,
      scanned,
      changed,
    });
  } catch (e) {
    console.error("migrateNumbers error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
