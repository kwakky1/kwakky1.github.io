---
title: Recoil에서 React Query로 서버 상태 관리 전환하기 | 로딩, 동기화, 캐싱 개선 경험
date: 2026-02-10
categories: [Frontend, State]
tags: [React, ReactQuery, Recoil, ServerState, Caching]
feature_image: "https://picsum.photos/2560/600?image=894"
---

기존 프로젝트에서는 전역 상태 관리를 위해 **Recoil**을 사용하고 있었습니다.  
하지만 서버에서 가져오는 데이터까지 Recoil로 관리하면서 다음과 같은 구조적 문제가 점점 커졌습니다.

- 로딩 / 에러 상태를 직접 관리해야 함
- `patch`, `put` 이후 데이터 동기화 로직이 복잡해짐
- 캐싱 전략 부재
- 동일 데이터에 대한 중복 요청 발생

또한 Recoil은 **현재 사실상 유지보수가 중단된 상태**이기 때문에  
장기적인 아키텍처 관점에서도 대안이 필요했습니다.

이 문제를 해결하기 위해:

- **서버 상태 → React Query**
- **클라이언트(UI) 상태 → Zustand**

로 역할을 분리하는 구조로 전환했습니다.

---

## 1. 서버 상태와 클라이언트 상태의 분리

Recoil은 **전역 상태 관리 도구**이고,  
React Query는 **서버 상태 관리 전용 도구**입니다.

서버 상태는 다음 특징을 가집니다.

- 비동기로 가져온다
- 언제든 변경될 수 있다
- 캐싱 / 재요청 전략이 필요하다

이 특성 때문에 **서버 데이터는 React Query로 관리하는 것이 구조적으로 자연스럽습니다.**

전환 이후 역할은 다음처럼 명확히 분리되었습니다.

- **서버 상태 → React Query**
- **UI 상태 → 전역 상태 관리 도구(Zustand 등)**

---

## 2. 로딩 / 에러 상태 자동 관리

Recoil에서는 다음을 직접 구현해야 했습니다.

- `isLoading` 상태
- `try / catch` 처리
- 실패 시 재시도 로직

React Query에서는 `useQuery` 하나로 해결됩니다.

```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ['orders', customerId],
  queryFn: fetchOrders,
});
```

별도의 로딩 상태 관리 코드가 필요 없어지고, 비동기 처리 구조가 단순해집니다.

---

## 3. patch / put 이후 데이터 동기화 단순화

Recoil에서는 업데이트 이후 다음 작업이 필요했습니다.

- selector 재실행 유도
- atom 직접 수정
- 리렌더 보장 처리

React Query에서는 query key 기반 캐시 무효화만 수행하면 됩니다.

```typescript
const mutation = useMutation({
  mutationFn: patchOrder,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  },
});
```

이 한 줄로 다음이 자동 처리됩니다.
- 서버 재요청
- 최신 데이터 동기화
- 화면 자동 갱신

업데이트 이후 상태 관리 복잡도가 크게 감소합니다.

---

## 4. setQueryData를 활용한 즉시 UI 반영

React Query는 낙관적 업데이트(Optimistic Update) 도 지원합니다.

```typescript
queryClient.setQueryData(['orders', customerId], (prev) => {
  if (!prev) return prev;

  return prev.map((order) =>
    order.id === updated.id ? updated : order
  );
});
```

이 방식의 장점:
- 빠른 사용자 경험 제공
- 추가 네트워크 요청 없이 캐시 수정
- 실패 시 롤백 가능

즉, 서버 응답을 기다리지 않는 UI 반응성을 구현할 수 있습니다.

---

## 5. 캐싱 전략이 기본 제공됨

React Query는 다음 기능을 기본 제공합니다.
- staleTime
- cacheTime
- refetchOnWindowFocus
- background refetch

따라서 직접 캐시 로직을 구현할 필요가 없습니다.

이는 서버 상태 관리에서 매우 큰 생산성 차이를 만듭니다.

---

## 6. 실제 전환 후 체감된 변화

### 코드 복잡도 감소
- selector 제거
- atom 의존성 감소
- 로딩 상태 코드 삭제

→ 전반적인 코드량 감소

### 데이터 흐름 명확화

이전
- 전역 상태와 서버 상태가 혼합됨

이후
- 서버 상태 → React Query
- 클라이언트 상태 → 전역 상태

→ 책임 분리가 명확해짐

### 업데이트 처리 단순화

이전:
- patch 이후 atom 직접 수정
- selector 재계산
- 리렌더 보장 필요

이후:
```typescript
queryClient.invalidateQueries({ queryKey: ['orders'] });
```
→ 한 줄로 전체 동기화 해결
물론 서버 부하를 막기 위해 setQueryData를 많이 사용했습니다.

## 7. 전역 상태 관리 도구는 Zustand로 전환

Recoil은 더 이상 활발한 업데이트가 이루어지지 않고 있으며,
장기 유지보수 관점에서 지속 가능한 대안이 필요했습니다.

현재 구조에서는 다음과 같이 역할을 분리했습니다.
- 서버 상태 → React Query
- 전역 UI 상태 → Zustand

Zustand를 선택한 이유:
- 보일러플레이트가 매우 적음
- React Query와 역할 충돌이 없음
- 서버 상태와 자연스럽게 분리됨
- 러닝 커브가 낮고 유지보수가 쉬움

결과적으로 상태 관리 아키텍처가 단순하고 명확해졌습니다.

--- 

마치며

Recoil에서 React Query + Zustand 구조로 전환한 이후:
- 로딩 / 에러 처리 자동화
- patch / put 이후 동기화 단순화
- 캐싱 전략 내장
- 상태 책임 분리 명확화
- 코드 복잡도 감소

특히 invalidateQueries와 setQueryData 는
서버 상태 관리 경험을 근본적으로 바꾸는 핵심 기능이었습니다.

서버 상태와 클라이언트 상태를 명확히 분리하는 것만으로도
프론트엔드 아키텍처의 복잡도를 크게 낮출 수 있었습니다.