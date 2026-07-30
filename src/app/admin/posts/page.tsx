"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminSession } from "@/lib/useAdminSession";

type PostSummary = { slug: string; title: string; date: string; tags: string[] };

export default function AdminPostsPage() {
  const { user, loading } = useAdminSession();
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/posts").then(async (res) => {
      if (res.ok) setPosts(await res.json());
    });
  }, [user]);

  async function remove(slug: string) {
    const getRes = await fetch(`/api/admin/posts/${slug}`);
    if (!getRes.ok) {
      setError("Failed to load post for deletion");
      return;
    }
    const { sha } = await getRes.json();
    const res = await fetch(`/api/admin/posts/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sha }),
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete post");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (loading || !user) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Posts ({posts.length})</h1>
        <div className="flex items-center gap-4">
          <Link href="/admin/posts/new" className="rounded bg-uber-black px-3 py-1.5 text-sm text-white">
            New Post
          </Link>
          <button onClick={logout} className="text-sm text-gray-500 underline">
            Log out
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-4">
        {posts.map((p) => (
          <li key={p.slug} className="border-b border-gray-200 pb-4">
            <p className="font-semibold">{p.title}</p>
            <p className="text-sm text-gray-500">
              {p.date} — {p.tags.join(", ")}
            </p>
            <div className="mt-2 flex gap-2">
              <Link
                href={`/admin/posts/${p.slug}/edit`}
                className="rounded bg-gray-200 px-3 py-1 text-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => remove(p.slug)}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
