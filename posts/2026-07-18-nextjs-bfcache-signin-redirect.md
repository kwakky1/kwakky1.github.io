---
title: 로그인 후 뒤로가기 하면 로그인 페이지가 다시 뜬다? Next.js middleware와 bfcache 트러블슈팅
date: 2026-07-18
categories: [Next.js, Auth, Troubleshooting]
tags: [Next.js, NextAuth, Middleware, bfcache, Cache-Control, SSR]
feature_image: "https://picsum.photos/2560/600?image=904"
---

로그인에 성공해서 메인 페이지로 이동한 뒤, 브라우저 **뒤로가기**를 누르면 로그인 폼이 다시 화면에 뜨는 버그를 제보받았다. 다시 로그인을 시도하면 정상 동작하고, 새로고침을 해도 문제가 사라져서 재현 조건을 좁히는 데만 꽤 시간이 걸렸다. 원인은 코드 로직이 아니라 브라우저의 **bfcache(Back-Forward Cache)** 였다.

---

## 문제 상황

Next.js(App Router 이전 `next-auth/middleware`의 `withAuth` 사용) + NextAuth 조합에서, 로그인 페이지(`/user/signin`)는 `getServerSideProps` 기반 페이지였다.

재현 순서는 이랬다.

1. `/user/signin`에서 로그인 진행
2. 로그인 성공 → 메인 페이지로 리다이렉트
3. 브라우저 **뒤로가기** 클릭
4. 이미 로그인된 상태인데도 `/user/signin` 폼이 그대로 다시 보임

<!-- TODO(image): 버그 재현 스크린샷. 로그인 후 메인 페이지 이동 → 뒤로가기 클릭 시 signin 폼이 다시 뜬 화면. 주소창에 /user/signin이 보이면서도 헤더에는 로그인된 상태(유저 메뉴 등)가 함께 보이면 좋음. -->

콘솔에도, 네트워크 탭에도 별다른 에러가 없었다. 그도 그럴 것이, **서버로 요청 자체가 나가지 않았기** 때문이다.

---

## 원인 분석: bfcache는 서버를 거치지 않는다

크롬 등 최신 브라우저는 뒤로가기/앞으로가기 성능을 위해 페이지 전체(JS 실행 상태 포함)를 메모리에 스냅샷으로 저장해두는 **bfcache**를 쓴다. 뒤로가기 시 이 스냅샷을 그대로 복원하면 서버 왕복 없이 즉시 화면이 뜬다.

문제는 이 복원 과정이 **미들웨어도, `getServerSideProps`도 다시 실행하지 않는다**는 점이다. 로그인 이전에 렌더링됐던 signin 페이지의 DOM 스냅샷이 그대로 화면에 박제되어 나타난 것이다. 로그인 여부를 서버에서 매번 판단하는 구조였기 때문에, 정작 가장 중요한 순간(뒤로가기)에는 그 판단 로직이 아예 실행되지 않는 셈이었다.

<!-- TODO(image): 수정 전 크롬 DevTools Application 탭 → Back/forward cache 패널. "Test back/forward cache" 버튼 클릭 후 해당 페이지가 차단 사유 없이 bfcache에 정상 캐싱된(Restored) 상태가 보이면 됨. -->

