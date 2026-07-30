import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-uber-black">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-gray-400">
        <nav className="flex gap-4 text-white">
          <Link href="/blog">Blog</Link>
          <Link href="/about">About</Link>
          <Link href="/admin/login">Admin</Link>
        </nav>
        <p>© {new Date().getFullYear()} — Engineering Blog</p>
      </div>
    </footer>
  );
}
