import Link from "next/link";
import Image from "next/image";
import { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

export default function PostCard({ post }: { post: PostMeta }) {
  const href = `/blog/${post.slug}`;

  return (
    <Link href={href}>
      <article className="group rounded-xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer bg-white h-full flex flex-col">
        {/* 썸네일 */}
        <div className="relative h-44 bg-gray-100 shrink-0 overflow-hidden">
          {post.feature_image ? (
            <Image
              src={post.feature_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-teal-400 to-blue-500" />
          )}
        </div>

        {/* 본문 */}
        <div className="p-4 flex flex-col flex-1">
          <h2 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-2 group-hover:text-teal-600 transition-colors">
            {post.title}
          </h2>
          <p className="text-sm text-gray-500 line-clamp-3 mb-3 flex-1">
            {post.excerpt}
          </p>

          {/* 태그 */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <time className="text-xs text-gray-400">{formatDate(post.date)}</time>
        </div>
      </article>
    </Link>
  );
}
