---
title: Polling 대신 SSE로 실시간 알림 붙여보기 | NestJS + RxJS + EventSource
date: 2026-07-22
categories: [Backend, Realtime]
tags: [NestJS, SSE, RxJS, React, EventSource]
feature_image: "https://picsum.photos/2560/600?image=1084"
---

내부 관리 시스템에 "당일 예약이 새로 들어오거나 변경/취소되면 담당자가 즉시 알아야 한다"는 요구사항이 생겼다. 기존에는 이걸 문자메시지로 처리하고 있었는데, 어차피 담당자가 하루 종일 붙어있는 내부 시스템이니 굳이 문자로 우회하지 말고 화면에서 바로 보여주면 더 효율적이지 않겠냐는 의견이 나왔다. 다만 시스템 안에 그냥 목록만 띄워두면 문자보다 나을 게 없다 — 화면을 새로고침하거나 리스트를 다시 조회하기 전까지는 변경 사항을 알 방법이 없기 때문이다. 그래서 실시간 채널부터 붙여보기로 했다.

---

## 왜 SSE인가

가장 먼저 검토한 건 Polling이었다. 몇 초 간격으로 알림 유무를 물어보는 구조인데, 알림이 없을 때도 계속 요청이 나가는 게 거슬렸다. 간격을 짧게 잡으면 그만큼 낭비되는 요청이 쌓이고, 길게 잡으면 "즉시성"이라는 요구사항 자체가 흐려진다.

WebSocket도 고려했지만, 이 시스템은 동시 접속자가 아무리 많아도 100명 안팎인 사내 관리자용 도구다. 서버 → 클라이언트 단방향 push만 있으면 충분한 상황에서 양방향 연결까지 관리할 이유가 없었다. 이 정도 규모라면 **SSE(Server-Sent Events)** 로도 충분히 감당된다고 판단해서, 데모 삼아 붙여봤다.

---

## 구조: 유저별 SSE 연결과 RxJS Subject

백엔드는 NestJS `@Sse()` 데코레이터로 SSE 응답을 처리하고, 유저마다 별도의 RxJS `Subject`를 두어 알림을 그 유저의 스트림으로만 흘려보내는 구조로 만들었다.

```typescript
@Injectable()
export class NotificationService {
  private subjects = new Map<number, Subject<Notification>>();
  private connectionCount = new Map<number, number>();

  getStream(userId: number): Observable<MessageEvent> {
    if (!this.subjects.has(userId)) {
      this.subjects.set(userId, new Subject<Notification>());
      this.connectionCount.set(userId, 0);
    }
    this.connectionCount.set(userId, (this.connectionCount.get(userId) ?? 0) + 1);

    return this.subjects.get(userId)!.asObservable().pipe(
      map((notification) => ({
        data: JSON.stringify(notification),
        type: 'notification',
        id: String(notification.id),
      }) as MessageEvent),
    );
  }

  async push(userId: number, message: string) {
    const saved = await this.notificationRepo.save(
      this.notificationRepo.create({ userId, message }),
    );
    this.subjects.get(userId)?.next(saved);
    return saved;
  }
}
```

컨트롤러는 `@Sse` 데코레이터가 `Content-Type: text/event-stream` 등 SSE 응답 헤더를 알아서 잡아주기 때문에, `Observable<MessageEvent>`만 리턴하면 된다.

```typescript
@Sse('sse/:userId')
sse(@Param('userId', ParseIntPipe) userId: number, @Req() req: Request) {
  req.on('close', () => this.notificationService.removeStream(userId));
  return this.notificationService.getStream(userId);
}
```

`connectionCount`를 따로 둔 건 멀티탭 때문이다. 한 유저가 탭을 여러 개 열면 `EventSource` 연결도 그만큼 생기는데, 탭 하나를 닫았다고 바로 `Subject`를 정리해버리면 나머지 탭의 연결까지 끊긴다. 그래서 연결 수를 세어두고, 마지막 연결이 끊어질 때만 정리하도록 했다.

