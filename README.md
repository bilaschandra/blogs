# Engineering Blog

A personal engineering blog built with Next.js. Every post is a Markdown (`.md`)
or MDX (`.mdx`) file committed to this repo — there's no database, no CMS, and no
runtime services. The site is fully static: pages are pre-rendered at build time.

## Local setup

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

Optionally, set the canonical site URL used by `sitemap.xml` and `rss.xml`:

```bash
# .env.local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

It defaults to `http://localhost:3000` if unset.

## Adding a new post

Create a `.md` or `.mdx` file in `content/posts/`, e.g.
`content/posts/my-new-post.md`, with frontmatter:

```md
---
title: "My New Post"
date: "2026-08-01"
tags: ["backend"]
excerpt: "One-sentence summary shown on listing pages."
coverImage: "/images/posts/my-new-post.png" # optional
---

Post content here. Markdown, GFM tables, and fenced code blocks
(syntax-highlighted) are all supported.
```

Notes:
- The filename (without extension) becomes the post's URL slug: `/blog/my-new-post`.
- `excerpt` is optional — if omitted, `description` is used, otherwise a snippet is
  generated from the body.
- `coverImage` is optional — posts without one show a solid placeholder. Put image
  files in `public/images/posts/`.

Commit and push, then deploy — the new post is picked up on the next build.

## Project structure

```
content/posts/          Markdown/MDX posts (the content)
public/images/posts/    Optional cover images
src/app/                Routes: home, /blog, /blog/[slug], /tags/[tag], /about
src/app/rss.xml/        RSS feed
src/app/sitemap.ts      Sitemap
src/components/         Header, Footer, PostCard, Pagination, SectionBanner
src/lib/posts.ts        Loads and parses Markdown posts
src/lib/mdx.ts          MDX rendering options (GFM + code highlighting)
```

## Build

```bash
npm run build   # produces the optimized static site
npm run start   # serves the production build locally
```

## Deployment

Any static-friendly Next.js host works (Vercel, AWS Amplify, Netlify, etc.).
Set `NEXT_PUBLIC_SITE_URL` to your production URL so `sitemap.xml` and `rss.xml`
emit absolute links, then deploy the repo. See
[docs/deployment-aws-amplify.md](docs/deployment-aws-amplify.md) for an AWS
Amplify Hosting walkthrough.
