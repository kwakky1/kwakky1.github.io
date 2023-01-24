---
title: 자바스크립트 딥다이브, 49장 Babel과 Webpack
categories:
- 자바스크립트 딥다이브
feature_image: "https://picsum.photos/2560/600?image=886"
---

Babel과 Webpack을 사용해야하는 이유

- IE를 포함한 구형 브라우저는 ESM을 지원하지 않는다.
- ESM을 사용하더라도 트랜스파일링이나 번들링이 필요한 것은 변함이 없다. 
- ESM이 아직 지원하지 않는 기능이 있고 점차 해결되고는 있지만 아직 몇 가지 이슈가 존재한다.


## 49.1 Babel

```javascript
[1, 2, 3].map(n => n ** n);
```

구형 브라우저는 ES6의 화살표 함수와 ES7의 지수 연사자를 지원하지 않을 수 있다.
Babel을 사용하면 위 코드를 다음과 같이 ES5 사양으로 변환할 수 있다.

```javascript
[1, 2, 3].map(function (n){
    return Math.pow(n, n);
});
```

### 49.1.1 Babel 설치

```text
npm install --save-dev @babel/core @babel/cli
```


### 49.1.2 Babel 프리셋 설치과 babel.config.json 설정 파일 작성

Babel을 사용하려면 `@babel/preset-env`를 설치해야 한다. 

공식 Bable 프리셋

- `@babel/preset-env`
- `@babel/preset-flow`
- `@babel/preset-react`
- `@babel/preset-typescript`

설치가 완료된 후에는 babel.config.json 파일을 생성하고 다음과 같이 작성한다.

```json
{
    "presets": ["@babel/preset-env"]
}
```

### 49.1.3 트랜스파일링

`bable src/js -w -d dist/js`

- -w: 타깃 폴더에 있는 모든 자바스크립트 파일들의 변경을 감지하여 자동으로 트랜스파일한다. (-watch 옵션의 축약형)
- -d: 트랜스파일링된 결과물이 저장될 폴더를 지정한다. 만약 지정된 폴더가 존재하지 않느면 자동 생성한다. (--out-dir 옵션의 축약형)


### 49.1.4 Babel 플러그인 설치

설치가 필요한 Babel 플러그인은 Babel 홈페이지에서 검색하여 사용할 수 있다. <br>  
필요한 플러그인은 `babel.config.json`을 아래와 같이 수정하면 된다.

```json

{
  "plugins" : ["@babel/plugin-proposal-class-properties"]
}
```

### 49.1.5 브라우저에서 모듈 로딩 테스트

브라우저는 CommonJS 방식의 `require` 함수를 지원하지 않으므로 에러가 발생한다. 
루트 폴더에 `index.html` 파일을 만들고 브라우저에서 실행하면 아래와 같은 오류가 발생한다.

<img width="416" alt="image" src="https://user-images.githubusercontent.com/62980973/214222017-c2bec270-e3f6-4789-a6e9-177870610f3e.png">

## 49.2 Webpack

Webpack은 의존 관계에 있는 자바스크립트, CSS, 이미지 등의 리소스를 하나의 파일로 번들링하는 모듈 번들러다.
Webpack을 사용하면 의존 모듈이 하나의 파일로 번ㄷ들링되므로 별도의 모듈 로더가 필요 없다.

### 49.2.1 Webpack 설치

`npm install --save-dev webpack webpack-cli`

### 49.2.2 babel-loader 설치

`npm install --save-dev babel-loader`


### 49.2.3 webpack.config.js 설정 파일 작성

```javascript
const path = require('path');

module.exports = {
    entry: './src/js/main.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: "js/bundle.js"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [
                    path.resolve(__dirname, 'src/js')
                ],
                exclude: /node_moules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    devtool: 'source-map',
    mode: 'development'
}
```

결과

<img width="542" alt="image" src="https://user-images.githubusercontent.com/62980973/214224120-52d71e1b-60ca-43c8-b08c-e5567e073ec3.png">


웹팩으로 번들링한 bundle.js 실행

<img width="420" alt="image" src="https://user-images.githubusercontent.com/62980973/214224359-1bad6878-98de-4be5-8cea-ea8ef617bb1a.png">

### babel-polyfill 설치

ES6에서 추가된 Promise, Object.assign, Array.from 등은 ES5 사양으로 트랜스 파일링해도 대체할 기능이 없기 때문에 그대로 남는다.


<img width="448" alt="image" src="https://user-images.githubusercontent.com/62980973/214225427-4a953b9e-e2d9-4f2c-a38b-32ab80fb85e9.png">

`npm i @babel/polyfill` 설치 후 `webpack.config.js` 파일에 entry 키에 `@babel/polyfill`을 추가해준다. 

<img width="704" alt="image" src="https://user-images.githubusercontent.com/62980973/214226807-1da006a4-3469-4904-8667-27c119a88ad1.png">

dist/js/bundle.js를 확인해 보면 폴리필이 추가된 것을 확인할 수 있다.


---
## 바벨 & 웹팩 테스트 깃허브 주소

<a href="https://github.com/kwakky1/babel-webpack-test">https://github.com/kwakky1/babel-webpack-test</a>
