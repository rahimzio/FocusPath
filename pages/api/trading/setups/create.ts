// pages/api/trading/setups/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { TradingSetup } from "../../../../components/trading1/interface";

type SetupGameGrade = "S" | "A" | "B" | "C";

type DbTradingSetup = Omit<TradingSetup, "_id"> & {
  _id: ObjectId;
  type: "trading_setup_v2";

  setupSelectedIds?: string[];
  setupAvgPoints?: number;
  setupGameGrade?: SetupGameGrade;

  date?: string; // YYYY-MM-DD
};

function toDateOnly(s?: string) {
  return s ? String(s).slice(0, 10) : "";
}

function uniqStrings(input: any): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const s = String(raw ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }

  return out.length ? out : undefined;
}

function safeJson(value: any, maxLen = 4000) {
  try {
    const s = JSON.stringify(value, null, 2);
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen) + `\n... (truncated, total ${s.length} chars)`;
  } catch {
    return String(value);
  }
}

function previewArray(arr: any, n = 3) {
  if (!Array.isArray(arr)) return undefined;
  return arr.slice(0, n);
}

function normalizeTemplate(input: any) {
  if (!Array.isArray(input)) return undefined;

  const out: any[] = [];
  const seen = new Set<string>();

  for (const raw of input) {
    const id = String(raw?.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      label: String(raw?.label ?? "").trim(),
      required: !!raw?.required,
      description: raw?.description != null ? String(raw.description) : undefined,
    });
  }

  return out.length ? out : undefined;
}

