# Real Admin Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single shared `ADMIN_PASSWORD` (`x-admin-password` header) with real per-user username/password login: a MongoDB `users` collection (bcrypt-hashed passwords, `admin`/`author` roles) and DB-backed session cookies, gating every existing admin page/route.

**Architecture:** `bcryptjs` for password hashing, opaque session tokens stored in a new `sessions` collection (MongoDB TTL index auto-expires them) and set as an httpOnly cookie. A shared `getSessionUser(request)` helper (replacing today's `isAuthorized`) is called directly inside every admin API route handler — same pattern this codebase already uses, just resolving a real user instead of a boolean. Every admin page keeps its existing "client component checks auth on mount" structure, swapping the old password-prompt UI for a shared `useAdminSession` hook that calls a new `GET /api/auth/me` and redirects to `/admin/login` on `401`.

**Tech Stack:** Next.js 14 (App Router) Route Handlers (Node.js runtime), MongoDB, `bcryptjs`, Node's built-in `crypto` for token generation.

## Global Constraints

- No new signing secret / env var is needed — sessions are opaque random tokens validated by DB lookup, not signed JWTs. `ADMIN_PASSWORD` is fully removed (no transition period), per the spec.
- **`src/middleware.ts` is intentionally NOT part of this plan**, despite being mentioned in the spec's Architecture section. Next.js 14.2's Middleware runs on the Edge Runtime, which cannot load the `mongodb` driver or `bcryptjs` (both need Node.js APIs) — so it cannot do a real DB-backed session/role check. Every existing admin page in this codebase already does its own client-side "check auth on mount, show login if not" — this plan keeps that exact pattern (via a shared `useAdminSession` hook) and does role/session enforcement in the Node.js-runtime API routes and page components instead. This produces the exact same user-facing behavior the spec describes (redirect to login if not authed, block non-admins from admin-only pages) without hitting the Edge Runtime limitation.
- Comment moderation (`/admin/comments`, `/api/admin/comments`) and the new `/admin/users`/`/api/admin/users` are **admin-only**. The post CMS (`/admin/posts*`, `/api/admin/posts*`) requires **any logged-in user** (admin or author) — per-post ownership is explicitly out of scope until the (separate, future) storage migration spec adds an `author` field to posts.
- Login failures (unknown username OR wrong password) both return the identical `401 {"error": "invalid username or password"}` — never reveal which one was wrong.
- New users can only be created via the admin-only `/admin/users` page/API, or via the one-time bootstrap CLI script this plan adds (`scripts/create-admin.mjs`) — there is no public signup. The bootstrap script is the only way to create the very first account (a fresh `/admin/users` page requires already being logged in as an admin).
- No automated test suite for this project — every task's testable deliverable is manual verification (curl with a cookie jar, and the browser), matching this project's established convention.
- Local dev's `DATABASE_URL` points at the local Docker MongoDB (`mongodb://127.0.0.1:27017/bilas_mongo_db`), confirmed already running — all verification steps below create real test accounts there, not against production Atlas.

---

## File Structure

```
src/lib/passwords.ts                    # create: hashPassword, verifyPassword (bcryptjs wrapper)
src/lib/sessions.ts                      # create: createSession, getUserByToken, deleteSession, SESSION_COOKIE
src/lib/adminAuth.ts                     # modify: replace isAuthorized(boolean) with getSessionUser(request): Promise<SessionUser|null>
src/lib/types.ts                         # modify: add UserRole, SessionUser types
src/lib/mongodb.ts                       # modify: ensureIndexes adds users.username unique index, sessions.token unique index, sessions.expiresAt TTL index
src/lib/useAdminSession.ts               # create: shared client hook — fetches /api/auth/me, redirects to /admin/login on 401
scripts/create-admin.mjs                 # create: one-time/ongoing CLI to bootstrap user accounts directly against MongoDB
src/app/api/auth/login/route.ts          # create: POST — verify credentials, create session, set cookie
src/app/api/auth/logout/route.ts         # create: POST — delete session, clear cookie
src/app/api/auth/me/route.ts             # create: GET — current session user or 401
src/app/api/admin/users/route.ts         # create: GET (list, admin-only), POST (create, admin-only)
src/app/api/admin/comments/route.ts      # modify: getSessionUser + admin-role check (was isAuthorized boolean)
src/app/api/admin/posts/route.ts         # modify: getSessionUser, any logged-in user (was isAuthorized boolean)
src/app/api/admin/posts/[slug]/route.ts  # modify: getSessionUser, any logged-in user (was isAuthorized boolean)
src/app/admin/login/page.tsx             # create: username/password login form
src/app/admin/users/page.tsx             # create: admin-only user list + create form
src/app/admin/comments/page.tsx          # modify: useAdminSession + admin-role gate, drop password state/header, add logout
src/app/admin/posts/page.tsx             # modify: useAdminSession, drop password state/header, add logout
src/app/admin/posts/new/page.tsx         # modify: useAdminSession, drop password prop
src/app/admin/posts/[slug]/edit/page.tsx # modify: useAdminSession, drop password prop
src/components/PostForm.tsx              # modify: remove `password` prop and x-admin-password header (cookie sent automatically)
src/lib/adminSession.ts                  # delete: sessionStorage password cache, superseded by real cookies
src/components/Footer.tsx                # modify: add "Admin" link to /admin/login
package.json                             # modify: add bcryptjs + @types/bcryptjs, add "create-admin" script
.env.local.example                       # modify: remove ADMIN_PASSWORD (no longer read by any code)
README.md                                # modify: replace ADMIN_PASSWORD docs with login/roles/bootstrap docs
```

---

### Task 1: Password hashing, sessions core, and Mongo indexes

**Files:**
- Create: `src/lib/passwords.ts`
- Create: `src/lib/sessions.ts`
- Modify: `src/lib/adminAuth.ts` (full replacement)
- Modify: `src/lib/types.ts`
- Modify: `src/lib/mongodb.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `getDb()` (`src/lib/mongodb.ts`, already exists).
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, hash: string): Promise<boolean>` (`passwords.ts`); `createSession(userId: ObjectId): Promise<{token: string; expiresAt: Date}>`, `getUserByToken(token: string): Promise<SessionUser | null>`, `deleteSession(token: string): Promise<void>`, `SESSION_COOKIE: string` (`sessions.ts`); `getSessionUser(request: NextRequest): Promise<SessionUser | null>` (`adminAuth.ts`) — used by every API route in Tasks 2-4; `UserRole = "admin" | "author"`, `SessionUser = {userId, username, displayName, role}` (`types.ts`) — used everywhere a session user is passed around, including the client-side hook in Task 3.

- [ ] **Step 1: Add the bcryptjs dependency**

Modify `package.json`: add to `dependencies`:

```json
"bcryptjs": "^2.4.3",
```

and to `devDependencies`:

```json
"@types/bcryptjs": "^2.4.6",
```

Run:

```bash
npm install
```

- [ ] **Step 2: Add SessionUser/UserRole types**

Modify `src/lib/types.ts`, adding at the end:

```ts
export type UserRole = "admin" | "author";

export type SessionUser = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};
```

- [ ] **Step 3: Create the password hashing wrapper**

Create `src/lib/passwords.ts`:

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Create the sessions module**

Create `src/lib/sessions.ts`:

```ts
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
```

- [ ] **Step 5: Replace adminAuth.ts**

Modify `src/lib/adminAuth.ts` — replace its entire contents with:

```ts
import { NextRequest } from "next/server";
import { getUserByToken, SESSION_COOKIE } from "./sessions";
import type { SessionUser } from "./types";

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(token);
}
```

- [ ] **Step 6: Add the new Mongo indexes**

Modify `src/lib/mongodb.ts`'s `ensureIndexes` function — it currently reads:

```ts
async function ensureIndexes(db: Db): Promise<void> {
  await db
    .collection("reactions")
    .createIndex({ slug: 1, emoji: 1 }, { unique: true });
}
```

Change it to:

```ts
async function ensureIndexes(db: Db): Promise<void> {
  await db
    .collection("reactions")
    .createIndex({ slug: 1, emoji: 1 }, { unique: true });
  await db.collection("users").createIndex({ username: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
```

(`expireAfterSeconds: 0` on a `Date` field makes this a TTL index: MongoDB automatically deletes a session document once its `expiresAt` timestamp passes — no cleanup job needed.)

- [ ] **Step 7: Verify — real MongoDB round trip for hashing, sessions, and indexes**

Create a temporary script `scripts/verify-auth-core.mjs`:

```js
import { ObjectId } from "mongodb";
import { getDb } from "../src/lib/mongodb.ts";
import { hashPassword, verifyPassword } from "../src/lib/passwords.ts";
import { createSession, getUserByToken, deleteSession } from "../src/lib/sessions.ts";

const db = await getDb();

// Password hashing
const hash = await hashPassword("correct-horse-battery-staple");
console.log("Hash looks like bcrypt:", hash.startsWith("$2"));
console.log("Correct password verifies:", await verifyPassword("correct-horse-battery-staple", hash));
console.log("Wrong password rejected:", !(await verifyPassword("wrong-password", hash)));

// Indexes exist
const userIndexes = await db.collection("users").indexes();
const sessionIndexes = await db.collection("sessions").indexes();
console.log("users has unique username index:", userIndexes.some((i) => i.key.username === 1 && i.unique));
console.log("sessions has unique token index:", sessionIndexes.some((i) => i.key.token === 1 && i.unique));
console.log("sessions has TTL index on expiresAt:", sessionIndexes.some((i) => i.key.expiresAt === 1 && i.expireAfterSeconds === 0));

// Session lifecycle against a fake user id (no real user needed for this check)
const fakeUserId = new ObjectId();
await db.collection("users").insertOne({
  _id: fakeUserId,
  username: "verify-temp-user",
  passwordHash: "unused",
  displayName: "Verify Temp",
  role: "author",
  createdAt: new Date(),
});

const { token } = await createSession(fakeUserId);
const found = await getUserByToken(token);
console.log("Session resolves to correct user:", found?.username === "verify-temp-user" && found.role === "author");

const bogus = await getUserByToken("not-a-real-token");
console.log("Bogus token returns null:", bogus === null);

await deleteSession(token);
const afterDelete = await getUserByToken(token);
console.log("Token invalid after logout:", afterDelete === null);

// Clean up
await db.collection("users").deleteOne({ _id: fakeUserId });

process.exit(0);
```

Run it (against your local Docker MongoDB):

```bash
node --env-file=.env.local ./node_modules/.bin/tsx scripts/verify-auth-core.mjs
```

Expected: every line prints `true`.

Delete `scripts/verify-auth-core.mjs` once confirmed.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/passwords.ts src/lib/sessions.ts src/lib/adminAuth.ts src/lib/types.ts src/lib/mongodb.ts
git commit -m "Add password hashing, session core, and users/sessions indexes"
```

---

### Task 2: Bootstrap script + login/logout/me API routes

**Files:**
- Create: `scripts/create-admin.mjs`
- Modify: `package.json` (add `create-admin` script)
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword` (`src/lib/passwords.ts`), `createSession`/`deleteSession`/`SESSION_COOKIE` (`src/lib/sessions.ts`), `getSessionUser` (`src/lib/adminAuth.ts`) — all from Task 1.
- Produces: `POST /api/auth/login` (body `{username, password}` → `200 {status:"ok"}` + sets cookie, or `401 {error: "invalid username or password"}`); `POST /api/auth/logout` (→ `200 {status:"ok"}`, clears cookie); `GET /api/auth/me` (→ `200 SessionUser` or `401 {error:"unauthorized"}`) — consumed by Task 3's `useAdminSession` hook and every admin page in Task 4.

- [ ] **Step 1: Create the bootstrap CLI script**

Create `scripts/create-admin.mjs`:

```js
import { getDb } from "../src/lib/mongodb.ts";
import { hashPassword } from "../src/lib/passwords.ts";

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

const { username, password, displayName, role } = parseArgs();

if (!username || !password || !displayName || !role) {
  console.error(
    'Usage: npm run create-admin -- --username=<u> --password=<p> --displayName="<name>" --role=admin|author'
  );
  process.exit(1);
}

if (role !== "admin" && role !== "author") {
  console.error(`Invalid role "${role}" — must be "admin" or "author"`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const normalizedUsername = username.trim().toLowerCase();

const db = await getDb();
const existing = await db.collection("users").findOne({ username: normalizedUsername });
if (existing) {
  console.error(`Username "${normalizedUsername}" already exists`);
  process.exit(1);
}

const passwordHash = await hashPassword(password);
await db.collection("users").insertOne({
  username: normalizedUsername,
  passwordHash,
  displayName,
  role,
  createdAt: new Date(),
});

console.log(`Created ${role} user "${normalizedUsername}"`);
process.exit(0);
```

- [ ] **Step 2: Add the npm script alias**

Modify `package.json`'s `scripts` block, adding:

```json
"create-admin": "tsx scripts/create-admin.mjs"
```

- [ ] **Step 3: Create the login route**

Create `src/app/api/auth/login/route.ts`:

```ts
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
```

- [ ] **Step 4: Create the logout route**

Create `src/app/api/auth/logout/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/sessions";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ status: "ok" });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
  return response;
}
```

- [ ] **Step 5: Create the "current user" route**

Create `src/app/api/auth/me/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(user);
}
```

- [ ] **Step 6: Verify — bootstrap two test accounts, then exercise the full login/me/logout cycle with a cookie jar**

```bash
npm run dev
```

In another terminal, create a test admin and a test author:

```bash
npm run create-admin -- --username=qa-admin --password=TestPassword123 --displayName="QA Admin" --role=admin
npm run create-admin -- --username=qa-author --password=TestPassword123 --displayName="QA Author" --role=author
```

Expected: both print `Created admin user "qa-admin"` / `Created author user "qa-author"`. Run either command again with the same username — expect `Username "qa-admin" already exists`.

Wrong password:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qa-admin","password":"wrong-password"}'
```

Expected: `401 {"error":"invalid username or password"}`.

Unknown username (same generic message):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"does-not-exist","password":"whatever123"}'
```

Expected: `401 {"error":"invalid username or password"}` — identical message to the wrong-password case above.

Correct login, using a cookie jar so the session cookie persists across requests:

```bash
curl -s -c /tmp/qa-admin-cookies.txt -w "\nHTTP %{http_code}\n" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"qa-admin","password":"TestPassword123"}'
```

Expected: `200 {"status":"ok"}`, and `/tmp/qa-admin-cookies.txt` now contains a `session_token` cookie.

Check identity:

```bash
curl -s -b /tmp/qa-admin-cookies.txt http://localhost:3000/api/auth/me
```

Expected: `{"userId":"...","username":"qa-admin","displayName":"QA Admin","role":"admin"}`.

No cookie at all:

```bash
curl -s -w "\nHTTP %{http_code}\n" http://localhost:3000/api/auth/me
```

Expected: `401 {"error":"unauthorized"}`.

Logout, then confirm the session is really gone:

```bash
curl -s -b /tmp/qa-admin-cookies.txt -c /tmp/qa-admin-cookies.txt -X POST http://localhost:3000/api/auth/logout
curl -s -w "\nHTTP %{http_code}\n" -b /tmp/qa-admin-cookies.txt http://localhost:3000/api/auth/me
```

Expected: logout returns `{"status":"ok"}`; the follow-up `/api/auth/me` now returns `401` even though the cookie file still has the (now-deleted) token — confirming logout actually deletes the server-side session, not just clears the client cookie.

Clean up the cookie jar file:

```bash
rm -f /tmp/qa-admin-cookies.txt
```

(Leave the `qa-admin` and `qa-author` accounts in place — later tasks reuse them.)

- [ ] **Step 7: Commit**

```bash
git add scripts/create-admin.mjs package.json src/app/api/auth
git commit -m "Add bootstrap script and login/logout/me API routes"
```

---

### Task 3: Admin users management (API + shared session hook + page)

**Files:**
- Create: `src/lib/useAdminSession.ts`
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/app/admin/users/page.tsx`

**Interfaces:**
- Consumes: `GET /api/auth/me` (Task 2, via `fetch`), `getSessionUser` (Task 1), `hashPassword` (Task 1), `SessionUser` (Task 1).
- Produces: `useAdminSession(): {user: SessionUser | null; loading: boolean}` (`useAdminSession.ts`) — every admin page in this task and Task 4 uses this exact hook; `GET /api/admin/users` → `200 {id, username, displayName, role, createdAt}[]` (admin-only); `POST /api/admin/users` body `{username, displayName, password, role}` → `201 {status:"ok"}` (admin-only).

- [ ] **Step 1: Create the shared client-side session hook**

Create `src/lib/useAdminSession.ts`:

```ts
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { SessionUser } from "./types";

export function useAdminSession(): { user: SessionUser | null; loading: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me").then(async (res) => {
      if (cancelled) return;
      if (res.status === 401) {
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      const data: SessionUser = await res.json();
      setUser(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [router, pathname]);

  return { user, loading };
}
```

- [ ] **Step 2: Create the admin users API route**

Create `src/app/api/admin/users/route.ts`:

```ts
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
  await db.collection("users").insertOne({
    username,
    passwordHash,
    displayName,
    role,
    createdAt: new Date(),
  });

  return NextResponse.json({ status: "ok" }, { status: 201 });
}
```

- [ ] **Step 3: Create the admin-only Manage Users page**

Create `src/app/admin/users/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/useAdminSession";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "author";
  createdAt: string;
};

