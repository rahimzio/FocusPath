// pages/api/trading/strategies/create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../../db/connectToDatabase";
import { getTradingCollection } from "../../db/mongo";

/** Regex-escape für exakten, case-insensitiven Namen-Duplikatcheck */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeColor(input?: string): string | undefined {
  if (!input) return undefined;
  const s = String(input).trim();
  // Erlaube #RGB oder #RRGGBB (mit/ohne '#'), normalisiere auf '#RRGGBB'
  const re = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  if (!re.test(s)) return undefined;
  const hex = s.startsWith("#") ? s.slice(1) : s;
  const long = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  return `#${long.toUpperCase()}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await connectToDatabase();
    const col = await getTradingCollection(db); // immer bestehende "trading"-Collection

    const body = req.body ?? {};
    const userId = String(body.userId || "").trim();
    const nameRaw = String(body.name || "").trim();

    if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
    if (!nameRaw) return res.status(400).json({ error: "name ist erforderlich" });

    // Normalisierung
    const name = nameRaw;
    const description = body.description ? String(body.description).trim() : undefined;
    const tag_color = normalizeColor(body.tag_color);

    // Case-insensitiver Duplikatcheck (z. B. "Uni" == "uni"), aber exakt auf den Namen
    const nameRegex = new RegExp(`^${escapeRegex(name)}$`, "i");
    const dup = await col.findOne({
      type: "strategy",
      userId,
      name: { $regex: nameRegex },
      archived: { $ne: true },
      deleted: { $ne: true },
    });
    if (dup) {
      return res.status(409).json({ error: "Strategie mit diesem Namen existiert bereits." });
    }

    const now = new Date().toISOString();
    const doc = {
      type: "strategy" as const,
      userId,
      name,
      description,
      tag_color,
      createdAt: now,
      updatedAt: now,
      archived: false,
      deleted: false,
    };

    const result = await col.insertOne(doc);

    return res.status(201).json({
      ok: true,
      strategy: { ...doc, _id: String(result.insertedId) },
    });
  } catch (err: any) {
    console.error("❌ /api/trading/strategies/create:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
