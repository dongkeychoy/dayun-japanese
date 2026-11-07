import { lessons } from "./day01.js?v=6";

const $ = (id) => document.getElementById(id);
let lesson = lessons[lessons.length - 1];
const storeGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const storeSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};
let level = Number(storeGet("dayun:level") || 1);
if (![1, 2, 3].includes(level)) level = 1;
let tab = "train",
  wordPage = 0,
  qIndex = 0,
  qScore = 0,
  qLocked = false,
  quizDone = false,
  selectedAnswer = null;
let scoreById = {},
  audioCtx = null,
  toastTimer = 0;
let speechAudio = null,
  speechButton = null,
  speechRequest = 0;
const stateKey = () => `dayun:${lesson.id}`;
try {
  scoreById = JSON.parse(storeGet(stateKey()) || "{}") || {};
} catch {
  scoreById = {};
}
let soundOn = storeGet("dayun:sounds") !== "off";
const available = () => lesson.forms; // All levels keep every form visible.
const save = () => {
  try {
    storeSet(stateKey(), JSON.stringify(scoreById));
  } catch {
    toast("이 브라우저에서는 기록 저장이 제한돼요");
  }
};
function toast(msg) {
  $("toast").textContent = msg;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function makeAudio() {
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  try {
    audioCtx ??= new C();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}
function tone(freq = 500, dur = 0.12, type = "sine", vol = 0.08, delay = 0) {
  if (!soundOn) return;
  const c = makeAudio();
  if (!c) return;
  const at = c.currentTime + delay;
  const o = c.createOscillator(),
    g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.002, vol), at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.01);
}
function playFx(which) {
  if (!soundOn) return;
  if (which === "tap") {
    tone(680, 0.07, "sine", 0.035);
  } else if (which === "correct") {
    tone(659, 0.14, "sine", 0.075);
    tone(784, 0.15, "sine", 0.075, 0.12);
    tone(988, 0.24, "sine", 0.085, 0.25);
    applause();
  } else if (which === "wrong") {
    tone(214, 0.19, "triangle", 0.06);
    tone(174, 0.19, "triangle", 0.04, 0.12);
  } else if (which === "success") {
    tone(523, 0.12, "sine", 0.08);
    tone(659, 0.12, "sine", 0.08, 0.1);
    tone(784, 0.12, "sine", 0.08, 0.2);
    tone(1046, 0.35, "sine", 0.1, 0.32);
    applause(0.38);
  }
}
// A brief, soft applause effect synthesized from locally generated noise. No copyrighted sound files.
function applause(offset = 0.17) {
  const c = makeAudio();
  if (!c || !soundOn) return;
  const buffer = c.createBuffer(
    1,
    Math.round(c.sampleRate * 0.075),
    c.sampleRate,
  );
  const d = buffer.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.2);
  for (let i = 0; i < 8; i++) {
    const src = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      gain = c.createGain(),
      t = c.currentTime + offset + i * 0.065;
    src.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = 950;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.033, t + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t);
    src.stop(t + 0.075);
  }
}
// Prefer bundled Japanese audio: works even when the phone has no Japanese TTS voice.
function stopSpeech() {
  speechRequest++;
  if (speechAudio) {
    speechAudio.pause();
    speechAudio = null;
  }
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (speechButton) {
    speechButton.classList.remove("speaking");
    speechButton.removeAttribute("aria-busy");
    speechButton = null;
  }
}
function say(text, source, button) {
  stopSpeech();
  const request = speechRequest;
  speechButton = button;
  button?.classList.add("speaking");
  button?.setAttribute("aria-busy", "true");
  const finish = () => {
    if (request !== speechRequest) return;
    if (speechButton) {
      speechButton.classList.remove("speaking");
      speechButton.removeAttribute("aria-busy");
      speechButton = null;
    }
  };
  const fallback = () => {
    if (request !== speechRequest) return;
    if (!("speechSynthesis" in window)) {
      finish();
      toast("음성을 재생하지 못했어요. 다시 듣기를 눌러 주세요.");
      return;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.83;
      u.pitch = 1;
      const ja = speechSynthesis
        .getVoices()
        .find((v) => v.lang?.toLowerCase().startsWith("ja"));
      if (ja) u.voice = ja;
      u.onend = finish;
      u.onerror = (e) => {
        if (request !== speechRequest) return;
        finish();
        if (!["canceled", "interrupted"].includes(e.error))
          toast(
            "음성을 재생하지 못했어요. 휴대폰의 소리 설정을 확인해 주세요.",
          );
      };
      speechSynthesis.speak(u);
    } catch {
      finish();
      toast("일본어 음성 재생을 확인해 주세요.");
    }
  };
  speechAudio = new Audio(source);
  speechAudio.onended = finish;
  // play() rejects on load failures too; use one fallback path, never speak twice.
  speechAudio.play().catch(fallback);
}