export default function AdminUsersPage() {
  const { user, loading } = useAdminSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "author">("author");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/users").then(async (res) => {
      if (res.ok) setUsers(await res.json());
    });
  }, [user]);

  if (loading || !user) return null;

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p>You don&apos;t have access to this page.</p>
      </main>
    );
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password, role }),
    });

    if (res.ok) {
      setUsername("");
      setDisplayName("");
      setPassword("");
      setRole("author");
      const listRes = await fetch("/api/admin/users");
      if (listRes.ok) setUsers(await listRes.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create user");
    }
    setCreating(false);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Users ({users.length})</h1>
      <ul className="mt-6 space-y-2">
        {users.map((u) => (
          <li key={u.id} className="border-b border-gray-200 pb-2">
            <span className="font-semibold">{u.displayName}</span>{" "}
            <span className="text-sm text-gray-500">
              @{u.username} — {u.role}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-bold">Add a user</h2>
      <form onSubmit={createUser} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Display name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "author")}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="author">Author</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create user"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </main>
  );
}
```

Note: this page will redirect to `/admin/login` (via `useAdminSession`) until Task 4 creates that page — that's expected for now; full click-through verification of this page happens once Task 4 lands. This step's verification below uses `curl` directly against the API instead.

- [ ] **Step 4: Verify — role gating on the users API, via curl with cookie jars for both test accounts**

```bash
npm run dev
```

Log in as both test accounts from Task 2 (fresh cookie jars):

```bash
curl -s -c /tmp/qa-admin-cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"qa-admin","password":"TestPassword123"}'
curl -s -c /tmp/qa-author-cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" -d '{"username":"qa-author","password":"TestPassword123"}'
```

Author tries to list users (expect `403`):

```bash
curl -s -w "\nHTTP %{http_code}\n" -b /tmp/qa-author-cookies.txt http://localhost:3000/api/admin/users
```

Admin lists users (expect `200`, includes `qa-admin` and `qa-author`):

```bash
curl -s -b /tmp/qa-admin-cookies.txt http://localhost:3000/api/admin/users
```

Admin creates a third user:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST -b /tmp/qa-admin-cookies.txt http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"username":"qa-third","displayName":"QA Third","password":"TestPassword123","role":"author"}'
```

