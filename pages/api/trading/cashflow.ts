// pages/api/trading/cashflow.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ObjectId } from "mongodb";
import { connectToDatabase } from "../db/mongo";

// Alle Cashflows liegen in der Collection "trading" unter recordType: "cashflow"
const COLLECTION = "trading" as const;

type FlowType = "deposit" | "withdrawal";

export interface CashflowDoc {
  _id?: ObjectId;
  recordType: "cashflow";
  userId: string;
  accountId: string;
  flow: FlowType;           // "deposit" | "withdrawal"
  amount: number;           // immer positiv gespeichert
  date: string;             // ISO-Date (z.B. "2025-09-04" oder ISO datetime)
  note?: string;
  createdAt: string;
  updatedAt: string;
}

const toStr = (v: any) => (v === undefined || v === null ? undefined : String(v));
const trim = (v: any) => toStr(v)?.trim() ?? "";
const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const isISODate = (s: string | undefined) => !!s && !Number.isNaN(Date.parse(s));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection(COLLECTION);

    if (req.method === "GET") {
      const { userId, accountId, from, to, limit: limitRaw } = req.query as Record<string, string | undefined>;
      if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });

      const q: any = { recordType: "cashflow", userId };
      if (accountId) q.accountId = accountId;

      // Datumsfilter optional
      if (from || to) {
        q.date = {} as any;
        if (from && isISODate(from)) q.date.$gte = new Date(from).toISOString();
        if (to && isISODate(to)) q.date.$lte = new Date(to).toISOString();
        if (Object.keys(q.date).length === 0) delete q.date;
      }

      const limit = Math.min(Math.max(Number(limitRaw ?? 500), 1), 1000);

      const items = await col
        .find(q)
        .sort({ date: -1, _id: -1 })
        .limit(limit)
        .toArray();

      // Summen berechnen
      let deposits = 0, withdrawals = 0;
      for (const it of items) {
        const amt = Number(it.amount ?? 0);
        if (it.flow === "deposit") deposits += amt;
        else if (it.flow === "withdrawal") withdrawals += amt;
      }

      return res.status(200).json({
        items: items.map((d: any) => ({
          _id: String(d._id),
          userId: d.userId,
          accountId: d.accountId,
          flow: d.flow,
          amount: Number(d.amount),
          date: d.date,
          note: d.note ?? "",
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
        totals: { deposits, withdrawals, net: deposits - withdrawals },
      });
    }

    if (req.method === "POST") {
      const body = req.body ?? {};
      const userId = trim(body.userId);
      const accountId = trim(body.accountId);
      const flow = trim(body.flow) as FlowType;
      const amount = toNum(body.amount);
      const dateRaw = trim(body.date);
      const note = trim(body.note) || undefined;

      if (!userId) return res.status(400).json({ error: "userId ist erforderlich" });
      if (!accountId) return res.status(400).json({ error: "accountId ist erforderlich" });
      if (flow !== "deposit" && flow !== "withdrawal")
        return res.status(400).json({ error: 'flow muss "deposit" oder "withdrawal" sein' });
      if (!Number.isFinite(amount) || amount <= 0)
        return res.status(400).json({ error: "amount muss > 0 sein" });

      const dateISO = isISODate(dateRaw) ? new Date(dateRaw).toISOString() : new Date().toISOString();
      const now = new Date().toISOString();

      const doc: CashflowDoc = {
        recordType: "cashflow",
        userId,
        accountId,
        flow,
        amount: Number(amount),
        date: dateISO,
        note,
        createdAt: now,
        updatedAt: now,
      };

      const r = await col.insertOne(doc);
      return res.status(200).json({ ok: true, id: String(r.insertedId), item: { ...doc, _id: String(r.insertedId) } });
    }

    if (req.method === "DELETE") {
      const id = toStr(req.query.id ?? req.body?.id);
      if (!id) return res.status(400).json({ error: "id ist erforderlich" });
      let _id: ObjectId;
      try { _id = new ObjectId(id); } catch { return res.status(400).json({ error: "id ungültig" }); }

      const r = await col.deleteOne({ _id, recordType: "cashflow" });
      if (r.deletedCount !== 1) return res.status(404).json({ error: "Eintrag nicht gefunden" });
      return res.status(200).json({ ok: true, id });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e: any) {
    console.error("❌ /api/trading/cashflow error:", e);
    return res.status(500).json({ error: e?.message ?? "Internal Server Error" });
  }
}
