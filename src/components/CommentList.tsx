"use client";

import { useEffect, useState } from "react";

type Comment = { id: string; name: string; text: string; createdAt: string };

export function CommentList({ slug, refreshKey }: { slug: string; refreshKey: number }) {
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then((res) => res.json())
      .then(setComments);
  }, [slug, refreshKey]);

  if (comments.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">No comments yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-4">
      {comments.map((c) => (
        <li key={c.id} className="border-b border-gray-200 pb-3 dark:border-gray-800">
          <p className="text-sm font-semibold">{c.name}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{c.text}</p>
        </li>
      ))}
    </ul>
  );
}
