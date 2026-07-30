import crypto from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { SessionUser, UserRole } from "./types";

export const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(userId: ObjectId): Promise<{ token: string; expiresAt: Date }> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.collection("sessions").insertOne({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function getUserByToken(token: string): Promise<SessionUser | null> {
  const db = await getDb();
  const session = await db
    .collection("sessions")
    .findOne({ token, expiresAt: { $gt: new Date() } });
  if (!session) return null;

  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) return null;

  return {
    userId: user._id.toString(),
    username: user.username,
    displayName: user.displayName,
    role: user.role as UserRole,
  };
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  await db.collection("sessions").deleteOne({ token });
}
