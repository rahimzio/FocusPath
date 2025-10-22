// pages/api/_lib/finance.ts
import type { NextApiRequest } from "next";
import type { Db, Document, WithId } from "mongodb";
import { FinanceDoc } from "@/utils/interfaces/finance";

export const FINANCE_COLLECTION = "finance";

export function nowISO() { return new Date().toISOString(); }

export async function insertFinance<T extends FinanceDoc>(db: Db, doc: Omit<T, "createdAt" | "updatedAt">) {
  const withMeta: T = { ...(doc as any), createdAt: nowISO(), updatedAt: nowISO() };
  const r = await db.collection(FINANCE_COLLECTION).insertOne(withMeta as Document);
  return { id: String(r.insertedId), doc: withMeta };
}

export async function updateFinance(db: Db, filter: any, set: any) {
  return db.collection(FINANCE_COLLECTION).updateOne(
    filter,
    { $set: { ...set, updatedAt: nowISO() } }
  );
}

export async function upsertFinance(db: Db, filter: any, set: any, setOnInsert: any = {}) {
  return db.collection(FINANCE_COLLECTION).updateOne(
    filter,
    { $set: { ...set, updatedAt: nowISO() }, $setOnInsert: { ...setOnInsert, createdAt: nowISO() } },
    { upsert: true }
  );
}

export function requireGet(req: NextApiRequest, name: string) {
  const val = req.query[name];
  if (!val || typeof val !== "string") throw new Error(`Missing ${name}`);
  return val;
}

export function ensureNumber(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) throw new Error("Invalid number");
  return x;
}
