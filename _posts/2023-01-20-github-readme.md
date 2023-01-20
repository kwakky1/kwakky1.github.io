---
title: Github 프로필 꾸미기, ReadMe
categories:
- 깃허브
- ReadMe
- 깃허브 프로필
feature_image: "https://picsum.photos/2560/600?image=881"
---

유튜브를 보다가 깃허브를 예쁘게 꾸미는 영상을 보니 자기소개용으로 간단하게 깃허브를 꾸며볼까 하는 생각을 했다.
솔직히 꾸미는건 특별한게 없고 ReadMe를 마크다운이나 HTML로 작성하면 된다. 

<img width="836" alt="image" src="https://user-images.githubusercontent.com/62980973/213605497-1a6a8da9-07af-4e89-9d58-2a131ef047eb.png">

기술스택이나 깃허브 내용을 잘 보여줄수 있도록 뱃지나 이미 많은 사람들이 만들어놓은 플러그인을 사용할 수 있는데 너무 간단하다.


## 깃허브 readMe-stats

[깃허브 readMe-stats](https://github.com/anuraghazra/github-readme-stats) 를 통해서 깃허브에서 사용하는 언어나 기타 관련 사항들을 readMe에 이미지로 띄울 수 있다.

윗 깃허브를 보면 내가 현재 사용하는 두 가지 깃허브 관련 이미지를 어떻게 만들수 있는지 자세히 설명해준다. 하지만 무슨 이유에서인지 웹사이트에서 연결되어 있는 url을 변경해야 잘 나온다

```text
// 변경 전

<img align="center" src="https://github-readme-stats.vercel.app/api/top-langs/?username=kwakky1&hide=java,html,tex&title_color=ffffff&text_color=c9cacc&icon_color=2bbc8a&bg_color=1d1f21&langs_count=3" />

// 변경 후

<img align="center" src="https://github-readme-stats-sigma-five.vercel.app/api/top-langs/?username=kwakky1&hide=java,html,tex&title_color=ffffff&text_color=c9cacc&icon_color=2bbc8a&bg_color=1d1f21&langs_count=3" />

```

이미지 tag에 src에 주소를 `github-readme-stats.vercel.app`에서 `github-readme-stats-sigma-five.vercel.app`로 바꾸면 바로 사용할 수 있다.



## 기술스택 뱃지

![HTML5](https://img.shields.io/badge/-HTML5-F05032?style=flat&logo=html5&logoColor=ffffff)

```text
![HTML5](https://img.shields.io/badge/-HTML5-F05032?style=flat&logo=html5&logoColor=ffffff)
```

[뱃지 만들어주는 사이트](https://shields.io) 를 이용하면 위와 같이 쉽게 내가 원하는 뱃지를 만들 수 있다. <br>
[아이콘](https://simpleicons.org/) 도 사이트에서 검색하여 원하는 아이콘과 뱃지를 조합해서 만들 수 있다. 여러 style의 뱃지를 지원해주니 내가 원하는걸 찾아서 고쳐주기만 하면된다.

## productive-box

<img width="467" alt="image" src="https://user-images.githubusercontent.com/62980973/213609639-ba855e01-6369-490e-981d-1612867897ad.png">

내 커밋 기록을 통해 아침형인지 올빼미형인지 알려주는 플러그인이다. https://github.com/kwakky1/productive-box 내가 받은 productive-box 인데 이걸 그대로 fork 해서 사용해도된다.
일단은 깃허브

<img width="850" alt="image" src="https://user-images.githubusercontent.com/62980973/213610235-81d358bb-cc67-40c5-9558-3cafe08777fb.png">

여기 있는 readMe를 읽고 진행하는 것이 좋다. 나도 플러그인을 만든게 있는데 리드미를 잘 작성해놓는것이 좋겠다는 생각이 들었다.

-

![2B946A91-2045-4C9C-86F3-1FB6770968E2_1_201_a](https://user-images.githubusercontent.com/62980973/213610870-17285f5e-0f53-450e-bfcd-5ec0049acb76.jpeg)

내 경우에는 다른건 리드미를 따라했는데 Read and write 권한을 줘야 제대로 뜬다.
그리고 gist를 만들때 제목을 넣지 않아야 productive-box에서 알아서 제목을 만들어준다.

---

사실 깃허브 프로필을 위한 ReadMe 보다는 레파지토리마다 각 레파지토리에 필요한 ReadMe를 작성해야하는 것 같다. 앞으로는 만들어지는 레파지토리마다 꼭 ReadMe를 작성해봐야겠다. 



