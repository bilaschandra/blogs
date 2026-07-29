import { getPostsByTag } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SectionBanner } from "@/components/SectionBanner";

export default function TagPage({ params }: { params: { tag: string } }) {
  const posts = getPostsByTag(params.tag);

  return (
    <main>
      <SectionBanner title={`Tag: ${params.tag}`} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {posts.length === 0 && <p className="text-gray-500">No posts yet.</p>}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </main>
  );
}
