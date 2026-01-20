// pages/api/trading/setups/delete.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "@/pages/api/db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed. Use DELETE." });
  }

  try {
    // Body oder Query unterstützen (DELETE kann je nach Client tricky sein)
    const body = (req.body ?? {}) as { userId?: string; setupId?: string };
    const userId = String(body.userId ?? req.query.userId ?? "").trim();
    const setupId = String(body.setupId ?? req.query.setupId ?? "").trim();

    if (!userId || !setupId) {
      return res.status(400).json({ message: "Missing required fields (userId, setupId)." });
    }

    if (!ObjectId.isValid(setupId)) {
      return res.status(400).json({ message: "Invalid setupId." });
    }

    const { db } = await connectToDatabase();
    const col = db.collection("trading");

    const _id = new ObjectId(setupId);

    // Nur Setups löschen (typ-guard)
    const result = await col.deleteOne({
      _id,
      userId,
      type: "trading_setup_v2",
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Setup not found (or not owned by user / wrong type).",
      });
    }

    return res.status(200).json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error("[API setups/delete] ERROR:", err);
    return res.status(500).json({ message: "Internal server error while deleting setup." });
  }
}
