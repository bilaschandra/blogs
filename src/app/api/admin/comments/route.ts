import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

function isAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return Boolean(password) && password === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const pending = await db
    .collection("comments")
    .find({ approved: false })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json(
    pending.map((c) => ({
      id: c._id.toString(),
      slug: c.slug,
      name: c.name,
      text: c.text,
      createdAt: c.createdAt,
    }))
  );
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const action = body?.action;

  if (typeof id !== "string" || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const db = await getDb();

  if (action === "approve") {
    await db.collection("comments").updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: true } }
    );
  } else {
    await db.collection("comments").deleteOne({ _id: new ObjectId(id) });
  }

  return NextResponse.json({ status: "ok" });
}
