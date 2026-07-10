---
title: Core Web Vitals 개선하기 | Hero 영상 LCP와 서드파티 스크립트 로딩 전략 정리
date: 2026-07-10
categories: [Frontend, Optimization]
tags: [Next.js, Performance, LCP, CoreWebVitals]
feature_image: "https://picsum.photos/2560/600?image=902"
---

메인 배너에 자동재생 영상을 쓰는 랜딩 페이지의 Core Web Vitals를 개선한 기록입니다. 영상 하나만 손보면 끝날 줄 알았는데, 실제로는 "화면에 안 보이는 리소스가 왜 로드되고 있는가"를 하나씩 걷어내는 작업에 가까웠습니다.

![Lighthouse 점수 비교 - 개선 전](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682172/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/xk1ic45sfmfzzv42aa6n.png)
![Lighthouse 점수 비교 - 개선 후](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682173/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/dziqxrrvtxp8knjnrsie.png)

## 1. Hero 영상: 숨겨진 반응형 분기의 이중 fetch

PC/모바일 배너를 각각 다른 `<video>`로 렌더링하고 `display: none`으로 한쪽만 숨기는 반응형 패턴을 쓰고 있었습니다.

- **문제**: 두 `<video>` 모두 DOM에 마운트된 상태라 `autoPlay` 속성이 둘 다 동작해, 화면에 보이지도 않는 쪽의 영상까지 함께 다운로드·재생되고 있었습니다. 모바일에서 PC용 영상까지 몰래 받는 셈이라 대역폭과 LCP 모두 손해.

<!-- TODO(image): 수정 전 상태를 재현해 크롬 DevTools Network 탭 스크린샷. PC/MO 두 video 리소스가 동시에 로드되는 워터폴이 보이면 됨 (Filter: Media). -->

- **해결**: `autoPlay` 속성을 떼고, `offsetParent`로 실제 화면에 렌더링 중인 요소인지 확인한 뒤에만 `load()`를 호출하도록 게이팅했습니다. 그리고 poster 이미지를 문서 흐름 안에 그대로 두어 LCP 요소를 "영상"이 아닌 "poster 이미지 로딩 속도"로 고정시키고, video는 `canplay` 이벤트 이후 `opacity`로만 위에 겹쳐 노출했습니다.

```tsx
const video = videoRef.current;
// display:none으로 숨겨진 반응형 분기(PC/MO)에서는 로드하지 않음
if (!video || video.offsetParent === null) return;

const handleCanPlay = () => {
  setIsVideoReady(true);
  video.play();
};
video.addEventListener("canplay", handleCanPlay);
video.load();
```

```tsx
// poster는 일반 흐름에 남겨 LCP 앵커 + 컨테이너 레이아웃 높이 역할을 겸하게 하고,
// video는 그 위에 절대 위치로 겹쳐 opacity로만 노출한다.
// video를 문서 흐름에서 완전히 빼버리면(예: display:none 토글) 부모에 명시적 height가
// 없는 한 컨테이너가 0x0으로 붕괴하는 함정이 있어 주의가 필요하다.
<Box position="relative">
  <img src={poster} alt="" fetchPriority="high" style={{ display: "block", objectFit: "cover" }} />
  <video style={{ position: "absolute", inset: 0, opacity: isVideoReady ? 1 : 0, transition: "opacity 300ms ease-in" }} ... />
</Box>
```

![수정 후 Network 탭 - video 요청이 하나로 줄어든 모습](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682174/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/y1vxwwzwndovgqkaasgm.png)

## 2. 서드파티 스크립트: 전역 로드에서 컴포넌트 단위 로드로

지도 SDK를 `_app.tsx`에서 `beforeInteractive`로 전역 로드하고 있었습니다.

- **문제**: 지도가 안 보이는 페이지에서도 렌더링을 막아가며 무거운 SDK를 미리 받고 있었습니다. 첫 페인트를 늦추는 리소스가 정작 필요 없는 페이지에도 실려 있는 상황.

![지도가 없는 페이지에서 카카오맵 SDK가 beforeInteractive로 로드되던 수정 전 모습](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682175/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/xisyiyyyt55hz4ys9wbc.png)

