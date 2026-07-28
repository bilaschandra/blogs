import Link from "next/link";

export function Pagination({
  currentPage,
  totalPages,
  basePath,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-8 flex justify-between text-sm">
      {currentPage > 1 ? (
        <Link href={`${basePath}?page=${currentPage - 1}`}>&larr; Newer</Link>
      ) : (
        <span />
      )}
      <span className="text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link href={`${basePath}?page=${currentPage + 1}`}>Older &rarr;</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
