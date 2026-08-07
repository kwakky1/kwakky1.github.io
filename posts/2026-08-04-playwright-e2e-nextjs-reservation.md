---
title: Next.js 예약 서비스에 Playwright e2e 붙이기 — 로그인, 예약, 마이페이지
date: 2026-08-04
categories: [Testing, Frontend]
tags: [Playwright, e2e, Next.js, React Hook Form]
feature_image: "https://picsum.photos/2560/600?image=1050"
---

로그인, 예약, 마이페이지는 서비스에서 가장 자주 건드리는 만큼 배포 이후에도 조용히 깨지기 쉬운 영역이다. 유닛 테스트만으로는 "폼을 채우고 제출했을 때 실제로 다음 화면으로 넘어가는지" 같은 흐름 전체를 보장할 수 없어서, 로그인 → 예약 → 마이페이지 순서로 Playwright e2e를 붙였다. 세 플로우를 진행하면서 매번 부딪힌 질문은 같았다 — **이 API를 모킹해도 되는가, 아니면 실제로 붙여야 하는가.**

---

## 환경 설정: `next dev`와 다르게 동작하는 것들

`playwright.config.ts`는 시스템에 설치된 Chrome을 그대로 쓰고, 서버가 안 떠 있으면 `npm run dev`를 자동으로 띄우도록 구성했다.

```typescript
// playwright.config.ts
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: { slowMo: Number(process.env.SLOWMO) || 0 }
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120000 }
});
```

`webServer.reuseExistingServer: true`는 로컬에서 이미 `npm run dev`가 떠 있으면 재사용하고, 없으면 새로 띄운다. 헤드리스 기본값 대신 눈으로 확인하고 싶을 때는 `SLOWMO=400 playwright test --headed`로 액션 사이에 딜레이를 주는 스크립트(`test:e2e:headed`)를 따로 뒀다.

한 가지 삽질한 부분은 `.env` 로드였다. `next dev`는 `.env`/`.env.local`을 자동으로 읽지만 Playwright는 그렇지 않다. 설정 파일 맨 위에서 직접 `dotenv`로 로드해야 하고, 이때도 Next.js와 같은 우선순위(`.env.local`이 `.env`를 덮어씀)를 맞춰줘야 실제 서버가 보는 환경변수와 테스트가 읽는 환경변수가 어긋나지 않는다.

```typescript
dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
```

---

## 로그인: 인증 방식 3갈래, 모킹 전략도 제각각

로그인 화면은 이메일/SNS/비회원 3갈래로 갈라져서, 스펙 파일도 `login-email`, `login-sns`, `login-nomember`로 나눠 작성했다.

**이메일 로그인**은 폼 검증과, 로그인 실패 시 쿼리파라미터로 넘어오는 7종 에러 메시지 안내 모달이 제대로 뜨는지를 확인한다. 실계정으로 실제 로그인까지 검증하는 테스트는 `env` 변수가 있을 때만 돈다.

**SNS 로그인**은 5개 provider(카카오/네이버/구글/페이스북/애플) 버튼의 접근성 라벨을 확인하고, 클릭 시 각 OAuth 인가 화면 호스트로 리다이렉트되는지까지만 본다. 실제 자격증명을 입력하는 인증까지는 검증하지 않는다 — 여기까지만 자동화해도 "버튼이 엉뚱한 provider로 연결되는" 회귀는 잡을 수 있다.

```typescript
const providers = [
  { id: "kakao", label: "카카오", hostPattern: /kauth\.kakao\.com/ },
  { id: "naver", label: "네이버", hostPattern: /nid\.naver\.com/ },
  // ...
];

for (const { id, label, hostPattern } of providers) {
  test(`${label} 버튼 클릭 시 ${id} OAuth 인가 화면으로 이동한다`, async ({ page }) => {
    await page.getByRole("button", { name: `${label}로 로그인` }).click();
    await page.waitForURL(hostPattern, { timeout: 15000 });
  });
}
```

가장 흥미로웠던 건 **비회원 로그인**이다. 이름/전화번호를 입력하면 서버가 SMS로 인증번호를 보내는 흐름인데, 테스트에서 실제 문자를 받을 수는 없다. 대신 인증번호 발송 요청 자체를 가로채서, 요청 본문에 담긴 메시지 텍스트에서 인증번호를 정규식으로 뽑아낸 뒤 성공 응답으로 대체했다.

