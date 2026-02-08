---
title: Next.js + NestJS 세션 기반 로그인 구조 전환 정리
date: 2026-02-08 21:00:00 +0900
categories: [Frontend, Architecture]
tags: [Next.js, NestJS, Session, SSR, ReactQuery]
feature_image: "https://picsum.photos/2560/600?image=892"
---

## 1. 배경
기존 프론트엔드 구조는 **클라이언트 상태 기반(Client-side state)** 로그인 방식을 사용하고 있었습니다.

* **Recoil:** 모든 인증 상태 저장
* **흐름:** 로그인 후 클라이언트 상태 변경 → Client-side Redirect
* **권한 제어:** 각 페이지 내부 혹은 Client Component에서 처리

이 구조는 서버와 클라이언트의 싱크 문제 및 보안 취약점을 야기했습니다.

## 2. 기존 구조의 문제점

### 2.1 인증의 '진실 소스(Source of Truth)' 불일치
인증의 실제 데이터는 서버 세션에 있지만, UI 판단은 클라이언트의 Recoil 상태에 의존했습니다. 이로 인해 두 상태가 불일치할 가능성이 항상 존재했습니다.

### 2.2 SSR 환경과의 충돌 (Next.js App Router)
Next.js의 App Router 환경에서는 서버에서 페이지가 렌더링될 때 이미 로그인 여부가 결정되어야 합니다. 기존 방식은 다음과 같은 사용자 경험 저하를 일으켰습니다.
1.  **로그인 깜빡임:** 페이지 렌더링 후 클라이언트 JS가 로드되어야 세션을 확인하고 리다이렉트함.
2.  **보안:** 클라이언트 단의 리다이렉트는 소스 코드 노출 및 우회 가능성이 존재.
3.  **비효율:** 불필요한 클라이언트 사이드 API 호출 발생.

### 2.3 인증 책임의 파편화
| 위치 | 역할 |
| :--- | :--- |
| **Recoil** | 로그인 상태 저장 |
| **Header** | 세션 체크 및 UI 대응 |
| **각 Page** | 개별 리다이렉트 처리 로직 포함 |

---

## 3. 해결 전략
> **핵심 원칙:** "로그인 여부의 진실은 반드시 **서버 세션**이어야 한다."

따라서 모든 인증 구조를 **SSR 중심 구조**로 전환하여 서버에서 권한을 먼저 검증하도록 설계했습니다.



## 4. 새로운 아키텍처

### 4.1 역할 분리
| 영역 | 책임 |
| :--- | :--- |
| **SSR Protected Layout** | 서버에서 세션 확인 후 즉시 Redirect 처리 (권한 수문장) |
| **React Query** | Login / Logout / Switch 등 명령(Mutation) 및 캐시 관리 |
| **NestJS Session** | 인증의 실제 데이터 및 유효성 검증 (True Source) |
| **Zustand (Optional)** | 단순 UI 표시용(프로필 이미지 등) 전역 상태 |

### 4.2 전체 인증 흐름
1.  **LoginForm:** React Query의 `useMutation` 호출.
2.  **Server:** `POST /user/login` 처리 후 세션 생성.
3.  **Client:** `router.replace('/')`와 `router.refresh()`를 순차 실행하여 서버 데이터를 갱신.
4.  **Protected Layout (SSR):** 페이지 진입 전 서버에서 세션을 확인하고, 유효하지 않으면 즉시 서버 사이드 `redirect` 수행.

---

## 5. 주요 코드 변경 사항

### 5.1 React Query 기반 Auth 훅 (`queries/useAuth.ts`)
요청 관리와 성공 후 처리를 캡슐화합니다. 여기서 핵심은 `router.refresh()`입니다.

```typescript
export const useAuth = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const login = useMutation({
    mutationFn: loginApi,
    onSuccess: () => {
      router.replace('/');
      router.refresh(); // 서버 컴포넌트 데이터 갱신
    },
  });

  const logout = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.clear();
      router.replace('/account/signin');
      router.refresh();
    },
  });

  return { login, logout };
};
```

### 5.2 Protected Layout에서의 서버 인증 (`app/(protected)/layout.tsx`)
인증 판단의 단일 진입점입니다. 클라이언트가 페이지에 접근하기 전 서버에서 먼저 차단하므로 보안성이 가장 높습니다.

```typescript
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/services/auth';

export default async function ProtectedLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  // 서버 사이드에서 세션 확인
  const user = await getSessionUser();

  if (!user) {
    // 세션이 없으면 즉시 로그인 페이지로 리다이렉트
    redirect('/account/signin');
  }

  return <>{children}</>;
}
```

