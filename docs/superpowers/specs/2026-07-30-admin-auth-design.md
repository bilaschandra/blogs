# Real Admin Authentication (Users, Roles, Sessions) — Design

## Purpose

Replace the current single shared `ADMIN_PASSWORD` (one password, no identity, sent as an `x-admin-password` header) with real username/password login backed by MongoDB: individual user accounts, two roles (`admin`, `author`), and cookie-based sessions.

This is the first of three related pieces of work, in this order:

1. **This spec** — real authentication (users, roles, sessions, login page, footer link).
2. **Post storage migration** — move posts from git/MDX files into MongoDB, add an `author` field linking each post to a user, display the author on each article.
3. **Tag cloud** — a "top 50 tags sized by article count" cloud in the home page banner, reading tag/count data from MongoDB. Deliberately sequenced *after* #2, since it's meant to read real tag data from the migrated post store rather than the current git-based one.

Comment moderation and the post CMS both currently gate on the shared password via `src/lib/adminAuth.ts`'s `isAuthorized(request)`. This spec replaces that mechanism entirely.

## Scope boundary with the storage migration (important)

Posts are **not** migrated to MongoDB in this spec — that's #2 above. Because of that, per-post authorship/ownership doesn't exist yet, so "an author can only edit their own posts" **cannot** be enforced here. For this spec:

- Comment moderation becomes **admin-only** immediately (comments already live in MongoDB, so this is fully enforceable now).
- The post CMS (`/admin/posts/*`) requires **any logged-in user** (author or admin), with no per-post ownership check yet. True ownership enforcement is explicitly deferred to spec #2, once posts carry an `author` field.

## Data model

**`users` collection:**
```
{
  _id: ObjectId,
  username: string,       // unique, stored lowercase, indexed unique
  passwordHash: string,   // bcrypt
  displayName: string,    // shown as the article author later (spec #2); independent of username
  role: "admin" | "author",
  createdAt: Date
}
```

**`sessions` collection:**
```
{
  _id: ObjectId,
  token: string,          // random opaque token (32+ bytes, hex), indexed unique
  userId: ObjectId,       // ref users._id
  expiresAt: Date         // TTL-indexed — MongoDB auto-deletes expired sessions, no cleanup job needed
}
```

Session lifetime: 30 days, fixed from login (not sliding/refreshed on activity).

## Architecture

- **Password hashing:** `bcrypt` (new dependency) — no reason to hand-roll this.
- **Sessions:** DB-backed, not stateless JWT. Login creates a session row and sets an httpOnly, `Secure`, `SameSite=Lax` cookie holding the opaque token. Every authenticated request looks the token up in `sessions` and joins to `users` for role. Chosen over a stateless JWT because sessions are then instantly revocable (delete the row) and this is consistent with how the rest of the app already treats MongoDB as the source of truth for anything dynamic (comments, reactions).
- **`src/lib/adminAuth.ts`** is replaced by a `getSessionUser(request): Promise<{ userId, username, displayName, role } | null>` helper, used by both middleware and API routes.
- **`src/middleware.ts`** (new) protects everything under `/admin/*` except `/admin/login`:
  - No valid session → redirect to `/admin/login?next=<original path>`.
  - `/admin/users`, `/admin/comments`, and `/api/admin/comments` additionally require `role: "admin"`.
- The old `x-admin-password` header pattern and `src/lib/adminSession.ts` (sessionStorage password cache) are removed entirely — no transition/back-compat period, this is a full replacement.
- Existing admin pages/components that currently send the `x-admin-password` header (`PostForm.tsx`, `admin/comments/page.tsx`, `admin/posts/page.tsx`, `admin/posts/[slug]/edit/page.tsx`) are updated to rely on the cookie being sent automatically, and drop their password-prompt UI.

## Components

### Pages

- **`/admin/login`** — username + password form. On success, redirects to `next` (or `/admin/posts` by default).
- **`/admin/users`** (admin-only) — list existing users (username, displayName, role, createdAt) and a form to create a new one (username, displayName, password, role).
- A **logout** control (e.g. in the existing admin nav) posts to the logout endpoint and redirects to `/admin/login`.

### API routes

- `POST /api/auth/login` — body `{ username, password }`. Validates against `users` (bcrypt compare). On success, creates a session, sets the cookie, returns `{ status: "ok" }`. On failure, `401 { error: "invalid username or password" }` — identical message whether the username doesn't exist or the password is wrong (no user enumeration).
- `POST /api/auth/logout` — deletes the current session row (if any), clears the cookie, returns `{ status: "ok" }`.
- `GET /api/admin/users` (admin-only) — list users (never returns `passwordHash`).
- `POST /api/admin/users` (admin-only) — create a user. Validates `username` uniqueness (`400` "username already taken" on collision), password minimum length (8 chars), hashes with bcrypt, inserts.

## Error handling

- Invalid login → `401`, generic message, no enumeration of which field was wrong.
- Missing/expired session on an `/admin/*` **page** → middleware redirect to `/admin/login?next=...`.
- Missing/expired session on an **API route** → `401 { error: "unauthorized" }` (same response shape the app already uses).
- Duplicate username on account creation → `400 { error: "username already taken" }`.
- No login rate-limiting/brute-force protection in this pass — reasonable for a single-admin-plus-a-few-authors blog with no history of abuse; noted as a known gap rather than built now.

## Testing

Manual verification pass (matching how prior features on this project were verified — there's no automated test suite):

- Login with correct credentials succeeds and sets a session that persists across a page reload.
- Login with wrong username or wrong password both fail with the same generic message.
- Logout clears access — subsequent `/admin/*` page loads redirect to login.
- An `author`-role account can reach `/admin/posts` but is redirected/blocked from `/admin/users` and from `/api/admin/comments`.
- An `admin`-role account can reach everything.
- Session expiry (can be tested by manually shortening `expiresAt` in Mongo) correctly forces re-login.

## Explicitly out of scope

- Per-post ownership enforcement ("author can only edit their own posts") — deferred to the storage migration spec (#2), which introduces the `author` field on posts.
- Password reset / "forgot password" flow — not needed yet at this account scale; recommend resetting via direct MongoDB update if ever needed.
- Login rate-limiting / brute-force protection.
- OAuth or any third-party login provider.
- Public signup — accounts are only created via the admin-only `/admin/users` page.
