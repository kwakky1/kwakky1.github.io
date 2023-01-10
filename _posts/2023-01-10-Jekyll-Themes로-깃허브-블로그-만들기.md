---
title: Jekyll Themes로 깃허브 블로그 만들기
categories:
- Jekyll
- 깃허브블로그
- 깃허브블로그테마
- 깃허브블로그테마추천
  feature_image: "https://picsum.photos/2560/600?image=873"
---

# Intro

개발자가 되기전부터 사용하던 네이버블로그에 개인적인 블로깅과 개발관련 블로깅을 함께 진행하다보니 정리가 안된다는 느낌이 들었다.
이전에 만들었던 깃허브 블로그 테마가 마음에 안들어서 새로운 깃허브 블로그 테마를 적용하고 설정해보았다.

# GitHub Jekyll Themes

예전에는 Next라는 깃허브 블로그 테마를 사용했는데 생긴것부터 마음에 들지 않아 [Jekyll 무료 깃허브 테마 사이트](https://jekyllthemes.io/free) 에서
마음에 드는 테마를 찾았다.

# Jekyll Blog Install Guide

### 1. Ruby 설치
맥을 사용하고 있다면 이미 ruby가 설치되어 있을수 있지만 `homebrew`를 통해서 관리를 해주는것이 좋다. 
 ```
 brew install ruby
 ```

### 2. Jekyll Bundler 설치

```
gem install jekyll bundler
```

### 3. 깃허브 Repository 생성

Repository 이름은 `닉네임.github.io`로 만들어 준다.

### 4. Jekyll 테마다운

[무료 테마사이트](https://jekyllthemes.io/free) 에 있는 것 중에 [이 테마](https://jekyllthemes.io/theme/alembic) 를 다운 받아서 사용하였다.

### 5. 깃허브 remote 연결

```text
git init
git add .
git commit -m "init"
git remote add origin [깃헙 원격 리포 주소]
git push -u origin master
```

### 6. 번들 설치

해당 Repository 경로에 들어간 후

```text
bundle install
```

### 7. 로컬에서 실행

```text
bundle exec jekyll serve
```

브라우저에서 http://localhost:4000 에 접속하면 블로그 테마를 확인할 수 있다.  
