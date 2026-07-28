# Personal Engineering Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a personal engineering blog — static MDX posts, MongoDB-backed comments and emoji reactions, deployed free on Vercel.

**Architecture:** Next.js 14 (App Router, TypeScript, Tailwind CSS). Posts are `.mdx` files in `/content/posts`, parsed with `gray-matter` and rendered with `next-mdx-remote/rsc`. Comments and reactions are the only dynamic data, stored in two MongoDB collections and accessed exclusively through Next.js API routes (`/api/comments`, `/api/reactions`, `/api/admin/comments`). No full auth system — a single shared `ADMIN_PASSWORD` gates the comment-moderation page.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, `gray-matter`, `next-mdx-remote`, `remark-gfm`, `rehype-pretty-code` (Shiki), `mongodb` driver v6, Vercel (hosting), MongoDB Atlas free tier (already provisioned).

## Global Constraints

- Two MongoDB collections only: `comments`, `reactions`. Nothing else touches the database.
- Secrets (`DATABASE_URL`, `ADMIN_PASSWORD`) live in `.env.local` (gitignored) and Vercel project env vars — never hardcoded, never committed.
- No full auth system — admin moderation is gated by a single shared password compared against `ADMIN_PASSWORD`.
- No CAPTCHA / rate-limiting at launch. Comments default to `approved: false`; only approved comments render publicly.
- No automated test suite for launch (per approved spec, `docs/superpowers/specs/2026-07-28-engineering-blog-design.md`). Every task's "testable deliverable" is a concrete manual verification step (exact command + exact expected output), not a Jest/Vitest suite.
- Free tier only: Vercel free tier, MongoDB Atlas free tier, free `*.vercel.app` subdomain.

---

## File Structure

