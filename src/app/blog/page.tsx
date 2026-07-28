import { getAllPosts, paginate } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";
import { Pagination } from "@/components/Pagination";
import { SectionBanner } from "@/components/SectionBanner";

const PER_PAGE = 10;

export default function BlogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;
  const { items, currentPage, totalPages } = paginate(getAllPosts(), page, PER_PAGE);

  return (
    <main>
      <SectionBanner title="All Posts" />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {items.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
        <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/blog" />
      </div>
    </main>
  );
}
