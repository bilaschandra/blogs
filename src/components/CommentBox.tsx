"use client";

import { useState } from "react";

export function CommentBox({
  slug,
  onSubmitted,
}: {
  slug: string;
  onSubmitted: () => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name, text }),
    });

    if (res.ok) {
      setStatus("done");
      setName("");
      setText("");
      onSubmitted();
    } else {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-4 text-sm text-green-600">
        Thanks! Your comment is awaiting moderation.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        maxLength={60}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Comment"
        required
        maxLength={2000}
        rows={4}
        className="w-full rounded border border-gray-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : "Submit comment"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
