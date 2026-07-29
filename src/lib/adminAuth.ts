import { NextRequest } from "next/server";

export function isAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return Boolean(password) && password === process.env.ADMIN_PASSWORD;
}
