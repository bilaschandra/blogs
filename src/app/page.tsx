import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SectionBanner } from "@/components/SectionBanner";

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5);

  return (
    <main>
      <SectionBanner title="Notes on building things" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </main>
  );
}
