import { notFound } from "next/navigation";
import Image from "next/image";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { mdxOptions } from "@/lib/mdx";

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
      </div>
    </article>
  );
}
