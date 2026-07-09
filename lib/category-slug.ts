// URL 세그먼트에 "."이 포함되면(예: "Next.js") Next.js의 trailingSlash 정규화가
// 파일 확장자로 오인해 트레일링 슬래시를 제거해버려 정적 export에서 404가 난다.
// "."을 "-"로 치환한 슬러그를 라우트 파라미터로 쓰고, 필터링 시 원래 카테고리명으로 역매핑한다.
//
// fs를 사용하는 lib/posts.ts와 분리된 이유: 이 함수는 클라이언트 컴포넌트(CategoryNav)에서도
// 쓰이는데, lib/posts.ts를 그대로 import하면 Node 전용 fs 모듈까지 클라이언트 번들에 끌려온다.
export function categorySlug(category: string): string {
  return encodeURIComponent(category.replace(/\./g, "-"));
}
