// pages/api/trading/setups/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

type SetupStatus = string; // wir lassen es offen (legacy-safe)

// ✅ ADD
type Grade = "A" | "B" | "C";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function toIsoNow() {
  return new Date().toISOString();
}

// ✅ Status normalisieren für executed-mapping
function normalizeSetupStatus(raw: any) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "";

  // "executed" definieren wir als: status === "active"
  const map: Record<string, string> = {
    active: "active",
    activated: "active",
    executed: "active",

    archive: "archived",
    archived: "archived",

    draft: "draft",
    planned: "draft",

    resolved: "resolved",
    invalid: "invalid",
  };

  return map[s] ?? s;
}

// ✅ ADD: grade helper
function isGrade(x: any): x is Grade {
  return x === "A" || x === "B" || x === "C";
}

// ✅ ADD: dedupe + trim string arrays safely
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ message: "Method not allowed. Use PATCH." });
  }

  try {
    const body = req.body ?? {};

    const userId = String(body.userId || "").trim();
    const id = String(body.id || body._id || "").trim();

    if (!userId) return res.status(400).json({ message: "userId required" });
    if (!id) return res.status(400).json({ message: "id required" });

    const setupId = new ObjectId(id);
    const now = toIsoNow();

    // Optional fields (nur setzen, wenn im body vorhanden)
    const hasStatus = body.status !== undefined;
    const hasEndResult = body.endResult !== undefined;

    const nextStatus = hasStatus ? normalizeSetupStatus(body.status) : undefined;

    // Optional: endResult
    const endResult =
      body.endResult === "finished" || body.endResult === "not_finished"
        ? body.endResult
        : undefined;

    // ✅ ADD: Setup-Game Felder (nur setzen, wenn im body vorhanden)
    const hasSetupSelectedIds = body.setupSelectedIds !== undefined;
    const hasSetupAvgScore = body.setupAvgScore !== undefined;
    const hasSetupGrade = body.setupGrade !== undefined;

    // ✅ ADD: optionale Felder fürs Mapping/Recap (minimal, aber hilfreich)
    const hasLinkedTradeId = body.linkedTradeId !== undefined;
    const hasDecision = body.decision !== undefined;
    const hasOutcome = body.outcome !== undefined;
    const hasReflection = body.reflection !== undefined;

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    // 1) Setup holen (damit wir activatedAt nur beim ersten Mal setzen)
    const existing = await col.findOne({
      _id: setupId,
      type: "trading_setup_v2",
      userId,
      deleted: { $ne: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Setup not found" });
    }

    const update: any = {
      updatedAt: now,
    };

    if (hasStatus && isNonEmptyString(nextStatus)) {
      update.status = nextStatus;

      // ✅ activatedAt nur beim ersten Wechsel zu active
      const prevStatus = String((existing as any).status || "").toLowerCase();
      const prevActivatedAt = (existing as any).activatedAt;

      if (nextStatus === "active" && prevStatus !== "active" && !prevActivatedAt) {
        update.activatedAt = now;
      }

      // ✅ archivedAt wenn auf archived gesetzt
      if (nextStatus === "archived") {
        update.archivedAt = now;
      }
    }

    if (hasEndResult) {
      // endResult nur setzen, wenn gültig — sonst löschen wir es NICHT (keine Sideeffects)
      if (endResult) update.endResult = endResult;

      // ✅ ADD: Wenn finished → automatisch archivieren (dein Wunsch)
      // (nur wenn endResult gültig gesetzt wurde)
      if (endResult === "finished") {
        update.status = "archived";
        update.archivedAt = now;
      }
    }

    // ✅ ADD: Setup-Game speichern (Improve/Inchworm)
    // Wichtig: wir löschen NICHTS, wenn invalid / undefined reinkommt
    if (hasSetupSelectedIds) {
      const ids = uniqStrings(body.setupSelectedIds);
      if (ids) update.setupSelectedIds = ids;
    }

    if (hasSetupAvgScore) {
      const s = Number(body.setupAvgScore);
      if (Number.isFinite(s)) update.setupAvgScore = s;
    }

    if (hasSetupGrade) {
      if (isGrade(body.setupGrade)) update.setupGrade = body.setupGrade;
    }

    // ✅ ADD: optional mapping fields (für später: unified recap / linking)
    if (hasLinkedTradeId) {
      const v = String(body.linkedTradeId || "").trim();
      if (v) update.linkedTradeId = v;
    }
    if (hasDecision && typeof body.decision === "string") update.decision = body.decision;
    if (hasOutcome && typeof body.outcome === "string") update.outcome = body.outcome;
    if (hasReflection && typeof body.reflection === "string") update.reflection = body.reflection;

    const result = await col.updateOne(
      { _id: setupId, type: "trading_setup_v2", userId },
      { $set: update }
    );

    const saved = await col.findOne({ _id: setupId, type: "trading_setup_v2", userId });

    return res.status(200).json({
      ok: true,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      setup: saved ?? null,
    });
  } catch (err) {
    console.error("Error updating trading setup", err);
    return res.status(500).json({ message: "Internal server error while updating setup." });
  }
}
