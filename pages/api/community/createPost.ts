// pages/api/community/createPost.ts
import { NextApiRequest, NextApiResponse } from "next";
import { connectToDatabase } from "../db/mongo";
import { ObjectId } from "mongodb";
import { CommunityPost, PostType, Category } from "@/utils/interfaces/shared";

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

    const ADMIN_EMAIL = "rahimzio11@gmail.com";
    if (
      (type === "update" || type === "survey") &&
      createdBy.toLowerCase() !== ADMIN_EMAIL
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (type === "survey") {
      if (!Array.isArray(options)) {
        return res.status(400).json({ message: "Survey requires options" });
      }
      const validOptions = (options as string[])
        .map((o) => o.trim())
        .filter((o) => o);
      if (validOptions.length < 2) {
        return res.status(400).json({ message: "Survey requires at least two options" });
      }
      req.body.options = validOptions;
    }

    const { db } = await connectToDatabase();

    const surveyOptions =
      type === "survey"
        ? (req.body.options as string[]).map((text: string) => ({
          id: new ObjectId().toString(),
          text,
          votes: [],
        }))
        : undefined;

    const newPost: CommunityPost = {
      _id: new ObjectId(),
      title,
      content,
      type: type as PostType,
      createdBy,
      createdAt: new Date().toISOString(),
      ...(type === "userTopic" ? { category: category as Category, comments: [], likes: [] } : {}),
      ...(type === "survey" ? { options: surveyOptions, likes: [] } : {}),
      ...(type === "update" ? { likes: [] } : {}),
    };

    await db.collection("community").insertOne(newPost);

    return res.status(201).json({
      message: "Post created successfully",
      post: { ...newPost, _id: newPost._id.toString() },
    });  } catch (error) {
    console.error("Error creating community post:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}