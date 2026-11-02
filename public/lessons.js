// DAY 카드는 이 배열에 추가하세요. id는 한 번 정하면 바꾸지 않습니다.
export const lessons = [{
  id: 'day-01', day: '01', verb: '行く', reading: 'いく', meaning: '가다', theme: '오늘은 어디로 가볼까?',
  illustration: 'journey', scenes: ['school', 'park', 'stay', 'yesterday', 'school', 'park'],
  tip: '行く는 특별해요! て형은 行って, 과거형은 行った예요. 「行いて」가 되지 않아요.',
  forms: [
    { label: '기본형', japanese: '行く', reading: 'いく', meaning: '가다', sentence: '学校に行く。', kana: 'がっこうにいく。', translation: '학교에 가다.' },
    { label: '정중형', japanese: '行きます', reading: 'いきます', meaning: '가요 / 갑니다', sentence: '公園に行きます。', kana: 'こうえんにいきます。', translation: '공원에 가요.' },
    { label: '부정형', japanese: '行かない', reading: 'いかない', meaning: '가지 않다', sentence: '今日は行かない。', kana: 'きょうはいかない。', translation: '오늘은 가지 않아.' },
    { label: '과거형', japanese: '行った', reading: 'いった', meaning: '갔다', sentence: '昨日、海に行った。', kana: 'きのう、うみにいった。', translation: '어제 바다에 갔어.' },
    { label: 'ている형', japanese: '行っている', reading: 'いっている', meaning: '가 있다 / 다니고 있다', sentence: '姉は学校に行っている。', kana: 'あねはがっこうにいっている。', translation: '언니는 학교에 가 있어.' },
    { label: 'て형', japanese: '行って', reading: 'いって', meaning: '가서 / 가고', sentence: '公園に行って、遊ぶ。', kana: 'こうえんにいって、あそぶ。', translation: '공원에 가서 놀아.' }
  ],
  note: '行っている는 문맥에 따라 “가 있다” 또는 “다니고 있다”예요. “지금 가는 중”은 行く途中です라고 말할 수 있어요.',
  missions: ['일본어를 가리고 ‘가다 · 가요 · 가지 않다’를 말해보기', '行った · 行って를 아빠에게 소리 내어 읽어주기', '가고 싶은 곳을 넣어 ‘〇〇に行きます’ 말해보기']
}];
