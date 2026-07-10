import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { markdownToHtml } from "@/lib/markdown";

export const metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content", "privacy.md"),
    "utf-8"
  );
  const { content } = matter(raw);
  const contentHtml = await markdownToHtml(content);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div
        className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-teal-600 dark:prose-a:text-teal-400"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </div>
  );
}