Expected: `201 {"status":"ok"}`. Re-run the same create request — expect `400 {"error":"username already taken"}`.

Confirm the stored record never exposes the password hash:

```bash
curl -s -b /tmp/qa-admin-cookies.txt http://localhost:3000/api/admin/users | grep -o "passwordHash"
```

Expected: no output (the field isn't present in the response at all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/useAdminSession.ts src/app/api/admin/users src/app/admin/users
git commit -m "Add admin-only user management API and page"
```

---

### Task 4: Migrate existing admin pages and API routes to session auth

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Modify: `src/app/api/admin/comments/route.ts`
- Modify: `src/app/api/admin/posts/route.ts`
- Modify: `src/app/api/admin/posts/[slug]/route.ts`
- Modify: `src/app/admin/comments/page.tsx`
- Modify: `src/app/admin/posts/page.tsx`
- Modify: `src/app/admin/posts/new/page.tsx`
- Modify: `src/app/admin/posts/[slug]/edit/page.tsx`
- Modify: `src/components/PostForm.tsx`
- Delete: `src/lib/adminSession.ts`

**Interfaces:**
- Consumes: `useAdminSession` (Task 3), `getSessionUser` (Task 1), `POST /api/auth/login`/`/logout` (Task 2).
- Produces: nothing new consumed by later tasks — this is the last code task before final wiring (Task 5).

- [ ] **Step 1: Create the login page**

Create `src/app/admin/login/page.tsx`:

```tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const next = searchParams.get("next") || "/admin/posts";
      router.push(next);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "invalid username or password");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {submitting ? "Logging in..." : "Log in"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-bold">Admin login</h1>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
```

(`useSearchParams()` requires a `<Suspense>` boundary in the Next.js App Router — without it, `next build` emits a de-opt warning for this route.)

- [ ] **Step 2: Migrate the comments admin route to session auth (admin-only)**

Modify `src/app/api/admin/comments/route.ts` — replace the import and both auth checks. It currently starts:

```ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { isAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  ...
```

Change the import to:

```ts
import { getSessionUser } from "@/lib/adminAuth";
```

Replace the `GET` function's auth check with:

```ts
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  ...
```

(keep the rest of the function body unchanged). Do the identical replacement in the `PATCH` function.

- [ ] **Step 3: Migrate the posts CMS routes to session auth (any logged-in user)**

Modify `src/app/api/admin/posts/route.ts`: replace `import { isAuthorized } from "@/lib/adminAuth";` with `import { getSessionUser } from "@/lib/adminAuth";`, and replace each of the two `if (!isAuthorized(request)) { ... }` blocks (in `GET` and `POST`) with:

```ts
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
```

Modify `src/app/api/admin/posts/[slug]/route.ts`: same replacement — swap the import and all three `if (!isAuthorized(request))` blocks (in `GET`, `PUT`, `DELETE`) for the `getSessionUser` check above. No role check needed here (any logged-in user, per this plan's scope boundary).

- [ ] **Step 4: Migrate the comments admin page**

Modify `src/app/admin/comments/page.tsx` — replace its entire contents with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/useAdminSession";

type PendingComment = {
  id: string;
  slug: string;
  name: string;
  text: string;
  createdAt: string;
};

export default function AdminCommentsPage() {
  const { user, loading } = useAdminSession();
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/comments").then(async (res) => {
      if (res.ok) setComments(await res.json());
    });
  }, [user]);

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError(`Failed to ${action} comment`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (loading || !user) return null;

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p>You don&apos;t have access to this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pending comments ({comments.length})</h1>
        <button onClick={logout} className="text-sm text-gray-500 underline">
          Log out
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-6">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-gray-200 pb-4">
            <p className="text-sm text-gray-500">
              {c.slug} — {c.name}
            </p>
            <p className="mt-1">{c.text}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(c.id, "approve")}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white"
              >
                Approve
              </button>
              <button
                onClick={() => act(c.id, "reject")}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 5: Migrate the posts list page**

Modify `src/app/admin/posts/page.tsx` — replace its entire contents with:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminSession } from "@/lib/useAdminSession";

type PostSummary = { slug: string; title: string; date: string; tags: string[] };

export default function AdminPostsPage() {
  const { user, loading } = useAdminSession();
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/posts").then(async (res) => {
      if (res.ok) setPosts(await res.json());
    });
  }, [user]);

  async function remove(slug: string) {
    const getRes = await fetch(`/api/admin/posts/${slug}`);
    if (!getRes.ok) {
      setError("Failed to load post for deletion");
      return;
    }
    const { sha } = await getRes.json();
    const res = await fetch(`/api/admin/posts/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha }),
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete post");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Posts ({posts.length})</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/posts/new" className="rounded bg-uber-black px-3 py-1.5 text-sm text-white">
            New Post
          </Link>
          <button onClick={logout} className="text-sm text-gray-500 underline">
            Log out
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="border-b border-gray-200 pb-4">
            <p className="font-semibold">{p.title}</p>
            <p className="text-sm text-gray-500">
              {p.date} — {p.tags.join(", ")}
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href={`/admin/posts/${p.slug}/edit`}
                className="rounded bg-gray-200 px-3 py-1 text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => remove(p.slug)}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 6: Migrate the new-post page**

