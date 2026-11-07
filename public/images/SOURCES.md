# DAY 01 이미지 및 음성 출처

## 대표 이미지

- `walking-girl.webp`: 기존 저장소의 `runtime.js`에 사용자 제공 이미지로 포함된 WebP를 바이트 변경 없이 추출했습니다.

## 사진

Wikimedia Commons 축소본을 저장했습니다. 앱에서는 카드 비율에 맞게 CSS `object-fit: cover`로 표시합니다. 원본 사진 파일의 라이선스는 아래와 같습니다.

- `academy.jpg`: Lucky-japan, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). [원본과 파일 정보](https://commons.wikimedia.org/wiki/File:Part_of_the_study_room_of_the_cram_school_Lighthouse_Academy.jpg).

- `bookstore.jpg`: Nick-D, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). [원본과 파일 정보](https://commons.wikimedia.org/wiki/File:Interior_of_Avenue_Bookstore_Albert_Park_September_2024.jpg).

- `school.jpg`: Koichiro Enoki, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0). [원본과 파일 정보](https://commons.wikimedia.org/wiki/File:Exterior_of_Miyamaki_Elementary_School.jpg).

- `station.jpg`: User:Araisyohei, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0). [원본과 파일 정보](https://commons.wikimedia.org/wiki/File:Tokyo-Station-2005-7-21_4.jpg).

- `park.jpg`: [Unsplash 사진](https://images.unsplash.com/photo-1519331379826-f10be5486c6f), [Unsplash License](https://unsplash.com/license).

## 일본어 음성

- `audio/forms`, `audio/sentences`, `audio/words`: DAY 01에 적힌 일본어를 Google Translate 일본어 TTS로 합성한 MP3 19개입니다. 텍스트는 `day01.js`의 활용형·후리가나와 동일합니다.
- 앱에서는 이 로컬 파일을 우선 재생하며, 파일 재생 실패 시 브라우저의 `ja-JP` TTS로 재시도합니다. 실행 중 외부 TTS 서버를 호출하지 않습니다.
- 정답·오답·박수 효과음은 기존 Web Audio 합성 방식을 유지합니다.
