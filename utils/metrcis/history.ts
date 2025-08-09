import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "@/pages/api/db/connectToDatabase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed. Use GET." });
  }

  const { userId, from, to, range } = req.query;
  if (typeof userId !== "string") {
    return res.status(400).json({ message: "Missing userId" });
  }

  try {
    const { db } = await connectToDatabase();
    const appData = db.collection("appData");

    const query: any = { type: "daily_scores", userId };

    if (typeof from === "string" && typeof to === "string") {
      query.date = { $gte: from, $lte: to };
    } else if (typeof range === "string") {
      const days = parseInt(range, 10);
      if (!isNaN(days)) {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days + 1);
        query.date = {
          $gte: start.toISOString().slice(0, 10),
          $lte: end.toISOString().slice(0, 10),
        };
      }
    }

    const data = await appData
      .find(query)
      .sort({ date: 1 })
      .toArray();

    return res.status(200).json(data);
  } catch (err: any) {
    console.error("Error fetching metrics history", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}