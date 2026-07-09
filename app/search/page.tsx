"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SearchDoc {
  title: string;
  excerpt: string;
  content: string;
  url: string;
  tags: string[];
  categories: string[];
}

function findResults(term: string, docs: SearchDoc[]): SearchDoc[] {
  if (!term.trim()) return [];
  let regex: RegExp;
  try {
    regex = new RegExp(term, "gi");
  } catch {
    return [];
  }
  return docs.filter(
    (doc) => regex.test(doc.title) || regex.test(doc.content)
  );
}

export default function SearchPage() {
  const [docs, setDocs] = useState<SearchDoc[]>([]);
  const [term, setTerm] = useState("");

  useEffect(() => {
    fetch("/search-index.json")
      .then((res) => res.json())
      .then(setDocs)
      .catch(() => setDocs([]));
  }, []);

  const results = findResults(term, docs);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        Search
      </h1>
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="검색어를 입력하세요"
        autoComplete="off"
        className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
      />

      <ul className="mt-6 space-y-4">
        {term.trim() !== "" && results.length === 0 && (
          <p className="text-gray-400 dark:text-gray-500">
            검색 결과가 없습니다.
          </p>
        )}
        {results.map((doc) => (
          <li key={doc.url}>
            <Link
              href={doc.url.replace("https://kwakky1.github.io", "")}
              className="block rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-teal-500 transition-colors"
            >
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                {doc.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {doc.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
