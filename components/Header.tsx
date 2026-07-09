import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg text-gray-900 dark:text-gray-100 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          Andy&apos;s Blog
        </Link>
        <nav className="flex items-center gap-5 text-sm text-gray-600 dark:text-gray-300">
          <Link href="/about" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            About
          </Link>
          <Link href="/categories" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Categories
          </Link>
          <Link href="/search" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            Search
          </Link>
          <a
            href="https://github.com/kwakky1"
            target="_blank"
            rel="noreferrer"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
