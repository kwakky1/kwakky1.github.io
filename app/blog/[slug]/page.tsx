import { getAllPosts, getPostBySlug } from "@/lib/posts";
import { markdownToHtml } from "@/lib/markdown";
import TableOfContents from "@/components/TableOfContents";
import "highlight.js/styles/github-dark.css";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return { title: post.title };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const contentHtml = await markdownToHtml(post.content);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 flex gap-12">
      {/* 본문 */}
      <article className="flex-1 min-w-0">
        <header className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            {post.title}
          </h1>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-sm bg-teal-50 text-teal-700 px-3 py-0.5 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <time className="text-sm text-gray-400">{post.date}</time>
        </header>

        {/* 마크다운 → HTML 렌더링 */}
        <div
          className="prose prose-gray max-w-none prose-headings:font-bold prose-a:text-teal-600 prose-code:before:content-none prose-code:after:content-none prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      {/* 우측 고정 TOC */}
      <aside className="hidden xl:block w-60 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <TableOfContents content={post.content} />
        </div>
      </aside>
    </div>
  );
}
