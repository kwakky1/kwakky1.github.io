export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} Andy&apos;s Blog</p>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/kwakky1"
            target="_blank"
            rel="noreferrer"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            GitHub
          </a>
          <a
            href="mailto:kwakky1@gmail.com"
            className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
