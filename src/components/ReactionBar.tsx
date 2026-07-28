"use client";

import { useEffect, useState } from "react";

type Reaction = { emoji: string; count: number };

export function ReactionBar({ slug }: { slug: string }) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [clicked, setClicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then(setReactions);

    const stored = localStorage.getItem(`reactions:${slug}`);
    if (stored) setClicked(new Set(JSON.parse(stored)));
  }, [slug]);

  async function react(emoji: string) {
    if (clicked.has(emoji)) return;

    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, emoji }),
    });
    const updated: Reaction = await res.json();

    setReactions((prev) =>
      prev.map((r) => (r.emoji === emoji ? updated : r))
    );
    const next = new Set(clicked);
    next.add(emoji);
    setClicked(next);
    localStorage.setItem(`reactions:${slug}`, JSON.stringify(Array.from(next)));
  }

  return (
    <div className="mt-8 flex gap-3">
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => react(r.emoji)}
          disabled={clicked.has(r.emoji)}
          className="flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1 text-sm transition-colors enabled:hover:border-uber-tag-text enabled:hover:text-uber-tag-text disabled:opacity-60"
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
    </div>
  );
}
