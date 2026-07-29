import { NextRequest, NextResponse } from "next/server";
import matter from "gray-matter";
import { isAuthorized } from "@/lib/adminAuth";
import {
  getFile,
  putFile,
  deleteFile,
  encodeBase64,
  decodeBase64,
  extensionFromFilename,
  GitHubConflictError,
} from "@/lib/github";

const SLUG_PATTERN = /^[a-z0-9-]+$/;

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_PATTERN.test(params.slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  let file;
  try {
    file = await getFile(`content/posts/${params.slug}.mdx`);
  } catch (err) {
    console.error("Failed to fetch post:", err);
    return NextResponse.json({ error: "failed to fetch post" }, { status: 502 });
  }
  if (!file) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data, content } = matter(decodeBase64(file.contentBase64));
  return NextResponse.json({
    title: data.title,
    date: data.date,
    tags: ((data.tags as string[]) ?? []).join(", "),
    excerpt: data.excerpt,
    coverImage: (data.coverImage as string) ?? null,
    content,
    sha: file.sha,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_PATTERN.test(params.slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body?.excerpt === "string" ? body.excerpt.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const date = typeof body?.date === "string" ? body.date : "";
  const sha = typeof body?.sha === "string" ? body.sha : "";
  const tags: string[] =
    typeof body?.tags === "string"
      ? body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];
  const coverImageBase64 = typeof body?.coverImageBase64 === "string" ? body.coverImageBase64 : undefined;
  const coverImageFilename = typeof body?.coverImageFilename === "string" ? body.coverImageFilename : undefined;
  const existingCoverImage = typeof body?.existingCoverImage === "string" ? body.existingCoverImage : undefined;

  if (!title || !excerpt || !content || !date || !sha) {
    return NextResponse.json(
      { error: "title, excerpt, content, date, and sha are required" },
      { status: 400 }
    );
  }

  try {
    let coverImage = existingCoverImage;
    let ext: string | undefined;
    if (coverImageBase64 && coverImageFilename) {
      ext = extensionFromFilename(coverImageFilename);
      coverImage = `/images/posts/${params.slug}.${ext}`;
    }

    const frontmatter: Record<string, unknown> = { title, date, tags, excerpt };
    if (coverImage) frontmatter.coverImage = coverImage;
    const fileContent = matter.stringify(content, frontmatter);
    await putFile(
      `content/posts/${params.slug}.mdx`,
      encodeBase64(fileContent),
      `Update post: ${title}`,
      sha
    );

    if (coverImageBase64 && coverImageFilename && ext) {
      const existingImageFile = await getFile(`public/images/posts/${params.slug}.${ext}`).catch(
        () => null
      );
      await putFile(
        `public/images/posts/${params.slug}.${ext}`,
        coverImageBase64,
        `Update cover image for ${params.slug}`,
        existingImageFile?.sha
      );
    }

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    if (err instanceof GitHubConflictError) {
      return NextResponse.json(
        { error: "this post changed elsewhere — refresh and try again" },
        { status: 409 }
      );
    }
    console.error("Failed to update post:", err);
    return NextResponse.json({ error: "failed to update post" }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { slug: string } }) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!SLUG_PATTERN.test(params.slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const sha = typeof body?.sha === "string" ? body.sha : "";
  if (!sha) {
    return NextResponse.json({ error: "sha is required" }, { status: 400 });
  }

  try {
    await deleteFile(`content/posts/${params.slug}.mdx`, sha, `Delete post: ${params.slug}`);
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    if (err instanceof GitHubConflictError) {
      return NextResponse.json(
        { error: "this post changed elsewhere — refresh and try again" },
        { status: 409 }
      );
    }
    console.error("Failed to delete post:", err);
    return NextResponse.json({ error: "failed to delete post" }, { status: 502 });
  }
}
