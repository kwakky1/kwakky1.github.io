---
title: "Next.js를 Docker에서 실행하면 API 호출이 실패하는 진짜 이유"
date: 2026-02-07
categories: [Next.js, Docker, Troubleshooting]
tags: [nextjs, docker, api, axios, next-auth, baseurl]
feature_image: "https://picsum.photos/2560/600?image=891"
---

# Next.js를 Docker에서 실행하면 API 호출이 실패하는 진짜 이유

Next.js 프로젝트를 Docker 환경에서 실행할 때  
**API 호출이 정상적으로 동작하지 않는 문제**를 겪는 경우가 많다.

특히 다음과 같은 상황이 자주 발생한다.

- 브라우저에서는 정상 동작
- Next 서버 내부 호출에서는 실패
- `localhost`로 호출하면 연결 불가
- 컨테이너 이름으로 호출해야 정상 동작

이번 글에서는  
**왜 이런 문제가 발생하는지**와  
**실무에서 사용하는 해결 방법**을 정리한다.

---

# 문제 상황

Docker Compose 환경:

- Next.js: `3000`
- API Server: `3001`

로컬에서 Next를 실행하면 문제 없음.

하지만 **Next까지 Docker에서 실행**하면:

`AxiosError: connect ECONNREFUSED 127.0.0.1:3001`

같은 에러가 발생한다.

---

# 핵심 원인: localhost의 의미가 다르다

가장 중요한 포인트는 이것이다.

> Docker 내부에서의 `localhost`는  
> **내 PC가 아니라 해당 컨테이너 자신**을 의미한다.

즉:

| 호출 위치 | localhost 의미 |
|-----------|----------------|
| 브라우저 | 사용자 PC |
| Next 서버(컨테이너) | Next 컨테이너 |
| API 컨테이너 | API 컨테이너 |

따라서 Next 컨테이너에서

`http://localhost:3001`

을 호출하면  
**API 서버가 아니라 자기 자신을 바라보게 된다.**

→ 당연히 연결 실패.

---

# 해결 방법: 컨테이너 이름으로 호출하기

Docker Compose에서는  
**서비스 이름이 내부 DNS 주소**가 된다.

예:
```yaml
services:
  next:
    ...
  api:
    ...
```

이 경우 Next 컨테이너에서 API 호출은:
`http://api:3001` 처럼 해야 한다.


Next.js + Docker 환경에서 API 호출이 실패하는 이유는 단순하다.

localhost가 서로 다른 공간을 가리키기 때문이다.
해결 방법은 명확하다. Docker 내부에서는 컨테이너 이름 사용


