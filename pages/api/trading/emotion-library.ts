// pages/api/trading/emotion-library.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";

type Cat = { name: string; items: string[] };

const DEFAULTS: Cat[] = [
  { name: "Angst", items: ["Exit zu früh", "zu früher entry", "Nicht geklickt", "nicht auf bos/cisd gewartet"] },
  { name: "Gier", items: ["Overtrading", "Zu später entry", "zu viele Adds"] },
  { name: "Wut", items: ["Revenge", "Plan ignoriert", "SL verschoben"] },
  { name: "Overconfidence", items: ["Size zu groß", "Kein SL gesetzt"] },
  { name: "Undiszipliniert", items: ["Regelbruch", "Ablenkung", "Impulsiv"] },
];

function sanitizeCategories(raw: any): Cat[] {
  if (!Array.isArray(raw)) return DEFAULTS;
  const out: Cat[] = [];
  for (const c of raw) {
    const name = typeof c?.name === "string" ? c.name.trim() : "";
    if (!name) continue;
    const items = Array.isArray(c?.items)
      ? Array.from(
          new Set(
            c.items
              .map((x: any) => (typeof x === "string" ? x.trim() : ""))
              .filter((s: string) => !!s)
          )
        )
      : [];
    out.push({ name, items: items as string[] });
  }
  // vernünftige Limits gegen Ausreißer
  return out.slice(0, 20).map((c) => ({ ...c, items: c.items.slice(0, 100) }));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.query as { userId?: string };

  try {
    // Standard: Fallback sofort bereit halten
    let categories: Cat[] = DEFAULTS;

    if (userId && typeof userId === "string" && userId.trim()) {
      try {
        const { db } = await connectToDatabase();

        // 1) Versuche, eine benutzerdefinierte Library zu laden
        //    Erwartete Struktur: { userId, categories: Cat[], updatedAt }
        const libCol = db.collection("emotion_library");
        const custom = await libCol.findOne<{ categories?: any }>({ userId });
        if (custom?.categories) {
          categories = sanitizeCategories(custom.categories);
        } else {
          // 2) (Optional) Heuristik: häufige Fehler des Users aus Trades ermitteln
          //    → wenn es keine custom library gibt, fülle „Undiszipliniert“ dynamisch auf
          const trades = db.collection("trading");
          try {
            await trades.createIndex({ userId: 1, type: 1, tradingMistakes: 1 });
          } catch {}
          const topMistakes = await trades
            .aggregate<{ _id: string; count: number }>([
              { $match: { userId, type: "tradeEntry", archived: { $ne: true }, deleted: { $ne: true }, tradingMistakes: { $exists: true, $ne: [] } } },
              { $unwind: "$tradingMistakes" },
              { $group: { _id: "$tradingMistakes", count: { $sum: 1 } } },
              { $sort: { count: -1, _id: 1 } },
              { $limit: 20 },
            ])
            .toArray();

          if (topMistakes.length) {
            const dyn = topMistakes.map((m) => String(m._id)).filter(Boolean);
            const base = sanitizeCategories(DEFAULTS);
            // Hänge an „Undiszipliniert“ an (oder füge eine neue Kategorie hinzu)
            const idx = base.findIndex((c) => c.name.toLowerCase() === "undiszipliniert");
            if (idx >= 0) {
              const merged = Array.from(new Set([...base[idx].items, ...dyn]));
              base[idx] = { ...base[idx], items: merged.slice(0, 100) };
              categories = base;
            } else {
              categories = [...base, { name: "Undiszipliniert", items: dyn }];
            }
          }
        }
      } catch (e) {
        // Bei DB-Problemen einfach auf Defaults zurückfallen
        console.warn("emotion-library DB fallback:", (e as any)?.message);
      }
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ categories });
  } catch (err: any) {
    console.error("❌ /api/trading/emotion-library:", err);
    return res.status(500).json({ error: err?.message ?? "Internal Server Error" });
  }
}
