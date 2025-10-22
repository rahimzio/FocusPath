import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { insertFinance } from "@/lib/api/finance";
import { AccountType, FinanceAccount } from "@/utils/interfaces/finance";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Use POST." });

  const { userId, name, provider, type, baseCurrency = "EUR" } = req.body as {
    userId?: string; name?: string; provider?: string; type?: AccountType; baseCurrency?: string;
  };
  if (!userId || !name || !type) return res.status(400).json({ message: "Missing userId/name/type" });

  try {
    const { db } = await connectToDatabase();
    const doc: Omit<FinanceAccount, "createdAt" | "updatedAt"> = {
      kind: "account", userId, name: name.trim(), provider: provider?.trim(),
      type, baseCurrency,
    };
    const r = await insertFinance(db, doc);
    res.status(201).json({ ok: true, id: r.id });
  } catch (e) {
    console.error("createAccount", e);
    res.status(500).json({ message: "Internal server error" });
  }
}