function normalizeState(input: any) {
  if (Array.isArray(input)) {
    return input
      .map((x) => ({
        itemId: String(x?.itemId ?? "").trim(),
        checked: !!x?.checked,
        checkedAt: x?.checkedAt ? String(x.checkedAt) : undefined,
      }))
      .filter((x) => !!x.itemId);
  }

  if (input && typeof input === "object") {
    const out: any[] = [];
    for (const [k, v] of Object.entries(input)) {
      const itemId = String(k).trim();
      if (!itemId) continue;
      out.push({ itemId, checked: !!v });
    }
    return out.length ? out : undefined;
  }

  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
    const raw = (req.body ?? {}) as any;

    // ✅ detect wrapper used
    const wrapperUsed = raw?.payload ? "payload" : raw?.data ? "data" : "none";
    const body: any = raw?.payload ?? raw?.data ?? raw;

    // ✅ base log: what arrived
    console.log("\n================ [API setups/create] ================");
    console.log("[create] wrapperUsed:", wrapperUsed);
    console.log("[create] raw body (truncated):\n", safeJson(raw, 2500));
    console.log("[create] resolved body (truncated):\n", safeJson(body, 2500));

    const {
      userId,
      market,
      direction,
      patternType,
      status,

      setupSelectedIds,
      setupAvgPoints,
      setupGameGrade,
      date,

      entryChecklistTemplate,
      entryChecklistState,

      ...unsafeRest
    } = body;

    // ✅ extracted summary
    console.log("[create] extracted fields:", {
      userId,
      market,
      direction,
      patternType,
      status,
      date,

      setupSelectedIdsType: Array.isArray(setupSelectedIds) ? "array" : typeof setupSelectedIds,
      setupSelectedIdsCount: Array.isArray(setupSelectedIds) ? setupSelectedIds.length : undefined,
      setupAvgPoints,
      setupGameGrade,

      entryChecklistTemplateType: Array.isArray(entryChecklistTemplate) ? "array" : typeof entryChecklistTemplate,
      entryChecklistTemplateCount: Array.isArray(entryChecklistTemplate) ? entryChecklistTemplate.length : undefined,
      entryChecklistTemplatePreview: previewArray(entryChecklistTemplate, 2),

      entryChecklistStateType: Array.isArray(entryChecklistState)
        ? "array"
        : entryChecklistState && typeof entryChecklistState === "object"
          ? "object"
          : typeof entryChecklistState,
      entryChecklistStateCount: Array.isArray(entryChecklistState) ? entryChecklistState.length : undefined,
      entryChecklistStatePreview: previewArray(entryChecklistState, 2),

      unsafeRestKeys: Object.keys(unsafeRest ?? {}).slice(0, 30),
    });

    if (!userId || !market || !direction || !patternType || !status) {
      console.log("[create] ❌ missing required fields:", {
        userIdOk: !!userId,
        marketOk: !!market,
        directionOk: !!direction,
        patternTypeOk: !!patternType,
        statusOk: !!status,
      });

      return res.status(400).json({
        message: "Missing required fields (userId, market, direction, patternType, status).",
      });
    }

    // ✅ prevent client from overwriting protected fields
    const { _id: _ignoreId, type: _ignoreType, createdAt: _c, updatedAt: _u, ...rest } =
      (unsafeRest as any) ?? {};

    console.log("[create] rest keys after stripping protected:", Object.keys(rest ?? {}).slice(0, 50));

    const { db } = await connectToDatabase();
    const col = db.collection<DbTradingSetup>("trading");

    try {
      await Promise.all([
        col.createIndex({ type: 1, userId: 1, createdAt: -1 }),
        col.createIndex({ type: 1, userId: 1, status: 1 }),
        col.createIndex({ type: 1, userId: 1, date: -1 }),
      ]);
    } catch {
      // ignore
    }

    const now = new Date().toISOString();
    const dayKey = toDateOnly(date) || toDateOnly(now);

    const normalizedTemplate = normalizeTemplate(entryChecklistTemplate);
    const normalizedState = normalizeState(entryChecklistState);

    console.log("[create] normalized checklist:", {
      normalizedTemplateCount: Array.isArray(normalizedTemplate) ? normalizedTemplate.length : 0,
      normalizedTemplatePreview: previewArray(normalizedTemplate, 3),
      normalizedStateCount: Array.isArray(normalizedState) ? normalizedState.length : 0,
      normalizedStatePreview: previewArray(normalizedState, 3),
    });

    const doc: DbTradingSetup = {
      _id: new ObjectId(),
      type: "trading_setup_v2",
      userId,

      createdAt: now,
      updatedAt: now,
      date: dayKey,

      market,
      direction,
      patternType,
      status,

      ...rest,

      entryChecklistTemplate: normalizedTemplate,
      entryChecklistState: normalizedState,

      setupSelectedIds: uniqStrings(setupSelectedIds),
      setupAvgPoints: Number.isFinite(Number(setupAvgPoints)) ? Number(setupAvgPoints) : undefined,
      setupGameGrade,
    };

    // ✅ final doc log (preview)
    console.log("[create] final doc preview:", {
      _id: doc._id.toHexString(),
      type: doc.type,
      userId: doc.userId,
      market: doc.market,
      direction: doc.direction,
      patternType: doc.patternType,
      status: doc.status,
      date: doc.date,

      entryChecklistTemplateCount: Array.isArray((doc as any).entryChecklistTemplate)
        ? (doc as any).entryChecklistTemplate.length
        : 0,
      entryChecklistTemplatePreview: previewArray((doc as any).entryChecklistTemplate, 2),

      entryChecklistStateCount: Array.isArray((doc as any).entryChecklistState)
        ? (doc as any).entryChecklistState.length
        : 0,
      entryChecklistStatePreview: previewArray((doc as any).entryChecklistState, 2),

      restKeys: Object.keys(rest ?? {}).slice(0, 30),
    });

    const insertRes = await col.insertOne(doc);
    console.log("[create] ✅ insertOne result:", {
      acknowledged: insertRes.acknowledged,
      insertedId: insertRes.insertedId?.toHexString ? insertRes.insertedId.toHexString() : String(insertRes.insertedId),
    });
    console.log("================ [/API setups/create] ================\n");

    const { _id, type, ...clean } = doc;

    return res.status(201).json({
      setup: {
        ...clean,
        _id: _id.toHexString(),
      },
    });
  } catch (err) {
    console.error("[API setups/create] ERROR:", err);
    return res.status(500).json({
      message: "Internal server error while creating setup.",
    });
  }
}
