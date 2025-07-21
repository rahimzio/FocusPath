import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { hash } from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };
  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Fehlende Daten" });
  }

  const { db } = await connectToDatabase();

  const entry = await db.collection("passwordResets").findOne({ email, code });
  if (!entry || new Date(entry.expiresAt) < new Date()) {
    return res.status(400).json({ message: "Ungültiger oder abgelaufener Code" });
  }

  const users = db.collection("users");
  const hashed = await hash(newPassword, 12);
  await users.updateOne({ email }, { $set: { password: hashed } });
  await db.collection("passwordResets").deleteOne({ email });

  res.status(200).json({ message: "Passwort aktualisiert" });
}