"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredPassword, storePassword } from "@/lib/adminSession";

type PostSummary = { slug: string; title: string; date: string; tags: string[] };

export default function AdminPostsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredPassword();
    if (!stored) return;
    setPassword(stored);
    fetch("/api/admin/posts", { headers: { "x-admin-password": stored } }).then((res) => {
      if (res.ok) {
        setAuthed(true);
        res.json().then(setPosts);
      }
    });
  }, []);

  async function login() {
    const res = await fetch("/api/admin/posts", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      setAuthed(true);
      setError("");
      storePassword(password);
      setPosts(await res.json());
    } else {
      setError("Wrong password");
    }
  }

  async function remove(slug: string) {
    const getRes = await fetch(`/api/admin/posts/${slug}`, {
      headers: { "x-admin-password": password },
    });
    if (!getRes.ok) {
      setError("Failed to load post for deletion");
      return;
    }
    const { sha } = await getRes.json();
    const res = await fetch(`/api/admin/posts/${slug}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify({ sha }),
    });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.slug !== slug));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete post");
    }
  }

  if (!authed) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-xl font-bold">Admin login</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="mt-4 w-full rounded border border-gray-300 px-3 py-2"
        />
        <button
          onClick={login}
          className="mt-2 rounded bg-uber-black px-4 py-2 text-sm text-white"
        >
          Log in
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Posts ({posts.length})</h1>
        <Link href="/admin/posts/new" className="rounded bg-uber-black px-3 py-1.5 text-sm text-white">
          New Post
        </Link>
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
