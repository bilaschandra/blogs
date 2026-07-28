# Uber-Style Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the existing blog (black header/footer, white body, light-gray section banners, blue tag accents, bold geometric headings, cover-image-driven post cards) to visually match uber.com/us/en/blog/engineering/, and remove the light/dark mode toggle in favor of one fixed look.

**Architecture:** Pure frontend/visual change — no backend, database, or API route changes. New Tailwind color/font tokens drive a new `SectionBanner` component and restyled `Header`, `Footer`, `PostCard`, and post-detail hero. `PostFrontmatter` gains an optional `coverImage` field with graceful fallback rendering (a plain dark block) when absent, so the two existing sample posts need no content changes.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS 3.4, `next/font/google` (Space Grotesk), `next/image`.

## Global Constraints

- Colors: `#000000` (header/footer bg), `#F3F3F3` (section banner bg), `#EFF4FE` (tag pill bg), `#175BCC` (tag pill text / accent), `#6B6B6B` (secondary/date text) — exact values from the approved spec (`docs/superpowers/specs/2026-07-28-uber-style-redesign-design.md`).
- Headings use Space Grotesk (bold, geometric sans); body text keeps the existing font.
- Dark mode is removed entirely: delete `ThemeToggle`, remove `darkMode: "class"` from `tailwind.config.ts`, and remove every `dark:`-prefixed class and the `prefers-color-scheme` media query in `globals.css`.
- `coverImage` on `PostFrontmatter`/`Post` is **optional** — absence must render a plain dark placeholder block, never a broken image or a build error.
- No author byline, no tags on the post detail page (tags stay listing/card-only).
- No changes to MongoDB, API routes, or comment/reaction logic — restyling only.
- No automated test suite for this project (per approved spec) — every task's testable deliverable is manual verification via the dev server, not Jest/Vitest.

---

## File Structure

```
tailwind.config.ts                  # modify: remove darkMode, add color/font tokens
src/app/globals.css                 # modify: remove dark-mode CSS, simplify
src/app/layout.tsx                  # modify: add Space Grotesk font, flat bg-white
src/components/Header.tsx           # modify: black bg, remove ThemeToggle
src/components/Footer.tsx           # modify: black bg, nav links
src/components/ThemeToggle.tsx      # delete
src/components/SectionBanner.tsx    # create: light-gray banner component
src/app/page.tsx                    # modify: use SectionBanner
src/app/blog/page.tsx               # modify: use SectionBanner
src/app/tags/[tag]/page.tsx         # modify: use SectionBanner
src/app/about/page.tsx              # modify: use SectionBanner
src/lib/types.ts                    # modify: add optional coverImage field
src/components/PostCard.tsx         # modify: cover image, blue tag pills, bold title
src/app/blog/[slug]/page.tsx        # modify: centered hero, cover image, drop dark:prose-invert
src/components/ReactionBar.tsx      # modify: remove dark:, add blue hover accent
src/components/CommentBox.tsx       # modify: remove dark:, black button
src/components/CommentList.tsx      # modify: remove dark:
src/app/admin/comments/page.tsx     # modify: remove dark: (no functional change)
```

---

### Task 1: Design tokens, fonts, and black Header/Footer

**Files:**
- Modify: `tailwind.config.ts` (all 22 lines — remove `darkMode`, add `colors`/`fontFamily`)
- Modify: `src/app/globals.css` (all 33 lines — remove dark-mode CSS, simplify to Tailwind directives + existing utility)
- Modify: `src/app/layout.tsx:1-28`
- Modify: `src/components/Header.tsx:1-17`
- Modify: `src/components/Footer.tsx:1-7`
- Delete: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Produces: Tailwind color classes `bg-uber-black`, `bg-uber-banner`, `bg-uber-tag-bg`, `text-uber-tag-text`, `text-uber-gray`; font class `font-heading` (Space Grotesk). Every later task in this plan uses these exact class names.
- Consumes: nothing new (this is the foundation task).

- [ ] **Step 1: Update Tailwind config with color/font tokens, remove dark mode**

Replace `tailwind.config.ts` in full:

```ts
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "uber-black": "#000000",
        "uber-banner": "#F3F3F3",
        "uber-tag-bg": "#EFF4FE",
        "uber-tag-text": "#175BCC",
        "uber-gray": "#6B6B6B",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [typography],
};
export default config;
```

- [ ] **Step 2: Simplify globals.css — remove dark-mode CSS**

Replace `src/app/globals.css` in full:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

- [ ] **Step 3: Add Space Grotesk font and flat white background in the root layout**

Replace `src/app/layout.tsx` in full:

```tsx
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Engineering Blog",
  description: "Notes on building things.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${spaceGrotesk.variable} bg-white text-black`}>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Redesign the Header — black background, no theme toggle**

