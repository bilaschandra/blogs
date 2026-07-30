"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { useAdminSession } from "@/lib/useAdminSession";

type PostData = {
  title: string;
  date: string;
  tags: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  sha: string;
};

export default function EditPostPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { user, loading } = useAdminSession();
  const [post, setPost] = useState<PostData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch(`/api/admin/posts/${params.slug}`).then(async (res) => {
      if (res.ok) {
        setPost(await res.json());
      } else {
        setError("Failed to load post");
      }
    });
  }, [user, params.slug]);

  if (loading || !user) return null;
  if (error) return <p className="mx-auto max-w-2xl px-4 py-16 text-red-600">{error}</p>;
  if (!post) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Edit post</h1>
      <PostForm
        mode="edit"
        slug={params.slug}
        initial={post}
        sha={post.sha}
        existingCoverImage={post.coverImage}
        onSaved={() => router.push("/admin/posts")}
      />
    </main>
  );
}
