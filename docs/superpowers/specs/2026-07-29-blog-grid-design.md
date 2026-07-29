# Responsive Card-Grid Blog Listing — Design

## Purpose

Fix the blog listing pages, which currently render posts as a single-column stacked list (one card per row, regardless of viewport width), into a responsive multi-column card grid matching the reference site (uber.com/us/en/blog/engineering/), with pagination capped at 25 posts per page on the main blog listing. This is a pure layout/structural change — no changes to `src/lib/posts.ts`, the data model, or any dynamic feature (reactions, comments, CMS).

An approved HTML mockup (reviewed and confirmed by the user) demonstrates the target layout; this spec translates it into exact changes to the real codebase.

## Root cause of the current bug

Every listing page (`/`, `/blog`, `/tags/[tag]`) wraps its posts in a `max-w-3xl` (768px) container — a width chosen for the single-column reading experience of the post *detail* page, but reused unchanged for the *listing* pages too. A 768px-wide column has no room for more than one card per row, regardless of how `PostCard` itself is styled. Widening the container is the actual fix; nothing about `PostCard`'s internals was broken.

## Changes

### 1. Widen listing containers, keep the post detail page as-is

- `src/components/SectionBanner.tsx`: widen its inner container from `max-w-3xl` to `max-w-6xl` (1152px). This component is shared by the home, blog, tags, and about pages — widening it once fixes the banner width everywhere it's used.
- `src/app/page.tsx` (home), `src/app/blog/page.tsx`, `src/app/tags/[tag]/page.tsx`: widen each page's post-list container from `max-w-3xl` to `max-w-6xl`, to match the now-wider banner above it and give the grid room to breathe.
- `src/app/about/page.tsx` and `src/app/blog/[slug]/page.tsx` (post detail): **unchanged** — these stay at `max-w-3xl` for comfortable reading-width prose. The About page's banner will be wider than its body paragraph as a result (an intentional, accepted trade-off — the banner's width doesn't need to match narrow prose content below it).

### 2. Responsive grid layout

- `src/app/page.tsx`, `src/app/blog/page.tsx`, `src/app/tags/[tag]/page.tsx`: replace the current plain stacked `<div>` wrapping the `PostCard` list with a CSS grid: 1 column below 640px, 2 columns from 640px, 3 columns from 1024px (Tailwind's default `sm`/`lg` breakpoints — no custom breakpoints needed).
- `src/components/PostCard.tsx`: remove the `border-b border-gray-200 py-6` styling on the card's outer `<article>` — that treatment assumed a vertically-stacked list separated by horizontal rules; in a grid, spacing comes from the grid's own gap, and a bottom border on a grid cell would look like a stray line under short cards. No other change to `PostCard`'s internals (image/fallback, tag pills, title, date all stay as they are).

### 3. Pagination cap

- `src/app/blog/page.tsx`: change `PER_PAGE` from `10` to `25`. `Pagination.tsx` and the `paginate()` utility already support this — only the constant changes.
- `/tags/[tag]` stays unpaginated (as it is today) — the user's request was specifically about the main `/blog` listing; tag pages get the same visual grid treatment for consistency but no new pagination behavior, since that wasn't part of the actual complaint and no tag page today has anywhere near enough posts to need it.
- Latest-first ordering is already correct in `getAllPosts()` (sorts by `date` descending) — no change needed.

## Explicitly out of scope

- Any change to `src/lib/posts.ts`, the `Post`/`PostFrontmatter` types, or how posts are read/sorted/filtered.
- Pagination on the home page or tag pages.
- Any change to the post detail page's layout (hero, cover image, MDX rendering, reactions, comments) — that was redesigned separately and isn't part of this fix.
- Card content changes (still image/fallback, tag pills, title, date — no excerpt, no author, matching the existing approved card design).