처음에는 `getServerSideProps`에서 응답 헤더에 `Cache-Control: no-store`를 설정해 간단히 끝날 줄 알았다.

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  context.res.setHeader("Cache-Control", "no-store");
  // ...
  return { props: {} };
};
```

하지만 효과가 없었다. Next.js가 SSR 응답을 만드는 과정에서 **내부적으로 응답 헤더를 다시 쓰면서 `getServerSideProps`에서 설정한 `Cache-Control` 값이 덮어써졌기** 때문이다. 즉, `getServerSideProps` 레이어에서는 이 페이지가 bfcache 대상에서 빠지도록 만들 수 없었다.

<!-- TODO(image): res.setHeader 시도가 무효화되는 걸 보여주는 크롬 DevTools Network 탭 Headers 패널. /user/signin 요청의 Response Headers에 Cache-Control: no-store가 반영되지 않은(또는 다른 값으로 덮어써진) 상태가 보이면 됨. -->

---

## 해결 방법

응답 헤더가 최종적으로 확정되는 지점, 즉 **미들웨어**에서 직접 헤더를 설정하는 방식으로 우회했다. 미들웨어의 `NextResponse`는 Next.js 내부 SSR 파이프라인보다 뒤에 적용되므로 값이 덮어써지지 않는다.

```typescript
// proxy.ts (middleware)
export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth?.token;
    const { pathname, searchParams } = req.nextUrl;

    // 이미 로그인된 상태로 /user/signin에 접근하면(뒤로가기 포함)
    // signin 페이지를 렌더링하지 않고 바로 리다이렉트한다.
    if (pathname === "/user/signin" && token && !token.error) {
      const callbackUrl = searchParams.get("callbackUrl");
      return NextResponse.redirect(new URL(callbackUrl ?? "/", req.url));
    }

    const response = NextResponse.next();

    // 뒤로가기 시 로그인 전 signin 폼이 bfcache에서 그대로 복원되지 않도록
    // 이 페이지는 bfcache 대상에서 제외한다.
    // getServerSideProps의 res.setHeader는 Next.js 내부 SSR 응답 헤더에
    // 덮어써지므로, middleware 응답에 직접 설정해야 한다.
    if (pathname === "/user/signin") {
      response.headers.set("Cache-Control", "no-store");
    }
    return response;
  },
  {
    pages: { signIn: "/user/signin" }
  }
);
```

핵심은 두 가지를 함께 적용한 것이다.

1. **`Cache-Control: no-store`를 미들웨어에서 설정** — signin 페이지 자체를 bfcache 대상에서 제외한다. 이러면 뒤로가기 시 브라우저가 스냅샷을 쓰지 않고 서버에 다시 요청하게 된다.
2. **로그인된 토큰으로 signin 접근 시 즉시 리다이렉트** — bfcache가 아니더라도(예: 북마크, 직접 URL 접근) 이미 로그인된 사용자가 signin 페이지에 진입하는 모든 경로를 미들웨어 단계에서 차단한다.

1번만으로도 재현 시나리오는 해결되지만, 2번을 같이 넣어야 "로그인된 상태에서 signin 페이지가 보이면 안 된다"는 규칙이 진입 경로와 무관하게 항상 성립한다.

<!-- TODO(image): 수정 후 크롬 DevTools Application 탭 → Back/forward cache 패널. 같은 테스트를 다시 돌렸을 때 "Cache-Control: no-store" 같은 차단 사유(Not restored from bfcache)가 표시되는 화면. 위 수정 전 스크린샷과 짝을 이루는 after 컷. -->

---

## 정리

- **증상**: 로그인 후 뒤로가기 시 로그인 폼이 재노출됨. 네트워크 요청도, 에러도 없음.
- **원인**: bfcache가 서버 왕복 없이 페이지 스냅샷을 복원하기 때문에, 서버에서만 판단하던 인증 로직(미들웨어, `getServerSideProps`)이 뒤로가기 시점에는 아예 실행되지 않음.
- **잘못된 접근**: `getServerSideProps`에서 `res.setHeader`로 `Cache-Control`을 설정 — Next.js 내부 SSR 응답 헤더 처리 과정에서 덮어써져 무효.
- **해결**: 미들웨어(Edge 레이어) 응답에서 직접 `Cache-Control: no-store`를 설정하고, 로그인된 토큰으로 signin 페이지 접근 시 즉시 리다이렉트.

일반화하면, **인증 상태에 따라 렌더링이 달라지는 페이지는 브라우저 캐시(특히 bfcache) 대상에서 제외하는 것을 기본값으로 둬야 한다**는 교훈이다. `pageshow` 이벤트로 `event.persisted`를 감지해 클라이언트에서 강제 리로드하는 방법도 있지만, 서버/미들웨어 레벨에서 애초에 캐시되지 않도록 막는 편이 더 근본적이다. 헤더를 어디서 설정하느냐(페이지 레벨 vs 미들웨어 레벨)에 따라 실제로 적용되는지 여부가 갈릴 수 있다는 점도 함께 기억해둘 만하다.
