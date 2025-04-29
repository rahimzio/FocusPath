// pages/api/auth/[...nextauth].ts

import NextAuth, { DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/pages/api/db/mongo";

// TypeScript-Erweiterung für Session (User-ID ergänzen)
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { email, password } = credentials as {
          email: string;
          password: string;
        };

        const emailCleaned = email.trim().toLowerCase();

        const { db } = await connectToDatabase();
        const users = db.collection("users");

        const user = await users.findOne({ email: emailCleaned });

        if (!user) {
          console.warn("❌ Kein Benutzer gefunden:", email);
          return null;
        }

        const bcrypt = require("bcryptjs");
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          console.warn("❌ Falsches Passwort:", email);
          return null;
        }

        console.log("✅ Benutzer erfolgreich authentifiziert:", email);
        return {
          id: user._id.toString(),
          email: user.email,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login/login",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export default handler;
