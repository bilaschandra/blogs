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