Modify `src/app/admin/posts/new/page.tsx` — replace its entire contents with:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { useAdminSession } from "@/lib/useAdminSession";

export default function NewPostPage() {
  const router = useRouter();
  const { user, loading } = useAdminSession();

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">New post</h1>
      <PostForm mode="create" onSaved={() => router.push("/admin/posts")} />
    </main>
  );
}
```

- [ ] **Step 7: Migrate the edit-post page**

Modify `src/app/admin/posts/[slug]/edit/page.tsx` — replace its entire contents with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { useAdminSession } from "@/lib/useAdminSession";

type PostData = {
  title: string;
  date: string;
  tags: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  sha: string;
};

export default function EditPostPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, loading } = useAdminSession();
  const [post, setPost] = useState<PostData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch(`/api/admin/posts/${params.slug}`).then(async (res) => {
      if (res.ok) {
        setPost(await res.json());
      } else {
        setError("Failed to load post");
      }
    });
  }, [user, params.slug]);

  if (loading || !user) return null;
  if (error) return <p className="mx-auto max-w-2xl px-4 py-16 text-red-600">{error}</p>;
  if (!post) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Edit post</h1>
      <PostForm
        mode="edit"
        slug={params.slug}
        initial={post}
        sha={post.sha}
        existingCoverImage={post.coverImage}
        onSaved={() => router.push("/admin/posts")}
      />
    </main>
  );
}
```

