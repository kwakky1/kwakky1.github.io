@AGENTS.md

# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm install         # install deps
npm run dev          # dev server (also regenerates search-index.json/rss.xml/sitemap.xml first)
npm run build         # static export to out/ (prebuild regenerates feeds automatically)
npm run generate-feeds  # regenerate search-index.json, rss.xml, sitemap.xml manually
```

There is no `npm run lint` configured yet; rely on `npm run build`'s TypeScript check.

## Architecture

Next.js 16 (App Router), TypeScript, Tailwind CSS v4. Fully static — `next.config.ts` sets `output: "export"` and `trailingSlash: true`. No server runtime; the site is plain HTML/CSS/JS served by GitHub Pages.

- **`posts/*.md`** — blog post source of truth. Filename is `YYYY-MM-DD-slug.md`; the slug (filename minus `.md`) is the route segment at `/blog/[slug]/`.
- **`lib/posts.ts`** — reads `posts/`, parses frontmatter with `gray-matter`. `getAllPosts`, `getPostBySlug`, `getAllCategories`, `getPostsByCategory`.
- **`lib/markdown.ts`** — `unified`/`remark`/`rehype` pipeline (GFM, heading slugs/autolinks, `rehype-highlight` syntax highlighting) that turns post body markdown into HTML string, rendered via `dangerouslySetInnerHTML`.
- **`content/about.md`** — About page source (kept out of `posts/` so it isn't listed as a blog post). Rendered by `app/about/page.tsx` through the same markdown pipeline.
- **`scripts/generate-feeds.mjs`** — build-time script (runs via npm `prebuild`) that reads `posts/` independently (plain JS, no path aliases) and writes `public/search-index.json`, `public/rss.xml`, `public/sitemap.xml`.
- **`app/search/page.tsx`** — client component; fetches `/search-index.json` and does a client-side regex filter (title/content). No search backend.
- **Dark mode** — Tailwind v4 custom variant (`@custom-variant dark` in `app/globals.css`), toggled by adding/removing the `.dark` class on `<html>` (`components/ThemeToggle.tsx`). A blocking inline script in `app/layout.tsx` applies the stored/system preference before hydration to avoid a flash of the wrong theme.

### Frontmatter fields (posts and about page)

```yaml
---
title: 제목
date: 2026-02-13          # unquoted YAML date — gray-matter parses this as a Date object, not a string
categories: [Frontend, Optimization]
tags: [Next.js, Performance]
feature_image: "https://picsum.photos/2560/600?image=895"  # optional
---
```

**Gotcha:** an unquoted `date:` in frontmatter is parsed by gray-matter/js-yaml as a `Date` object, not a string. Always convert it with the `toIsoDate()` helper in `lib/posts.ts` (and the equivalent in `scripts/generate-feeds.mjs`) rather than `String(date).slice(0, 10)` — the latter silently drops the year (e.g. produces `Fri Feb 13` instead of `2026-02-13`). This bit the original migration and was fixed once already; don't reintroduce it.

**Gotcha:** category names containing a `.` (e.g. `Next.js`) break Next.js's `trailingSlash` normalization for static export — it treats the segment as a file extension and drops the trailing slash, which 404s on GitHub Pages. Category routes always go through `categorySlug()`/`findCategoryBySlug()` in `lib/posts.ts` (replaces `.` with `-` for the URL only, original name is still used for display) — don't build category links with `encodeURIComponent(category)` directly.

## Writing a new post

1. Add `posts/YYYY-MM-DD-slug.md` with the frontmatter above.
2. `npm run dev` (regenerates feeds automatically) and check `http://localhost:3000/blog/YYYY-MM-DD-slug/`.
3. Commit with `docs(blog): <post summary>` (see Commit Convention below). No need to touch categories/search/RSS by hand — all derived at build time from `posts/`.

## Deployment

`.github/workflows/deploy.yml` builds (`npm ci && npm run build`) and deploys `out/` via `actions/upload-pages-artifact` + `actions/deploy-pages` on every push to `master`.

This requires the repo's **Settings → Pages → Build and deployment → Source** to be set to **"GitHub Actions"** (not "Deploy from a branch" — that's the old Jekyll-native build path and won't run this workflow). This is a one-time manual setting in the GitHub UI.

No custom domain (no `CNAME`); site is served at the repo's default `https://kwakky1.github.io` user-page URL, so no `basePath` is configured.

## Git history note

This repo's `master` branch history is a Jekyll → Next.js rewrite (not a linear history — the old Jekyll site's commits and this Next.js codebase diverged from a shared ancestor). The pre-migration Jekyll site is preserved on the `jekyll-backup` branch for reference; don't merge it back into `master`.

## Commit Convention

- Post-only changes (adding/editing `posts/*.md`, `content/about.md`): `docs(blog): <post title or summary>`
- Code/infra changes (routes, components, scripts, config, workflow): `feat: ...` / `fix: ...` / `refactor: ...` as appropriate
- No `Co-Authored-By` requirement one way or the other — existing history has both.
