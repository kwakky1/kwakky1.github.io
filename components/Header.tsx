import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-bold text-lg text-gray-900 hover:text-teal-600 transition-colors"
        >
          Andy&apos;s Blog
        </Link>
        <nav className="flex items-center gap-5 text-sm text-gray-600">
          <Link href="/" className="hover:text-teal-600 transition-colors">
            홈
          </Link>
          <a
            href="https://github.com/kwakky1"
            target="_blank"
            rel="noreferrer"
            className="hover:text-teal-600 transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
