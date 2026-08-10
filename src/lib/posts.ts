import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { Post, Paginated } from "./types";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");
const POST_EXTENSIONS = [".md", ".mdx"];

function getPostSlugs(): string[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((file) => POST_EXTENSIONS.includes(path.extname(file)))
    .map((file) => file.replace(/\.mdx?$/, ""));
}

function resolvePostPath(slug: string): string | null {
  for (const ext of POST_EXTENSIONS) {
    const filePath = path.join(POSTS_DIR, `${slug}${ext}`);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "");
}

function toExcerpt(data: Record<string, unknown>, content: string): string {
  if (typeof data.excerpt === "string") return data.excerpt;
  if (typeof data.description === "string") return data.description;
  const text = content.replace(/[#>*`_-]/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = resolvePostPath(slug);
  if (!filePath) return null;

  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  return {
    slug,
    content,
    title: typeof data.title === "string" ? data.title : slug,
    date: toDateString(data.date),
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    excerpt: toExcerpt(data, content),
    coverImage: typeof data.coverImage === "string" ? data.coverImage : undefined,
  };
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
