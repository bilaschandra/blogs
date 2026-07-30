import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(user);
}
