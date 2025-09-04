import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { FINANCE_COLLECTION } from "@/lib/api/finance";

const DEBUG = String(process.env.DEBUG_FINANCE) === "1";

const CATEGORY_SLUGS = new Set(["invest","funmoney","bills","ungeplante_rechnung"]);

function normalizeCategory(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim().toLowerCase().replace(/\s+/g, "_");
  // erlaubte Varianten abfangen
  const map: Record<string,string> = {
    invest: "invest",
    investment: "invest",
    funmoney: "funmoney",
    bills: "bills",
    rechnungen: "bills",
    "ungeplante_rechnung": "ungeplante_rechnung",
    "ungeplante-rechnung": "ungeplante_rechnung",
    "ungeplante": "ungeplante_rechnung",
  };
  const slug = map[s] || s;
  return CATEGORY_SLUGS.has(slug) ? slug : null;
}

function toISODate(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();

  // already ISO-ish YYYY-MM-DD
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m1) return new Date(`${m1[1]}-${m1[2]}-${m1[3]}T00:00:00.000Z`).toISOString();

  // german DD.MM.YYYY
  const m2 = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
  if (m2) return new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00.000Z`).toISOString();

  // full date string parse (fallback)
  const t = new Date(s);
  return isNaN(t.getTime()) ? null : t.toISOString();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });

  try {
    const body = (req.body || {}) as any;
    if (DEBUG) console.log("[addExpense] raw body:", body);

    const userId = String(body.userId || "").trim();
    const amountNum = typeof body.amount === "number" ? body.amount : Number(String(body.amount || "").replace(",", "."));
    const dueDateISO = toISODate(body.dueDate ?? body.date);
    const category = normalizeCategory(body.category);
    const note = (body.note ?? "").toString().trim() || null;

    if (!userId || !(amountNum > 0) || !dueDateISO || !category) {
      if (DEBUG) console.warn("[addExpense] validation failed", {
        userIdOk: !!userId, amountNum, dueDateISO, category
      });
      return res.status(400).json({ message: "Missing/invalid userId/amount/dueDate/category" });
    }

    const doc = {
      kind: "expense",
      userId,
      amount: amountNum,
      category,                // slug für Filters
      dueDate: dueDateISO,     // normalisiert
      note,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { db } = await connectToDatabase();
    const r = await db.collection(FINANCE_COLLECTION).insertOne(doc);
    if (DEBUG) console.log("[addExpense] inserted", r.insertedId.toString(), doc);

    return res.status(201).json({ ok: true, id: r.insertedId.toString() });
  } catch (e) {
    console.error("[addExpense] ERROR", e);
    return res.status(500).json({ message: "Internal server error" });
  }
}
