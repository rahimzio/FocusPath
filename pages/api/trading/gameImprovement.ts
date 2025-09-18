// pages/api/trading/gameImprovement.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

const COLLECTION = "trading";
const RT_PLAN = "gameImprovementPlan";

/**
 * Doc (in "trading"):
 * {
 *   _id,
 *   recordType: "gameImprovementPlan",
 *   userId: string,
 *   periodDays: number,              // 30..90
 *   startedAt: string,               // ISO
 *   endsAt: string,                  // ISO
 *   status: "active" | "done" | "archived",
 *   // Ziele: welche Faktoren will ich reduzieren/erhöhen
 *   targets: {
 *     // „Back Tail“ (C): diese C-Faktoren reduzieren – als weekly Max
 *     reduceC?: { [label: string]: number },   // z.B. {"FOMO": 1}
 *     // „Front Tail“ (A/B): diese A/B-Faktoren steigern – als weekly Min
 *     boostAB?: { [label: string]: number },   // z.B. {"Trade nach Plan": 10}
 *   },
 *   notes?: string,
 *   createdAt: string,
 *   updatedAt: string
 * }
 */

function toStr(v: any) { return v == null ? undefined : String(v); }
function toNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
function clampDays(n?: number) {
  if (!n) return 30;
  return Math.max(7, Math.min(120, Math.round(n)));
}
function isoNow() { return new Date().toISOString(); }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection(COLLECTION);

    if (req.method === "GET") {
      // Liefert: aktiven Plan + Baseline & Fortschritt aus Trades
      const { userId, periodDays: pdRaw } = req.query as any;
      if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
      const periodDays = clampDays(toNum(pdRaw));

      // Aktiven Plan ziehen (falls da)
      const plan = await col.findOne(
        { recordType: RT_PLAN, userId, status: { $in: ["active"] } },
        { projection: { _id: 1, userId: 1, periodDays: 1, startedAt: 1, endsAt: 1, status: 1, targets: 1, notes: 1 } }
      );

      // Zeitraum (letzte `periodDays` Tage)
      const since = new Date();
      since.setDate(since.getDate() - periodDays);
      const sinceISO = since.toISOString();

      // Trades der Periode (nur final)
      const trades = await col.find({
        userId, recordType: { $in: [undefined, null] }, // deine Trades haben i.d.R. kein recordType
        status: "final",
        date: { $gte: sinceISO }, // deine Trades haben `date` als ISO
      }, {
        projection: {
          _id: 1, date: 1, result: 1,
          gameItems: 1,             // ["A:...", "B:...", "C:..."]
          gameCatalogGrade: 1,      // "A"|"B"|"C"
        }
      }).toArray();

      // Baseline & Fortschritt: wöchentliche Frequenzen der Items A/B/C
      // Wir zählen pro Label (ohne Prefix „A:“/„B:“/„C:“) und pro Grade.
      type Counter = Record<"A"|"B"|"C", Record<string, number>>;
      const counts: Counter = { A: {}, B: {}, C: {} };

      for (const t of trades) {
        const items: string[] = Array.isArray((t as any).gameItems) ? (t as any).gameItems : [];
        for (const k of items) {
          const [grade, rawLabel] = String(k).split(":");
          const label = (rawLabel ?? "").trim();
          if (!label || !["A","B","C"].includes(grade)) continue;
          counts[grade as "A"|"B"|"C"][label] = (counts[grade as "A"|"B"|"C"][label] ?? 0) + 1;
        }
      }

      // Wochen normalisieren (periodDays/7)
      const weeks = Math.max(1, periodDays / 7);
      const weekly: Counter = { A: {}, B: {}, C: {} };
      (["A","B","C"] as const).forEach(g => {
        for (const [lbl, n] of Object.entries(counts[g])) {
          weekly[g][lbl] = Number((n / weeks).toFixed(2));
        }
      });

      return res.status(200).json({
        plan: plan ? { ...plan, _id: String(plan._id) } : null,
        baselineWeekly: weekly,
        tradesCount: trades.length,
        since: sinceISO,
        periodDays,
      });
    }

    if (req.method === "POST") {
      // Plan anlegen ODER aktualisieren (upsertActive=true)
      const { userId, periodDays: pdRaw, targets, notes, upsertActive } = req.body || {};
      if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

      const periodDays = clampDays(toNum(pdRaw) ?? 30);
      const now = new Date();
      const endsAt = new Date(now); endsAt.setDate(now.getDate() + periodDays);

      const doc = {
        recordType: RT_PLAN,
        userId,
        periodDays,
        startedAt: isoNow(),
        endsAt: endsAt.toISOString(),
        status: "active" as const,
        targets: {
          reduceC: targets?.reduceC ?? {},
          boostAB: targets?.boostAB ?? {},
        },
        notes: toStr(notes),
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };

      if (upsertActive) {
        // genau EIN aktiver Plan pro User
        const upd = await col.findOneAndUpdate(
          { recordType: RT_PLAN, userId, status: "active" },
          { $set: { ...doc, createdAt: undefined, updatedAt: isoNow() } as any, $setOnInsert: { createdAt: isoNow() } },
          { upsert: true, returnDocument: "after" }
        );
        return res.status(200).json({ ok: true, plan: { ...upd.value, _id: String(upd.value?._id) } });
      } else {
        const ins = await col.insertOne(doc);
        return res.status(200).json({ ok: true, id: String(ins.insertedId) });
      }
    }

    if (req.method === "PATCH") {
      const { id, userId, status, targets, notes } = req.body || {};
      if (!id) return res.status(400).json({ error: "id ist erforderlich" });

      let _id: ObjectId;
      try { _id = new ObjectId(String(id)); } catch {
        return res.status(400).json({ error: "id ungültig" });
      }

      const match: any = { _id, recordType: RT_PLAN };
      if (userId) match.userId = String(userId);

      const set: any = { updatedAt: isoNow() };
      if (status && ["active","done","archived"].includes(String(status))) set.status = String(status);
      if (targets) {
        set["targets.reduceC"] = targets.reduceC ?? {};
        set["targets.boostAB"] = targets.boostAB ?? {};
      }
      if (notes !== undefined) set.notes = toStr(notes);

      const upd = await col.updateOne(match, { $set: set });
      if (!upd.matchedCount) return res.status(404).json({ error: "Plan nicht gefunden" });
      return res.status(200).json({ ok: true, modified: upd.modifiedCount });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("[/api/trading/gameImprovement] error:", err);
    return res.status(500).json({ error: err?.message ?? "Internal error" });
  }
}
