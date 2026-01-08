// pages/api/trading/improve/plan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type PlanStatus = "active" | "archived";
type EndResult = "finished" | "not_finished";

type InchwormPlanDoc = {
  _id?: any;
  type: "inchworm_plan";
  userId: string;

  // existing
  period: string; // free text
  focus?: string;

  // existing (kept flexible)
  selected?: any;
  targets?: any;

  // ✅ timeframe (optional but useful for month-based evaluation)
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD

  // ✅ drill shown in overview
  todayDrillId?: string;

  // ✅ status/endResult (archiving/repeating)
  status?: PlanStatus; // default active
  endResult?: EndResult; // finished | not_finished
  archivedAt?: string;

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  const str = String(s);
  return str.length >= 10 ? str.slice(0, 10) : str;
}

function trim(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function isEndResult(x: any): x is EndResult {
  return x === "finished" || x === "not_finished";
}

/** remove undefined keys recursively (keeps false/0/"") */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> | undefined {
  if (!obj || typeof obj !== "object") return obj;

  const out: any = Array.isArray(obj) ? [] : {};
  let hasAny = false;

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;

    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = stripUndefined(v as any);
      if (nested && Object.keys(nested).length > 0) {
        out[k] = nested;
        hasAny = true;
      }
      continue;
    }

    out[k] = v;
    hasAny = true;
  }

  return hasAny ? out : undefined;
}