```
blogs/
├── content/posts/*.mdx                 # blog post source files
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # root layout, header/footer
│   │   ├── page.tsx                    # home page
│   │   ├── globals.css
│   │   ├── blog/page.tsx               # paginated post list
│   │   ├── blog/[slug]/page.tsx        # post detail
│   │   ├── tags/[tag]/page.tsx         # posts filtered by tag
│   │   ├── about/page.tsx
│   │   ├── admin/comments/page.tsx     # moderation UI
│   │   ├── api/comments/route.ts
│   │   ├── api/reactions/route.ts
│   │   ├── api/admin/comments/route.ts
│   │   ├── rss.xml/route.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── PostCard.tsx
│   │   ├── Pagination.tsx
│   │   ├── ReactionBar.tsx
│   │   ├── CommentBox.tsx
│   │   └── CommentList.tsx
│   └── lib/
│       ├── posts.ts                    # read/parse/paginate MDX posts
│       ├── mongodb.ts                  # cached Mongo client
│       └── types.ts                    # shared TS types
├── .env.local                          # gitignored, real secrets
├── .env.local.example                  # committed, documents required vars
└── docs/superpowers/{specs,plans}/...
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json` (via `create-next-app`)
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `.env.local.example`
- Modify: `.gitignore` (already has `node_modules/`, `.next/`, `.env*`, `.vercel` from spec commit — verify, don't duplicate)

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000` rendering `src/app/page.tsx`. All later tasks build on this.

- [ ] **Step 1: Scaffold Next.js app in the current directory**

```bash
npx create-next-app@14.2.5 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

When prompted, accept defaults. The directory already contains `.git`, `.gitignore`, and `docs/` — this is expected and safe; `create-next-app` will not overwrite them.

- [ ] **Step 2: Verify `.gitignore` still covers secrets**

Open `.gitignore` and confirm it contains (add any missing):

```
node_modules/
.next/
.env
.env.local
.vercel
```

- [ ] **Step 3: Create the env var documentation file**

Create `.env.local.example`:

```
DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority"
ADMIN_PASSWORD="choose-a-strong-password"
```

- [ ] **Step 4: Create real `.env.local` (not committed)**

Create `.env.local` with the real `DATABASE_URL` (the Atlas connection string already provisioned) and a real `ADMIN_PASSWORD` of your choosing. Do not paste the real values into any file that isn't `.env.local`.

- [ ] **Step 5: Replace the placeholder home page**

Replace contents of `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">Engineering Blog</h1>
      <p className="mt-4 text-gray-600 dark:text-gray-400">
        Coming soon: posts.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Verify dev server runs**

```bash
npm run dev
```

Open `http://localhost:3000` — expect to see "Engineering Blog" heading and the placeholder paragraph, with no console errors. Stop the server (Ctrl+C) once confirmed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with TypeScript and Tailwind"
```

---

### Task 2: Post content library (MDX frontmatter parsing, listing, tags, pagination)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/posts.ts`
- Create: `content/posts/hello-world.mdx`
- Create: `content/posts/why-this-blog-exists.mdx`

**Interfaces:**
- Produces:
  - `type PostFrontmatter = { title: string; date: string; tags: string[]; excerpt: string }`
  - `type Post = PostFrontmatter & { slug: string; content: string }`
  - `getAllPosts(): Post[]` — sorted by `date` descending
  - `getPostBySlug(slug: string): Post | null`
  - `getAllTags(): string[]` — unique, sorted alphabetically
  - `getPostsByTag(tag: string): Post[]`
  - `paginate<T>(items: T[], page: number, perPage: number): { items: T[]; currentPage: number; totalPages: number }`
- Consumes: nothing (this is the foundation content layer).

- [ ] **Step 1: Install `gray-matter`**

```bash
npm install gray-matter
```

- [ ] **Step 2: Create shared types**

Create `src/lib/types.ts`:

```ts
export type PostFrontmatter = {
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
};

export type Post = PostFrontmatter & {
  slug: string;
  content: string;
};

export type Paginated<T> = {
  items: T[];
  currentPage: number;
  totalPages: number;
};
```

- [ ] **Step 3: Create two sample posts**

Create `content/posts/hello-world.mdx`:

```mdx
---
title: "Hello, World"
date: "2026-07-28"
tags: ["meta"]
excerpt: "The first post on this engineering blog."
---

# Hello, World

This is the first post. Code blocks should be syntax-highlighted:

```ts
function add(a: number, b: number): number {
  return a + b;
}
```

More posts coming soon.
```

Create `content/posts/why-this-blog-exists.mdx`:

```mdx
---
title: "Why This Blog Exists"
date: "2026-07-27"
tags: ["meta", "writing"]
excerpt: "A short note on why I'm writing an engineering blog."
---

# Why This Blog Exists

Writing things down clarifies thinking. This blog is where I do that.
```

- [ ] **Step 4: Implement the posts library**

Create `src/lib/posts.ts`:

```ts
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Post, PostFrontmatter, Paginated } from "./types";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function getPostSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = data as PostFrontmatter;

  return { slug, content, ...frontmatter };
}

export function getAllPosts(): Post[] {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug))
    .filter((post): post is Post => post !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const post of getAllPosts()) {
    for (const tag of post.tags) tags.add(tag);
  }
  return Array.from(tags).sort();
}

export function getPostsByTag(tag: string): Post[] {
  return getAllPosts().filter((post) => post.tags.includes(tag));
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number
): Paginated<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
  };
}
```

- [ ] **Step 5: Verify with a one-off script**

Create a temporary file `scripts/verify-posts.mjs`:

```js
import { getAllPosts, getAllTags, getPostsByTag, paginate } from "../src/lib/posts.ts";

console.log("All posts:", getAllPosts().map((p) => p.slug));
console.log("All tags:", getAllTags());
console.log("Posts tagged 'meta':", getPostsByTag("meta").map((p) => p.slug));
console.log("Page 1 of size 1:", paginate(getAllPosts(), 1, 1));
```

Run:

```bash
npx tsx scripts/verify-posts.mjs
```

(Install `tsx` if missing: `npm install -D tsx`.)

Expected output: two slugs (`why-this-blog-exists` first, since its date is later... wait, dates are `2026-07-28` and `2026-07-27` — `hello-world` is newer and must print first), tags `["meta", "writing"]`, one post tagged `meta` returning both slugs, and page 1 of size 1 containing only `hello-world` with `totalPages: 2`.

Delete `scripts/verify-posts.mjs` after confirming.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add MDX post content library with tags and pagination"
```

---

### Task 3: MDX rendering pipeline and post detail page

**Files:**
- Create: `src/lib/mdx.ts`
- Create: `src/app/blog/[slug]/page.tsx`
- Modify: `src/app/globals.css` (add Shiki theme CSS variables if needed)

**Interfaces:**
- Consumes: `getPostBySlug(slug)`, `getAllPosts()` from `src/lib/posts.ts` (Task 2).
- Produces: `/blog/[slug]` route rendering full post content with syntax-highlighted code blocks. Later tasks (comments, reactions) attach client components to this page.

- [ ] **Step 1: Install MDX rendering dependencies**

```bash
npm install next-mdx-remote remark-gfm rehype-pretty-code shiki
```

- [ ] **Step 2: Define shared MDX options**

Create `src/lib/mdx.ts`:

```ts
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";

export const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [rehypePrettyCode, { theme: "github-dark" }] as [
        typeof rehypePrettyCode,
        { theme: string }
      ],
    ],
  },
};
```

- [ ] **Step 3: Build the post detail page**

Create `src/app/blog/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="mt-2 text-sm text-gray-500">{post.date}</p>
      <div className="prose dark:prose-invert mt-8">
        <MDXRemote source={post.content} options={mdxOptions} />
      </div>
    </article>
  );
}
```

- [ ] **Step 4: Install Tailwind Typography for readable prose styling**

```bash
npm install -D @tailwindcss/typography
```

Add the plugin to `tailwind.config.ts`:

```ts
import typography from "@tailwindcss/typography";
// ...
plugins: [typography],
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Visit `http://localhost:3000/blog/hello-world` — expect the title "Hello, World", the date, and a syntax-highlighted TypeScript code block (dark background, colored tokens). Visit `http://localhost:3000/blog/does-not-exist` — expect the default Next.js 404 page.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add MDX rendering pipeline and post detail page"
```

---

### Task 4: Home, blog listing, and tag pages

**Files:**
- Create: `src/components/PostCard.tsx`
- Create: `src/components/Pagination.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/blog/page.tsx`
- Create: `src/app/tags/[tag]/page.tsx`
- Modify: `src/app/layout.tsx` (add `Header`/`Footer`)
- Create: `src/components/Header.tsx`
- Create: `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `getAllPosts`, `getPostsByTag`, `getAllTags`, `paginate` from `src/lib/posts.ts` (Task 2).
- Produces: navigable site — home shows latest 5 posts, `/blog?page=N` paginates all posts 10-per-page, `/tags/[tag]` lists posts for that tag. `Header`/`Footer` wrap every page via `layout.tsx`.

