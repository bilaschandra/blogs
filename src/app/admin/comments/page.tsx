"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/useAdminSession";

type PendingComment = {
  id: string;
  slug: string;
  name: string;
  text: string;
  createdAt: string;
};

export default function AdminCommentsPage() {
  const { user, loading } = useAdminSession();
  const [comments, setComments] = useState<PendingComment[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetch("/api/admin/comments").then(async (res) => {
      if (res.ok) setComments(await res.json());
    });
  }, [user]);

  async function act(id: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== id));
    } else {
      setError(`Failed to ${action} comment`);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  if (loading || !user) return null;

  if (user.role !== "admin") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p>You don&apos;t have access to this page.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Pending comments ({comments.length})</h1>
        <button onClick={logout} className="text-sm text-gray-500 underline">
          Log out
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-6 space-y-6">
        {comments.map((c) => (
          <li key={c.id} className="border-b border-gray-200 pb-4">
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
