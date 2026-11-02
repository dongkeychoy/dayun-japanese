import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../public/lessons.js';
class Element {
  constructor() { this.value = 'day-01'; this.textContent = ''; this.hidden = false; this.style = {}; this.handlers = {}; this.children = []; this.dataset = {}; this.classList = { add() {}, remove() {}, contains() { return false; } }; }
  set innerHTML(s) { this.html = s; this.children = [...s.matchAll(/data-answer="(\d+)"/g)].map(m => { const e = new Element(); e.dataset.answer = m[1]; return e; }); }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute() {} focus() {} closest() { return this; }
}
test('complete learning flow and saved mission state', async () => {
  const elements = new Map();
  globalThis.document = { addEventListener() {}, querySelector() { return new Element(); }, querySelectorAll() { return []; }, getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); } };
  globalThis.window = {};
  const storage = new Map(); globalThis.localStorage = { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) };
  await import('../public/app.js');
  const get = id => elements.get(id);
  assert.equal(lessons[0].forms.length, 6);
  assert.equal(get('verb').textContent, '行く');
  get('dad-check').handlers.click(); assert.match(get('stamp').textContent, /세 가지/);
  for (let i = 0; i < 6; i++) {
    const chosen = get('answers').children.find(e => Number(e.dataset.answer) === (i === 0 ? 1 : i)) || get('answers').children.find(e => Number(e.dataset.answer) !== i);
    get('answers').handlers.click({ target: chosen });
    const score = get('score').textContent;
    get('answers').handlers.click({ target: chosen }); assert.equal(get('score').textContent, score);
    get('next').handlers.click();
  }
  assert.equal(get('question').textContent, '6문제 중 5개 성공!');
  assert.equal(JSON.parse(storage.get('dayun:day-01')).lastScore, 5);
  get('retry').handlers.click(); assert.equal(get('quiz-count').textContent, '1 / 6');
  for (let i = 0; i < 3; i++) get('missions').handlers.change({ target: { dataset: { mission: String(i) }, checked: true } });
  get('dad-check').handlers.click(); assert.match(get('stamp').textContent, /확인 완료/);
  get('day-select').handlers.change(); assert.match(get('stamp').textContent, /확인 완료/);
  get('missions').handlers.change({ target: { dataset: { mission: '0' }, checked: false } });
  assert.equal(get('stamp').textContent, '');
  assert.equal(JSON.parse(storage.get('dayun:day-01')).stamped, false);
});
