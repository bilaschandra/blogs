import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/passwords";
import { createSession, SESSION_COOKIE } from "@/lib/sessions";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username =
    typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "invalid username or password" }, { status: 401 });
  }

  const db = await getDb();
  const user = await db.collection("users").findOne({ username });
  if (!user) {
    return NextResponse.json({ error: "invalid username or password" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "invalid username or password" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user._id);

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