- **해결**: 스크립트를 지도를 실제로 쓰는 컴포넌트 내부로 옮기고 `afterInteractive` + `onReady` 콜백으로 전환했습니다. 이때 스크립트 로드 완료 여부를 `state`로 추적해야 하는 이유가 있는데, 클라이언트 사이드 라우팅으로 해당 컴포넌트가 뒤늦게 마운트되는 경우 `useEffect`의 지도 초기화 로직이 스크립트 로드 완료보다 먼저 실행돼버리는 레이스 컨디션이 있었기 때문입니다.

```tsx
const [isScriptReady, setIsScriptReady] = useState(
  () => typeof window !== "undefined" && !!window.kakao?.maps,
);

useEffect(() => {
  if (!isScriptReady || !mapRef.current) return;
  window.kakao.maps.load(() => {
    /* 지도 초기화 */
  });
}, [isScriptReady, latitude, longitude]);

return (
  <>
    <Script
      strategy="afterInteractive"
      src={SDK_URL}
      onReady={() => setIsScriptReady(true)}
    />
    <div ref={mapRef} />
  </>
);
```

같은 맥락에서 GTM 스크립트도 `_document.tsx`에 raw `<script>` 태그로 박혀 있던 것을 `next/script`(`afterInteractive`)로 옮겼습니다. raw script는 Next의 로딩 전략 최적화 대상 밖에 있어서, 굳이 페이지 렌더링을 막을 이유가 없는 스크립트가 조기에 실행되고 있었습니다.

## 3. 폰트: 안 쓰는 굵기까지 강제 preload하고 있었다

`next/font/local`로 커스텀 폰트를 등록할 때 7개 굵기(weight)를 전부 나열해뒀는데, 기본 설정상 모두 `<link rel="preload">`로 강제 fetch되고 있었습니다.

- **문제**: 실제 화면에서 쓰지 않는 Thin·ExtraLight 굵기까지 preload 대상에 포함되어, Hero 영상·이미지 같은 진짜 above-the-fold 리소스와 초기 대역폭을 다투고 있었습니다.

![수정 전 Network 탭 - 폰트 7개 굵기가 전부 preload로 잡혀있는 모습](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682176/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/i458ht9ekcjyfsker7na.png)

- **해결**: 안 쓰는 굵기 정의를 제거하고, `preload: false`로 바꿔 폰트를 일반 CSS 리소스 로딩 경로로 내렸습니다.

```tsx
const customFont = localFont({
  preload: false, // above-the-fold 리소스와의 대역폭 경합 방지
  src: [
    { path: "...-Bold.woff2", weight: "700", style: "normal" },
    { path: "...-Regular.woff2", weight: "400", style: "normal" },
    // Thin, ExtraLight 등 실사용 없는 굵기는 제거
  ],
});
```

## 4. 무거운 슬라이더도 code splitting

상품 목록 페이지의 프로모션 슬라이더가 페이지 컴포넌트에 직접 import되어 있어, 슬라이더 라이브러리가 초기 번들에 그대로 포함되고 있었습니다. 슬라이더 자체를 별도 컴포넌트로 추출하고 `next/dynamic`으로 분리했습니다.

```tsx
const CategoryPromoSwiper = dynamic(
  () => import("@/components/CategoryPromoSwiper"),
);
```

![Network 탭 - 슬라이더 청크가 초기 로드에서 빠진 모습, 개선 전](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682177/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/ymk6ykbuneabymlhvvl6.png)
![Network 탭 - 슬라이더 청크가 초기 로드에서 빠진 모습, 개선 후](https://res.cloudinary.com/bx1ml39u/image/upload/v1783682178/kwakky1-blog/2026-07-10-core-web-vitals-hero-video-script-optimization/aamnl6jjfiyi9ding8oo.png)

## 정리

이번 작업에서 반복된 패턴은 결국 하나였습니다 — **"화면에 지금 안 보이는 것"과 "브라우저가 지금 우선적으로 받고 있는 것"이 일치하지 않는 지점을 찾아 맞추는 것**. LCP 요소를 명확한 하나의 리소스(poster 이미지)로 고정하고, 당장 필요 없는 스크립트·폰트·라이브러리의 우선순위를 의도적으로 낮추는 것만으로도 손댈 수 있는 부분이 생각보다 많았습니다.