function burst(n = 19) {
  const layer = $("fx-layer");
  layer.replaceChildren();
  const colors = ["#ff99b6", "#ffd565", "#82d6f6", "#8c7af1", "#78e1bc"];
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "confetti";
    el.style.background = colors[i % colors.length];
    el.style.setProperty("--dx", `${(Math.random() - 0.5) * 320}px`);
    el.style.setProperty("--dy", `${-70 + Math.random() * 190}px`);
    el.style.setProperty("--r", `${(Math.random() - 0.5) * 800}deg`);
    layer.append(el);
  }
  setTimeout(() => layer.replaceChildren(), 950);
}
const escapeHtml = (str) =>
  String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function render() {
  const forms = available(),
    footer = $("footer-status");
  $("app").classList.toggle("train-screen", tab === "train");
  $("app").dataset.mode = tab;
  $("day-label").textContent = `DAY ${String(lesson.day).padStart(2, "0")} ▾`;
  $("hero-word").textContent = lesson.kanji;
  $("hero-kana").textContent = lesson.reading;
  $("hero-ko").textContent = lesson.title;
  $("level-open").innerHTML = `LV.${level} <span aria-hidden="true">⌄</span>`;
  document.querySelectorAll("[data-tab]").forEach((b) => {
    const v = b.dataset.tab === tab;
    b.classList.toggle("active", v);
    b.setAttribute("aria-selected", String(v));
  });
  $("workspace").setAttribute("aria-labelledby", `tab-${tab}`);
  if (tab === "train") {
    footer.textContent = `LEVEL ${level} · ${forms.length}가지 변화형 익히기`;
    renderTrain(forms);
  }
  if (tab === "sentence") {
    footer.textContent = `일본어 → 히라가나 → 해석`;
    renderSentence(forms);
  }
  if (tab === "word") {
    footer.textContent = "오늘의 단어 5개 · 문장에서 만난 단어";
    renderWords();
  }
  if (tab === "quiz") {
    footer.textContent = "맞히면 점수와 박수 효과!";
    renderQuiz(forms);
  }
}
function trainCard(f, i) {
  return `<article class="study-row"><span class="row-label">${escapeHtml(f.name)}</span><span class="row-jp" lang="ja"><span class="row-kanji">${escapeHtml(f.kanji)}</span><span class="row-hiragana">${escapeHtml(f.jp)}</span></span><span class="row-ko">${escapeHtml(f.ko)}</span><button type="button" class="row-speak" data-speak="train" data-index="${i}" aria-label="${escapeHtml(f.name)} 일본어 발음 듣기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg></button></article>`;
}
function pageNav(current, total) {
  return `<div class="view-nav"><button class="round-nav" type="button" data-nav="word-prev" ${current === 0 ? "disabled" : ""} aria-label="이전 단어">‹ 이전 단어</button><span class="page-counter" aria-live="polite">${current + 1} / ${total}</span><button class="round-nav" type="button" data-nav="word-next" ${current === total - 1 ? "disabled" : ""} aria-label="다음 단어">다음 단어 ›</button></div>`;
}

