# Uber-Style Visual Redesign — Design

## Purpose

Restyle the existing blog to visually match the reference site (uber.com/us/en/blog/engineering/): black header/footer, white content area, light-gray section banners, blue tag accents, bold geometric headings, and cover-image-driven post cards. This is a visual/structural redesign of existing pages and components — no new dynamic features, no changes to the comments/reactions backend logic.

This is the first of three related pieces of work (decided together, brainstormed separately):
1. **This redesign** (visual/structural).
2. A future web-based admin CMS for writing posts and uploading cover images from the browser, without a code deploy (separate brainstorm — out of scope here).
3. A future Open Graph card image per post (separate brainstorm — out of scope here, but will reuse this design's color palette once built).

## Reference colors (extracted from uber.com/us/en/blog/engineering/)

| Token | Value | Used for |
|---|---|---|
| `uber-black` | `#000000` | Header, footer background |
| `uber-white` | `#FFFFFF` | Page/content background |
| `uber-banner-bg` | `#F3F3F3` | Section banner background (blog listing, tags, home, about) |
| `uber-tag-bg` | `#EFF4FE` | Tag pill background |
| `uber-tag-text` | `#175BCC` | Tag pill text, link/accent color |
| `uber-gray-text` | `#6B6B6B` | Secondary text (dates) |

## Typography

- Headings: **Space Grotesk** (bold geometric sans, close visual match to Uber's proprietary typeface), loaded via `next/font/google` in `src/app/layout.tsx`, applied as a CSS variable/Tailwind font family for headings only.
- Body text: unchanged (current system sans stack).

## Dark mode removal

The existing light/dark toggle is removed entirely — one fixed look for everyone, matching the reference site (which has no toggle).

- Delete `src/components/ThemeToggle.tsx`.
- Remove `darkMode: "class"` from `tailwind.config.ts`.
- Remove every `dark:`-prefixed Tailwind class across the codebase (dead code once the toggle is gone): `Header.tsx`, `Footer.tsx`, `PostCard.tsx`, `Pagination.tsx`, `layout.tsx`, `page.tsx`, `blog/page.tsx`, `blog/[slug]/page.tsx`, `tags/[tag]/page.tsx`, `about/page.tsx`, `admin/comments/page.tsx`, `ReactionBar.tsx`, `CommentBox.tsx`, `CommentList.tsx`, `Comments.tsx`, `globals.css`.

## Components

### Header (`src/components/Header.tsx`)

Black background, full width. Left: "Engineering Blog" wordmark, white, bold (Space Grotesk). Right: `Blog` and `About` links, white text. No login/signup (not applicable — no user accounts on this site). No theme toggle.

### Footer (`src/components/Footer.tsx`)

Black background, full width. A copyright line (`© {year} — Engineering Blog`) and `Blog` / `About` links, in white/light-gray text. Deliberately NOT a copy of Uber's full corporate mega-footer (investors, app store badges, social icons, language picker) — those are irrelevant to a personal blog. Only the black-background visual treatment is carried over.

### SectionBanner (new: `src/components/SectionBanner.tsx`)

A light-gray (`uber-banner-bg`) full-width band containing a large bold title (Space Grotesk), matching the reference site's category-page header. Takes a single `title` prop. Used on:
- `/blog` — title "All Posts"
- `/tags/[tag]` — title `Tag: {tag}`
- `/` (home) — title "Notes on building things" (the site's existing tagline; deliberately not "Engineering Blog" again, since the header wordmark directly above already shows that exact text)
- `/about` — title "About"

Replaces the current plain `<h1>` heading block on each of those pages.

### PostCard (`src/components/PostCard.tsx`)

- Cover image on top, 16:9 aspect ratio, rounded top corners, `object-cover`. If `post.coverImage` is absent, renders a plain solid-dark (`uber-black`) block of the same dimensions instead of a broken `<img>` — no placeholder text or icon, just the block.
- Tag pills directly below the image: `uber-tag-bg` background, `uber-tag-text` text, rounded, small/bold, one pill per tag (same visual treatment as the reference site's category badges).
- Title: bold black, Space Grotesk, 2-line clamp.
- Date: `uber-gray-text`, small, below the title.

### Post detail page (`src/app/blog/[slug]/page.tsx`)

Restructured hero section, before the existing MDX content:
1. Date, centered, small, `uber-gray-text`.
2. Title, centered, bold, large (Space Grotesk).
3. Cover image, full content-width, same fallback-to-dark-block behavior as `PostCard`, directly below the title.

No author byline (single-author blog — redundant, and no avatar image exists). No tags shown on the post page itself (tags remain a listing/card-only element, matching the reference site's actual article pages, which also don't show tags on the article itself).

Below the hero: existing MDX-rendered content (unchanged), then `ReactionBar`, then `Comments` — both restyled to drop `dark:` classes and adopt the accent color (e.g. reaction buttons highlight with `uber-tag-text` on hover/active instead of generic gray).

### Pagination (`src/components/Pagination.tsx`)

Visual pass only (recolor to drop `dark:` classes) — structure and behavior (Newer/Older, page X of Y) unchanged.

### Admin page (`src/app/admin/comments/page.tsx`)

Functionally unchanged — this is an internal tool only the blog's author sees, not brand-facing. `dark:` classes removed (dead code cleanup) but no other visual redesign applied here.

## Data model change

`PostFrontmatter`/`Post` (`src/lib/types.ts`) gains one new optional field:

```ts
coverImage?: string; // path under public/images/posts/, e.g. "/images/posts/my-post.jpg"
```

No change to `src/lib/posts.ts`'s parsing logic — `gray-matter` already passes through arbitrary frontmatter fields, and the field being optional means the two existing sample posts (`hello-world.mdx`, `why-this-blog-exists.mdx`) need no changes; they simply render the fallback dark block wherever a cover image would go.

## Explicitly out of scope (for now)

- Admin CMS / web-based post authoring (separate future brainstorm).
- OG image generation (separate future brainstorm; will reuse this design's palette).
- Any change to comment/reaction backend logic, MongoDB schema, or API routes — this is a pure frontend/visual change.
- Sourcing or generating actual cover images for existing posts — the user will supply images per-post over time; the fallback block handles their absence in the meantime.
