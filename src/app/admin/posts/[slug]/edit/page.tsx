"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getStoredPassword, storePassword } from "@/lib/adminSession";

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
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [post, setPost] = useState<PostData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredPassword();
    if (!stored) return;
    setPassword(stored);
    fetch(`/api/admin/posts/${params.slug}`, {
      headers: { "x-admin-password": stored },
    }).then((res) => {
      if (res.ok) {
        setAuthed(true);
        res.json().then(setPost);
      }
    });
  }, [params.slug]);

  async function login() {
    const res = await fetch(`/api/admin/posts/${params.slug}`, {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      setAuthed(true);
      storePassword(password);
      setPost(await res.json());
    } else {
      setError("Wrong password");
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

  if (!post) return null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Edit post</h1>
      <PostForm
        password={password}
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
