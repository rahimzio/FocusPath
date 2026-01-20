// pages/api/trading/setups/add-thought-log.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

const DEBUG = process.env.NODE_ENV !== "production";

function normalizeBody(body: any) {
  let parsed = body;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      // leave
    }
  }

  // SWRMutation pattern: { arg: payload }
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

  if (DEBUG) {
    console.log(`\n[add-thought-log][${reqId}] HIT pages/api route`);
    console.log(`[add-thought-log][${reqId}] method=${req.method} url=${req.url}`);
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed. Use POST." });
  }

  try {
    const payload = normalizeBody(req.body);

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
    const text = String(payload?.text ?? "").trim();

    if (DEBUG) {
      console.log(
        `[add-thought-log][${reqId}] payloadKeys=`,
        payload && typeof payload === "object" ? Object.keys(payload) : typeof payload
      );
      console.log(`[add-thought-log][${reqId}] userId="${userId}" len=${userId.length}`);
      console.log(`[add-thought-log][${reqId}] setupIdStr="${setupIdStr}" len=${setupIdStr.length}`);
      console.log(`[add-thought-log][${reqId}] textLen=${text.length}`);
      console.log(`[add-thought-log][${reqId}] bodyPreview=`, previewBody(req.body));
    }

    if (!userId) return res.status(400).json({ message: "userId required" });
    if (!setupIdStr) return res.status(400).json({ message: "Invalid id" });
    if (!text) return res.status(400).json({ message: "text required" });

    const hex = extractHexObjectId(setupIdStr);
    const canUseObjectId = !!hex && ObjectId.isValid(hex);
    const objectId = canUseObjectId ? new ObjectId(hex) : null;

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const now = new Date().toISOString();
    const entry = {
      id: new ObjectId().toHexString(),
      text,
      createdAt: now,
    };

    // ✅ TS FIX: Mongo-Typen sind hier oft zu strict -> cast update to any
    const update = {
      $push: { thoughtLogs: entry },
      $set: { updatedAt: now },
    } as any;

    let result: any = null;

    // 1) normal: _id ObjectId
    if (objectId) {
      if (DEBUG) console.log(`[add-thought-log][${reqId}] try ObjectId match _id=${objectId.toHexString()}`);
      result = await col.findOneAndUpdate(
        { _id: objectId, type: "trading_setup_v2", userId, deleted: { $ne: true } } as any,
        update,
        { returnDocument: "after" }
      );
    }

    // 2) fallback: _id string
    if (!result?.value) {
      if (DEBUG) console.log(`[add-thought-log][${reqId}] try STRING match _id="${setupIdStr}"`);
      result = await col.findOneAndUpdate(
        { _id: setupIdStr, type: "trading_setup_v2", userId, deleted: { $ne: true } } as any,
        update,
        { returnDocument: "after" }
      );
    }

    if (!result?.value) {
      if (DEBUG) {
        console.log(`[add-thought-log][${reqId}] NOT FOUND`);
        console.log(`[add-thought-log][${reqId}] debug=`, {
          userId,
          setupIdStr,
          extractedHex: hex,
          objectIdTried: objectId ? objectId.toHexString() : null,
        });
      }
      return res.status(404).json({ message: "Setup not found" });
    }

    const doc = result.value as any;
    const outId =
      doc?._id && typeof doc._id === "object" && typeof doc._id.toHexString === "function"
        ? doc._id.toHexString()
        : String(doc?._id);

    const { _id, type, ...rest } = doc;

    if (DEBUG) console.log(`[add-thought-log][${reqId}] OK added entryId=${entry.id} setupId=${outId}`);

    return res.status(200).json({
      setup: { ...rest, _id: outId },
      entry,
    });
  } catch (err: any) {
    console.error(`[API setups/add-thought-log] ERROR:`, err?.message, err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
