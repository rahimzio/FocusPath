// pages/api/frequency/resetOnboarding.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

type ResetPayload = {
  userId: string;
  wipeBase?: boolean;
  wipeModels?: boolean;
  wipeTasks?: boolean;
  wipeReflections?: boolean;
  dryRun?: boolean;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();
  const debugId = `resetOnboarding:${started}`;
  console.log(`[${debugId}] === START POST /api/frequency/resetOnboarding ===`);
  console.log(`[${debugId}] Timestamp: ${new Date().toISOString()}`);

  if (req.method !== "POST") {
    console.error(`[${debugId}] ❌ Method not allowed: ${req.method}`);
    return res.status(405).json({ ok: false, error: "Method not allowed", debugId });
  }

  try {
    console.log(`[${debugId}] Incoming POST request`);

    const raw = req.body && typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
    console.log(`[${debugId}] Raw request body:`, raw);

    let body: ResetPayload;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseErr) {
      console.error(`[${debugId}] JSON parse error:`, parseErr);
      return res.status(400).json({ ok: false, error: "Invalid JSON body", debugId });
    }

    console.log(`[${debugId}] Parsed body:`, JSON.stringify(body, null, 2));

    if (!body.userId) {
      console.error(`[${debugId}] ❌ Missing userId`);
      return res.status(400).json({ ok: false, error: "Missing userId", debugId });
    }

    const {
      wipeBase = true,
      wipeModels = true,
      wipeTasks = true,
      wipeReflections = false,
      dryRun = false,
    } = body;

    let userId: ObjectId;
    try {
      userId = new ObjectId(body.userId);
    } catch {
      console.error(`[${debugId}] ❌ Invalid userId format: ${body.userId}`);
      return res.status(400).json({ ok: false, error: "Invalid userId format", debugId });
    }

    console.log(`[${debugId}] Using userId: ${body.userId}`);
    console.log(`[${debugId}] Flags => wipeBase=${wipeBase}, wipeModels=${wipeModels}, wipeTasks=${wipeTasks}, wipeReflections=${wipeReflections}, dryRun=${dryRun}`);

    console.log(`[${debugId}] Connecting to DB...`);
    const { db } = await connectToDatabase();
    console.log(`[${debugId}] ✅ DB connected successfully`);

    const results: any = {};

    // --- A) Frequency-Basis/Modelle löschen ---
    if (wipeBase || wipeModels) {
      console.log(`[${debugId}] Step A: Removing frequency base/models from appData`);
      const unset: any = {};
      if (wipeBase) unset["frequency.base"] = "";
      if (wipeModels) unset["frequency.models"] = "";
      console.log(`[${debugId}] Unset object:`, unset);

      if (Object.keys(unset).length) {
        if (dryRun) {
          console.log(`[${debugId}] DRYRUN: Would run appData.$unset`, unset);
          results.appData = { dryRun: true };
        } else {
          const resDb = await db.collection("appData").updateOne(
            { userId },
            { $unset: unset, $set: { updatedAt: new Date().toISOString() } },
            { upsert: false }
          );
          console.log(`[${debugId}] appData.updateOne result: matchedCount=${resDb.matchedCount}, modifiedCount=${resDb.modifiedCount}`);
          results.appData = { matchedCount: resDb.matchedCount, modifiedCount: resDb.modifiedCount };
        }
      }
    }

    // --- B) Tasks löschen ---
    if (wipeTasks) {
      console.log(`[${debugId}] Step B: Removing onboarding tasks`);
      const filter = { userId, isFrequencyTask: true };
      console.log(`[${debugId}] Task filter:`, filter);
      if (dryRun) {
        const count = await db.collection("tasks").countDocuments(filter);
        console.log(`[${debugId}] DRYRUN: Would delete ${count} tasks`);
        results.tasks = { dryRun: true, wouldDelete: count };
      } else {
        const del = await db.collection("tasks").deleteMany(filter);
        console.log(`[${debugId}] tasks.deleteMany result: deletedCount=${del.deletedCount}`);
        results.tasks = { deletedCount: del.deletedCount };
      }
    }

    // --- C) Reflections löschen ---
    if (wipeReflections) {
      console.log(`[${debugId}] Step C: Removing frequencyReflections`);
      const filter = { userId };
      console.log(`[${debugId}] Reflections filter:`, filter);
      if (dryRun) {
        const count = await db.collection("frequencyReflections").countDocuments(filter);
        console.log(`[${debugId}] DRYRUN: Would delete ${count} reflections`);
        results.reflections = { dryRun: true, wouldDelete: count };
      } else {
        const del = await db.collection("frequencyReflections").deleteMany(filter);
        console.log(`[${debugId}] reflections.deleteMany result: deletedCount=${del.deletedCount}`);
        results.reflections = { deletedCount: del.deletedCount };
      }
    }

    console.log(`[${debugId}] ✅ Reset completed in ${Date.now() - started}ms`);
    return res.status(200).json({ ok: true, debugId, results });

  } catch (err: any) {
    console.error(`[${debugId}] ❌ ERROR:`, err?.stack || err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || "Unknown error", debugId });
  }
}
