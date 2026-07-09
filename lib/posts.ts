import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDir = path.join(process.cwd(), "posts");

// gray-matter/js-yaml은 frontmatter의 unquoted date(예: date: 2026-02-11)를
// 문자열이 아닌 Date 객체로 파싱하므로 String(date).slice(0, 10)은 요일/월/일만
// 잘라내 연도가 사라지는 버그가 있었다. Date 객체 여부와 무관하게 안전하게 변환한다.
function toIsoDate(value: unknown, fallback: string): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10);
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  categories: string[];
  tags: string[];
  feature_image?: string;
  excerpt: string;
}

export interface Post extends PostMeta {
  content: string;
}

export function getAllPosts(): PostMeta[] {
  const files = fs.readdirSync(postsDir);

  return files
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/(\.md)+$/, "");
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
      const { data, content } = matter(raw);

      // 파일명 앞 10자리(YYYY-MM-DD)를 date fallback으로 사용
      const dateFromFilename = slug.slice(0, 10);

      return {
        slug,
        title: data.title ?? slug,
        date: toIsoDate(data.date, dateFromFilename),
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        feature_image: data.feature_image,
        excerpt:
          content
            .replace(/```[\s\S]*?```/g, "")
            .replace(/#{1,6}\s/g, "")
            .replace(/\*\*/g, "")
            .trim()
            .slice(0, 120) + "...",
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface CategoryCount {
  category: string;
  count: number;
}

export function getAllCategories(): CategoryCount[] {
  const counts = new Map<string, number>();

  for (const post of getAllPosts()) {
    for (const category of post.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function getPostsByCategory(category: string): PostMeta[] {
  return getAllPosts().filter((post) => post.categories.includes(category));
}

// URL 세그먼트에 "."이 포함되면(예: "Next.js") Next.js의 trailingSlash 정규화가
// 파일 확장자로 오인해 트레일링 슬래시를 제거해버려 정적 export에서 404가 난다.
// "."을 "-"로 치환한 슬러그를 라우트 파라미터로 쓰고, 필터링 시 원래 카테고리명으로 역매핑한다.
export function categorySlug(category: string): string {
  return encodeURIComponent(category.replace(/\./g, "-"));
}

export function findCategoryBySlug(slug: string): string | undefined {
  return getAllCategories().find((c) => categorySlug(c.category) === slug)
    ?.category;
}

export function getPostBySlug(slug: string): Post {
  const raw = fs.readFileSync(path.join(postsDir, `${slug}.md`), "utf-8");
  const { data, content } = matter(raw);

  const dateFromFilename = slug.slice(0, 10);

  return {
    slug,
    title: data.title ?? slug,
    date: toIsoDate(data.date, dateFromFilename),
    categories: Array.isArray(data.categories) ? data.categories : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    feature_image: data.feature_image,
    excerpt: "",
    content,
  };
}