function parseObjectId(id: any): ObjectId | null {
  try {
    const s = String(id || "").trim();
    if (!s) return null;
    return new ObjectId(s);
  } catch {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection<InchwormPlanDoc>("trading");

  // Indizes (idempotent)
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, status: 1 }),
      col.createIndex({ type: 1, userId: 1, updatedAt: -1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
    ]);
  } catch (e: any) {
    console.warn("[API improve/plan] index warn:", e?.message);
  }

  try {
    // -------------------- GET --------------------
    /**
     * GET /api/trading/improve/plan?userId=...
     * -> returns active plan if exists, else latest
     *
     * GET /api/trading/improve/plan?userId=...&id=...
     * -> returns specific plan by id
     *
     * GET /api/trading/improve/plan?userId=...&mode=history&limit=20
     * -> returns archived history (latest first)
     */
    if (req.method === "GET") {
      const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
      if (!userId) return res.status(400).json({ error: "userId required" });

      const id = typeof req.query.id === "string" ? req.query.id.trim() : "";
      const mode = typeof req.query.mode === "string" ? req.query.mode.trim().toLowerCase() : "";
      const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
      const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 20;

      // by id
      if (id) {
        const oid = parseObjectId(id);
        if (!oid) return res.status(400).json({ error: "invalid id" });

        const plan = await col.findOne({
          _id: oid,
          type: "inchworm_plan",
          userId,
          deleted: { $ne: true },
        });

        return res.status(200).json({
          plan: plan ?? null,
          meta: { durationMs: Date.now() - startedAt, source: "by_id" },
        });
      }

      // history list (archived)
      if (mode === "history") {
        const items = await col
          .find({
            type: "inchworm_plan",
            userId,
            deleted: { $ne: true },
            status: "archived",
          })
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(limit)
          .toArray();

        return res.status(200).json({
          items,
          meta: { durationMs: Date.now() - startedAt, source: "history" },
        });
      }

      // prefer active plan
      const active = await col.findOne({
        type: "inchworm_plan",
        userId,
        deleted: { $ne: true },
        status: { $ne: "archived" },
      });

      if (active) {
        return res.status(200).json({
          plan: active,
          meta: { durationMs: Date.now() - startedAt, source: "active" },
        });
      }

      // fallback: latest
      const latest = await col
        .find({
          type: "inchworm_plan",
          userId,
          deleted: { $ne: true },
        })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(1)
        .toArray();

      return res.status(200).json({
        plan: latest?.[0] ?? null,
        meta: { durationMs: Date.now() - startedAt, source: "latest" },
      });
    }

    // -------------------- POST (create new active plan; archive old active) --------------------
    /**
     * POST /api/trading/improve/plan
     * body: { userId, period, focus?, selected?, targets?, from?, to?, todayDrillId? }
     *
     * Behavior:
     * - Archives any previous active plan(s)
     * - Inserts a fresh active plan
     */
    if (req.method === "POST") {
      const body = req.body ?? {};

      const userId = String(body.userId || "").trim();
      const period = trim(body.period);
      const focus = trim(body.focus);

      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!period) return res.status(400).json({ error: "period required" });

      const from = toDateOnly(body.from) || undefined;
      const to = toDateOnly(body.to) || undefined;

      // keep flexible:
      const selected = body.selected ?? body.planSelected ?? body.selection ?? undefined;
      const targets = body.targets ?? undefined;

      const todayDrillId = trim(body.todayDrillId) || undefined;

      const now = new Date().toISOString();

      // archive previous active plans (safe, predictable: 1 active plan)
      await col.updateMany(
        { type: "inchworm_plan", userId, deleted: { $ne: true }, status: { $ne: "archived" } },
        { $set: { status: "archived", archivedAt: now, updatedAt: now } }
      );

      const doc: InchwormPlanDoc =
        (stripUndefined({
          type: "inchworm_plan",
          userId,
          period,
          focus: focus || undefined,
          selected,
          targets,
          from,
          to,
          todayDrillId,
          status: "active" as PlanStatus,
          endResult: undefined, // reset on new plan
          createdAt: now,
          updatedAt: now,
          deleted: false,
        }) as InchwormPlanDoc) ?? ({
          type: "inchworm_plan",
          userId,
          period,
          status: "active",
          createdAt: now,
          updatedAt: now,
          deleted: false,
        } as InchwormPlanDoc);

      const insert = await col.insertOne(doc as any);
      const saved = await col.findOne({ _id: insert.insertedId });

      return res.status(200).json({
        ok: true,
        plan: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    }

    // -------------------- PATCH (update / archive / endResult / repeat) --------------------
    /**
     * PATCH /api/trading/improve/plan
     * body: { userId, id, status?, endResult?, todayDrillId?, from?, to?, selected?, targets?, repeat? ... }
     *
     * repeat=true:
     * - archives current plan
     * - creates a new active plan (copy) with optional overrides
     */
    if (req.method === "PATCH") {
      const body = req.body ?? {};

      const userId = String(body.userId || "").trim();
      const id = String(body.id || body._id || "").trim();

      if (!userId) return res.status(400).json({ error: "userId required" });
      if (!id) return res.status(400).json({ error: "id required" });

      const planId = parseObjectId(id);
      if (!planId) return res.status(400).json({ error: "invalid id" });

      const now = new Date().toISOString();

      const existing = await col.findOne({
        _id: planId,
        type: "inchworm_plan",
        userId,
        deleted: { $ne: true },
      });

      if (!existing) return res.status(404).json({ error: "plan not found" });

      const update: any = { updatedAt: now };
      const unset: any = {};

      // endResult (set only if valid; never delete)
      if (body.endResult !== undefined) {
        if (isEndResult(body.endResult)) update.endResult = body.endResult;
      }

      // status (archive/active)
      if (body.status !== undefined) {
        const s = String(body.status || "").trim().toLowerCase();
        if (s === "archived") {
          update.status = "archived";
          update.archivedAt = now;
        } else if (s === "active") {
          update.status = "active";
          // do NOT delete archivedAt (no side effects)
        }
      }

      // ✅ todayDrillId (SET or CLEAR)
      // - if ""/null => unset todayDrillId
      // - if value => set todayDrillId
      if (body.todayDrillId !== undefined) {
        const v = String(body.todayDrillId ?? "").trim();
        if (!v) unset.todayDrillId = "";
        else update.todayDrillId = v;
      }

      // timeframe
      if (body.from !== undefined) {
        const v = toDateOnly(body.from);
        if (v) update.from = v;
      }
      if (body.to !== undefined) {
        const v = toDateOnly(body.to);
        if (v) update.to = v;
      }

      // selected/targets flexible update
      if (body.selected !== undefined) update.selected = body.selected;
      if (body.targets !== undefined) update.targets = body.targets;

      const repeat = body.repeat === true;

      // normal update
      if (!repeat) {
        const mongoUpdate: any = { $set: update };
        if (Object.keys(unset).length) mongoUpdate.$unset = unset;

        await col.updateOne({ _id: planId, type: "inchworm_plan", userId }, mongoUpdate);

        const saved = await col.findOne({ _id: planId, type: "inchworm_plan", userId });
        return res.status(200).json({
          ok: true,
          plan: saved ?? null,
          meta: { durationMs: Date.now() - startedAt },
        });
      }

      // ✅ repeat mode
      {
        const mongoUpdate: any = { $set: { ...update, status: "archived", archivedAt: now } };
        if (Object.keys(unset).length) mongoUpdate.$unset = unset;

        await col.updateOne(
          { _id: planId, type: "inchworm_plan", userId },
          mongoUpdate
        );
      }

      // also archive other actives (safety)
      await col.updateMany(
        { type: "inchworm_plan", userId, deleted: { $ne: true }, status: { $ne: "archived" } },
        { $set: { status: "archived", archivedAt: now, updatedAt: now } }
      );

      const newDoc: InchwormPlanDoc = {
        type: "inchworm_plan",
        userId,

        period: trim(body.newPeriod) || String(existing.period || "").trim(),
        focus: trim(body.newFocus) || (existing.focus ?? undefined),

        selected: body.newSelected ?? existing.selected,
        targets: body.newTargets ?? existing.targets,

        from: toDateOnly(body.newFrom) || existing.from || undefined,
        to: toDateOnly(body.newTo) || existing.to || undefined,

        todayDrillId: trim(body.newTodayDrillId) || existing.todayDrillId || undefined,

        status: "active",
        endResult: undefined,

        createdAt: now,
        updatedAt: now,
        deleted: false,
      };

      const ins = await col.insertOne(newDoc as any);
      const saved = await col.findOne({ _id: ins.insertedId });

      return res.status(200).json({
        ok: true,
        repeatedFromId: planId.toHexString(),
        plan: saved ?? null,
        meta: { durationMs: Date.now() - startedAt },
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("[API improve/plan] error:", e);
    return res.status(500).json({ error: e?.message ?? "Internal Server Error" });
  }
}