```typescript
async function mockSendSms(page: Page) {
  let sentCode = "";
  await page.route("**/api/user/sendSMS", async (route) => {
    const body = route.request().postDataJSON() as { message: string };
    sentCode = body.message.match(/\[(\d{4})\]/)?.[1] ?? "";
    await route.fulfill({ json: { success: true } });
  });
  return () => sentCode;
}
```

실제 문자를 발송하지 않으면서도 "서버가 생성한 진짜 인증번호"로 다음 단계(인증번호 입력 → 확인)까지 그대로 이어갈 수 있었다. 이 헬퍼는 이후 예약, 마이페이지 스펙에서 비회원 세션을 만드는 데 그대로 재사용했다.

---

## 예약: 뭘 모킹할 수 있고, 뭘 못 하는지가 API 위치에 따라 갈렸다

예약 플로우에서는 같은 "폼 제출"이라도 API가 어디서 호출되느냐에 따라 테스트 방식이 완전히 달라졌다.

**예약 생성**은 클라이언트에서 `fetch`로 호출하는 API(`/api/reserve/schedule`, `/api/reserve/create`)라서 `page.route`로 브라우저 네트워크 레이어에서 그대로 가로채 모킹할 수 있었다. 실제 백엔드에 데이터를 쓰지 않고도 폼 검증부터 제출, 완료 화면 이동까지 검증 가능하다.

```typescript
await page.route("**/api/reserve/schedule", async (route) => {
  await route.fulfill({ json: { success: true, data: [{ start_time: "14:00", blocked: false, slots: 3 }] } });
});
await page.route("**/api/reserve/create", async (route) => {
  await route.fulfill({ json: { success: true, data: { id: 999999 } } });
});
```

반면 **예약 변경/취소** 페이지는 `getServerSideProps`에서 서버 사이드로 백엔드를 호출한다. 이 요청은 브라우저를 거치지 않고 Next.js 서버 프로세스 안에서 발생하기 때문에 `page.route`로는 애초에 가로챌 방법이 없다. 결국 이 구간은 로컬 dev 백엔드에 실제로 예약을 생성 → 변경 → 취소까지 왕복시키는 별도 테스트로 작성했다. 취소로 끝맺도록 해서 취소된 예약은 목록에서 빠지므로 테스트 데이터가 남지 않는다.

이 실제-연동 테스트에서는 두 가지를 신경 써야 했다.

- **날짜/시간 슬롯을 하드코딩하지 않기**: 특정 매장을 고정하면 그 매장이 정기휴무인 요일마다 테스트가 깨진다. 그래서 매 실행마다 오늘 영업 중인 매장을 API로 조회해서 고르고, 예약 가능한 슬롯도 앞으로 7일 범위 안에서 동적으로 탐색하도록 했다.
- **변경 시 같은 슬롯으로 재제출하면 안 됨**: 예약 변경은 "기존 슬롯을 비우고 새 슬롯을 채우는" 게 아니라, 재고 체크가 본인이 이미 점유한 슬롯을 제외하지 않고 계산해서 같은 시간으로 재제출하면 "예약이 모두 찼습니다"로 잘못 거부된다. 그래서 변경 단계에서는 방금 생성했던 슬롯을 명시적으로 제외하고 다른 시간을 골랐다.

예약 생성/변경/취소 모두 "1시간 이내 임박 예약은 서버에서 변경·취소를 막는" 정책이 있어서, 생성부터 취소까지 전체 흐름이 끝날 때까지 여유가 있도록 오늘 날짜에서는 90분 이상 남은 슬롯만 고르도록 버퍼를 뒀다.

### 테스트 중 발견한 버그

예약 폼에서 연령을 선택하지 않고 제출했을 때 에러 문구가 안 뜨는 걸 발견했다. 원인은 `RadioBoxGroup.tsx`가 react-hook-form의 에러 객체를 `errors[id]`로 조회하고 있었는데, 실제 필드 이름이 `data.age`처럼 점 경로였던 것. react-hook-form은 이런 경우 `errors.data.age`로 중첩 저장하기 때문에 `errors["data.age"]`는 항상 `undefined`였다.

