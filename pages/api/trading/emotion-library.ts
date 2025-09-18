// pages/api/trading/emotion-library.ts
import type { NextApiRequest, NextApiResponse } from "next";

const DEFAULTS = [
  { name: "Angst", items: ["Exit zu früh","zu früher entry", "Nicht geklickt","nicht auf bos/cisd gewartet"] },
  { name: "Gier", items: ["Overtrading", "Zu später entry", "zu viele Adds"] }, 
  { name: "Wut", items: ["Revenge", "Plan ignoriert", "SL verschoben"] },
  { name: "Overconfidence", items: ["Size zu groß", "Kein SL gesetzt"] },
  { name: "Undiszipliniert", items: ["Regelbruch", "Ablenkung", "Impulsiv"] },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  // Du kannst hier später per userId personalisieren
  return res.status(200).json({ categories: DEFAULTS });
}
