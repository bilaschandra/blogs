# Personal Engineering Blog — Design

## Purpose

A personal engineering blog in the style of the Uber Engineering blog. Built simple and cheap: static content, a database used only where genuinely needed, hosted for free.

## Goals / constraints

- Personal project, single author, low traffic expected.
- Low/no cost: free hosting tier, free database tier, free subdomain to start.
- Simple to maintain: writing a post should be "add a markdown file, commit, push."
- Standard blog reader features: comments and emoji reactions on posts.

## Architecture

- **Framework:** Next.js 14 (App Router) + TypeScript, Tailwind CSS for styling.
- **Content layer (static):** Blog posts are `.mdx` files in `/content/posts/*.mdx` with frontmatter (`title`, `date`, `tags`, `excerpt`). Parsed with `gray-matter`, rendered with `next-mdx-remote/rsc`. Code blocks syntax-highlighted with `rehype-pretty-code` (Shiki) and `remark-gfm` for GitHub-flavored markdown (tables, etc.).
- **Dynamic layer (MongoDB):** Two collections only — `comments` and `reactions` — accessed exclusively through Next.js API routes. No other part of the site touches the database. This keeps the "low cost / simple" property: if the database ever goes away, the blog's actual content is untouched.
- **Hosting:** GitHub repo → Vercel (free tier), auto-deploy on push to `main`. Starts on a free `*.vercel.app` subdomain; a custom domain can be attached later without any rebuild.
- **Database:** MongoDB Atlas free-tier cluster (already provisioned by the user). Connection string stored as `DATABASE_URL` in `.env.local` locally and as a Vercel project environment variable in production — never committed to git.

## Pages & components

| Route | Purpose |
|---|---|
| `/` | Home — hero + latest posts |
| `/blog` | All posts, paginated |
| `/blog/[slug]` | Post content, code highlighting, comment box, emoji reaction bar |
| `/tags/[tag]` | Posts filtered by tag |
| `/about` | About page |
| `/admin/comments` | Password-gated moderation page to approve/reject pending comments |
| `/rss.xml`, `/sitemap.xml` | Auto-generated |

No full auth system — this is a single-author blog, so the admin page is protected by a simple password check against an `ADMIN_PASSWORD` environment variable, not a user/session system.

## Data model (MongoDB)

**`comments`**
```
{
  slug: string,
  name: string,
  text: string,
  createdAt: Date,
  approved: boolean   // defaults to false; only approved comments render on the post
}
```

**`reactions`**
```
{
  slug: string,
  emoji: string,
  count: number
}
```
Unique index on `(slug, emoji)`. Incremented via upsert. The browser remembers which emoji it already used per post via `localStorage`, to softly prevent repeat-clicking (not abuse-proof — acceptable at personal-blog scale).

## Error handling & security

- MongoDB client connection is cached across serverless invocations (standard Next.js + MongoDB pattern) to avoid exhausting connections on Vercel's serverless functions.
- API routes validate input shape/length, return `400` on invalid input, log unexpected errors server-side only, and never leak stack traces to the client.
- Secrets (`DATABASE_URL`, `ADMIN_PASSWORD`) are gitignored locally and set as environment variables in Vercel — never hardcoded or committed.
- No CAPTCHA or rate-limiting at launch — YAGNI given expected traffic. The comment moderation queue (`approved: false` by default) is the spam defense. Rate-limiting can be added later if it becomes necessary.

## Testing

- No formal automated test suite for launch. This is a solo personal blog with mostly static content; correctness is verified by manually checking build output, post rendering, comment submit → moderate → publish flow, and reactions in local dev before each deploy.
- If comment/reaction logic grows in complexity later, that's the natural place to add targeted tests (e.g. Vitest) around the API route handlers.

## Explicitly out of scope (for now)

- User accounts / full authentication system.
- CAPTCHA or automated spam/rate-limiting.
- Newsletter signup.
- Custom domain (deferred until after launch; free subdomain to start).
