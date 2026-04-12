---
title: 리액트 useEffect 사용법 및 메모리 누수
categories:
- React
- useEffect
feature_image: "https://picsum.photos/2560/600?image=890"
---

리액트에서 많이 사용하는 `useEffect`의 side Effect에 대해서 깊이 생각하지 않고 코드를 작성해왔다.
확실한 이해가 필요하다고 생각해 리액트 공식문서를 보고 다시 한번 정리해보고자 한다.

## useEffect Hook 이란?

클래스 방식에서는 `componentDidMount`, `componentDidUpdate` 등을 사용하여 side effects 를 제어했지만  
함수형 컴포넌트에서는 `useEffect` Hook을 통해 다양한 side effects 를 수행할 수 있다.
데이터 가져오기, 구독(subscription) 설정하기, 수동으로 React 컴포넌트의 DOM을 수정하는 것까지 이 모든 것이 side effects 이다.

## useEffect 사용방법

```javascript
import React, { useState, useEffect } from 'react';

function Example() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        document.title = `You clicked ${count} times`;
    },[count]);

    return (
        <div>
            <p>You clicked {count} times</p>
            <button onClick={() => setCount(count + 1)}>
                Click me
            </button>
        </div>
    );
}
```

`useEffect`는 컴포넌트 안에 위치해야하며, 두번째 파라미터에 `deps`는 빈배열이 들어가면 처음에만 함수호출,
의존값이 있으면 처음 + 지정값이 변경될 때 호출, 아예 없는 경우 컴포넌트가 리렌더링 될 때마다 호출된다. <br>
부모 컴포넌트가 리렌더링되면 자식 컴포넌트 또한 리렌더링 되기 때문에 최적화가 필요하다.


## useEffect clean up 함수

```javascript
useEffect(() => {
    console.log('컴포넌트가 화면에 나타남'); // 마운트
    return () => {
      console.log('컴포넌트가 화면에서 사라짐'); // 언마운트
    };
  }, []);
```

`useEffect`에서는 함수를 반환할 수 있는데 이를 `cleanup`함수라고 부른다. `cleanup`함수는 컴포넌트가 사라질 때 호출된다.

마운트시
```javascript
useEffect(() => {
    checkUser(navigate)
        .then((staff: { username: string }) => {
            if (staff.username) {
                setUser(staff.username);
            }
        })
        .catch((err) => {
            ErrorCheck(err);
        })
});
```
- props 로 받은 값을 컴포넌트의 로컬 상태로 설정
- 외부 API 요청 (REST API 등)
- 라이브러리 사용
- setInterval 을 통한 반복작업 혹은 setTimeout 을 통한 작업 예약



언마운트시

```javascript
useEffect(() => {
		Hub.listen('auth', listener);
		return () => {
			Hub.remove('auth', listener);
		};
	}, [listener]);
```

```javascript
useEffect(() => {
		const create = onCreateProduct();
		return () => {
			create.unsubscribe();
		};
	}, [onCreateProduct, onDeleteProduct, onUpdateProduct]);
```

- setInterval, setTimeout 을 사용하여 등록한 작업들 clear 하기 (clearInterval, clearTimeout)
- 라이브러리 인스턴스 제거 



