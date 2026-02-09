---
title: NextAuth 없이 NestJS 세션 인증 구현하기 | 성능과 UX 최적화 삽질기
date: 2022-02-09
categories: [Frontend, Architecture]
tags: [Next.js, NestJS, Session, SSR, ReactQuery]
feature_image: "https://picsum.photos/2560/600?image=893"
---

인증 라이브러리의 대명사인 `NextAuth.js`는 매우 편리하지만, 이미 **NestJS와 같은 강력한 백엔드에서 세션 시스템을 운용 중**이라면 계륵이 되기도 합니다. NextAuth의 세션과 백엔드의 세션을 동기화하는 복잡한 과정을 거치느니, 직접 세션을 핸들링하기로 결정하며 겪은 UX 최적화 과정을 공유합니다.

---

## 1. 왜 NextAuth를 직접 구현했는가?

가장 큰 이유는 **"인증의 단일 진실 공급원(Single Source of Truth)"** 을 유지하고, Next 서버에서도 동일한 세션 메커니즘을 사용하기 위해서였습니다.

* **세션 공유의 어려움**: NestJS(Express)가 전달하는 `connect.sid` 쿠키 암호화 방식과 NextAuth의 쿠키 관리 방식은 다릅니다. 이를 억지로 맞추기보다 백엔드의 세션을 그대로 믿고 따르는 것이 아키텍처상 더 가볍습니다.
* **직관적인 제어**: 미들웨어를 통해 쿠키 존재 여부만 확인하고 리다이렉트하는 방식이 런타임 오버헤드가 적고 제어권이 높습니다.

---

## 2. Middleware를 활용한 경로 보호 전략

Next.js의 **Route Group `(protected)`** 은 실제 URL 경로에 나타나지 않습니다. 이를 효과적으로 보호하기 위해 `matcher`에서 예외 경로를 설정하고 미들웨어 내부에서 세션을 체크하는 전략을 사용했습니다.

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_TOKEN = process.env.CAPTURE_INTERNAL_TOKEN;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get('connect.sid'); // NestJS 세션 쿠키
  
  if (!session) {
    const loginUrl = new URL('/account/signin', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // api, 403, account, static 파일 등을 제외한 모든 경로 보호
  matcher: ['/((?!api|403|account|_next/static|_next/image|favicon.ico).*)'],
};
```

## 3. 로그인 병목 현상 해결: Streaming

로그인 버튼을 눌렀는데 화면 전환이 너무 느린 문제가 있었습니다. 범인은 **ProtectedLayout**에서의 데이터 페칭 방식이었습니다.

```typescript
export default async function ProtectedLayout({ children }) {
  const user = await getSessionUser(); // 1번 대기
  
  // 2번 대기: 이 데이터가 올 때까지 브라우저는 화이트 아웃(White-out) 상태!
  await queryClient.prefetchQuery({ queryKey: ['stores'], queryFn: fetchStoreList });

  return <main>{children}</main>;
}
```

**해결책: `loading.tsx` 도입과 병렬 처리**
(protected)/loading.tsx를 생성하여 서버가 데이터를 가져오는 동안 사용자에게 즉시 로딩 UI를 스트리밍합니다.


## 5. 마치며
직접 구현한 인증 시스템은 라이브러리 뒤에 숨겨진 **Next.js의 렌더링 원리(Streaming, Hydration, Middleware)** 를 깊이 이해하게 해주었습니다.

로컬 환경(npm run dev)에서는 컴파일 오버헤드로 인해 리다이렉트가 다소 느려 보일 수 있지만, 실제 빌드된 환경에서는 NextAuth 못지않은 매끄러운 UX를 제공할 수 있게 되었습니다.