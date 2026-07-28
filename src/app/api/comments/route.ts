import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const db = await getDb();
  const comments = await db
    .collection("comments")
    .find({ slug, approved: true })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json(
    comments.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      text: c.text,
      createdAt: c.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (
    typeof slug !== "string" ||
    !slug ||
    name.length < 1 ||
    name.length > 60 ||
    text.length < 1 ||
    text.length > 2000
  ) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("comments").insertOne({
    slug,
    name,
    text,
    createdAt: new Date(),
    approved: false,
  });

  return NextResponse.json({ status: "submitted for review" }, { status: 201 });
}