- [ ] **Step 8: Drop the password prop/header from PostForm**

Modify `src/components/PostForm.tsx` — replace its entire contents with:

```tsx
"use client";

import { useState } from "react";

type PostFormValues = {
  title: string;
  date: string;
  tags: string;
  excerpt: string;
  content: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PostForm({
  mode,
  slug,
  initial,
  sha,
  existingCoverImage,
  onSaved,
}: {
  mode: "create" | "edit";
  slug?: string;
  initial?: PostFormValues;
  sha?: string;
  existingCoverImage?: string | null;
  onSaved: (slug: string) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (coverImageFile && coverImageFile.size > 5 * 1024 * 1024) {
      setError("Cover image must be under 5MB");
      setStatus("error");
      return;
    }

    setStatus("saving");

    const body: Record<string, unknown> = { title, date, tags, excerpt, content };
    if (coverImageFile) {
      body.coverImageBase64 = await fileToBase64(coverImageFile);
      body.coverImageFilename = coverImageFile.name;
    }
    if (mode === "edit") {
      body.sha = sha;
      body.existingCoverImage = existingCoverImage;
    }

    const url = mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${slug}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = mode === "create" ? await res.json() : { slug };
      onSaved(data.slug ?? slug!);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Tags (comma-separated)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Excerpt</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          rows={2}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">
          Cover image {mode === "edit" && "(leave blank to keep current)"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Content (Markdown/MDX)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={16}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "saving" ? "Saving..." : "Save post"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 9: Delete the now-unused sessionStorage password helper**

```bash
rm src/lib/adminSession.ts
```

Confirm nothing else still imports it:

```bash
grep -rn "adminSession" src
```

Expected: no output.

- [ ] **Step 10: Verify — full browser click-through for both roles, plus the API-level regression checks**

```bash
npm run dev
```

Visit `/admin/posts` directly while logged out (no cookie) — expect an immediate redirect to `/admin/login?next=%2Fadmin%2Fposts`.

Log in as `qa-author` / `TestPassword123` (created in Task 2). Expect redirect to `/admin/posts`, showing the real posts list (title/date/tags for the existing sample posts). Click "New Post", create a post titled "Auth Migration Test" with any content, submit — expect redirect back to `/admin/posts` with the new post listed. Click "Edit" on it, change the title to "Auth Migration Test Edited", submit — expect the list to reflect the new title. Click "Delete" on it — expect it to disappear from the list. Confirm via GitHub (`https://github.com/bilaschandra/blogs/commits/main`) that real commits were made for create/update/delete, exactly like before this migration — only the auth mechanism changed, not the CMS's git-backed behavior.