- [ ] **Step 1: Build `PostCard`**

Create `src/components/PostCard.tsx`:

```tsx
import Link from "next/link";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="border-b border-gray-200 py-6 dark:border-gray-800">
      <Link href={`/blog/${post.slug}`} className="text-xl font-semibold hover:underline">
        {post.title}
      </Link>
      <p className="mt-1 text-sm text-gray-500">{post.date}</p>
      <p className="mt-2 text-gray-600 dark:text-gray-400">{post.excerpt}</p>
      <div className="mt-2 flex gap-2">
        {post.tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${tag}`}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            {tag}
          </Link>
        ))}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Build `Pagination`**

Create `src/components/Pagination.tsx`:

```tsx
import Link from "next/link";

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex justify-between text-sm">
      {currentPage > 1 ? (
        <Link href={`${basePath}?page=${currentPage - 1}`}>&larr; Newer</Link>
      ) : (
        <span />
      )}
      <span className="text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link href={`${basePath}?page=${currentPage + 1}`}>Older &rarr;</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
```

- [ ] **Step 3: Build `Header` and `Footer`**

Create `src/components/Header.tsx`:

```tsx
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
      <Link href="/" className="font-bold">
        Engineering Blog
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/blog">Blog</Link>
        <Link href="/about">About</Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
```

