"use client";

import { useState } from "react";
import { CommentList } from "@/components/CommentList";
import { CommentBox } from "@/components/CommentBox";

export function Comments({ slug }: { slug: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">Comments</h2>
      <CommentList slug={slug} refreshKey={refreshKey} />
      <CommentBox slug={slug} onSubmitted={() => setRefreshKey((k) => k + 1)} />
    </section>
  );
}
