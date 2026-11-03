# 다윤이의 일본어 미션 · LEVEL 1 (v2)

현재 배포 진입점은 **public/index.html**이며, 초급 모바일 한 화면 학습이 가능하도록 HTML/CSS/JS/학습 데이터와 그림을 이 파일에 통합한 정적 웹앱입니다. 이전 public/app.js, public/style.css, public/lessons.js 는 기존 버전 자료이며 **현재 index.html에서는 불러오지 않습니다**. 즉 DAY 추가는 먼저 현재 public/index.html 속 `const lessons = [...]` 배열에 새 DAY 객체를 추가해야 합니다. 향후 편의성을 위해 파일을 다시 모듈화할 수 있습니다.

## 현재 학습 경험
- 모바일 1화면 고정, 세로 스크롤 없음. 4개 탭(훈련/문장/단어/퀴즈)
- DAY 01 行く(いく) / 가다
- LEVEL 1: 기본형/정중형/부정형/과거형 4개
- LEVEL 2: 과거부정형·연결형 추가(6개)
- LEVEL 3: 진행·상태형(ている) 추가(7개)
- 문장마다 일본어 정자체, 히라가나, 한국어 해석, 브라우저 TTS
- 문장 빈칸 4지선다 퀴즈, 점수, 애니메이션, 자체 합성한 효과음, 아빠 확인 도장
- 레벨·퀴즈 기록은 기기 내 localStorage에 저장, 부모와 기기 간 동기화는 하지 않음

## 빌드·배포
- 빌드: `npm run build` (public → dist 복사)
- Cloudflare Workers 연결 빌드 명령: `npm run build`
- 배포 명령 예시: `npx wrangler deploy --assets ./dist --compatibility-date 2026-11-01`
- 배포가 실제 성공했는지는 Cloudflare Dashboard의 최신 배포 기록에서 별도 확인합니다.

## 이미지
현재 화면에 쓰인 어린이 일러스트는 독립 제작한 대체 이미지로, 이미지 자체가 HTML에 내장되어 있습니다. 요청하신 いらすとや의 그림을 공식 사이트에서 직접 내려받은 후, 이용약관을 확인해 교체할 수 있습니다. 출처 예: https://www.irasutoya.com/2020/01/blog-post_4.html. いらすとや 저작권은 유지됩니다. 공식 이미지가 이미 포함되었다고 표시하면 안 됩니다.

## 검증
별도 제작 소스에서 `npm test` / `npm run build` 성공. Chromium으로 320×568, 360×740, 390×844, 430×932에서 4개 모드의 스크롤 없음, 퀴즈 100점 및 아빠 확인 동작을 확인. 기기 실제 TTS와 소리 품질은 휴대폰에서 추가 점검 필요.

기존 CHOY 앱은 이 저장소와 독립적입니다.
