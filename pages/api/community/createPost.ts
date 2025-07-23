// pages/api/community/createPost.ts
import { NextApiRequest, NextApiResponse } from "next";
import { Category, CommunityPost, PostType, PollOption  } from "@/utils/interface";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { title, content, type, createdBy, category, options } = req.body;

    // Validation
    if (!title || !content || !type || !createdBy) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!["update", "survey", "userTopic"].includes(type)) {
      return res.status(400).json({ message: "Invalid post type" });
    }

    if (type === "userTopic" && !category) {
      return res.status(400).json({ message: "Category required for userTopic" });
    }

        const ADMIN_EMAIL = "Rahimzio11@gmail.com";
    if ((type === "update" || type === "survey") && createdBy !== ADMIN_EMAIL) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (type === "survey" && (!Array.isArray(options) || options.length < 2)) {
      return res.status(400).json({ message: "Survey requires at least two options" });
    }

    const { db } = await connectToDatabase();

    const newPost: CommunityPost = {
      _id: new ObjectId(),
      title,
      content,
      type: type as PostType,
      createdBy,
      createdAt: new Date().toISOString(),
            ...(type === "userTopic" ? { category: category as Category, comments: [], likes: [] } : {}),
      ...(type === "survey"
        ? {
            options: (options as string[]).map((text: string) => ({
              id: new ObjectId().toString(),
              text,
              votes: [],
            })) as PollOption[],
            likes: [],
          }
        : {}),
      ...(type === "update" ? { likes: [] } : {}),
    };

    await db.collection("community").insertOne(newPost);

    return res.status(201).json({ message: "Post created successfully", post: newPost });
  } catch (error) {
    console.error("Error creating community post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}