```typescript
removeStream(userId: number) {
  const count = (this.connectionCount.get(userId) ?? 1) - 1;
  this.connectionCount.set(userId, count);
  if (count <= 0) {
    this.subjects.get(userId)?.complete();
    this.subjects.delete(userId);
    this.connectionCount.delete(userId);
  }
}
```

---

## 프런트엔드: EventSource 커스텀 훅

`EventSource`는 브라우저 내장 API라 별도 라이브러리 없이 바로 쓸 수 있다. `userId`가 바뀔 때만 재연결하도록 훅으로 감쌌다.

```typescript
export function useSSE(
  userId: number | undefined,
  onMessage: (payload: NotificationPayload) => void,
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!userId) return;

    const es = new EventSource(`${process.env.API_URL}/notifications/sse/${userId}`);

    es.addEventListener('notification', (e: MessageEvent) => {
      const payload: NotificationPayload = JSON.parse(e.data);
      onMessageRef.current(payload);
    });

    return () => es.close();
  }, [userId]);
}
```

콜백을 `ref`에 담아둔 이유는, 리렌더될 때마다 새로 생성되는 `onMessage`를 그대로 의존성 배열에 넣으면 매번 `EventSource`가 재연결되기 때문이다. 연결은 `userId`가 바뀔 때만 새로 맺고, 최신 콜백은 `ref`로만 참조하도록 분리했다.

연결이 끊기면 브라우저가 알아서 재연결을 시도한다는 점도 SSE를 고른 이유 중 하나였다. WebSocket이었다면 직접 짜야 했을 재연결 로직을 공짜로 얻는 셈이다.

헤더에는 알림 벨을 붙여서, `useSSE`로 새 알림을 받으면 목록 상태에 얹고 동시에 토스트도 띄우게 했다.

```typescript
const handleNewMessage = useCallback(
  (payload: NotificationPayload) => {
    setNotifications((prev) => [payload, ...prev]);
    onNewNotification(payload.message);
  },
  [onNewNotification],
);

useSSE(userId, handleNewMessage);
```

읽지 않은 알림은 뱃지 카운트와 목록에서 색으로 구분되고, 클릭하면 읽음 처리 API를 호출한다. 새 알림이 오면 화면 우상단에 토스트가 떴다가 4초 뒤 자동으로 사라진다. 폴링이었다면 "지금 목록을 다시 불러와서 이전 상태와 비교해 새 항목만 골라내는" 로직이 필요했을 텐데, SSE는 서버가 새 이벤트만 밀어주기 때문에 프런트 쪽 로직이 그만큼 단순해졌다.

---

## 정리

- **문제**: 당일 예약 변경사항을 문자메시지로 알리고 있었는데, 어차피 하루 종일 붙어있는 내부 시스템에서 바로 보여주는 게 더 효율적이었다. 다만 단순히 목록만 띄워두면 화면을 직접 새로고침하거나 다시 조회하기 전까지는 변경 사항을 알 수 없어 문자보다 나을 게 없었다.
- **선택**: 동시 접속 100명 안팎인 사내 도구라 WebSocket의 양방향 연결 관리 비용은 과하고, Polling은 불필요한 요청과 지연을 감수해야 했다. 서버 push만 필요한 상황이라 SSE로 충분했다.
- **구현**: NestJS `@Sse` + 유저별 RxJS `Subject`로 스트림을 분리하고, 멀티탭은 연결 수 카운트로 처리했다. 프런트는 `EventSource` 훅 하나로 구독했다.

다만 이건 단일 인스턴스, 소규모 사용자를 전제로 한 데모다. 서버가 여러 대로 늘어나면 메모리에 들고 있는 `Subject`가 인스턴스마다 갈라지는 문제가 생기니 Redis pub/sub 같은 공유 브로커가 필요하고, 재연결 사이에 유실되는 이벤트를 복구하려면 `Last-Event-ID`를 붙여야 한다. `/notifications/sse/:userId`가 URL의 `userId`를 그대로 신뢰하는 부분도 실제로 붙이기 전에는 세션/토큰 기반 인증으로 바꿔야 할 지점이다.
