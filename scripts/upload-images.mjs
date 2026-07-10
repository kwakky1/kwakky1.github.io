// 포스트 본문의 <!-- TODO(image): ... --> 자리를 순서대로 채워 넣는다.
//
// 사용법:
//   npm run upload-images -- <post-slug>
//
// 1. posts/<post-slug>.md 에서 <!-- TODO(image): ... --> 주석을 등장 순서대로 찾는다.
// 2. image-drafts/<post-slug>/ 안의 이미지 파일을 파일명 앞자리 숫자(1, 2, 3, ...) 순으로 정렬한다.
//    예: 1.png, 2.png, 3-network-tab.png, 4.png ...
// 3. 같은 순서로 짝지어 Cloudinary에 업로드하고, 성공한 자리만 그 TODO 주석을
//    `![대체텍스트](url)` 로 치환해 posts/<post-slug>.md 를 직접 덮어쓴다.
//
// 이미지 개수와 TODO 개수가 다르면 채울 수 있는 만큼만 채우고 나머지는 TODO로 남긴 채 경고한다.
// image-drafts/ 는 .gitignore 되어 있어 원본 스크린샷은 이 저장소에 커밋되지 않는다.
//
// 필요한 환경변수(.env.local, gitignore 처리됨): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error(
    "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET 환경변수가 필요합니다.\n" +
      ".env.local에 설정하세요 (.env.example 참고). 실행은 `npm run upload-images -- <post-slug>`."
  );
  process.exit(1);
}

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run upload-images -- <post-slug>");
  process.exit(1);
}

const postPath = path.join(process.cwd(), "posts", `${slug}.md`);
if (!fs.existsSync(postPath)) {
  console.error(`포스트 파일이 없습니다: ${postPath}`);
  process.exit(1);
}

const imageDir = path.join(process.cwd(), "image-drafts", slug);
if (!fs.existsSync(imageDir) || !fs.statSync(imageDir).isDirectory()) {
  console.error(`폴더가 없습니다: ${imageDir}\nimage-drafts/${slug}/ 에 이미지를 넣고 다시 실행하세요.`);
  process.exit(1);
}

const TODO_RE = /<!--\s*TODO\(image\):\s*(.*?)\s*-->/g;

const postContent = fs.readFileSync(postPath, "utf-8");
const todos = [...postContent.matchAll(TODO_RE)];
if (todos.length === 0) {
  console.error(`${postPath} 에 채울 <!-- TODO(image): ... --> 자리가 없습니다.`);
  process.exit(1);
}

function leadingNumber(filename) {
  const m = filename.match(/^\d+/);
  return m ? parseInt(m[0], 10) : Number.POSITIVE_INFINITY;
}

const files = fs
  .readdirSync(imageDir)
  .filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f))
  .sort((a, b) => leadingNumber(a) - leadingNumber(b) || a.localeCompare(b));

if (files.length === 0) {
  console.error(`${imageDir} 에 이미지 파일이 없습니다. (예: 1.png, 2.png, ...)`);
  process.exit(1);
}

if (files.length !== todos.length) {
  console.warn(
    `⚠ TODO 개수(${todos.length})와 이미지 개수(${files.length})가 다릅니다. 앞에서부터 ${Math.min(
      files.length,
      todos.length
    )}개만 순서대로 채웁니다.`
  );
}

function sign(params) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + API_SECRET).digest("hex");
}

async function uploadOne(filePath) {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `kwakky1-blog/${slug}`;
  const signature = sign({ folder, timestamp });

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`${path.basename(filePath)} 업로드 실패: ${res.status} ${await res.text()}`);
  }

  return (await res.json()).secure_url;
}

const pairCount = Math.min(files.length, todos.length);
let updated = postContent;
let offset = 0; // 이전 치환으로 문자열 길이가 바뀐 만큼 다음 TODO의 인덱스를 보정

for (let i = 0; i < pairCount; i++) {
  const file = files[i];
  const todo = todos[i];
  const altText = todo[1];

  const url = await uploadOne(path.join(imageDir, file));
  const replacement = `![${altText}](${url})`;

  const start = todo.index + offset;
  const end = start + todo[0].length;
  updated = updated.slice(0, start) + replacement + updated.slice(end);
  offset += replacement.length - todo[0].length;

  console.log(`✓ ${file} -> TODO #${i + 1} (${altText.slice(0, 30)}${altText.length > 30 ? "…" : ""})`);
}

fs.writeFileSync(postPath, updated);
console.log(`\n${postPath} 업데이트 완료 (${pairCount}개 교체).`);

if (todos.length > pairCount) {
  console.log(`남은 TODO ${todos.length - pairCount}개는 image-drafts/${slug}/ 에 이미지를 더 넣고 다시 실행하세요.`);
}
