// pages/api/auth/register.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import { connectToDatabase } from "@/pages/api/db/mongo";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { email, password, userName} = req.body;

  console.log("📨 Request empfangen:", { email, passwordMasked: password?.length ? "*".repeat(password.length) : null });

  const emailCleaned = email.trim().toLowerCase();

  if (!email || !password || password.length < 6) {
    console.warn("⚠️ Ungültige Eingabe:", { emailValid: !!email, passwordLength: password?.length });
    return res.status(400).json({
      message: "Ungültige Eingabe. Passwort muss mindestens 6 Zeichen lang sein.",
    });
  }

  try {
    const { db } = await connectToDatabase();
    console.log("🧭 Verwende Datenbank:", db.databaseName);

    const users = db.collection("users");

    const existingUser = await users.findOne({ email: emailCleaned });

    if (existingUser) {
      console.warn("⚠️ Benutzer existiert bereits:", email);
      return res.status(400).json({ message: "Benutzer existiert bereits." });
    }

    const existingUserName = await users.findOne({ email: userName });

    if(existingUserName){
      console.warn("⚠️ Benutzer Name existiert bereits:", userName);
      return res.status(400).json({ message: "Benutzer Name existiert bereits." });
    }

    const hashedPassword = await hash(password, 12);
    const result = await users.insertOne({
      email: emailCleaned,
      password: hashedPassword,
      userName: userName,
      createdAt: new Date().toISOString(),
    });

    const insertedUserId = result.insertedId.toString();

    console.log("✅ Benutzer erfolgreich registriert:", email, "→ ID:", insertedUserId);

    // 🧩 Erstelle Initialeintrag in appData mit gültigem Shard Key (userId)
    const insertedUserId1 = result.insertedId.toString();
    await db.collection("appData").insertOne({
      type: "userConfig",
      userId: insertedUserId1,
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return res.status(201).json({
      message: "Benutzer erfolgreich registriert.",
      userId: result.insertedId.toString(),
    });
  } catch (err: any) {
    console.error("❌ Fehler bei der Registrierung:", err);
    return res.status(500).json({ message: "Serverfehler bei der Registrierung." });
  }
}