Create `src/components/Footer.tsx`:

```tsx
export function Footer() {
  return (
    <footer className="mx-auto max-w-3xl px-4 py-8 text-center text-sm text-gray-500">
      © {new Date().getFullYear()} — built with Next.js
    </footer>
  );
}
```

Create `src/components/ThemeToggle.tsx` (client component, no extra dependency):

```tsx
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button onClick={toggle} aria-label="Toggle dark mode">
      {dark ? "🌙" : "☀️"}
    </button>
  );
}
```

- [ ] **Step 4: Wire `Header`/`Footer` into the root layout**

Modify `src/app/layout.tsx` to import and render `<Header />` above `{children}` and `<Footer />` below it, inside `<body>`. Ensure `tailwind.config.ts` `darkMode` is set to `"class"` (add `darkMode: "class",` to the config object if not already present) so `ThemeToggle`'s `dark` class works.

- [ ] **Step 5: Build the home page**

Replace `src/app/page.tsx`:

```tsx
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Engineering Blog</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Notes on building things.
      </p>
      <div className="mt-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Build the paginated blog listing page**

Create `src/app/blog/page.tsx`:

```tsx
import { getAllPosts, paginate } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";

const PER_PAGE = 10;

export default function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { items, currentPage, totalPages } = paginate(getAllPosts(), page, PER_PAGE);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">All Posts</h1>
      <div className="mt-8">
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
    </main>
  );
}
```

- [ ] **Step 7: Build the tag page**

Create `src/app/tags/[tag]/page.tsx`:

```tsx
import { getPostsByTag } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

export default function TagPage({ params }: { params: { tag: string } }) {
  const posts = getPostsByTag(params.tag);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Tag: {params.tag}</h1>
      <div className="mt-8">
        {posts.length === 0 && <p className="text-gray-500">No posts yet.</p>}
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Verify**

```bash
npm run dev
```

Check: `/` shows both posts as cards; `/blog` shows both posts with no pagination controls (only 2 posts, 10 per page); `/tags/meta` shows both posts; `/tags/writing` shows only "Why This Blog Exists"; the sun/moon toggle in the header switches dark mode and persists across a page reload.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Add home, blog listing, and tag pages"
```

---

### Task 5: MongoDB connection module

**Files:**
- Create: `src/lib/mongodb.ts`

**Interfaces:**
- Consumes: `process.env.DATABASE_URL`.
- Produces: `getDb(): Promise<Db>` — returns a connected MongoDB `Db` instance, reusing a single cached client across calls (required on Vercel's serverless functions to avoid exhausting connections). Tasks 6, 7, and 8 all call `getDb()`.

- [ ] **Step 1: Install the MongoDB driver**

```bash
npm install mongodb
```

- [ ] **Step 2: Implement the cached connection module**

Create `src/lib/mongodb.ts`:

```ts
import { MongoClient, type Db } from "mongodb";

const uri = process.env.DATABASE_URL;
if (!uri) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db();
}
```

The connection string already includes the database name (`bilas_mongo_db`), so `client.db()` with no argument uses it.

- [ ] **Step 3: Verify with a one-off script**

Create temporary `scripts/verify-mongo.mjs`:

```js
import { getDb } from "../src/lib/mongodb.ts";

const db = await getDb();
const result = await db.collection("_connection_check").insertOne({ ok: true, at: new Date() });
console.log("Inserted:", result.insertedId.toString());
await db.collection("_connection_check").deleteOne({ _id: result.insertedId });
console.log("Cleaned up. Connection works.");
process.exit(0);
```

Run:

```bash
npx tsx scripts/verify-mongo.mjs
```

Expected output: an inserted ObjectId printed, then "Cleaned up. Connection works." with no errors. Delete `scripts/verify-mongo.mjs` after confirming.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add cached MongoDB connection module"
```

