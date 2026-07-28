import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";
import { ReactionBar } from "@/components/ReactionBar";
import { Comments } from "@/components/Comments";

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
      <ReactionBar slug={post.slug} />
      <Comments slug={post.slug} />
    </article>
  );
}
