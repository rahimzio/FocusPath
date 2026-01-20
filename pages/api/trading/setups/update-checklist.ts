// pages/api/trading/setups/update-checklist.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type ChecklistState = { itemId: string; checked: boolean; checkedAt?: string };

const DEBUG = process.env.NODE_ENV !== "production";

/**
 * Robust: kann req.body als Objekt ODER als JSON-String bekommen,
 * und unterstützt zusätzlich SWRMutation-Pattern { arg: {...} }.
 */
function normalizeBody(body: any) {
  let parsed = body;

  // body kann ein string sein (selten, aber möglich)
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      // leave as string
    }
  }

  // SWRMutation: { arg: payload }
  if (parsed && typeof parsed === "object" && "arg" in parsed) {
    return (parsed as any).arg;
  }

  return parsed ?? {};
}

function extractHexObjectId(input: any) {
  const s = String(input ?? "").trim();
  const m = s.match(/[a-fA-F0-9]{24}/);
  return m ? m[0] : "";
}

function previewBody(body: any) {
  try {
    const s = JSON.stringify(body);
    return s.length > 1200 ? s.slice(0, 1200) + "…(truncated)" : s;
  } catch {
    return String(body);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reqId = Math.random().toString(16).slice(2, 8);

  // ⭐ hilf dir sofort zu sehen, ob du wirklich diesen Handler triffst
  if (DEBUG) {
    console.log(`\n[update-checklist][${reqId}] HIT pages/api route`);
    console.log(`[update-checklist][${reqId}] method=${req.method} url=${req.url}`);
  }

  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed. Use PATCH." });
  }

  try {
    const payload = normalizeBody(req.body);

    // akzeptiere setupId ODER id ODER _id (und auch query fallback)
    const rawUserId =
      typeof payload?.userId === "string"
        ? payload.userId
        : typeof req.query.userId === "string"
        ? req.query.userId
        : "";

    const userId = String(rawUserId ?? "").trim();

    const rawSetupId =
      payload?.setupId ??
      payload?.id ??
      payload?._id ??
      (typeof req.query.setupId === "string" ? req.query.setupId : "") ??
      (typeof req.query.id === "string" ? req.query.id : "") ??
      "";

    const setupIdStr = String(rawSetupId ?? "").trim();

    const stateRaw = Array.isArray(payload?.entryChecklistState)
      ? payload.entryChecklistState
      : [];

    const entryChecklistState: ChecklistState[] = stateRaw
      .map((x: any) => ({
        itemId: String(x?.itemId ?? "").trim(),
        checked: !!x?.checked,
        checkedAt: x?.checkedAt ? String(x.checkedAt) : undefined,
      }))
      .filter((x:any) => x.itemId.length > 0);

    if (DEBUG) {
      console.log(`[update-checklist][${reqId}] payloadKeys=`, payload && typeof payload === "object" ? Object.keys(payload) : typeof payload);
      console.log(`[update-checklist][${reqId}] rawUserId=`, payload?.userId, "queryUserId=", req.query.userId);
      console.log(`[update-checklist][${reqId}] userId="${userId}" len=${userId.length}`);

      console.log(`[update-checklist][${reqId}] rawSetupId=`, rawSetupId);
      console.log(`[update-checklist][${reqId}] setupIdStr="${setupIdStr}" len=${setupIdStr.length}`);

      const hex = extractHexObjectId(setupIdStr);
      console.log(`[update-checklist][${reqId}] extractedHex="${hex}" isValidHex=${!!hex} objectIdValid=${hex ? ObjectId.isValid(hex) : false}`);

      console.log(`[update-checklist][${reqId}] checklist items=${entryChecklistState.length} sample=`, entryChecklistState.slice(0, 2));
      console.log(`[update-checklist][${reqId}] bodyPreview=`, previewBody(req.body));
    }

    // --- Validierung ---
    if (!userId) {
      return res.status(400).json({
        message: "userId required",
        debug: DEBUG ? { gotUserId: payload?.userId, queryUserId: req.query.userId } : undefined,
      });
    }

    if (!setupIdStr) {
      return res.status(400).json({
        message: "Invalid id",
        debug: DEBUG
          ? {
              gotSetupId: payload?.setupId,
              gotId: payload?.id,
              gotUnderscoreId: payload?._id,
              querySetupId: req.query.setupId,
              payloadKeys: payload && typeof payload === "object" ? Object.keys(payload) : null,
            }
          : undefined,
      });
    }

    // --- ObjectId Parsing ---
    const hex = extractHexObjectId(setupIdStr);
    const canUseObjectId = !!hex && ObjectId.isValid(hex);
    const objectId = canUseObjectId ? new ObjectId(hex) : null;

    if (!objectId && setupIdStr.length !== 24) {
      // Nicht zwingend error, aber wir wollen klare Debug-Infos.
      // (Du kannst trotzdem string-_id nutzen, aber es ist gut zu sehen.)
      if (DEBUG) {
        console.log(`[update-checklist][${reqId}] WARN: setupIdStr is not 24 chars. Will still try string _id fallback.`);
      }
    }

    const { db } = await connectToDatabase();

    // ⭐ absichtlich any: damit TS uns nicht zwingt, _id als ObjectId zu typisieren
    const col = db.collection<any>("trading");

    const now = new Date().toISOString();
    const update = {
      $set: {
        entryChecklistState,
        updatedAt: now,
      },
    };

    // 1) Versuch: _id als ObjectId (Normalfall)
    let result: any = null;

    if (objectId) {
      if (DEBUG) console.log(`[update-checklist][${reqId}] try ObjectId match _id=${objectId.toHexString()}`);

      result = await col.findOneAndUpdate(
        { _id: objectId, type: "trading_setup_v2", userId, deleted: { $ne: true } },
        update,
        { returnDocument: "after" }
      );
    }

    // 2) Fallback: _id als String (falls du irgendwann string ids hattest)
    if (!result?.value) {
      if (DEBUG) console.log(`[update-checklist][${reqId}] try STRING match _id="${setupIdStr}"`);

      result = await col.findOneAndUpdate(
        { _id: setupIdStr, type: "trading_setup_v2", userId, deleted: { $ne: true } },
        update,
        { returnDocument: "after" }
      );
    }

    // 3) Extra-Fallback: wenn setupIdStr zwar 24-hex ist, aber payload enthält z.B. "ObjectId('...')"
    // -> wir haben hex extrahiert, das war schon Versuch 1. Falls userId falsch ist, hilft das nicht.
    if (!result?.value) {
      if (DEBUG) {
        console.log(`[update-checklist][${reqId}] NOT FOUND`);
        console.log(`[update-checklist][${reqId}] debug find params=`, {
          userId,
          setupIdStr,
          extractedHex: hex,
          objectIdTried: objectId ? objectId.toHexString() : null,
        });
      }

      return res.status(404).json({
        message: "Setup not found",
        debug: DEBUG
          ? {
              userId,
              setupIdStr,
              extractedHex: hex,
              objectIdTried: objectId ? objectId.toHexString() : null,
              hint:
                "Wenn setupId gültig ist, ist oft userId falsch oder du triffst eine andere Route (app/api).",
            }
          : undefined,
      });
    }

    const doc = result.value as any;
    const outId =
      doc?._id && typeof doc._id === "object" && typeof doc._id.toHexString === "function"
        ? doc._id.toHexString()
        : String(doc?._id);

    const { _id, type, ...rest } = doc;

    if (DEBUG) console.log(`[update-checklist][${reqId}] OK updated _id=${outId}`);

    return res.status(200).json({ setup: { ...rest, _id: outId } });
  } catch (err: any) {
    console.error(`[API setups/update-checklist] ERROR:`, err?.message, err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
