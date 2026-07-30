import { NextRequest } from "next/server";
import { getUserByToken, SESSION_COOKIE } from "./sessions";
import type { SessionUser } from "./types";

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(token);
}
