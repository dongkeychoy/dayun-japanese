import { lessons } from './lessons.js';
const $ = (id) => document.getElementById(id);
let lesson, state, index = 0, score = 0, answered = false;
let toastTimer;
const sayStatus = (message) => { $('speech-status').textContent = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('speech-status').textContent = ''; }, 4500); };
function loadState() { try { return JSON.parse(localStorage.getItem(`dayun:${lesson.id}`)) || {}; } catch { return {}; } }
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
  $('form-list').innerHTML = lesson.forms.map((f, i) => `<article class="form-card"><div class="form-top"><span class="number">0${i + 1}</span><span class="label">${f.label}</span><span class="translation">${f.meaning}</span></div><div class="word-row"><div><div class="word" lang="ja">${f.japanese}</div><div class="kana" lang="ja">${f.reading}</div></div><button class="sound" data-form="${i}" aria-label="${f.label} ${f.reading} 발음 듣기">▶</button></div><div class="example"><div><p class="jp" lang="ja">${f.sentence}</p><p class="kana" lang="ja">${f.kana}</p><p class="translation">${f.translation}</p></div><button class="sound" data-example="${i}" aria-label="${f.label} 예문 발음 듣기">▶</button></div></article>`).join('');
  $('missions').innerHTML = lesson.missions.map((m, i) => `<label class="mission"><input type="checkbox" data-mission="${i}" ${state.missions[i] ? 'checked' : ''}><span>${m}</span></label>`).join('');
  stamp(); resetQuiz();
}
function stamp() { $('stamp').textContent = state.stamped ? '🌟 아빠 확인 완료! 오늘도 잘했어, 다윤아.' : ''; }
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
$('form-list').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.form !== undefined) speak(lesson.forms[Number(b.dataset.form)].reading); else speak(lesson.forms[Number(b.dataset.example)].kana); });
$('answers').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || answered) return; answered = true;
  const correct = Number(b.dataset.answer) === index; if (correct) score++;
  for (const option of $('answers').children) { option.disabled = true; if (Number(option.dataset.answer) === index) option.classList.add('correct'); }
  if (!correct) b.classList.add('wrong');
  $('feedback').textContent = correct ? '딩동댕! 잘했어 🌷' : `괜찮아! 정답은 ${lesson.forms[index].japanese} (${lesson.forms[index].reading})야.`;
  $('score').textContent = `정답 ${score}개`; $('quiz-progress').style.width = `${(index + 1) / lesson.forms.length * 100}%`;
  $('next').textContent = index === lesson.forms.length - 1 ? '결과 보기 ✨' : '다음 문제 →'; $('next').hidden = false;
});
$('next').addEventListener('click', () => {
  index++; if (index < lesson.forms.length) { showQuestion(); $('question').setAttribute('tabindex', '-1'); $('question').focus(); }
  else { $('next').hidden = true; $('answers').innerHTML = ''; $('question').textContent = `${lesson.forms.length}문제 중 ${score}개 성공!`; $('feedback').textContent = score === lesson.forms.length ? '모두 맞혔어! 이제 아빠에게 들려줄까? 🌟' : '조금씩 기억하면 돼. 위의 카드를 보고 다시 도전해봐 🌱'; $('retry').hidden = false; state.lastScore = score; save(); $('retry').focus(); }
});
$('retry').addEventListener('click', resetQuiz);
$('missions').addEventListener('change', e => { const i = Number(e.target.dataset.mission); state.missions[i] = e.target.checked; if (!e.target.checked) state.stamped = false; save(); stamp(); });
$('dad-check').addEventListener('click', () => { if (!lesson.missions.every((_, i) => state.missions[i])) { $('stamp').textContent = '세 가지 미션을 마치고 체크해 주세요 🌙'; return; } state.stamped = true; save(); stamp(); });
render();
