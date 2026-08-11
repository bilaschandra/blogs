import Link from "next/link";
import Image from "next/image";
import type { Post } from "@/lib/types";

const MAX_VISIBLE_TAGS = 3;

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col">
      <Link href={`/blog/${post.slug}`} className="relative block aspect-video w-full overflow-hidden rounded">
        {post.coverImage ? (
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
        ) : (
          <div className="h-full w-full bg-uber-black" />
        )}
      </Link>
      <div className="mt-3 flex flex-wrap gap-2">
        {post.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
          <Link
            key={tag}
            href={`/tags/${tag}`}
            className="rounded bg-uber-tag-bg px-2 py-0.5 text-xs font-semibold text-uber-tag-text"
          >
            {tag}
          </Link>
        ))}
        {post.tags.length > MAX_VISIBLE_TAGS && (
          <Link
            href={`/blog/${post.slug}`}
            className="rounded bg-uber-tag-bg px-2 py-0.5 text-xs font-semibold text-uber-tag-text"
          >
            +{post.tags.length - MAX_VISIBLE_TAGS}
          </Link>
        )}
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
