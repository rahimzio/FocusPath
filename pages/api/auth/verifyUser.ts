import { NextApiRequest, NextApiResponse } from "next";

// Für Testing: akzeptiere nur 1 festen Benutzer
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body;

  if (email === "test@example.com" && password === "pass1234") {
    return res.status(200).json({
      id: "demo-user-id",
      name: "Test User",
      email,
    });
  }

  return res.status(401).json({ message: "Invalid credentials" });
}