While still logged in as `qa-author`, navigate directly to `/admin/comments` — expect the "You don't have access to this page" message (author correctly blocked from comment moderation). Navigate to `/admin/users` — expect the same message.

Click "Log out" (from `/admin/posts`) — expect redirect to `/admin/login`. Confirm `/admin/posts` now redirects to login again if visited directly.

Log in as `qa-admin` / `TestPassword123`. Visit `/admin/comments` — expect it to load normally (no "access" message). Visit `/admin/users` — expect the user list (now showing `qa-admin`, `qa-author`, `qa-third`) and the create-user form, both fully working through the browser this time (Task 3 only verified this via curl).

- [ ] **Step 11: Commit**

```bash
git add src/app/admin/login src/app/api/admin/comments/route.ts src/app/api/admin/posts/route.ts "src/app/api/admin/posts/[slug]/route.ts" src/app/admin/comments/page.tsx src/app/admin/posts/page.tsx src/app/admin/posts/new/page.tsx "src/app/admin/posts/[slug]/edit/page.tsx" src/components/PostForm.tsx
git rm src/lib/adminSession.ts
git commit -m "Migrate admin pages and API routes from shared password to session auth"
```

---

### Task 5: Footer link, env/README cleanup, full regression pass

**Files:**
- Modify: `src/components/Footer.tsx`
- Modify: `.env.local.example`
- Modify: `README.md`

