// pages/api/trading/setups/execute.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed. Use PATCH." });
  }

  try {
    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();
    const setupId = String(body.setupId || body.id || "").trim();

    // executed: true -> entered, executed: false -> back to open
    const executed = body.executed === false ? false : true;

    // optional: wenn du beim “execute” direkt GamePicker Daten mitsenden willst
    const gameGrade = typeof body.gameGrade === "string" ? body.gameGrade : undefined;
    const gameSelectedIds = Array.isArray(body.gameSelectedIds)
      ? body.gameSelectedIds.map(String).filter(Boolean)
      : undefined;
    const gameAvgScore =
      Number.isFinite(Number(body.gameAvgScore)) ? Number(body.gameAvgScore) : undefined;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }
    if (!setupId) {
      return res.status(400).json({ message: "setupId required" });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const now = new Date().toISOString();

    const _id = new ObjectId(setupId);

    const $set: any = {
      updatedAt: now,
    };

    if (executed) {
      // ✅ deine Definition: “aktiv / danach gehandelt”
      // Wir mappen das stabil auf status=entered (weil dein UI schon entered als active bucket nutzt)
      $set.status = "entered";
      $set.decision = "entered";
      $set.executedAt = now; // ✅ neu: Timestamp fürs Improve/Filter
    } else {
      // zurücksetzen
      $set.status = "open";
      $set.decision = undefined;
      $set.executedAt = undefined;
    }

    // optional game data speichern, wenn mitgeschickt
    if (gameGrade) $set.gameGrade = gameGrade;
    if (gameSelectedIds) $set.gameSelectedIds = gameSelectedIds;
    if (gameAvgScore !== undefined) $set.gameAvgScore = gameAvgScore;

    const result = await col.updateOne(
      { _id, type: "trading_setup_v2", userId },
      { $set }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Setup not found (or user mismatch)" });
    }

    const saved = await col.findOne({ _id, type: "trading_setup_v2", userId });

    return res.status(200).json({ ok: true, setup: saved ?? null });
  } catch (err: any) {
    console.error("Error executing setup", err?.message ?? err);
    return res.status(500).json({ message: "Internal server error while executing setup." });
  }
}
