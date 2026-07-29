"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PostForm } from "@/components/PostForm";
import { getStoredPassword, storePassword } from "@/lib/adminSession";

export default function NewPostPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredPassword();
    if (stored) {
      setPassword(stored);
      setAuthed(true);
    }
  }, []);

  function login() {
    storePassword(password);
    setAuthed(true);
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
          Continue
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">New post</h1>
      <PostForm password={password} mode="create" onSaved={() => router.push("/admin/posts")} />
    </main>
  );
}
