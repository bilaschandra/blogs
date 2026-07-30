import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSessionUser } from "@/lib/adminAuth";
import { hashPassword } from "@/lib/passwords";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sessionUser.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const db = await getDb();
  const users = await db
    .collection("users")
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json(
    users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (sessionUser.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "admin" || body?.role === "author" ? body.role : "";

  if (!username || !displayName || !role || password.length < 8) {
    return NextResponse.json(
      { error: "username, displayName, role, and a password of at least 8 characters are required" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne({ username });
  if (existing) {
    return NextResponse.json({ error: "username already taken" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  try {
    await db.collection("users").insertOne({
      username,
      passwordHash,
      displayName,
      role,
      createdAt: new Date(),
    });
  } catch (error) {
    // Handle MongoDB duplicate-key error that can occur in race conditions
    if (error instanceof Error && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "username already taken" }, { status: 400 });
    }
    // Re-throw any other error
    throw error;
  }

  return NextResponse.json({ status: "ok" }, { status: 201 });
}