function renderTrain(forms) {
  $("workspace").innerHTML =
    `<section class="view train-one-line"><div class="section-head"><h2>동사 변신 7가지</h2><span class="tiny-label">듣고 따라 말해요</span></div><div class="form-rows">${forms.map((f, i) => trainCard(f, i)).join("")}</div></section>`;
}
function renderSentence(forms) {
  $("workspace").innerHTML =
    `<section class="view sentence-one-line"><div class="section-head"><h2>실생활 문장 7가지</h2><span class="tiny-label">듣고 따라 말해요</span></div><div class="sentence-rows">${forms.map((f, i) => `<article class="sentence-row"><div class="sentence-main"><div class="sentence-jp" lang="ja">${escapeHtml(f.prefix)}<mark>${escapeHtml(f.kanji)}</mark>${escapeHtml(f.suffix)}</div><div class="sentence-reading" lang="ja">${escapeHtml(f.kana)}</div><div class="sentence-meta"><span class="sentence-type">${escapeHtml(f.name)}</span><span class="sentence-ko">${escapeHtml(f.meaning)}</span></div></div><button type="button" class="sentence-audio" data-speak="sentence" data-index="${i}" aria-label="${escapeHtml(f.name)} 문장 듣기">▶</button></article>`).join("")}</div></section>`;
}
function renderWords() {
  const words = lesson.words;
  wordPage = Math.max(0, Math.min(wordPage, words.length - 1));
  const w = words[wordPage],
    example = lesson.forms.find((f) => f.id === w.sentenceId);
  $("workspace").innerHTML =
    `<section class="view word-view"><div class="section-head"><h2>오늘의 단어</h2><span class="tiny-label">문장도 함께 복습해요</span></div><article class="word-card"><div class="word-visual"><img class="word-photo" src="${escapeHtml(w.image)}" alt="${escapeHtml(w.ko)} 사진" width="860" height="540"/><div class="photo-credit"><a href="${escapeHtml(w.photoCredit.source)}" target="_blank" rel="noopener noreferrer">사진: ${escapeHtml(w.photoCredit.author)}</a><a href="${escapeHtml(w.photoCredit.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(w.photoCredit.license)}</a></div></div><div class="word-details"><div><div class="vocab-jp" lang="ja">${escapeHtml(w.jp)}</div><div class="vocab-kana" lang="ja">${escapeHtml(w.kana)}</div><div class="vocab-meaning">${escapeHtml(w.ko)}</div></div><button class="word-audio" type="button" data-speak="word" data-index="${wordPage}" aria-label="${escapeHtml(w.ko)} 단어 듣기">▶ 단어 듣기</button></div><div class="word-example"><span class="example-label">문장에서 만난 단어</span><div class="word-example-jp" lang="ja">${escapeHtml(example.full)}</div><div class="word-example-kana" lang="ja">${escapeHtml(example.kana)}</div><div class="word-example-ko">${escapeHtml(example.meaning)}</div><button class="word-audio example-audio" type="button" data-speak="word-example" data-index="${wordPage}" aria-label="${escapeHtml(w.ko)} 예문 듣기">▶ 문장 듣기</button></div></article>${pageNav(wordPage, words.length)}</section>`;
}
// Stable distractors: each question always has exactly one correct option.
function quizOptions(index, forms) {
  const correct = forms[index],
    others = forms.filter((x) => x.id !== correct.id);
  const selected = others.slice(0, 3);
  if (selected.length < 3) throw Error("Need at least four forms");
  const set = [...selected, correct];
  return set.sort(
    (a, b) =>
      ((a.id.charCodeAt(0) + index * 7) % 11) -
      ((b.id.charCodeAt(0) + index * 7) % 11),
  );
}
function quizQuestion(f, forms) {
  const opts = quizOptions(qIndex, forms);
  return `<section class="view"><div class="quiz-top"><span class="quiz-count">문제 ${qIndex + 1} / ${forms.length}</span><span class="quiz-score">★ ${Math.round((qScore / forms.length) * 100)}점</span></div><div class="progress-track"><div class="progress-fill" style="width:${(qIndex / forms.length) * 100}%"></div></div><article class="quiz-question"><div class="quiz-help">빈칸에 들어갈 표현을 골라봐!</div><div class="quiz-jp" lang="ja">${escapeHtml(f.prefix)} <span class="blank"></span>${escapeHtml(f.suffix)}</div><div class="quiz-kana" lang="ja">${escapeHtml(f.kanaPrefix)} ____ ${escapeHtml(f.kanaSuffix)}</div><div class="quiz-ko">${escapeHtml(f.quizKo)}</div></article><div class="option-grid">${opts.map((o) => `<button type="button" class="option" data-answer="${escapeHtml(o.id)}" lang="ja">${escapeHtml(o.jp)}</button>`).join("")}</div><div class="quiz-feedback"><span class="feedback-text" id="quiz-feedback">정답을 골라 보세요</span><button type="button" class="next-button" id="quiz-next" hidden>다음 →</button></div></section>`;
}
function renderQuiz(forms) {
  if (quizDone) {
    const percent = Math.round((qScore / forms.length) * 100);
    const success = percent >= 75;
    $("workspace").innerHTML =
      `<section class="view"><div class="section-head"><h2>오늘의 결과</h2><span class="tiny-label">${forms.length}문제 완료</span></div><div class="result"><div class="result-visual stamp">${success ? "🏆" : "🌱"}</div><div class="result-title">${success ? "대단해, 다윤아!" : "조금 더 해볼까?"}</div><div class="result-score">${percent}점</div><div class="result-sub">${forms.length}문제 중 ${qScore}문제 정답<br>${success ? "밤에 아빠에게 한 문장 말해 보자!" : "다시 도전하면 더 잘할 수 있어!"}</div><button type="button" data-action="retry">다시 도전하기</button><button type="button" data-action="parent" class="secondary">밤에 아빠와 확인하기</button></div></section>`;
    return;
  }
  qIndex = Math.min(qIndex, forms.length - 1);
  $("workspace").innerHTML = quizQuestion(forms[qIndex], forms);
  if (qLocked) showAnswer(forms);
}
function answerQuiz(id) {
  if (qLocked || quizDone) return;
  const forms = available(),
    f = forms[qIndex],
    correct = id === f.id;
  qLocked = true;
  selectedAnswer = id;
  if (correct) {
    qScore++;
    playFx("correct");
    burst(22);
  } else playFx("wrong");
  showAnswer(forms);
}
function showAnswer(forms) {
  const f = forms[qIndex],
    id = selectedAnswer,
    correct = id === f.id;
  $("workspace").querySelector(".quiz-score").textContent =
    `★ ${Math.round((qScore / forms.length) * 100)}점`;
  const buttons = [...$("workspace").querySelectorAll("[data-answer]")];
  for (const b of buttons) {
    b.disabled = true;
    if (b.dataset.answer === f.id) b.classList.add("correct");
    else if (b.dataset.answer === id) b.classList.add("wrong");
  }
  const fb = $("quiz-feedback");
  fb.textContent = correct
    ? "정답! 잘했어!"
    : "아쉽다! 정답은 " + f.jp + " 이야.";
  $("quiz-next").hidden = false;
  $("quiz-next").textContent =
    qIndex === forms.length - 1 ? "결과 보기" : "다음 문제 →";
}
function nextQuiz() {
  const forms = available();
  qIndex++;
  qLocked = false;
  selectedAnswer = null;
  if (qIndex >= forms.length) {
    quizDone = true;
    scoreById.best = Math.max(
      scoreById.best || 0,
      Math.round((qScore / forms.length) * 100),
    );
    scoreById.last = Math.round((qScore / forms.length) * 100);
    save();
    playFx("success");
    burst(35);
  }
  render();
}
function resetQuiz() {
  qIndex = 0;
  qScore = 0;
  qLocked = false;
  quizDone = false;
  selectedAnswer = null;
  render();
}
function setTab(v) {
  stopSpeech();
  tab = v;
  playFx("tap");
  render();
}
function openParent() {
  const questions = lesson.parentQuestions;
  $("parent-questions").innerHTML = questions
    .map(
      (q, i) =>
        `<label><input type="checkbox" data-parent="${i}"><span>${escapeHtml(q)}</span></label>`,
    )
    .join("");
  $("dad-complete").disabled = true;
  $("dad-dialog").showModal();
}
$("workspace").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.speak) {
    const i = Number(b.dataset.index),
      kind = b.dataset.speak;
    if (kind === "train") {
      const f = available()[i];
      say(f.jp, `./audio/forms/${f.id}.mp3`, b);
    } else if (kind === "sentence") {
      const f = available()[i];
      say(f.kana, `./audio/sentences/${f.id}.mp3`, b);
    } else if (kind === "word") {
      const w = lesson.words[i];
      say(w.kana, `./audio/words/${w.sentenceId}.mp3`, b);
    } else if (kind === "word-example") {
      const f = lesson.forms.find((f) => f.id === lesson.words[i].sentenceId);
      say(f.kana, `./audio/sentences/${f.id}.mp3`, b);
    }
    return;
  }
  if (b.dataset.answer) {
    answerQuiz(b.dataset.answer);
    return;
  }
  if (b.id === "quiz-next") {
    nextQuiz();
    return;
  }
  if (b.dataset.action === "retry") {
    resetQuiz();
    return;
  }
  if (b.dataset.action === "parent") {
    openParent();
    return;
  }
  if (b.dataset.nav) {
    stopSpeech();
    wordPage += b.dataset.nav === "word-next" ? 1 : -1;
    playFx("tap");
    render();
  }
});

