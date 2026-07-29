import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { isAuthorized } from "@/lib/adminAuth";
import { slugify } from "@/lib/slugify";
import {
  listPostFiles,
  getFile,
  putFile,
  encodeBase64,
  decodeBase64,
  GitHubConflictError,
} from "@/lib/github";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const files = await listPostFiles();
    const posts = await Promise.all(
      files.map(async (f) => {
        const slug = f.name.replace(/\.mdx$/, "");
        const file = await getFile(`content/posts/${f.name}`);
        if (!file) return null;
        const { data } = matter(decodeBase64(file.contentBase64));
        return {
          slug,
          title: data.title as string,
          date: data.date as string,
          tags: (data.tags as string[]) ?? [],
        };
      })
    );
    const found = posts.filter((p): p is NonNullable<typeof p> => p !== null);
    found.sort((a, b) => (a.date < b.date ? 1 : -1));
    return NextResponse.json(found);
  } catch (err) {
    console.error("Failed to list posts:", err);
    return NextResponse.json({ error: "failed to list posts" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body?.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const date =
    typeof body?.date === "string" && body.date
      ? body.date
      : new Date().toISOString().slice(0, 10);
  const tags: string[] =
    typeof body?.tags === "string"
      ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];
  const coverImageBase64 = typeof body?.coverImageBase64 === "string" ? body.coverImageBase64 : undefined;
  const coverImageFilename = typeof body?.coverImageFilename === "string" ? body.coverImageFilename : undefined;

  if (!title || !excerpt || !content) {
    return NextResponse.json(
      { error: "title, excerpt, and content are required" },
      { status: 400 }
    );
  }

  const slug = slugify(title);
  if (!slug) {
    return NextResponse.json(
      { error: "title must contain at least one letter or number" },
      { status: 400 }
    );
  }

  const existing = await getFile(`content/posts/${slug}.mdx`).catch(() => null);
  if (existing) {
    return NextResponse.json(
      { error: `a post with slug "${slug}" already exists` },
      { status: 400 }
    );
  }

  try {
    let coverImage: string | undefined;
    if (coverImageBase64 && coverImageFilename) {
      const parts = coverImageFilename.split(".");
      const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
      coverImage = `/images/posts/${slug}.${ext}`;
      await putFile(
        `public/images/posts/${slug}.${ext}`,
        coverImageBase64,
        `Add cover image for ${slug}`
      );
    }

    const frontmatter: Record<string, unknown> = { title, date, tags, excerpt };
    if (coverImage) frontmatter.coverImage = coverImage;
    const fileContent = matter.stringify(content, frontmatter);
    await putFile(`content/posts/${slug}.mdx`, encodeBase64(fileContent), `Add post: ${title}`);

    return NextResponse.json({ slug }, { status: 201 });
  } catch (err) {
    if (err instanceof GitHubConflictError) {
      return NextResponse.json({ error: "conflict creating post, try again" }, { status: 409 });
    }
    console.error("Failed to create post:", err);
    return NextResponse.json({ error: "failed to create post" }, { status: 502 });
  }
}
