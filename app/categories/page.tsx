import Link from "next/link";
import { categorySlug, getAllCategories } from "@/lib/posts";

export const metadata = { title: "Categories" };

export default function CategoriesPage() {
  const categories = getAllCategories();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">
        Categories
      </h1>
      <div className="flex flex-wrap gap-3">
        {categories.map(({ category, count }) => (
          <Link
            key={category}
            href={`/categories/${categorySlug(category)}/`}
            className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
          >
            {category}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