document
  .querySelectorAll("[data-tab]")
  .forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
$("hero-speak").addEventListener("click", () =>
  say(lesson.reading, "./audio/forms/base.mp3", $("hero-speak")),
);
$("day-label").addEventListener("click", () => {
  $("day-options").innerHTML = lessons
    .map(
      (l, i) =>
        `<button type="button" data-day="${i}" class="${l.id === lesson.id ? "active" : ""}"><b>DAY ${String(l.day).padStart(2, "0")} · ${escapeHtml(l.kanji)} (${escapeHtml(l.reading)})</b><span>${escapeHtml(l.title)} · ${escapeHtml(l.note)}</span></button>`,
    )
    .join("");
  $("day-dialog").showModal();
});
$("day-options").addEventListener("click", (e) => {
  const b = e.target.closest("[data-day]");
  if (!b) return;
  lesson = lessons[Number(b.dataset.day)];
  try {
    scoreById = JSON.parse(storeGet(stateKey()) || "{}") || {};
  } catch {
    scoreById = {};
  }
  stopSpeech();
  tab = "train";
  wordPage = 0;
  resetQuiz();
  $("day-dialog").close();
  const image = $("hero-image");
  const next = new Image();
  next.onload = () => (image.src = lesson.image);
  next.onerror = () => (image.src = lesson.fallback);
  next.src = lesson.image;
});
$("level-open").addEventListener("click", () => {
  document
    .querySelectorAll("[data-level]")
    .forEach((b) =>
      b.classList.toggle("active", Number(b.dataset.level) === level),
    );
  $("level-dialog").showModal();
});
document.querySelectorAll("[data-level]").forEach((b) =>
  b.addEventListener("click", () => {
    level = Number(b.dataset.level);
    storeSet("dayun:level", String(level));
    stopSpeech();
    qIndex = 0;
    qScore = 0;
    qLocked = false;
    quizDone = false;
    selectedAnswer = null;
    $("level-dialog").close();
    toast(`LEVEL ${level}로 변경했어요`);
    render();
  }),
);
document
  .querySelectorAll("[data-close]")
  .forEach((b) =>
    b.addEventListener("click", () => $(b.dataset.close).close()),
  );