Replace `src/components/Header.tsx` in full:

```tsx
import Link from "next/link";

export function Header() {
  return (
    <header className="bg-uber-black">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/" className="font-heading text-lg font-bold text-white">
          Engineering Blog
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Redesign the Footer — black background, nav links + copyright**

Replace `src/components/Footer.tsx` in full:

```tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-uber-black">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-gray-400">
        <nav className="flex gap-4 text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
        </nav>
        <p>© {new Date().getFullYear()} — Engineering Blog</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Delete ThemeToggle**

```bash
rm src/components/ThemeToggle.tsx
```

- [ ] **Step 7: Verify**

```bash
npm run dev
```

Visit `http://localhost:3000/`. Confirm: header has a black background with a white "Engineering Blog" wordmark (bold, geometric font — visibly different from the body text font) on the left and white `Blog`/`About` links on the right; there is no sun/moon toggle button anywhere. Scroll to the footer: black background, white `Blog`/`About` links, and a gray copyright line below them. No console errors. Then run:

```bash
npm run build
```

Expect a clean build (this will fail loudly if `ThemeToggle` is still imported anywhere — confirming the deletion didn't leave a dangling import).

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts src/app/globals.css src/app/layout.tsx src/components/Header.tsx src/components/Footer.tsx
git rm src/components/ThemeToggle.tsx
git commit -m "Redesign Header/Footer with Uber-style black branding, remove dark mode"
```

---

### Task 2: SectionBanner component

**Files:**
- Create: `src/components/SectionBanner.tsx`
- Modify: `src/app/page.tsx:1-20`
- Modify: `src/app/blog/page.tsx:1-26`
- Modify: `src/app/tags/[tag]/page.tsx:1-18`
- Modify: `src/app/about/page.tsx:1-11`

**Interfaces:**
- Consumes: Tailwind tokens `bg-uber-banner`, `font-heading` from Task 1.
- Produces: `SectionBanner({ title: string })` — a light-gray full-width band with a large bold title. Used by all four pages below; no other task depends on this component's internals beyond the `title` prop.

- [ ] **Step 1: Create the SectionBanner component**

Create `src/components/SectionBanner.tsx`:

```tsx
export function SectionBanner({ title }: { title: string }) {
  return (
    <div className="bg-uber-banner">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-heading text-4xl font-bold text-black">{title}</h1>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use it on the home page**

Replace `src/app/page.tsx` in full:

```tsx
import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SectionBanner } from "@/components/SectionBanner";

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5);

  return (
    <main>
      <SectionBanner title="Notes on building things" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Use it on the blog listing page**

Replace `src/app/blog/page.tsx` in full:

```tsx
import { getAllPosts, paginate } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";
import { SectionBanner } from "@/components/SectionBanner";

const PER_PAGE = 10;

export default function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { items, currentPage, totalPages } = paginate(getAllPosts(), page, PER_PAGE);

  return (
    <main>
      <SectionBanner title="All Posts" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Use it on the tag page**

Replace `src/app/tags/[tag]/page.tsx` in full:

```tsx
import { getPostsByTag } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SectionBanner } from "@/components/SectionBanner";

export default function TagPage({ params }: { params: { tag: string } }) {
  const posts = getPostsByTag(params.tag);

  return (
    <main>
      <SectionBanner title={`Tag: ${params.tag}`} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {posts.length === 0 && <p className="text-gray-500">No posts yet.</p>}
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Use it on the about page**

Replace `src/app/about/page.tsx` in full:

```tsx
import { SectionBanner } from "@/components/SectionBanner";

export default function AboutPage() {
  return (
    <main>
      <SectionBanner title="About" />
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-gray-600">
          This is a personal engineering blog — notes on building things,
          written by one person, for anyone who finds them useful.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Verify**

```bash
npm run dev
```

Visit `/`, `/blog`, `/tags/meta`, and `/about`. Confirm each shows a light-gray band directly under the black header, with a large bold title: "Notes on building things", "All Posts", "Tag: meta", and "About" respectively. Confirm the home page's title is NOT "Engineering Blog" (that text already appears in the header directly above — the banner title must be visibly different text). No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/SectionBanner.tsx src/app/page.tsx src/app/blog/page.tsx "src/app/tags/[tag]/page.tsx" src/app/about/page.tsx
git commit -m "Add SectionBanner and use it on home, blog, tags, and about pages"
```

---

### Task 3: Cover images on PostCard

**Files:**
- Modify: `src/lib/types.ts:1-6` (the `PostFrontmatter` type only)
- Modify: `src/components/PostCard.tsx:1-25`

**Interfaces:**
- Consumes: `Post` type from `src/lib/types.ts` (Task-2-independent, already exists); Tailwind tokens from Task 1.
- Produces: `PostCard` now expects `post.coverImage?: string`. Task 4 (post detail page) uses the same optional-field/fallback-block pattern — keep the fallback markup shape (`aspect-video` + solid `bg-uber-black` div) identical between the two so they look consistent.

- [ ] **Step 1: Add the optional coverImage field**

Modify `src/lib/types.ts` — add one line to `PostFrontmatter`:

```ts
export type PostFrontmatter = {
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  coverImage?: string;
};
```

(Leave `Post` and `Paginated<T>` below it unchanged.)

- [ ] **Step 2: Redesign PostCard**

Replace `src/components/PostCard.tsx` in full:

```tsx
import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="border-b border-gray-200 py-6">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-video w-full overflow-hidden rounded">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
        ) : (
          <div className="h-full w-full bg-uber-black" />
        )}
      </Link>
      <div className="mt-3 flex gap-2">
        {post.tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${tag}`}
            className="rounded bg-uber-tag-bg px-2 py-0.5 text-xs font-semibold text-uber-tag-text"
          >
            {tag}
          </Link>
        ))}
      </div>
      <Link
        href={`/blog/${post.slug}`}
        className="mt-2 block line-clamp-2 font-heading text-xl font-bold text-black hover:underline"
      >
        {post.title}
      </Link>
      <p className="mt-1 text-sm text-uber-gray">{post.date}</p>
    </article>
  );
}
```

Note: this intentionally drops the plain-text excerpt line that used to render below the title — the approved redesign spec's card layout (image, tags, title, date) doesn't include it, matching the reference site's actual cards. `post.excerpt` itself is untouched in the data model (still used for `<meta description>` via `generateMetadata` and for `rss.xml`) — only its rendering on the card is removed.

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Visit `/`, `/blog`, and `/tags/meta`. Confirm every card shows: a solid black block where the cover image would be (neither sample post has `coverImage` set, so this exercises the fallback path), tag pills with a light-blue background and blue text directly below the image block, a bold black title, and a gray date below the title — with no excerpt text visible. Click a card's image and its title — both must navigate to the post. No console errors, no broken-image icons.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/components/PostCard.tsx
git commit -m "Add optional coverImage field and redesign PostCard"
```

---

### Task 4: Post detail page hero redesign

**Files:**
- Modify: `src/app/blog/[slug]/page.tsx:1-33`

**Interfaces:**
- Consumes: `Post.coverImage` (Task 3); `mdxOptions` from `src/lib/mdx.ts` (unchanged, existing); `ReactionBar`/`Comments` components (unchanged, existing).
- Produces: no new exports — this task only changes this page's JSX structure. Tasks 5 restyles `ReactionBar`/`CommentBox`/`CommentList` but does not change how this page renders them.

- [ ] **Step 1: Restructure the post page into a centered hero + cover image + body**

Replace `src/app/blog/[slug]/page.tsx` in full:

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { ReactionBar } from "@/components/ReactionBar";
import { Comments } from "@/components/Comments";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}

export default function PostPage({ params }: { params: { slug: string } }) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article>
      <div className="mx-auto max-w-3xl px-4 pt-16 text-center">
        <p className="text-sm text-uber-gray">{post.date}</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-black">{post.title}</h1>
      </div>
      <div className="relative mx-auto mt-8 aspect-video w-full max-w-3xl overflow-hidden rounded">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
        ) : (
          <div className="h-full w-full bg-uber-black" />
        )}
      </div>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="prose mt-8">
          <MDXRemote source={post.content} options={mdxOptions} />
        </div>
        <ReactionBar slug={post.slug} />
        <Comments slug={post.slug} />
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Visit `/blog/hello-world`. Confirm: date is centered above the title, title is centered, bold, and large; directly below is a solid black block (16:9) since this post has no `coverImage`; below that, the MDX content renders with syntax highlighting intact, followed by the reaction buttons and comments section. Repeat for `/blog/why-this-blog-exists`. No tags are shown anywhere on either post page. No console errors.

- [ ] **Step 3: Commit**

```bash
git add "src/app/blog/[slug]/page.tsx"
git commit -m "Redesign post detail page with centered hero and cover image"
```

---

### Task 5: Restyle dynamic components (reactions, comments, admin)

**Files:**
- Modify: `src/components/ReactionBar.tsx:39-53` (the returned JSX block only)
- Modify: `src/components/CommentBox.tsx:36-74` (the returned JSX blocks only)
- Modify: `src/components/CommentList.tsx:16-29` (the returned JSX blocks only)
- Modify: `src/app/admin/comments/page.tsx:48-99` (the returned JSX blocks only)

**Interfaces:**
- Consumes: Tailwind tokens `uber-tag-text`, `uber-black` from Task 1.
- Produces: no changes to any function signature, prop, state, or fetch logic in any of these four files — this task is a pure JSX/className edit. Behavior (what happens on click/submit) must be byte-for-byte identical before and after.

- [ ] **Step 1: Restyle ReactionBar — remove dark:, add blue hover accent**

In `src/components/ReactionBar.tsx`, replace the `return (...)` block (currently lines 39-53) with:

```tsx
  return (
    <div className="mt-8 flex gap-3">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => react(r.emoji)}
          disabled={clicked.has(r.emoji)}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm transition-colors enabled:hover:border-uber-tag-text enabled:hover:text-uber-tag-text disabled:opacity-60"
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
```

Everything above this (the `useState`/`useEffect`/`react()` function) is unchanged.

- [ ] **Step 2: Restyle CommentBox — remove dark:, black submit button**

In `src/components/CommentBox.tsx`, replace the two `return (...)` blocks (currently lines 36-42 and 44-74) with:

```tsx
  if (status === "done") {
    return (
      <p className="mt-4 text-sm text-green-600">
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
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comment"
        required
        maxLength={2000}
        rows={4}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : "Submit comment"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Try again.</p>
      )}
    </form>
  );
```

Everything above this (the `useState`s and `submit()` function) is unchanged.

- [ ] **Step 3: Restyle CommentList — remove dark:**

In `src/components/CommentList.tsx`, replace the two `return (...)` blocks (currently lines 16-18 and 20-29) with:

```tsx
  if (comments.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No comments yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="border-b border-gray-200 pb-3">
          <p className="text-sm font-semibold">{c.name}</p>
          <p className="text-sm text-gray-700">{c.text}</p>
        </li>
      ))}
    </ul>
  );
```

Everything above this (the `useState`/`useEffect`) is unchanged.

- [ ] **Step 4: Restyle the admin comments page — remove dark:**

In `src/app/admin/comments/page.tsx`, replace the two `return (...)` blocks (currently lines 48-67 and 70-99) with:

```tsx
  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold">Admin login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="mt-4 w-full rounded border border-gray-300 px-3 py-2"
        />
        <button
          onClick={login}
          className="mt-2 rounded bg-uber-black px-4 py-2 text-sm text-white"
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
```

Everything above this (the `useState`s, `login()`, `act()` functions) is unchanged.

- [ ] **Step 5: Verify — restyled AND still functional**

```bash
npm run dev
```

On `/blog/hello-world`: click an emoji reaction — confirm the count still increments and the button still disables (hover over an un-clicked reaction button first and confirm its border/text turns blue). Submit a comment — confirm the "awaiting moderation" message still appears in green text. On `/admin/comments`: log in with the wrong password (still shows "Wrong password"), then the correct password (from `.env.local`) — confirm the pending comment from the submission above appears, and Approve/Reject still work (approving makes it visible on the post via a `curl` to `/api/comments?slug=hello-world`). No `dark:`-prefixed classes should remain anywhere — confirm with:

```bash
grep -rn "dark:" src/
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/components/ReactionBar.tsx src/components/CommentBox.tsx src/components/CommentList.tsx src/app/admin/comments/page.tsx
git commit -m "Restyle reactions, comments, and admin page; remove remaining dark: classes"
```

---

### Task 6: Full-site regression pass

**Files:** none created or modified — this task is verification-only across everything Tasks 1-5 touched.

**Interfaces:** none — this task consumes the finished output of Tasks 1-5 and produces no code.

- [ ] **Step 1: Full build and lint**

```bash
npm run lint
npm run build
```

Expected: both clean, no errors or warnings.

- [ ] **Step 2: Confirm no dark-mode remnants anywhere**

```bash
grep -rn "dark:" src/
grep -rn "prefers-color-scheme" src/
grep -rn "ThemeToggle" src/
```

Expected: no output from any of the three commands.

- [ ] **Step 3: Click through every page**

```bash
npm run dev
```

Visit and visually confirm the black-header/white-body/blue-accent look is consistent on: `/` (home), `/blog` (listing), `/blog/hello-world` and `/blog/why-this-blog-exists` (post pages), `/tags/meta` and `/tags/writing` (tag pages), `/about`, and `/admin/comments` (login screen — functional styling only, not part of the brand redesign per the spec's explicit scope note). Confirm there is no visual flash or mismatch between the black header/footer and the rest of each page, and that Space Grotesk is visibly applied to all headings (wordmark, banner titles, post titles, card titles) but NOT to body paragraph text.

- [ ] **Step 4: Commit (only if Step 1-3 surfaced fixes)**

If everything passed with no changes needed, there is nothing to commit for this task — it's a verification pass. If a fix was needed, commit it with a message describing what regression it closes.
