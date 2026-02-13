---
title: Next.js 메인 페이지 성능 최적화 | LCP 개선 및 SSR에서 ISR로의 전환
date: 2026-02-13
categories: [Frontend, Optimization]
tags: [Next.js, Performance, ISR, LCP, BundleAnalyzer]
feature_image: "https://picsum.photos/2560/600?image=895"
---

메인 페이지(`index.tsx`)의 로딩 속도를 개선하고 서버 자원을 효율적으로 사용하기 위해 진행한 핵심 최적화 작업 기록입니다.

## 1. 렌더링 전략 수정: SSR에서 ISR로 전환
매 요청마다 서버에서 페이지를 생성하던 방식(SSR)을 정적 생성 및 주기적 갱신 방식(ISR)으로 변경했습니다.

- **문제**: `getServerSideProps`를 사용 시 사용자가 접속할 때마다 DB 조회와 페이지 렌더링이 발생하여 TTFB(첫 바이트 수신 시간)가 느려지고 서버 부하가 가중됨.
- **해결**: `getStaticProps`와 `revalidate` 옵션을 사용하여 빌드 시점에 페이지를 미리 생성하고, 설정된 주기마다 배경에서 데이터를 갱신하도록 수정했습니다. 이를 통해 사용자에게 즉각적인 응답(Static 캐시)을 제공할 수 있게 되었습니다.

```typescript
export async function getStaticProps() {
  // 서버 사이드 직접 호출을 통한 데이터 페칭 (Self-API 호출 제거)
  const data = await getActivePopups();
  const popupList = JSON.parse(JSON.stringify(data));

  return {
    props: { popupList },
    // 60초마다 백그라운드에서 페이지 재생성 (ISR 전환)
    revalidate: 60 
  };
}
```

## 2. 무거운 컴포넌트 동적 임포트 (Dynamic Import)
초기 번들 사이즈를 키워 JS 실행 시간을 지연시켰던 라이브러리들을 `next/dynamic`으로 분리했습니다.

- **해결**: `@mui/x-data-grid`를 메인 첫 화면에 즉시 필요하지 않은 컴포넌트들을 동적 임포트로 전환하여 초기 로딩 속도를 개선했습니다.

```typescript
import dynamic from 'next/dynamic';

const DataGrid = dynamic(
  () => import('@mui/x-data-grid').then((mod) => mod.DataGrid), { ssr: false }
);
```


## 3. 빌드 시점의 Self-API 호출 제거
- **문제**: 빌드 시점에 `localhost` API를 호출하여 불필요한 네트워크 오버헤드가 발생함.
- **해결**: API 핸들러 로직을 서버 내부 함수로 분리하여 DB를 직접 조회하도록 수정함으로써 빌드 안정성과 속도를 확보했습니다.

## 4. Next/Image를 활용한 CLS 및 LCP 최적화
- **LCP 개선**: 메인 배너 이미지에 `priority` 속성을 부여하여 브라우저가 최우선 순위로 로드하도록 설정했습니다.
- **CLS 방어**: 부모 컨테이너에 `aspectRatio`를 명시하여 이미지가 로드되기 전 레이아웃이 밀리는 현상을 방지했습니다.

```html
<Box sx={{ position: "relative", width: "100%", aspectRatio: "393 / 540" }}>
  <Image
    src={MAIN_BANNER_URL}
    alt="Breezm Main Banner"
    fill
    priority // LCP 최적화: 뷰포트 내 핵심 리소스 우선 로드
    sizes="100vw"
    style={{ objectFit: "cover" }}
  />
</Box>
````

## 5. 라이브러리 트리쉐이킹(Tree-shaking) 적용
- **변경**: `import { isEmpty } from "lodash";` 방식을 개별 모듈 참조 방식으로 변경하여 필요한 모듈만 번들에 포함시켰습니다.

```
// 변경 전: import { isEmpty } from "lodash";
// 변경 후: 필요한 함수 경로를 직접 지정하여 번들 사이즈 최소화
import isEmpty from "lodash/isEmpty";
```