$("dad-open").addEventListener("click", openParent);
$("parent-questions").addEventListener("change", () => {
  $("dad-complete").disabled = [
    ...$("parent-questions").querySelectorAll("input"),
  ].some((i) => !i.checked);
});
$("dad-complete").addEventListener("click", () => {
  scoreById.dadApproved = true;
  scoreById.approvedAt = new Date().toISOString();
  save();
  $("dad-dialog").close();
  playFx("success");
  burst(35);
  toast("아빠 확인 완료! 오늘도 잘했어!");
  $("footer-status").textContent = "오늘의 아빠 확인 도장 완료!";
});
$("sound-toggle").addEventListener("click", () => {
  soundOn = !soundOn;
  storeSet("dayun:sounds", soundOn ? "on" : "off");
  $("sound-toggle").setAttribute("aria-pressed", String(soundOn));
  $("sound-toggle").setAttribute(
    "aria-label",
    soundOn ? "효과음 끄기" : "효과음 켜기",
  );
  $("sound-icon").textContent = soundOn ? "♫" : "♪";
  if (soundOn) playFx("tap");
  toast(soundOn ? "효과음을 켰어요" : "효과음을 껐어요");
});
$("sound-toggle").setAttribute("aria-pressed", String(soundOn));
$("sound-toggle").setAttribute(
  "aria-label",
  soundOn ? "효과음 끄기" : "효과음 켜기",
);
$("sound-icon").textContent = soundOn ? "♫" : "♪";
// Preserve the exact user-provided artwork from the existing repository.
const img = $("hero-image");
const chosen = new Image();
chosen.onload = () => {
  img.src = lesson.image;
};
chosen.onerror = () => {
  img.src = lesson.fallback;
};
chosen.src = lesson.image;
render();
