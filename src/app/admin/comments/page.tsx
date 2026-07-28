"use client";

import { useState } from "react";

type PendingComment = {
  id: string;
  slug: string;
  name: string;
  text: string;
  createdAt: string;
};

export default function AdminCommentsPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [error, setError] = useState("");

  async function login() {
    const res = await fetch("/api/admin/comments", {
      headers: { "x-admin-password": password },
    });
    if (res.ok) {
      setAuthed(true);
      setError("");
      setComments(await res.json());
    } else {
      setError("Wrong password");
    }
  }

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError(`Failed to ${action} comment`);
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
          className="mt-4 w-full rounded border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          onClick={login}
          className="mt-2 rounded bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900"
        >
          Log in
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-xl font-bold">Pending comments ({comments.length})</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-6">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-gray-200 pb-4 dark:border-gray-800">
            <p className="text-sm text-gray-500">
              {c.slug} — {c.name}
            </p>
            <p className="mt-1">{c.text}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => act(c.id, "approve")}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white"
              >
                Approve
              </button>
              <button
                onClick={() => act(c.id, "reject")}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
