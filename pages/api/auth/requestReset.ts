import type { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/mongo";
import { randomBytes } from "crypto";
import { Resend } from "resend";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Nur POST erlaubt" });
  }

  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ message: "E-Mail fehlt" });
  }

  const { db } = await connectToDatabase();
  const users = db.collection("users");
  const user = await users.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return res.status(404).json({ message: "Kein Benutzer gefunden" });
  }

  const code = randomBytes(3).toString("hex");
  await db.collection("passwordResets").updateOne(
    { email },
    { $set: { code, expiresAt: new Date(Date.now() + 1000 * 60 * 15) } },
    { upsert: true }
  );

  const resend = new Resend(process.env.RESEND_API_KEY || "");
 await resend.emails.send({
    from: process.env.EMAIL_FROM || "",
    to: email,
    subject: "Password Reset",
    text: `Dein Bestätigungscode: ${code}`,
  });

  res.status(200).json({ message: "Code gesendet" });
}