---

### Task 6: Emoji reactions feature

**Files:**
- Create: `src/app/api/reactions/route.ts`
- Create: `src/components/ReactionBar.tsx`
- Modify: `src/app/blog/[slug]/page.tsx` (render `<ReactionBar slug={post.slug} />`)

**Interfaces:**
- Consumes: `getDb()` from `src/lib/mongodb.ts` (Task 5).
- Produces: `GET /api/reactions?slug=X` → `{ emoji: string; count: number }[]`; `POST /api/reactions` with body `{ slug: string; emoji: string }` → the updated `{ emoji, count }`. `ReactionBar` is a client component usable on any post page.

- [ ] **Step 1: Implement the reactions API route**

Create `src/app/api/reactions/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

const ALLOWED_EMOJI = ["👍", "❤️", "🎉", "🤔"];

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const db = await getDb();
  const docs = await db.collection("reactions").find({ slug }).toArray();
  const result = ALLOWED_EMOJI.map((emoji) => {
    const doc = docs.find((d) => d.emoji === emoji);
    return { emoji, count: doc?.count ?? 0 };
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const emoji = body?.emoji;

  if (typeof slug !== "string" || !slug || !ALLOWED_EMOJI.includes(emoji)) {
    return NextResponse.json({ error: "invalid slug or emoji" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.collection("reactions").findOneAndUpdate(
    { slug, emoji },
    { $inc: { count: 1 } },
    { upsert: true, returnDocument: "after" }
  );

  return NextResponse.json({ emoji, count: result?.count ?? 1 });
}
```

- [ ] **Step 2: Implement the `ReactionBar` client component**

Create `src/components/ReactionBar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Reaction = { emoji: string; count: number };

export function ReactionBar({ slug }: { slug: string }) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [clicked, setClicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then(setReactions);

    const stored = localStorage.getItem(`reactions:${slug}`);
    if (stored) setClicked(new Set(JSON.parse(stored)));
  }, [slug]);

  async function react(emoji: string) {
    if (clicked.has(emoji)) return;

    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, emoji }),
    });
    const updated: Reaction = await res.json();

    setReactions((prev) =>
      prev.map((r) => (r.emoji === emoji ? updated : r))
    );
    const next = new Set(clicked);
    next.add(emoji);
    setClicked(next);
    localStorage.setItem(`reactions:${slug}`, JSON.stringify(Array.from(next)));
  }

  return (
    <div className="mt-8 flex gap-3">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => react(r.emoji)}
          disabled={clicked.has(r.emoji)}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm disabled:opacity-60 dark:border-gray-700"
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Render `ReactionBar` on the post page**

Modify `src/app/blog/[slug]/page.tsx`: import `ReactionBar` from `@/components/ReactionBar` and render `<ReactionBar slug={post.slug} />` immediately after the `<MDXRemote .../>` block, still inside `<article>`.

- [ ] **Step 4: Verify**

```bash
npm run dev
```

Visit `/blog/hello-world`. Confirm four emoji buttons render with count `0`. Click 👍 — expect the count to become `1` and the button to disable. Reload the page — expect the button to still be disabled and the count to still show `1` (both from the server response and from `localStorage`). Run:

```bash
curl -s "http://localhost:3000/api/reactions?slug=hello-world"
```

Expect JSON with `👍` at count `1` and the others at `0`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add emoji reactions feature"
```

---

### Task 7: Comments feature (submit + display approved)

**Files:**
- Create: `src/app/api/comments/route.ts`
- Create: `src/components/CommentBox.tsx`
- Create: `src/components/CommentList.tsx`
- Modify: `src/app/blog/[slug]/page.tsx` (render `<CommentList>` and `<CommentBox>`)

