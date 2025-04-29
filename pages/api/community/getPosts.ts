// pages/api/community/getPosts.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { CommunityPost } from "@/utils/interface";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { db } = await connectToDatabase();
    const { type } = req.query;

    let filter = {};
    if (type && typeof type === "string") {
      filter = { type };
    }

    const posts = await db
      .collection<CommunityPost>("community")
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({ posts });
  } catch (error) {
    console.error("Error fetching community posts:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}
