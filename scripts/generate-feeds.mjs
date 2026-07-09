// 빌드 시 검색 인덱스 / RSS / 사이트맵을 정적 파일로 생성한다.
// npm run build 전에 자동 실행됨 (package.json "prebuild")
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Feed } from "feed";

const SITE_URL = "https://kwakky1.github.io";
const postsDir = path.join(process.cwd(), "posts");
const publicDir = path.join(process.cwd(), "public");

// gray-matter/js-yaml은 unquoted date(예: date: 2026-02-11)를 Date 객체로 파싱하므로
// String(date).slice(0, 10)은 연도가 빠진 문자열이 된다. lib/posts.ts의 toIsoDate와 동일한 로직.
function toIsoDate(value, fallback) {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(String(value));
  return isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10);
}

function loadPosts() {
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));

  return files
    .map((filename) => {
      const slug = filename.replace(/(\.md)+$/, "");
      const raw = fs.readFileSync(path.join(postsDir, filename), "utf-8");
      const { data, content } = matter(raw);
      const dateFromFilename = slug.slice(0, 10);
      const date = toIsoDate(data.date, dateFromFilename);

      const plainText = content
        .replace(/```[\s\S]*?```/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/[*_>`]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      return {
        slug,
        title: data.title ?? slug,
        date,
        categories: Array.isArray(data.categories) ? data.categories : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        excerpt: plainText.slice(0, 160),
        content: plainText,
        url: `${SITE_URL}/blog/${slug}/`,
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function writeSearchIndex(posts) {
  const index = posts.map(({ title, excerpt, content, url, tags, categories }) => ({
    title,
    excerpt,
    content,
    url,
    tags,
    categories,
  }));
  fs.writeFileSync(
    path.join(publicDir, "search-index.json"),
    JSON.stringify(index)
  );
  console.log(`✓ search-index.json (${index.length} posts)`);
}

function writeRss(posts) {
  const feed = new Feed({
    title: "Andy's Blog",
    description: "This is Andy's blog",
    id: SITE_URL,
    link: SITE_URL,
    language: "ko",
    favicon: `${SITE_URL}/assets/logos/favicon-32x32.png`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Andy`,
    feedLinks: {
      rss2: `${SITE_URL}/rss.xml`,
    },
  });

  for (const post of posts) {
    feed.addItem({
      title: post.title,
      id: post.url,
      link: post.url,
      description: post.excerpt,
      date: new Date(post.date),
      category: post.categories.map((name) => ({ name })),
    });
  }

  fs.writeFileSync(path.join(publicDir, "rss.xml"), feed.rss2());
  console.log("✓ rss.xml");
}

function writeSitemap(posts) {
  const staticRoutes = ["", "about", "categories", "search"];
  const urls = [
    ...staticRoutes.map((route) => `${SITE_URL}/${route ? route + "/" : ""}`),
    ...posts.map((p) => p.url),
  ];

  const body = urls
    .map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;

  fs.writeFileSync(path.join(publicDir, "sitemap.xml"), xml);
  console.log("✓ sitemap.xml");
}

const posts = loadPosts();
fs.mkdirSync(publicDir, { recursive: true });
writeSearchIndex(posts);
writeRss(posts);
writeSitemap(posts);
