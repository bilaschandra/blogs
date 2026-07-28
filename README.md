# Engineering Blog

A personal engineering blog. Posts are Markdown/MDX files committed to this repo; comments and emoji reactions are the only dynamic features, backed by MongoDB.

## Local setup

First, copy the env template and fill in real values:
```bash
cp .env.local.example .env.local
```
- `DATABASE_URL` — for local development, point this at Docker's MongoDB rather than production: `mongodb://127.0.0.1:27017/bilas_mongo_db`. (Option A below overrides this automatically for the containerized app — see the note there.)
- `ADMIN_PASSWORD` — any password you'll use to access `/admin/comments` locally.
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` is fine for local dev.

Then pick one of the two ways to run it:

### Option A — everything in Docker (app + MongoDB)

```bash
docker compose up
```

This starts both the Next.js app (with hot reload — your local files are mounted into the container) and MongoDB, and wires them together automatically. Open **http://localhost:3000**.

- The app reads the rest of `.env.local` (`ADMIN_PASSWORD`, `NEXT_PUBLIC_SITE_URL`) normally, but `docker-compose.yml` overrides `DATABASE_URL` to `mongodb://mongo:27017/bilas_mongo_db` for the app container specifically — inside Docker's network, the Mongo container's hostname is `mongo`, not `127.0.0.1`. You don't need to change anything in `.env.local` for this to work.
- If port 3000 is already used by something else on your machine, run `APP_PORT=3050 docker compose up` instead (or any free port), and open that port instead.
- Stop with `Ctrl+C`, or `docker compose down` to also remove the containers (your MongoDB data persists in a Docker volume either way; add `-v` to `docker compose down` to wipe it too).

### Option B — Node on your host, MongoDB in Docker

```bash
docker compose up -d mongo
npm install
npm run dev
```

Make sure `.env.local`'s `DATABASE_URL` is set to `mongodb://127.0.0.1:27017/bilas_mongo_db` for this option (from your host, Mongo's container is reachable at `127.0.0.1`, not `mongo`). Open **http://localhost:3000**.

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
