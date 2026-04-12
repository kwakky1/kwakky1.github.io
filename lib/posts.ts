import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDir = path.join(process.cwd(), "posts");

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
      const slug = filename.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
      const { data, content } = matter(raw);

      // 파일명 앞 10자리(YYYY-MM-DD)를 date fallback으로 사용
      const dateFromFilename = slug.slice(0, 10);

      return {
        slug,
        title: data.title ?? slug,
        date: data.date ? String(data.date).slice(0, 10) : dateFromFilename,
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

export function getPostBySlug(slug: string): Post {
  const raw = fs.readFileSync(path.join(postsDir, `${slug}.md`), "utf-8");
  const { data, content } = matter(raw);

  const dateFromFilename = slug.slice(0, 10);

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ? String(data.date).slice(0, 10) : dateFromFilename,
    categories: Array.isArray(data.categories) ? data.categories : [],
    tags: Array.isArray(data.tags) ? data.tags : [],
    feature_image: data.feature_image,
    excerpt: "",
    content,
  };
}
