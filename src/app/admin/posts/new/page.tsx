"use client";

import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { useAdminSession } from "@/lib/useAdminSession";

export default function NewPostPage() {
  const router = useRouter();
  const { user, loading } = useAdminSession();

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">New post</h1>
      <PostForm mode="create" onSaved={() => router.push("/admin/posts")} />
    </main>
  );
}
