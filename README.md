# Engineering Blog

A personal engineering blog. Posts are Markdown/MDX files committed to this repo; comments and emoji reactions are the only dynamic features, backed by MongoDB.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env template and fill in real values:
   ```bash
   cp .env.local.example .env.local
   ```
   - `DATABASE_URL` — for local development, run MongoDB via Docker instead of pointing at production:
     ```bash
     docker compose up -d
     ```
     Then set `DATABASE_URL="mongodb://127.0.0.1:27017/bilas_mongo_db"` in `.env.local`.
   - `ADMIN_PASSWORD` — any password you'll use to access `/admin/comments` locally.
   - `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` is fine for local dev.
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Adding a new post

Create a new `.mdx` file in `content/posts/`, e.g. `content/posts/my-new-post.mdx`, with frontmatter:

```mdx
---
title: "My New Post"
date: "2026-08-01"
tags: ["backend"]
excerpt: "One-sentence summary shown on listing pages."
---

Post content here.
```

Commit and push — the site picks it up automatically on next deploy (no rebuild step beyond the normal deploy).

## Moderating comments

Comments submitted on any post are hidden until approved. Visit `/admin/comments`, enter the `ADMIN_PASSWORD`, and approve or reject each pending comment. Rejected comments are deleted; approved ones become publicly visible immediately.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it into Vercel ("Add New Project" → select the repo). Framework preset auto-detects Next.js.
3. In the Vercel project's Settings → Environment Variables, set for Production (and Preview):
   - `DATABASE_URL` — your MongoDB Atlas connection string (Atlas's Network Access must allow `0.0.0.0/0`, since Vercel's serverless functions don't have static outbound IPs)
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL` — the assigned `*.vercel.app` URL (update after the first deploy once Vercel assigns it, then redeploy)
4. Deploy. Verify: home/blog pages render, an emoji reaction persists after reload, a submitted comment stays hidden until approved via `/admin/comments`, and `/rss.xml` / `/sitemap.xml` return valid XML using the real production URL.
