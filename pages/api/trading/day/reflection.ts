// pages/api/trading/day/reflection.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/mongo";

type Grade = "A" | "B" | "C";

type Doc = {
  _id?: any;
  type: "day_reflection";
  userId: string;
  date: string; // YYYY-MM-DD

  // Trade-basierter Tageswert (FINAL oder zumindest persistiert)
  dayAvgScore?: number; // 0..3
  dayGrade?: Grade;

  notes?: string;
  noTradeButGood?: boolean;

  missedSetups?: {
    count?: number;
    reasons?: string[];
    notes?: string;
  };

  // ✅ Backwards compatibility: alte "Extras" (Buttons +A/+B/+C)
  manualExtras?: Grade[];

  // ✅ NEW: Reflection-Game (A/B/C Tages-Checkliste)
  // IDs referenzieren Einträge aus /api/trading/gameLibrary?scope=reflection
  reflectionSelectedIds?: string[];
  reflectionAvgScore?: number; // 0..3
  reflectionGrade?: Grade;

  // ✅ NEW: Setup-Game (future-proof)
  // IDs referenzieren Einträge aus /api/trading/gameLibrary?scope=setup
  setupSelectedIds?: string[];
  setupAvgScore?: number; // 0..3
  setupGrade?: Grade;

  // ✅ ADD: Trade-Game Faktoren (A/B/C Tages-Checkliste)
  // IDs referenzieren Einträge aus /api/trading/gameLibrary?scope=trade
  tradeSelectedIds?: string[];
  tradeAvgScore?: number; // 0..3
  tradeGrade?: Grade;

  // ✅ ADD: legacy nested structure (falls alte Docs existieren)
  // (wir speichern weiterhin flat, aber können lesen & akzeptieren legacy inputs)
  reflectionGame?: {
    selectedIds?: string[];
    avgScore?: number;
    grade?: Grade;
  };

  // ✅ ADD: legacy nested tradeGame (optional)
  tradeGame?: {
    selectedIds?: string[];
    avgScore?: number;
    grade?: Grade;
  };

  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

function toDateOnly(s?: string) {
  if (!s) return "";
  return String(s).slice(0, 10);
}

function isGrade(x: any): x is Grade {
  return x === "A" || x === "B" || x === "C";
}

/** dedupe + trim string arrays safely */
function uniqStrings(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out.length ? out : undefined;
}

/** remove undefined keys recursively (keeps false/0/"") */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> | undefined {
  if (!obj || typeof obj !== "object") return obj;

  const out: any = Array.isArray(obj) ? [] : {};
  let hasAny = false;

  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;

    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = stripUndefined(v);
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startedAt = Date.now();
  const { db } = await connectToDatabase();
  const col = db.collection<Doc>("trading");

  // Indizes (idempotent) – verhindert doppelte Tages-Dokumente je User
  try {
    await Promise.all([
      col.createIndex({ type: 1, userId: 1, date: 1 }, { unique: true }),
      col.createIndex({ type: 1, userId: 1, deleted: 1 }),
      col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
      col.createIndex({ type: 1, userId: 1, date: -1 }),
    ]);
  } catch (e) {
    console.warn("[API day/reflection] index creation warning:", (e as any)?.message);
  }

  if (req.method === "GET") {
    const { userId, date } = req.query;

    console.log("[API day/reflection][GET] query =", req.query);

    if (typeof userId !== "string" || !userId) {
      return res.status(400).json({ error: "userId required" });
    }
    if (typeof date !== "string" || !date) {
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const day = toDateOnly(date);

    try {
      const doc = await col.findOne({
        type: "day_reflection",
        userId,
        date: day,
        deleted: { $ne: true },
      });

      // ✅ ADD: normalize legacy reflectionGame → flat fields in response (no DB write)
      // ✅ ADD: normalize legacy tradeGame → flat fields in response (no DB write)
      const normalized = doc
        ? ({
            ...doc,
            reflectionSelectedIds:
              doc.reflectionSelectedIds ??
              (Array.isArray(doc.reflectionGame?.selectedIds) ? doc.reflectionGame!.selectedIds : undefined),
            reflectionAvgScore:
              doc.reflectionAvgScore ??
              (Number.isFinite(Number(doc.reflectionGame?.avgScore)) ? Number(doc.reflectionGame!.avgScore) : undefined),
            reflectionGrade:
              doc.reflectionGrade ??
              (isGrade(doc.reflectionGame?.grade) ? doc.reflectionGame!.grade : undefined),

            tradeSelectedIds:
              doc.tradeSelectedIds ??
              (Array.isArray(doc.tradeGame?.selectedIds) ? doc.tradeGame!.selectedIds : undefined),
            tradeAvgScore:
              doc.tradeAvgScore ??
              (Number.isFinite(Number(doc.tradeGame?.avgScore)) ? Number(doc.tradeGame!.avgScore) : undefined),
            tradeGrade:
              doc.tradeGrade ??
              (isGrade(doc.tradeGame?.grade) ? doc.tradeGame!.grade : undefined),
          } as Doc)
        : null;

      console.log(
        "[API day/reflection][GET] found=",
        !!doc,
        "id=",
        doc?._id,
        "durationMs=",
        Date.now() - startedAt
      );

      return res.status(200).json({ reflection: normalized ?? null });
    } catch (e: any) {
      console.error("[API day/reflection][GET] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    console.log("[API day/reflection][POST] body keys =", Object.keys(body || {}));

    const userId = String(body.userId || "").trim();
    const day = toDateOnly(String(body.date || ""));

    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!day) return res.status(400).json({ error: "date required (YYYY-MM-DD)" });

    const nowIso = new Date().toISOString();

    // ✅ ADD: accept legacy nested reflectionGame if flat fields are missing
    const legacyRefSelectedIds = uniqStrings(body.reflectionGame?.selectedIds);
    const legacyRefAvg = Number.isFinite(Number(body.reflectionGame?.avgScore))
      ? Number(body.reflectionGame?.avgScore)
      : undefined;
    const legacyRefGrade = isGrade(body.reflectionGame?.grade) ? body.reflectionGame.grade : undefined;

    // ✅ ADD: accept legacy nested tradeGame if flat fields are missing
    const legacyTradeSelectedIds = uniqStrings(body.tradeGame?.selectedIds);
    const legacyTradeAvg = Number.isFinite(Number(body.tradeGame?.avgScore))
      ? Number(body.tradeGame?.avgScore)
      : undefined;
    const legacyTradeGrade = isGrade(body.tradeGame?.grade) ? body.tradeGame.grade : undefined;

    const payload: Partial<Doc> =
      stripUndefined({
        type: "day_reflection",
        userId,
        date: day,

        dayAvgScore: Number.isFinite(Number(body.dayAvgScore)) ? Number(body.dayAvgScore) : undefined,
        dayGrade: isGrade(body.dayGrade) ? body.dayGrade : undefined,

        notes: typeof body.notes === "string" ? body.notes : undefined,
        noTradeButGood: !!body.noTradeButGood,

        missedSetups: body.missedSetups
          ? stripUndefined({
              count: Number.isFinite(Number(body.missedSetups.count)) ? Number(body.missedSetups.count) : undefined,
              reasons: uniqStrings(body.missedSetups.reasons),
              notes: typeof body.missedSetups.notes === "string" ? body.missedSetups.notes : undefined,
            })
          : undefined,

        // ✅ old extras (persist now)
        manualExtras: Array.isArray(body.manualExtras) ? body.manualExtras.map(String).filter(isGrade) : undefined,

        // ✅ reflection game (flat) + legacy fallback
        reflectionSelectedIds: uniqStrings(body.reflectionSelectedIds) ?? legacyRefSelectedIds,
        reflectionAvgScore: Number.isFinite(Number(body.reflectionAvgScore)) ? Number(body.reflectionAvgScore) : legacyRefAvg,
        reflectionGrade: isGrade(body.reflectionGrade) ? body.reflectionGrade : legacyRefGrade,

        // ✅ setup game (future-proof)
        setupSelectedIds: uniqStrings(body.setupSelectedIds),
        setupAvgScore: Number.isFinite(Number(body.setupAvgScore)) ? Number(body.setupAvgScore) : undefined,
        setupGrade: isGrade(body.setupGrade) ? body.setupGrade : undefined,

        // ✅ ADD: trade game (flat) + legacy fallback
        tradeSelectedIds: uniqStrings(body.tradeSelectedIds) ?? legacyTradeSelectedIds,
        tradeAvgScore: Number.isFinite(Number(body.tradeAvgScore)) ? Number(body.tradeAvgScore) : legacyTradeAvg,
        tradeGrade: isGrade(body.tradeGrade) ? body.tradeGrade : legacyTradeGrade,

        // ✅ ADD: (optional) store legacy object too if provided (safe for backwards compatibility)
        // (dein Frontend nutzt flat fields – aber falls alte Clients posten, behalten wir das)
        reflectionGame:
          body.reflectionGame && typeof body.reflectionGame === "object"
            ? stripUndefined({
                selectedIds: legacyRefSelectedIds,
                avgScore: legacyRefAvg,
                grade: legacyRefGrade,
              })
            : undefined,

        // ✅ ADD: optional legacy tradeGame store
        tradeGame:
          body.tradeGame && typeof body.tradeGame === "object"
            ? stripUndefined({
                selectedIds: legacyTradeSelectedIds,
                avgScore: legacyTradeAvg,
                grade: legacyTradeGrade,
              })
            : undefined,

        updatedAt: nowIso,
        deleted: false,
      }) ?? {
        type: "day_reflection",
        userId,
        date: day,
        updatedAt: nowIso,
        deleted: false,
      };

    try {
      const result = await col.updateOne(
        { type: "day_reflection", userId, date: day },
        { $set: payload, $setOnInsert: { createdAt: nowIso } },
        { upsert: true }
      );

      const saved = await col.findOne({ type: "day_reflection", userId, date: day });

      console.log("[API day/reflection][POST] upsert result =", {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId,
        durationMs: Date.now() - startedAt,
      });

      return res.status(200).json({
        ok: true,
        upsertedId: result.upsertedId ?? null,
        reflection: saved ?? null,
      });
    } catch (e: any) {
      console.error("[API day/reflection][POST] ERROR:", e?.message, e);
      return res.status(500).json({ error: e?.message ?? "Server error" });
    }
  }

  console.log("[API day/reflection] 405 method =", req.method);
  return res.status(405).json({ error: "Method not allowed" });
}
