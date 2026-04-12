"use client";

import { useEffect, useState, useMemo } from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split("\n");
  const result: Heading[] = [];

  for (const line of lines) {
    // 코드 블록 내부는 건너뜀
    if (line.startsWith("```")) continue;
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      // rehype-slug와 동일한 id 생성 규칙
      const id = text
        .toLowerCase()
        .replace(/[`*_[\]()]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      result.push({ id, text, level });
    }
  }
  return result;
}

export default function TableOfContents({ content }: { content: string }) {
  const [activeId, setActiveId] = useState<string>("");
  const headings = useMemo(() => extractHeadings(content), [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="text-sm">
      <p className="font-semibold text-gray-500 mb-3 text-xs uppercase tracking-widest">
        목차
      </p>
      <ul className="space-y-1.5 border-l-2 border-gray-100 pl-3">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
            <a
              href={`#${h.id}`}
              className={`block leading-snug py-0.5 transition-colors hover:text-teal-600 ${
                activeId === h.id
                  ? "text-teal-600 font-semibold border-l-2 border-teal-500 -ml-[14px] pl-3"
                  : "text-gray-400"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