### 5.3 중요: SSR 환경에서의 쿠키 전달 (Manual Cookie Forwarding)

Next.js App Router의 서버 컴포넌트(Server Components)에서 API를 호출할 때는 브라우저의 자동 쿠키 전송 메커니즘이 작동하지 않습니다. 따라서 서버 단에서 NestJS로 요청을 보낼 때는 반드시 현재 브라우저가 가진 쿠키를 직접 헤더에 담아줘야 합니다.



**구현 예시 (`services/auth.ts`):**

```typescript
import axios from 'axios';
import { cookies } from 'next/headers';

export const getSessionUser = async () => {
  const cookieStore = cookies();
  const cookieString = cookieStore.toString(); // 현재 브라우저의 모든 쿠키 추출

  try {
    const response = await axios.get(`${process.env.API_URL}/user/session`, {
      headers: {
        // 서버 컴포넌트(Node.js 환경)에서 백엔드로 쿠키를 직접 주입
        Cookie: cookieString,
      },
      // 서버 간 통신이므로 브라우저 전용 옵션인 withCredentials는 무시될 수 있음
    });

    return response.data;
  } catch (error) {
    // 세션이 없거나 에러 발생 시
    return null;
  }
};
```

주의사항: 클라이언트 컴포넌트(브라우저)에서 호출할 때는 브라우저가 알아서 쿠키를 넘겨주지만, 서버 컴포넌트에서 백엔드로 호출할 때는 이 수동 전달 과정이 필수입니다. 이를 누락하면 서버는 세션을 인식하지 못해 항상 `unauthorized`를 반환하게 됩니다.

## 6. 제거된 요소

인증의 진실 소스(Source of Truth)가 서버 세션으로 일원화됨에 따라, 불필요해진 클라이언트 사이드 로직들을 과감히 삭제했습니다.

### 6.1 Recoil 세션 상태 삭제
클라이언트 상태 라이브러리에서 관리하던 인증 관련 Atom들을 모두 제거했습니다.
* **삭제 대상:** `isLoggedInState`, `userAtom`, `sessionInfoAtom` 등
* **이유:** SSR 세션이 인증의 최신 상태를 보장하므로, 클라이언트가 이를 복제하여 들고 있을 경우 오히려 데이터 불일치 위험만 커지기 때문입니다.

### 6.2 클라이언트 리다이렉트 로직 제거
페이지 컴포넌트마다 흩어져 있던 인증 체크 로직을 제거했습니다.
* **기존 방식:** `useEffect` 내에서 `if (!isLoggedIn) router.push('/login')` 실행 (클라이언트 사이드 리다이렉트)
* **변경 후:** `Protected Layout`에서 서버 사이드 `redirect` 수행
* **이유:** 클라이언트 JS가 로드되기 전에 서버에서 즉시 차단하여 '로그인 깜빡임' 현상을 원천적으로 해결하기 위함입니다.

---

## 7. 최종 구조 요약



새롭게 구축된 인증 아키텍처는 다음과 같은 계층 구조를 가집니다.

* **Next.js (SSR):** `Protected Layout`이 Nest Session을 확인하여 페이지 접근 권한 결정.
* **React Query:** 로그인/로그아웃 등 API 요청 상태와 캐시 무효화 관리.
* **Zustand (Optional):** 프로필 이미지, 닉네임 등 UI 표시용 데이터만 가볍게 유지.

---

## 8. 기대 효과

### 8.1 UX 개선
* **Zero Flash:** 비인증 사용자가 페이지 진입 시 로그인 폼이 잠깐 보였다 사라지는 현상 제거.
* **즉시성:** 서버에서 리다이렉트가 결정되어 브라우저 렌더링 자원을 절약.

### 8.2 보안 강화
* 클라이언트 상태 위조를 통한 페이지 접근 불가.
* 인증 판단 로직을 서버 단일 지점으로 통합하여 관리 포인트 최소화.

### 8.3 구조 단순화
* 인증 책임이 명확히 분리되어 유지보수가 용이해짐.

---

## 9. 결론
Next.js + NestJS 환경에서 세션 기반 인증의 가장 효율적인 구조는 **"SSR Protected Layout 중심 인증"**입니다. 이번 구조 전환을 통해 클라이언트 상태 의존성을 제거하고, SSR 환경에 최적화된 보안 모델을 확립할 수 있었습니다.