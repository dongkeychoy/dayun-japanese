# 다윤이의 일본어 산책 🌷

다윤이 전용 모바일 일본어 학습장입니다. 순수 HTML/CSS/JavaScript로 동작하며 서버, API 키, 외부 라이브러리가 필요 없습니다. 다른 저장소나 CHOY 앱에 의존하지 않습니다.

## DAY 01

行く(いく, 가다)의 6가지 활용, 예문 6개와 한국어 번역, 일본어 TTS, 토끼 일러스트, 6문제 암기 퀴즈, 아빠의 밤 점검 미션을 제공합니다. 퀴즈 마지막 점수와 미션·확인 도장은 DAY별로 브라우저 localStorage에 저장됩니다. 기기 간 동기화나 아빠 알림 전송 기능은 없습니다.

일본어 TTS는 기기와 브라우저의 Web Speech API를 사용합니다. 일본어 음성 지원 및 네트워크 필요 여부는 기기에 따라 다릅니다. iOS Safari/Android Chrome에서 일본어 음성이 설치되어 있는지 확인하세요. 읽기 버튼은 직접 눌러야 재생됩니다.

## 실행 및 검사

Node.js 20 이상, Python 3(로컬 미리보기용).

```sh
npm test
npm run build
npm start
```

로컬 주소: http://localhost:4173 (public 폴더 제공). 빌드 산출물은 dist/입니다. 런타임 의존성이나 npm install은 필요 없습니다.

## Cloudflare Pages 배포

Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git에서 **dongkeychoy/dayun-japanese**만 선택합니다.

| 설정 | 값 |
| --- | --- |
| Production branch | main |
| Framework preset | None |
| Build command | npm run build |
| Build output directory | dist |
| Root directory | 저장소 루트 (비워 둠) |
| Node version | 22 이상 권장 |

Save and Deploy를 누르면 Cloudflare가 pages.dev 주소를 발급합니다. 기존 CHOY 프로젝트의 Git 연결·도메인·빌드 설정은 수정하지 마세요. 이 저장소를 별도 Pages 프로젝트로 연결합니다. 정적 파일 직접 업로드 시에도 npm run build 후 dist 폴더를 업로드하면 됩니다.

## DAY 추가하기

`public/lessons.js`의 `lessons` 배열에 새 객체를 추가합니다. `id`(예: day-02)는 고유하고 고정이어야 합니다. `day`, `verb`, `reading`, `meaning`, `theme`, `tip`, `note`, `forms`, `missions`를 채웁니다. forms에는 label/japanese/reading/meaning/sentence/kana/translation을 넣고, meaning은 퀴즈에서 구별 가능하게 작성합니다. 새 DAY는 선택 메뉴에 자동으로 나타나며 퀴즈와 미션도 자동 생성됩니다. HTML을 허용하는 외부 사용자 입력 데이터는 넣지 마세요.

## 수동 확인

- 320px 이상의 휴대폰에서 세로 스크롤, 메뉴 이동, 가로 넘침 확인
- 단어·활용·예문 발음 버튼에서 일본어 발음 확인 (실기기 음성 필요)
- 퀴즈 정답·오답 피드백, 중복 클릭 방지, 6문제 결과, 재도전 확인
- 미션 3개 완료 후 도장, 새로고침 후 저장, 체크 해제 시 도장 해제 확인
- 일본어 음성 미지원·저장 공간 차단 환경의 안내 확인
