# Admin CMS (GitHub-Backed) — Design

## Purpose

Let the blog's author create, edit, and delete posts (including cover images) from a browser form at `/admin/posts`, with no git/terminal use required. Publishing still goes through git — the CMS commits directly to the GitHub repo via GitHub's REST API — so the site's entire existing architecture (static `.mdx` files, `src/lib/posts.ts`, static generation) is untouched. No database or blob storage is introduced.

This is the second of three related pieces of work planned together (see `docs/superpowers/specs/2026-07-28-uber-style-redesign-design.md`): the visual redesign shipped first; this CMS is second; a future Open Graph image feature is third and out of scope here.

## Why GitHub-API-backed, not database-backed

The user explicitly accepted a ~1-2 minute publish delay (a real rebuild happens after each commit) in exchange for **not** introducing a database for post content or a blob-storage service for images. This keeps every post's full history in git, requires zero changes to how the public site reads posts, and needs no new paid/managed storage service. The known trade-off: right after saving, `/admin/posts`'s own list (sourced live from GitHub) shows the change immediately, but the **public** site won't reflect it until Amplify's triggered rebuild finishes.

## Architecture

- All new API routes live under `/api/admin/posts` and are password-gated identically to the existing `/api/admin/comments` route: an `x-admin-password` header compared against the `ADMIN_PASSWORD` env var, checked before any GitHub API call.
- A new `src/lib/github.ts` module wraps every GitHub REST API call this feature needs (list directory, get file, create file, update file, delete file) using plain `fetch` — no new npm dependency (Octokit, etc.) is introduced.
- Post content is still parsed/serialized with `gray-matter` (already a dependency) — `matter.stringify(content, frontmatter)` produces the exact `.mdx` file content to commit; `matter(rawFileContent)` parses it back out when editing.
- A new `GITHUB_TOKEN` env var (a GitHub fine-grained personal access token, scoped to just this repo, with "Contents: read and write" permission) authenticates every GitHub API call. Repo owner/name/branch (`bilaschandra`/`blogs`/`main`) are hardcoded constants in `src/lib/github.ts` — this app only ever manages one specific repo.
- Cover images upload as base64 from the browser and get committed straight to `public/images/posts/<slug>.<ext>` via the same GitHub API — no S3, no separate upload flow.

## GitHub REST API calls used

All requests go to `https://api.github.com`, with headers `Authorization: Bearer ${GITHUB_TOKEN}`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`.

- **List posts:** `GET /repos/{owner}/{repo}/contents/content/posts` — returns an array of file entries (name, sha). The route handler then fetches and parses each file's frontmatter for the list view.
- **Get one post:** `GET /repos/{owner}/{repo}/contents/content/posts/{slug}.mdx` — returns base64-encoded file content and its `sha`. The `sha` is required for any subsequent update/delete of that exact file and must round-trip through the client (fetched on page load, sent back on save) so GitHub can detect if the file changed elsewhere since.
- **Create or update a file** (post or image): `PUT /repos/{owner}/{repo}/contents/{path}` with body `{ message, content: <base64>, branch: "main", sha: <only when updating an existing file> }`. Omitting `sha` creates a new file; a 409 response means the file already exists (for create) or changed since it was fetched (for update).
- **Delete a post:** `DELETE /repos/{owner}/{repo}/contents/content/posts/{slug}.mdx` with body `{ message, sha, branch: "main" }`.

## Components

### Admin pages (all under `/admin/posts`, password-gated like `/admin/comments`)

- **`/admin/posts`** — lists existing posts (title, date, tags) fetched live from GitHub, each with Edit/Delete links, plus a "New Post" link.
- **`/admin/posts/new`** and **`/admin/posts/[slug]/edit`** — share one form component, `src/components/PostForm.tsx`: title, date (defaults to today), tags (comma-separated text input, parsed into an array), excerpt, cover image file picker (optional), content (plain `<textarea>` for the MDX body — no live preview, no rich-text toolbar). The edit form pre-fills from `GET /api/admin/posts/[slug]`.
- Slug is auto-generated from the title (lowercased, non-alphanumeric replaced with hyphens) on create, and checked against the existing post list for collisions before committing — a colliding slug is rejected with a clear inline error, not silently overwritten.

### API routes

- `GET /api/admin/posts` — list.
- `POST /api/admin/posts` — create: validates input, generates+checks the slug, optionally commits the cover image file, then commits the `.mdx` file.
- `GET /api/admin/posts/[slug]` — fetch one post's frontmatter, content, and current file `sha`, for the edit form.
- `PUT /api/admin/posts/[slug]` — update: requires the `sha` the client got from the GET; re-serializes frontmatter+content and commits.
- `DELETE /api/admin/posts/[slug]` — delete: requires the current `sha`; deletes the `.mdx` file. (Any cover image file is intentionally left in place — cleaning up orphaned images is out of scope for v1, YAGNI.)

## Validation & error handling

- Required fields: `title`, `excerpt`, `content` (non-empty after trim). `date` defaults to today if omitted. `tags` parses a comma-separated string into a trimmed, non-empty-filtered array (may be empty).
- Slug collision on create → `400` with a clear message, before any GitHub write happens.
- A GitHub `409` (stale `sha` on update/delete, meaning the file changed since it was fetched) is surfaced to the client as `409` with a message to refresh and retry — never silently overwritten.
- Any other GitHub API failure (network error, rate limit, auth failure) → `502` with a generic message; the real error is logged server-side only, never leaked to the client, matching this project's existing error-handling convention.
- Cover images: client-side file-size check (reject over 5MB) before encoding to base64 — keeps requests well within GitHub's Contents API practical limits for this use case.

## Known operational characteristic (not a defect)

Testing this feature — locally or in production — creates **real commits to the real `main` branch** and triggers **real Amplify rebuilds**, since there is no separate staging repo or dry-run mode. This is an accepted, informed trade-off for a personal project, not a gap to fix.

## Explicitly out of scope

- Cleaning up orphaned cover images when a post is deleted or its image is replaced on edit.
- Any change to the public site's read path (`src/lib/posts.ts`, static generation) — untouched.
- Live Markdown preview or rich-text editing.
- A staging/dry-run mode for testing without real commits/rebuilds.
- Open Graph image generation (separate, later piece of work).