**Interfaces:**
- Consumes: `getDb()` from `src/lib/mongodb.ts` (Task 5).
- Produces: `GET /api/comments?slug=X` → approved comments `{ _id, name, text, createdAt }[]`; `POST /api/comments` with body `{ slug, name, text }` → `201` on success (stored with `approved: false`), `400` on invalid input. `CommentList` and `CommentBox` are client components usable on any post page.

- [ ] **Step 1: Implement the comments API route**

Create `src/app/api/comments/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  const db = await getDb();
  const comments = await db
    .collection("comments")
    .find({ slug, approved: true })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json(
    comments.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      text: c.text,
      createdAt: c.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const slug = body?.slug;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (
    typeof slug !== "string" ||
    !slug ||
    name.length < 1 ||
    name.length > 60 ||
    text.length < 1 ||
    text.length > 2000
  ) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const db = await getDb();
  await db.collection("comments").insertOne({
    slug,
    name,
    text,
    createdAt: new Date(),
    approved: false,
  });

  return NextResponse.json({ status: "submitted for review" }, { status: 201 });
}
```

- [ ] **Step 2: Implement `CommentList`**

Create `src/components/CommentList.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; name: string; text: string; createdAt: string };

export function CommentList({ slug, refreshKey }: { slug: string; refreshKey: number }) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then(setComments);
  }, [slug, refreshKey]);

  if (comments.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No comments yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <p className="text-sm font-semibold">{c.name}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 3: Implement `CommentBox`**

Create `src/components/CommentBox.tsx`:

```tsx
"use client";

import { useState } from "react";

