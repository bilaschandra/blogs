import Link from "next/link";

export function Header() {
  return (
    <header className="bg-uber-black">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
        <Link href="/" className="font-heading text-lg font-bold text-white">
          Engineering Blog
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
    </header>
  );
}
