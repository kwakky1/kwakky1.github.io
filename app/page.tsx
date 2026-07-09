import { getAllCategories, getAllPosts } from "@/lib/posts";
import PostCard from "@/components/PostCard";
import CategoryNav from "@/components/CategoryNav";

export default function HomePage() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 lg:flex lg:items-start lg:gap-8">
      <CategoryNav categories={categories} totalCount={posts.length} />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">전체 포스트</h1>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </main>
  );
}
