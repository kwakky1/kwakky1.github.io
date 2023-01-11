---
title: Github 블로그 댓글 추가하기, utterances
categories:
- utterances
- 깃허브블로그
- 깃허브블로그댓글
- 깃허브블로그댓글구현
feature_image: "https://picsum.photos/2560/600?image=874"
---

깃허브 블로그를 만들어 놓고 보니 댓글로 의견을 나눌 수 있는 공간이 없었다. <br>
처음에는 템플릿에서 지원하는 disqus를 사용하려고 했는데 무겁고 광고 이슈가 있다는 말을 듣고 utterances를 사용하기로 했다.

# utterances🔮 란?
***

> A lightweight comments widget built on GitHub issues. Use GitHub issues for blog comments, wiki pages and more! <br>
> * Open source. 🙌 
> * No tracking, no ads, always free. 📡🚫  
> * No lock-in. All data stored in GitHub issues. 🔓  
> * Styled with Primer, the css toolkit that powers GitHub. 💅  
> * Dark theme. 🌘 
> * Lightweight. Vanilla TypeScript. No font downloads, JavaScript frameworks or polyfills for evergreen browsers. 🐦🌲

한번 번역을 해서 보는것보다 원문을 보는게 훨씬 더 잘 이해가 된다고 생각해서 utterances에 대한 원문 설명을 가지고 왔다.

***

<br>
- 오픈소스, 공짜, 테마가 다양, 관리가 용이하다는 장점이 있었다.  

# utterances 적용
***


<img width="1003" alt="스크린샷 2023-01-11 오전 10 21 44" src="https://user-images.githubusercontent.com/62980973/211721472-749399f5-9f2f-4615-9363-9aa20d5f71fd.png">

먼저 [이 페이지](https://github.com/apps/utterances) 에 들어가서 깃허브 App에 설치를 해준다. 

<img width="1166" alt="스크린샷 2023-01-11 오전 10 26 44" src="https://user-images.githubusercontent.com/62980973/211721565-f4738011-4f93-46de-b2ae-7adb38c56ff2.png">


위 그림에 있는 repository와 포스팅 맵핑을 연결해줘야하는데 page pathname을 선택하는것이 가장 무난하다.

<img width="1159" alt="스크린샷 2023-01-11 오전 10 26 34" src="https://user-images.githubusercontent.com/62980973/211721601-d850b520-edc2-431d-826d-060158a03059.png">

위 스크립트를 내 깃허브 템플릿에 적당한 위치에 넣어주면된다.

<img width="257" alt="스크린샷 2023-01-11 오후 12 19 02" src="https://user-images.githubusercontent.com/62980973/211721688-ee73c327-c432-48be-8ee2-3db55e1b05d4.png">

내가 사용하는 템플릿은 jekyll Alembic 인데 `_layouts` 폴더와 `_includes` 폴더에 각각 `post.html`, `post-comments.html` 
파일을 만들고 `post-comments.html`에 자신의 페이지에 맞는 스크립트를 넣어주면 된다.

- 마크다운 파일에 한글을 넣었더니 그 포스팅에만 utterances가 안보이는 오류가 있었다. 파일명에 한글은 삼가해야겠다...

# 결과
***

<img width="794" alt="스크린샷 2023-01-11 오후 12 26 34" src="https://user-images.githubusercontent.com/62980973/211721738-34731ae5-7f01-4028-b92c-f3d89cb74f4c.png">

이렇게 깔끔한 깃허브 issue 스타일의 UI가 적용된다. <br>
잠깐 disqus를 사용했었는데 utterances가 템플릿에 훨씬 잘 어울리는것 같아서 만족스럽다.