```diff
+ import get from "lodash/get";

- {errors[id] && <FormHelperText>{errors[id]?.message}</FormHelperText>}
+ {get(errors, id) && <FormHelperText>{get(errors, id)?.message as string}</FormHelperText>}
```

`lodash/get`으로 점 경로를 그대로 따라가도록 바꿔서 해결했다. e2e가 아니었다면 "연령을 선택하지 않고 제출 버튼을 눌렀을 때"라는, 후속 스텝에 가려 눈에 잘 안 띄는 케이스라 계속 묻혀 있었을 가능성이 높다.

---

## 마이페이지: 비회원 세션의 한계

마이페이지는 회원정보 수정/비밀번호 변경/약관 동의/회원탈퇴로 구성돼 있는데, 비회원(noMember) 세션은 `session.user.id`가 항상 `0`으로 발급된다. `findUserById`를 거치는 페이지(`/user`, `/user/edit` 등)는 이 세션으로 접근하면 전부 `notFound` 처리된다. 반면 `/user/edit/password`, `/user/edit/unsubscribe`처럼 `getServerSideProps`에서 유저 조회를 거치지 않는 페이지는 비회원 세션으로도 접근 가능했다.

결국 페이지별로 두 세션을 나눠 썼다.

- 유저 조회가 필요 없는 페이지: 비회원 세션(SMS 가로채기) 재사용
- 유저 조회가 필요한 페이지: 로그인 스펙과 동일한 실계정 `env` 변수 재사용, 없으면 `test.skip`

```typescript
test.beforeEach(async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "E2E_EMAIL_TEST_EMAIL / E2E_EMAIL_TEST_PASSWORD 환경변수가 없어 skip");
  await loginAsEmail(page);
  await page.goto("/user");
});
```

CI 환경이나 실계정 정보를 공유하지 않는 로컬 환경에서도 스위트 전체가 실패로 빨갛게 뜨는 대신 해당 테스트만 조용히 건너뛰도록 한 것이다.

---

## CI 대신 pre-push 훅

이번에는 GitHub Actions를 새로 붙이는 대신 `.husky/pre-push`에 로컬 훅으로 넣었다.

```
npm run test:unit
npm run test:e2e
npm run build
```

push 시점에 유닛 테스트 → e2e → 빌드 순서로 돌아 무거운 e2e를 가장 먼저 걸러내지 않고 뒤로 미룬다기보다는, 실패 비용이 싼 것부터 순서대로 배치한 것이다. 원격 CI가 없는 상태에서도 "깨진 채로 push되는" 것 자체는 막을 수 있고, 이 정도로도 지금 당장의 안전망으로는 충분하다고 판단했다.

---

## 정리

- **모킹 가능 여부는 API가 어디서 호출되는지에 달려 있다.** 클라이언트 `fetch`는 `page.route`로 가로챌 수 있지만, `getServerSideProps`의 서버 사이드 호출은 브라우저 네트워크 레이어를 거치지 않아 모킹이 불가능하다 — 이 경우는 로컬 백엔드에 실제로 왕복시키고, 되돌릴 수 있는 액션(취소 등)으로 끝맺어 데이터가 남지 않게 설계해야 한다.
- **SMS/이메일처럼 진짜 발송이 불가능한 인증 단계는, 발송 요청을 가로채 서버가 생성한 진짜 값을 추출하는 방식**으로 실제 인증 로직을 그대로 태울 수 있다. 값을 하드코딩하는 것보다 실제 흐름에 더 가깝다.
- **실계정이 있어야만 검증 가능한 케이스는 env 유무로 skip 처리**해서, 자격증명이 없는 환경에서도 스위트 전체가 빨갛게 뜨지 않도록 했다.
- 반복되는 로그인/인증 흐름은 헬퍼 함수로 뽑아 다음 스펙에서 그대로 재사용하는 편이, 매번 새로 짜는 것보다 훨씬 빠르게 커버리지를 넓힐 수 있었다.
- e2e는 버그를 잡는 도구이기 이전에, "이 폼이 실제로 어떻게 검증되고 있었는지"를 다시 들여다보게 만드는 계기이기도 했다. `RadioBoxGroup` 버그가 그 경우다.