export function CommentBox({
  slug,
  onSubmitted,
}: {
  slug: string;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, text }),
    });

    if (res.ok) {
      setStatus("done");
      setName("");
      setText("");
      onSubmitted();
    } else {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-4 text-sm text-green-600 dark:text-green-400">
        Thanks! Your comment is awaiting moderation.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        maxLength={60}
        className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comment"
        required
        maxLength={2000}
        rows={4}
        className="w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
      >
        {status === "submitting" ? "Submitting..." : "Submit comment"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Wire both into the post page**

Modify `src/app/blog/[slug]/page.tsx`: it needs to become a client-aware boundary for the refresh-after-submit behavior. Add a small client wrapper component `src/components/Comments.tsx`:

```tsx
"use client";

import { useState } from "react";
import { CommentList } from "./CommentList";
import { CommentBox } from "./CommentBox";

export function Comments({ slug }: { slug: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">Comments</h2>
      <CommentList slug={slug} refreshKey={refreshKey} />
      <CommentBox slug={slug} onSubmitted={() => setRefreshKey((k) => k + 1)} />
    </section>
  );
}
```

Move this file to `src/components/Comments.tsx` (fix the relative imports to `@/components/CommentList` and `@/components/CommentBox`). In `src/app/blog/[slug]/page.tsx`, import `Comments` from `@/components/Comments` and render `<Comments slug={post.slug} />` after `<ReactionBar slug={post.slug} />`.

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Visit `/blog/hello-world`. Confirm "No comments yet." renders. Submit a comment with a name and text — expect the "awaiting moderation" message, and the comment must NOT appear in the list (since it's unapproved). Run:

```bash
curl -s "http://localhost:3000/api/comments?slug=hello-world"
```

Expect an empty array `[]` (the submitted comment is unapproved, so it's excluded).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add comments feature with moderation queue"
```

---

### Task 8: Comment moderation admin page

**Files:**
- Create: `src/app/api/admin/comments/route.ts`
- Create: `src/app/admin/comments/page.tsx`

**Interfaces:**
- Consumes: `getDb()` from `src/lib/mongodb.ts` (Task 5); `process.env.ADMIN_PASSWORD`.
- Produces: `GET /api/admin/comments` (header `x-admin-password`) → pending comments `{ id, slug, name, text, createdAt }[]`, `401` if password header is missing/wrong. `PATCH /api/admin/comments` with body `{ id, action: "approve" | "reject" }` (same header) → `200` on success. `/admin/comments` is the password-gated UI consuming both.

- [ ] **Step 1: Implement the admin API route**

Create `src/app/api/admin/comments/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

function isAuthorized(request: NextRequest): boolean {
  const password = request.headers.get("x-admin-password");
  return Boolean(password) && password === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const pending = await db
    .collection("comments")
    .find({ approved: false })
    .sort({ createdAt: 1 })
    .toArray();

  return NextResponse.json(
    pending.map((c) => ({
      id: c._id.toString(),
      slug: c.slug,
      name: c.name,
      text: c.text,
      createdAt: c.createdAt,
    }))
  );
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id;
  const action = body?.action;

  if (typeof id !== "string" || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const db = await getDb();

  if (action === "approve") {
    await db.collection("comments").updateOne(
      { _id: new ObjectId(id) },
      { $set: { approved: true } }
    );
  } else {
    await db.collection("comments").deleteOne({ _id: new ObjectId(id) });
  }

  return NextResponse.json({ status: "ok" });
}
```

- [ ] **Step 2: Implement the moderation page**

Create `src/app/admin/comments/page.tsx`:

```tsx
"use client";

import { useState } from "react";

type PendingComment = {
  id: string;
  slug: string;
  name: string;
  text: string;
  createdAt: string;
};

export default function AdminCommentsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [error, setError] = useState("");

  async function login() {
    const res = await fetch("/api/admin/comments", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      setAuthed(true);
      setError("");
      setComments(await res.json());
    } else {
      setError("Wrong password");
    }
  }

  async function act(id: string, action: "approve" | "reject") {
    await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id, action }),
    });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold">Admin login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="mt-4 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={login}
          className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Log in
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Pending comments ({comments.length})</h1>
      <ul className="mt-6 space-y-6">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-gray-200 pb-4 dark:border-gray-800">
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

- [ ] **Step 3: Verify end-to-end**

With the dev server running and a pending comment already submitted from Task 7's verification (or submit a fresh one on `/blog/hello-world`):

1. Visit `/admin/comments`, enter the wrong password — expect "Wrong password".
2. Enter the correct `ADMIN_PASSWORD` from `.env.local` — expect the pending comment to appear.
3. Click "Approve" — expect it to disappear from the pending list.
4. Reload `/blog/hello-world` — expect the approved comment to now appear in the public comment list.
5. Run `curl -s "http://localhost:3000/api/comments?slug=hello-world"` — expect the approved comment's `name`/`text` in the JSON array.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add password-gated comment moderation page"
```

---

### Task 9: RSS feed, sitemap, and SEO metadata

**Files:**
- Create: `src/app/rss.xml/route.ts`
- Create: `src/app/sitemap.ts`
- Modify: `src/app/layout.tsx` (root `metadata` export)
- Modify: `src/app/blog/[slug]/page.tsx` (per-post `generateMetadata`)

**Interfaces:**
- Consumes: `getAllPosts()` from `src/lib/posts.ts` (Task 2).
- Produces: `/rss.xml` (valid RSS 2.0 XML), `/sitemap.xml` (via Next.js `MetadataRoute.Sitemap`), page `<title>`/`<meta description>` per route.

- [ ] **Step 1: Choose the site's canonical URL**

Add to `.env.local` and `.env.local.example`:

```
NEXT_PUBLIC_SITE_URL="https://your-project-name.vercel.app"
```

(Update this to the real Vercel URL once Task 10 assigns one — a placeholder is fine for now.)

- [ ] **Step 2: Implement the RSS route**

Create `src/app/rss.xml/route.ts`:

```ts
import { getAllPosts } from "@/lib/posts";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = getAllPosts();

  const items = posts
    .map(
      (post) => `
    <item>
      <title>${post.title}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${post.excerpt}</description>
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Engineering Blog</title>
    <link>${siteUrl}</link>
    <description>Notes on building things.</description>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

- [ ] **Step 3: Implement the sitemap**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const posts = getAllPosts();

  return [
    { url: siteUrl, lastModified: new Date() },
    { url: `${siteUrl}/blog`, lastModified: new Date() },
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    })),
  ];
}
```

- [ ] **Step 4: Add root and per-post metadata**

In `src/app/layout.tsx`, set the exported `metadata` object's `title` to `"Engineering Blog"` and `description` to `"Notes on building things."`.

In `src/app/blog/[slug]/page.tsx`, add:

```ts
export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

```bash
curl -s http://localhost:3000/rss.xml
curl -s http://localhost:3000/sitemap.xml
```

Expect valid XML from both, with `rss.xml` containing `<item>` entries for both posts and `sitemap.xml` listing the home page, `/blog`, and both post URLs. View page source of `/blog/hello-world` — expect `<title>Hello, World</title>`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add RSS feed, sitemap, and page metadata"
```

---

### Task 10: Deploy to Vercel

**Files:**
- Create: `README.md` (setup + deployment notes)
- No application code changes.

**Interfaces:**
- Consumes: the full app from Tasks 1–9.
- Produces: a live public URL serving the deployed blog.

- [ ] **Step 1: Push the repo to GitHub**

Create a new empty GitHub repository (via the GitHub website or `gh repo create`), then:

```bash
git remote add origin <your-new-repo-url>
git push -u origin main
```

- [ ] **Step 2: Import the project into Vercel**

In the Vercel dashboard: "Add New Project" → import the GitHub repo. Framework preset should auto-detect "Next.js" — accept the defaults for build/output settings.

- [ ] **Step 3: Set environment variables in Vercel**

In the Vercel project's Settings → Environment Variables, add for the "Production" (and "Preview") environment:

- `DATABASE_URL` — the real MongoDB Atlas connection string
- `ADMIN_PASSWORD` — the real admin password
- `NEXT_PUBLIC_SITE_URL` — the assigned `*.vercel.app` URL (Vercel shows this after first deploy; update this env var and redeploy once known)

- [ ] **Step 4: Deploy**

Trigger the deploy (Vercel deploys automatically on push, or click "Deploy" in the dashboard for the first run).

- [ ] **Step 5: Verify in production**

Once deployed, visit the live URL and confirm:

1. Home page and `/blog` list both posts.
2. `/blog/hello-world` renders with syntax highlighting.
3. Clicking an emoji reaction increments the count (confirms the live app can reach MongoDB Atlas).
4. Submitting a comment shows the "awaiting moderation" message.
5. `/admin/comments` with the real `ADMIN_PASSWORD` shows that pending comment; approving it makes it appear on the post.
6. `/rss.xml` and `/sitemap.xml` return valid XML using the real production URL.

- [ ] **Step 6: Write the README**

Create `README.md` documenting: how to run locally (`npm install`, copy `.env.local.example` to `.env.local`, fill in real values, `npm run dev`), how to add a new post (create a new `.mdx` file in `content/posts/`, commit, push — Vercel redeploys automatically), and where comments are moderated (`/admin/comments`).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add README with local setup and deployment instructions"
```

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-07-28-engineering-blog-design.md` maps to a task — content layer (Task 2–4), MongoDB comments/reactions (Task 5–8), error handling/security (input validation and cached client in Tasks 5–8, gitignored secrets in Task 1), testing approach (manual verification steps throughout, per the spec's explicit no-automated-suite decision), deployment (Task 10).
- **Type consistency:** `Post`/`PostFrontmatter`/`Paginated` defined once in `src/lib/types.ts` (Task 2) and reused verbatim in Tasks 3–4; `getDb()` signature defined once in Task 5 and reused identically in Tasks 6–8; the `reactions` shape `{ emoji, count }` and `comments` shape `{ id, slug, name, text, createdAt }` are each defined once and reused by their respective client components.
- **Out-of-scope items** from the spec (auth system, CAPTCHA, newsletter, custom domain) have no corresponding task, matching the spec's explicit exclusions.
