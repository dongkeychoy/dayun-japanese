import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { lessons } from "../public/day01.js";

const day = lessons[0];
const expected = [
  [
    "기본형",
    "行く",
    "いく",
    "가다",
    "明日、公園に行く。",
    "あした、こうえんに いく。",
    "내일 공원에 가.",
  ],
  [
    "정중형",
    "行きます",
    "いきます",
    "가요",
    "今日、学校に行きます。",
    "きょう、がっこうに いきます。",
    "오늘 학교에 가요.",
  ],
  [
    "부정형",
    "行かない",
    "いかない",
    "가지 않아",
    "今日は塾に行かない。",
    "きょうは じゅくに いかない。",
    "오늘은 학원에 가지 않아.",
  ],
  [
    "과거형",
    "行った",
    "いった",
    "갔어",
    "昨日、本屋に行った。",
    "きのう、ほんやに いった。",
    "어제 서점에 갔어.",
  ],
  [
    "과거부정형",
    "行かなかった",
    "いかなかった",
    "가지 않았어",
    "昨日は学校に行かなかった。",
    "きのうは がっこうに いかなかった。",
    "어제는 학교에 가지 않았어.",
  ],
  [
    "연결형",
    "行って",
    "いって",
    "가서",
    "駅に行って、友だちに会う。",
    "えきに いって、ともだちに あう。",
    "역에 가서 친구를 만나.",
  ],
  [
    "진행형",
    "行っている",
    "いっている",
    "다니고 있어",
    "毎日、学校に行っている。",
    "まいにち、がっこうに いっている。",
    "매일 학교에 다니고 있어.",
  ],
];
test("DAY 01 retains all seven requested conjugations and complete sentences", () => {
  assert.equal(day.kanji, "行く");
  assert.deepEqual(
    day.forms.map((f) => [
      f.name,
      f.kanji,
      f.jp,
      f.ko,
      f.full,
      f.kana,
      f.meaning,
    ]),
    expected,
  );
  for (const f of day.forms) {
    assert.equal(f.prefix + f.kanji + f.suffix, f.full);
    assert.equal(f.kanaPrefix + f.jp + f.kanaSuffix, f.kana);
  }
});
test("exactly five words reuse the matching full sentence, reading and translation", () => {
  assert.deepEqual(
    day.words.map((w) => [w.jp, w.kana, w.ko, w.sentenceId]),
    [
      ["学校", "がっこう", "학교", "polite"],
      ["公園", "こうえん", "공원", "base"],
      ["塾", "じゅく", "학원", "negative"],
      ["本屋", "ほんや", "서점", "past"],
      ["駅", "えき", "역", "te"],
    ],
  );
  for (const w of day.words) {
    const f = day.forms.find((f) => f.id === w.sentenceId);
    assert.ok(f.full.includes(w.jp));
    assert.ok(f.kana.includes(w.kana));
    assert.ok(f.meaning);
  }
});
test("all photos and nineteen bundled Japanese audio files exist", async () => {
  await access(new URL("../public/" + day.image.slice(2), import.meta.url));
  for (const w of day.words) {
    await access(new URL("../public/" + w.image.slice(2), import.meta.url));
    const audio = await readFile(
      new URL(`../public/audio/words/${w.sentenceId}.mp3`, import.meta.url),
    );
    assert.ok(audio.length > 1000);
  }
  for (const f of day.forms)
    for (const kind of ["forms", "sentences"]) {
      const audio = await readFile(
        new URL(`../public/audio/${kind}/${f.id}.mp3`, import.meta.url),
      );
      assert.ok(audio.length > 1000);
    }
});