**Interfaces:** none — this task consumes the finished auth system and produces no new code interfaces.

- [ ] **Step 1: Add the admin login link to the footer**

Modify `src/components/Footer.tsx`, changing:

```tsx
        <nav className="flex gap-4 text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
        </nav>
```

to:

```tsx
        <nav className="flex gap-4 text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
          <Link href="/admin/login">Admin</Link>
        </nav>
```

- [ ] **Step 2: Remove the now-unused ADMIN_PASSWORD from the env template**

Modify `.env.local.example`, removing this line entirely:

```
ADMIN_PASSWORD="choose-a-strong-password"
```

(`DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, and `GITHUB_TOKEN` stay unchanged.)

- [ ] **Step 3: Update the README**

Modify `README.md`'s local-setup bullet list — remove this line:

```
- `ADMIN_PASSWORD` — any password you'll use to access `/admin/comments` locally.
```

Modify the "Deployment (Vercel)" section's env var list — remove the `ADMIN_PASSWORD` bullet there too.

Add a new section, right after the existing "Moderating comments" section:

```markdown
## Admin login and managing users

Every `/admin/*` page requires logging in at `/admin/login` with a real username and password (there's also an "Admin" link in the site footer). Accounts have one of two roles:

- **`author`** — can create, edit, and delete posts via `/admin/posts`.
- **`admin`** — everything an author can do, plus moderate comments (`/admin/comments`) and manage user accounts (`/admin/users`).

There's no public signup. To create the very first account (or any account without going through the UI), run:

```bash
npm run create-admin -- --username=<username> --password=<password> --displayName="<Full Name>" --role=admin
```

Once at least one admin account exists, further accounts can be created from `/admin/users` while logged in as an admin.
```

- [ ] **Step 4: Full lint and build**

```bash
npm run lint
npm run build
```

Expected: both clean.

- [ ] **Step 5: Final full regression click-through**

```bash
npm run dev
```

From the home page, scroll to the footer and click "Admin" — confirm it navigates to `/admin/login`. Log in as `qa-admin`. Confirm comment moderation, post CMS, and user management all still work exactly as verified in Task 4. Log out via any admin page, confirm the footer's "Admin" link, when clicked again, lands back on the login page (not stuck on a stale authenticated view).

Clean up the test accounts created during this plan's verification (via `/admin/users` there's no delete button — YAGNI, per this plan's scope — so remove them directly):

```bash
node --env-file=.env.local ./node_modules/.bin/tsx -e "
import { getDb } from './src/lib/mongodb.ts';
const db = await getDb();
const r = await db.collection('users').deleteMany({ username: { \$in: ['qa-admin', 'qa-author', 'qa-third'] } });
console.log('Deleted', r.deletedCount, 'test users');
process.exit(0);
"
```

Expected: `Deleted 3 test users`. Confirm `/admin/login` still exists and works — if you need to log in again afterward, run `npm run create-admin` again for a real account.

- [ ] **Step 6: Commit**

```bash
git add src/components/Footer.tsx .env.local.example README.md
git commit -m "Add admin login footer link, remove ADMIN_PASSWORD, document login and user management"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1's `users`/`sessions` collections and indexes), password hashing + DB-backed sessions (Task 1), login/logout/me routes (Task 2), the bootstrap mechanism the spec didn't fully resolve (Task 2's `create-admin.mjs` — added here to close the chicken-and-egg gap of creating the first admin-only-creatable account), admin-only user management (Task 3), role gating on comment moderation vs. any-logged-in-user on the post CMS (Tasks 3-4), the footer link (Task 5), README documentation (Task 5). The one deliberate deviation from the spec — dropping `src/middleware.ts` in favor of route-handler + client-hook checks — is called out explicitly in Global Constraints with the Edge Runtime reasoning, and produces the same user-facing redirect/403 behavior the spec describes.
- **Type consistency:** `SessionUser = {userId, username, displayName, role}` is defined once in `src/lib/types.ts` (Task 1) and reused without redefinition by `sessions.ts`, `adminAuth.ts`, `useAdminSession.ts`, and every page that destructures `user.role`. `SESSION_COOKIE` is defined once in `sessions.ts` and imported (never re-declared) by the login/logout routes and `adminAuth.ts`. `PostForm`'s props (`mode`, `slug`, `initial`, `sha`, `existingCoverImage`, `onSaved`) drop only `password` compared to today's version — the new-post and edit-post pages in Task 4 both call it without that prop, consistently.
- **Out-of-scope items** carried over from the spec (per-post ownership, password reset, login rate-limiting, OAuth, public signup) have no corresponding task, matching the spec's explicit exclusions. Deleting user accounts from `/admin/users` was never in the spec either — Task 5's cleanup step uses a one-off script instead of a UI feature, consistent with YAGNI.
