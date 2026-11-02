import { lessons } from './lessons.js';
const $ = (id) => document.getElementById(id);
let lesson, state, index = 0, score = 0, answered = false;
let toastTimer, audioContext;
let soundEnabled = false;
try { soundEnabled = localStorage.getItem('dayun:sound') === 'on'; } catch {}
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function effect(kind = 'tap') {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const notes = { tap: [620], correct: [660, 880, 1100], wrong: [330, 260], mission: [660, 880], stamp: [523, 659, 784, 1047] }[kind];
    notes.forEach((frequency, i) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      const start = audioContext.currentTime + i * .1;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.035, start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + .13);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .15);
    });
  } catch { /* Audio is optional; learning remains available. */ }
}
function soundButton() {
  $('sound-toggle').textContent = soundEnabled ? '🔊 효과음 ON' : '🔇 효과음 OFF';
  $('sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-toggle').setAttribute('aria-label', soundEnabled ? '효과음 끄기' : '효과음 켜기');
}
function celebrate() {
  if (reducedMotion()) return;
  $('celebration').innerHTML = Array.from({ length: 18 }, (_, i) => `<span class="confetti" style="left:${(i * 37) % 100}%;animation-delay:${i * .025}s">${['✦','⭐','💜','✨','🌸'][i % 5]}</span>`).join('');
  setTimeout(() => { $('celebration').innerHTML = ''; }, 2200);
}
let observer;
function revealCards() {
  observer?.disconnect();
  if (!('IntersectionObserver' in window) || reducedMotion()) return;
  observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('reveal'); observer.unobserve(entry.target); }
  }), { threshold: .08 });
  document.querySelectorAll('.hero,.form-card,.story,.quiz,.night').forEach(card => observer.observe(card));
}
function updateProgress() {
  const learned = lesson.forms.filter((_, i) => state.heard?.[i]).length;
  const missions = lesson.missions.filter((_, i) => state.missions[i]).length;
  const total = lesson.forms.length + lesson.missions.length + 2;
  const done = learned + missions + (Number.isInteger(state.lastScore) ? 1 : 0) + (state.stamped ? 1 : 0);
  $('adventure-progress').textContent = `${done} / ${total} 모험 완료`;
  $('day-progress').style.width = `${done / total * 100}%`;
  $('mission-count').textContent = `⭐ 아빠와 함께 ${missions} / ${lesson.missions.length} 완료`;
  $('dad-check').textContent = state.stamped ? '🌟 오늘의 도장 다시 보기' : '아빠 확인! 참 잘했어요 도장 꾹!';
}
const sayStatus = (message) => { $('speech-status').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('speech-status').textContent = ''; }, 4500); };
function loadState() { try { const value = JSON.parse(localStorage.getItem(`dayun:${lesson.id}`)); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function save() { try { localStorage.setItem(`dayun:${lesson.id}`, JSON.stringify(state)); } catch { sayStatus('저장 공간을 사용할 수 없어 이번 기록은 저장되지 않아요.'); } }
function speak(text) {
  if (!('speechSynthesis' in window)) return sayStatus('이 브라우저는 음성 읽기를 지원하지 않아요. 일본어 읽기를 보고 따라 해봐요.');
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.toLowerCase().startsWith('ja'));
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ja-JP'; utterance.rate = 0.78;
  if (voice) utterance.voice = voice;
  utterance.onerror = (e) => { if (!['interrupted', 'canceled'].includes(e.error)) sayStatus('일본어 음성을 재생할 수 없어요. 기기의 일본어 음성 설정을 확인해 주세요.'); };
  speechSynthesis.speak(utterance);
}
// HTML is assembled only from the trusted, repository-owned lesson data.
function render() {
  lesson = lessons.find(l => l.id === $('day-select').value) || lessons[0];
  state = loadState(); if (!Array.isArray(state.missions)) state.missions = [];
  $('day-badge').textContent = `DAY ${lesson.day}`;
  for (const key of ['theme', 'reading', 'meaning', 'tip', 'note']) $(key).textContent = lesson[key];
  $('verb').textContent = lesson.verb;
  const heroImage = document.querySelector('.hero img');
  heroImage.src = `./${lesson.illustration || 'journey'}.svg`; heroImage.alt = `${lesson.meaning} · 토끼 루루의 오늘의 모험`;
  $('form-list').innerHTML = lesson.forms.map((f, i) => `<article class="form-card"><div class="form-top"><span class="number">${i + 1}</span><span class="label">${f.label}</span><span class="form-star" id="star-${i}">${state.heard?.[i] ? '★ 획득!' : '☆'}</span></div><div class="word-row"><div><div class="word" lang="ja">${f.japanese}</div><div class="kana" lang="ja">${f.reading}</div></div><button class="sound" data-form="${i}" aria-label="${f.label} ${f.reading} 발음 듣기">🔊</button></div><p class="translation">${f.meaning}</p><div class="form-bottom"><span>듣고 따라 하기</span><a class="example-link" href="#story-${i}">그림 예문 보기 →</a></div></article>`).join('');
  const scenes = lesson.scenes || ['school', 'park', 'school', 'sea', 'school', 'park'];
  $('example-list').innerHTML = lesson.forms.map((f, i) => `<article class="story" id="story-${i}"><div class="story-heading"><span>이야기 ${i + 1} · ${f.label}</span><span>${i + 1} / ${lesson.forms.length}</span></div><img src="./${scenes[i] || 'school'}.svg" alt="${f.translation}" width="340" height="240" loading="lazy"><button class="sound" data-example="${i}" aria-label="예문 ${i + 1} 듣기">🔊</button><p class="jp" lang="ja">${f.sentence}</p><p class="kana" lang="ja">${f.kana}</p><p class="translation">${f.translation}</p></article>`).join('');
  $('missions').innerHTML = lesson.missions.map((m, i) => `<label class="mission"><input type="checkbox" data-mission="${i}" ${state.missions[i] ? 'checked' : ''}><span>${m}</span></label>`).join('');
  stamp(); resetQuiz(); updateProgress(); revealCards();
}
function stamp() { $('stamp').classList.remove('stamping'); $('stamp').textContent = state.stamped ? '🌟 아빠 확인 완료! 오늘도 잘했어, 다윤아.' : ''; }
function resetQuiz() { index = 0; score = 0; showQuestion(); }
function showQuestion() {
  answered = false; $('next').hidden = true; $('retry').hidden = true; $('feedback').textContent = '';
  $('quiz-count').textContent = `${index + 1} / ${lesson.forms.length}`; $('score').textContent = `정답 ${score}개`;
  $('quiz-progress').style.width = `${index / lesson.forms.length * 100}%`;
  const f = lesson.forms[index]; $('question').textContent = `“${f.meaning}”는 일본어로?`;
  const options = [index, ...lesson.forms.map((_, i) => i).filter(i => i !== index).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
  $('answers').innerHTML = options.map(i => `<button data-answer="${i}" lang="ja">${lesson.forms[i].japanese}</button>`).join('');
}
$('day-select').innerHTML = lessons.map(l => `<option value="${l.id}">DAY ${l.day} · ${l.verb}</option>`).join('');
$('day-select').addEventListener('change', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); render(); });
$('verb-speak').addEventListener('click', () => speak(lesson.reading));
$('form-list').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.dataset.form === undefined) return;
  const i = Number(b.dataset.form); speak(lesson.forms[i].reading);
  if (!Array.isArray(state.heard)) state.heard = [];
  state.heard[i] = true; $(`star-${i}`).textContent = '★ 획득!'; save(); updateProgress();
});
$('example-list').addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.example !== undefined) speak(lesson.forms[Number(b.dataset.example)].kana); });
$('answers').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || answered) return; answered = true;
  const correct = Number(b.dataset.answer) === index; if (correct) score++;
  for (const option of $('answers').children) { option.disabled = true; if (Number(option.dataset.answer) === index) option.classList.add('correct'); }
  if (!correct) b.classList.add('wrong');
  effect(correct ? 'correct' : 'wrong'); if (correct) celebrate();
  $('feedback').textContent = correct ? '딩동댕! 잘했어 🌷' : `괜찮아! 정답은 ${lesson.forms[index].japanese} (${lesson.forms[index].reading})야.`;
  $('score').textContent = `정답 ${score}개`; $('quiz-progress').style.width = `${(index + 1) / lesson.forms.length * 100}%`;
  $('next').textContent = index === lesson.forms.length - 1 ? '결과 보기 ✨' : '다음 문제 →'; $('next').hidden = false;
});
$('next').addEventListener('click', () => {
  index++; if (index < lesson.forms.length) { showQuestion(); $('question').setAttribute('tabindex', '-1'); $('question').focus(); }
  else { $('next').hidden = true; $('answers').innerHTML = ''; $('question').textContent = `${lesson.forms.length}문제 중 ${score}개 성공!`; $('feedback').textContent = score === lesson.forms.length ? '모두 맞혔어! 이제 아빠에게 들려줄까? 🌟' : '조금씩 기억하면 돼. 위의 카드를 보고 다시 도전해봐 🌱'; $('retry').hidden = false; state.lastScore = score; save(); updateProgress(); $('retry').focus(); }
});
$('retry').addEventListener('click', resetQuiz);
$('missions').addEventListener('change', e => { const i = Number(e.target.dataset.mission); state.missions[i] = e.target.checked; if (!e.target.checked) state.stamped = false; save(); stamp(); updateProgress(); if (e.target.checked) effect('mission'); });
$('dad-check').addEventListener('click', () => {
  if (!lesson.missions.every((_, i) => state.missions[i])) { $('stamp').textContent = '세 가지 미션을 마치고 체크해 주세요 🌙'; return; }
  state.stamped = true; save(); stamp(); updateProgress();
  void $('stamp').offsetWidth; $('stamp').classList.add('stamping'); effect('stamp'); celebrate();
});
$('sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled; soundButton();
  try { localStorage.setItem('dayun:sound', soundEnabled ? 'on' : 'off'); } catch {}
  if (soundEnabled) effect('tap');
});
document.addEventListener('click', e => {
  const button = e.target.closest('button,a,summary,select');
  if (button && !button.closest('#answers') && !['sound-toggle', 'dad-check', 'verb-speak'].includes(button.id) && !button.classList.contains('sound')) effect('tap');
});
soundButton(); render();
