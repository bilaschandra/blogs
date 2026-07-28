import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-6">
      <Link href="/" className="font-bold">
        Engineering Blog
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/blog">Blog</Link>
        <Link href="/about">About</Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
