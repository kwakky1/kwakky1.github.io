---
title: Apple 로그인 구현 중 EB 환경변수 개행 문제와 테스트 서버 500 에러 해결기
date: 2026-02-11
categories: [Auth, Next.js, AWS]
tags: [Apple Login, NextAuth, JWT, Elastic Beanstalk, Cookie, Troubleshooting]
feature_image: "https://picsum.photos/2560/600?image=9895"
---

Next.js + NextAuth 환경에서 **Apple 로그인**을 구현하던 중
로컬에서는 정상 동작하지만 **테스트 서버(Elastic Beanstalk)에서만 500 에러**가 발생하는 문제가 있었다.

디버깅 과정에서 확인된 원인과 해결 방법을 정리한다.

---

# 문제 상황

## 환경별 동작 차이

| 환경 | 결과                              |
|------|---------------------------------|
| 로컬 개발 환경 | Apple 로그인 정상 (500에러는 안남)        |
| 테스트 서버(EB) | **500 Internal Server Error 발생** |

특이했던 점은:

> **로컬에서는 authOptions 생성 자체에 오류가 없었지만  
> 테스트 서버에서는 authOptions 단계에서 이미 예외가 발생**했다는 것이다.

---

# 실제 에러 흐름

1. NextAuth 초기화 과정에서 `authOptions` 생성
2. Apple `clientSecret` 생성을 위해 **Private Key 파싱 시도**
3. EB 환경변수에 저장된 key 문자열이 **손상된 상태**
4. `createPrivateKey` 단계에서 예외 발생
5. 결과적으로 **NextAuth 전체가 500 에러로 실패**

즉,

> **로그인 실패가 아니라 인증 설정 생성 단계에서 이미 크래시가 발생**한 문제였다.

---

# 원인 분석

## EB 환경변수 개행 문자 손실

Apple JWT 서명에는 `.p8 Private Key`가 필요하다.

로컬 `.env`에서는 정상:
```
—–BEGIN PRIVATE KEY—–
ABCDEF…
—–END PRIVATE KEY—–
```

하지만 EB 환경변수에 문자열로 저장하면:

- `\n` 개행이 제거되거나
- escape 처리 깨짐

런타임 실제 값:
```—–BEGIN PRIVATE KEY—–ABCDEF—–END PRIVATE KEY—–```

결과:

- `createPrivateKey` 파싱 실패
- JWT 생성 실패
- **authOptions 생성 단계에서 500 에러 발생**

---

# 해결 방법

핵심은 다음 두 가지였다.

> **1. Private Key를 Base64로 저장**  
> **2. 런타임에서 복원 후 JWT 생성**

---

## Base64 인코딩 후 환경변수 저장

```
base64 AuthKey_XXXX.p8
```

```APPLE_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0t...```

## 런타임에서 복원 후 clientSecret 생성

```ts
import { SignJWT } from "jose";
import { createPrivateKey } from "crypto";

export const createAppleClientSecret = async (): Promise<string> => {
const privateKey = Buffer.from(
process.env.APPLE_PRIVATE_KEY_BASE64!,
"base64"
).toString("utf-8");

return await new SignJWT({})
.setProtectedHeader({
alg: "ES256",
kid: process.env.APPLE_KEY_ID!,
})
.setIssuer(process.env.APPLE_TEAM_ID!)
.setSubject(process.env.APPLE_CLIENT_ID!)
.setAudience("https://appleid.apple.com")
.setIssuedAt()
.setExpirationTime("2h")
.sign(createPrivateKey(privateKey));
};
```

결과:
- authOptions 생성 정상화
- 테스트 서버에서도 Apple 로그인 성공

---

# 추가 이슈: HTTPS 환경의 세션 쿠키 문제

EB에서는 로그인 이후에도
세션이 유지되지 않는 문제가 함께 존재했다.

원인:

> HTTPS 환경에서 필요한 쿠키 옵션 미설정

```ts
cookies: {
  sessionToken: {
    name: "__Secure-next-auth.session-token",
    options: {
      httpOnly: true,
      sameSite: "none",
      path: "/",
      secure: true,
    },
  },
}
```

핵심:  
- sameSite: "none" → OAuth 리다이렉트 필수
- secure: true → HTTPS 필수
- __Secure- prefix → 보안 요구사항 충족

--- 

# 최종 정리

## ❌ 발생했던 문제
- EB 환경변수에서 Private Key 개행 손실
- authOptions 생성 단계에서 서버 500 에러
- HTTPS 쿠키 옵션 누락으로 세션 유지 실패

---

## ✅ 해결 방법
- Private Key Base64 저장 → 런타임 복원
- Apple JWT 정상 생성
- NextAuth 초기화 안정화
- Secure 쿠키 설정 적용
- 테스트 서버까지 완전 정상 동작


--- 

# 느낀 점

이번 이슈의 핵심은 코드가 아니라:

> 배포 환경에서의 문자열 처리 방식 차이

였다.

특히 OAuth + JWT + 클라우드 조합에서는
- 로컬 정상
- 서버만 실패

패턴이 매우 흔하다.

앞으로는 다음을 기본 체크리스트로 가져가야겠다:
- 개행 포함 키 → 무조건 Base64 저장
- NextAuth 500 → authOptions 초기화 단계부터 의심
- HTTPS 환경 → 쿠키 옵션 먼저 확인