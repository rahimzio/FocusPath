// pages/api/trading/inchworm/plan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase, getTradingCollection } from "../../db/mongo"; // ← sicherstellen, dass Pfad passt

const trim = (s: any) => (typeof s === "string" ? s.trim() : "");
const date10 = (d: any) => {
  const s = String(d || "");
  return s ? s.slice(0, 10) : undefined;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db);

    // Indizes (idempotent)
    try {
      await Promise.all([
        col.createIndex({ userId: 1, type: 1, updatedAt: -1 }),
        col.createIndex({ userId: 1, type: 1, deleted: 1 }),
      ]);
    } catch {}

    if (method === "GET") {
      const { userId } = req.query as { userId?: string };
      if (!userId) return res.status(400).json({ error: "userId erforderlich" });

      const plan = await col.findOne(
        { userId, type: "inchworm_plan", deleted: { $ne: true } },
        { sort: { updatedAt: -1 } }
      );

      return res.status(200).json({
        plan: plan
          ? {
              _id: String(plan._id),
              userId: plan.userId,
              type: "inchworm_plan",
              period: {
                start: plan?.period?.start ?? undefined,
                end: plan?.period?.end ?? undefined,
              },
              focus: plan?.focus ?? "",
              selected: {
                A: Array.isArray(plan?.selected?.A) ? plan.selected.A.map(String) : [],
                B: Array.isArray(plan?.selected?.B) ? plan.selected.B.map(String) : [],
                C: Array.isArray(plan?.selected?.C) ? plan.selected.C.map(String) : [],
              },
              targets: {
                avgTradesPerDay: plan?.targets?.avgTradesPerDay ?? undefined,
                avgTradesPerWeek: plan?.targets?.avgTradesPerWeek ?? undefined,
                avgTradesPerMonth: plan?.targets?.avgTradesPerMonth ?? undefined,
                standardRR: plan?.targets?.standardRR ?? undefined,
              },
              createdAt: plan.createdAt,
              updatedAt: plan.updatedAt,
            }
          : {
              _id: undefined,
              userId,
              type: "inchworm_plan",
              period: {},
              focus: "",
              selected: { A: [], B: [], C: [] },
              targets: {},
            },
      });
    }

    if (method === "PUT") {
      const body = req.body ?? {};
      const userId = trim(body.userId);
      if (!userId) return res.status(400).json({ error: "userId erforderlich" });

      // Eingaben normalisieren (nur Strings)
      let selected = {
        A: Array.isArray(body?.selected?.A) ? body.selected.A.map(String) : [],
        B: Array.isArray(body?.selected?.B) ? body.selected.B.map(String) : [],
        C: Array.isArray(body?.selected?.C) ? body.selected.C.map(String) : [],
      };

      // IDs in ObjectIds gießen (nur gültige)
      const libIds = [...selected.A, ...selected.B, ...selected.C]
        .map((s) => {
          try { return new ObjectId(String(s)); } catch { return null; }
        })
        .filter(Boolean) as ObjectId[];

      // Gegen Library validieren: existiert, gehört dem User, ist aktiv und game stimmt
      if (libIds.length) {
        // game_library_item lebt in derselben Collection
        const found = await col
          .find({
            _id: { $in: libIds },
            type: "game_library_item",
            userId,
            active: { $ne: false },
            deleted: { $ne: true },
          })
          .project({ _id: 1, game: 1 })
          .toArray();

        const byId = new Map(found.map((d: any) => [String(d._id), String(d.game)]));
        selected = {
          A: selected.A.filter((id: string) => byId.get(id) === "A"),
          B: selected.B.filter((id: string) => byId.get(id) === "B"),
          C: selected.C.filter((id: string) => byId.get(id) === "C"),
        };
      } else {
        // nichts gültiges → alles leeren
        selected = { A: [], B: [], C: [] };
      }

      const period = {
        start: date10(body?.period?.start),
        end: date10(body?.period?.end),
      };

      const focus = trim(body.focus);

      const toNumOpt = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const targets = {
        avgTradesPerDay: toNumOpt(body?.targets?.avgTradesPerDay),
        avgTradesPerWeek: toNumOpt(body?.targets?.avgTradesPerWeek),
        avgTradesPerMonth: toNumOpt(body?.targets?.avgTradesPerMonth),
        standardRR: trim(body?.targets?.standardRR) || undefined,
      };

      const now = new Date().toISOString();

      const $set: any = {
        type: "inchworm_plan",
        userId,
        period,
        focus: focus || undefined,
        selected,
        targets,
        updatedAt: now,
      };

      const result = await col.updateOne(
        { userId, type: "inchworm_plan", deleted: { $ne: true } },
        { $set, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );

      return res.status(200).json({
        ok: true,
        upsertedId: result.upsertedId ? result.upsertedId.toString() : undefined,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("inchworm/plan error:", e);
    return res.status(500).json({ error: e?.message ?? "Internal Server Error" });
  }
}
