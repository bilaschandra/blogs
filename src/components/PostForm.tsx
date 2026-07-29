"use client";

import { useState } from "react";

type PostFormValues = {
  title: string;
  date: string;
  tags: string;
  excerpt: string;
  content: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PostForm({
  password,
  mode,
  slug,
  initial,
  sha,
  existingCoverImage,
  onSaved,
}: {
  password: string;
  mode: "create" | "edit";
  slug?: string;
  initial?: PostFormValues;
  sha?: string;
  existingCoverImage?: string | null;
  onSaved: (slug: string) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [tags, setTags] = useState(initial?.tags ?? "");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (coverImageFile && coverImageFile.size > 5 * 1024 * 1024) {
      setError("Cover image must be under 5MB");
      setStatus("error");
      return;
    }

    setStatus("saving");

    const body: Record<string, unknown> = { title, date, tags, excerpt, content };
    if (coverImageFile) {
      body.coverImageBase64 = await fileToBase64(coverImageFile);
      body.coverImageFilename = coverImageFile.name;
    }
    if (mode === "edit") {
      body.sha = sha;
      body.existingCoverImage = existingCoverImage;
    }

    const url = mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${slug}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-password": password },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = mode === "create" ? await res.json() : { slug };
      onSaved(data.slug ?? slug!);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Tags (comma-separated)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Excerpt</label>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          required
          rows={2}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">
          Cover image {mode === "edit" && "(leave blank to keep current)"}
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold">Content (Markdown/MDX)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={16}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded bg-uber-black px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {status === "saving" ? "Saving..." : "Save post"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
