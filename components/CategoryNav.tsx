"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { categorySlug } from "@/lib/category-slug";
import type { CategoryCount } from "@/lib/posts";

function CategoryList({
  categories,
  totalCount,
  onNavigate,
}: {
  categories: CategoryCount[];
  totalCount: number;
  onNavigate?: () => void;
}) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-gray-800">
      <li>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center justify-between py-2.5 text-sm font-semibold text-teal-600 dark:text-teal-400"
        >
          전체글
          <span className="text-xs text-gray-400 dark:text-gray-500">{totalCount}</span>
        </Link>
      </li>
      {categories.map(({ category, count }) => (
        <li key={category}>
          <Link
            href={`/categories/${categorySlug(category)}/`}
            onClick={onNavigate}
            className="flex items-center justify-between py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            {category}
            <span className="text-xs text-gray-400 dark:text-gray-500">{count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CategoryNav({
  categories,
  totalCount,
}: {
  categories: CategoryCount[];
  totalCount: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* PC: 좌측 사이드바 */}
      <aside className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-20">
          <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">카테고리</h2>
          <CategoryList categories={categories} totalCount={totalCount} />
        </div>
      </aside>

      {/* 모바일: 트리거 버튼 */}
      <div className="lg:hidden mb-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          전체글
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* 모바일: 카테고리 모달 */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="닫기"
              className="text-gray-500 dark:text-gray-400"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">카테고리</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4">
            <CategoryList
              categories={categories}
              totalCount={totalCount}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
