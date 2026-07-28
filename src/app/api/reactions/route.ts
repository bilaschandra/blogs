import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const ALLOWED_EMOJI = ["👍", "❤️", "🎉", "🤔"];

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const db = await getDb();
  const docs = await db.collection("reactions").find({ slug }).toArray();
  const result = ALLOWED_EMOJI.map((emoji) => {
    const doc = docs.find((d) => d.emoji === emoji);
    return { emoji, count: doc?.count ?? 0 };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const emoji = body?.emoji;

  if (typeof slug !== "string" || !slug || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: "invalid slug or emoji" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("reactions").findOneAndUpdate(
    { slug, emoji },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return NextResponse.json({ emoji, count: result?.count ?? 1 });
}
