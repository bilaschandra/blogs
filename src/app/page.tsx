import { getAllPosts } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { SectionBanner } from "@/components/SectionBanner";

export default function HomePage() {
  const posts = getAllPosts().slice(0, 5);

  return (
    <main>
      <SectionBanner title="Notes on building things" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
