import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { lessons } from "../public/day01.js";

const baseDir = path.resolve(process.env.TEST_SITE_DIR || "dist");
const output = path.resolve("artifacts/mobile");
await mkdir(output, { recursive: true });
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
};
const server = createServer(async (req, res) => {
  const file = path.resolve(
    baseDir,
    "." + decodeURIComponent(new URL(req.url, "http://localhost").pathname),
  );
  if (!file.startsWith(baseDir + path.sep) && file !== baseDir) {
    res.writeHead(403).end();
    return;
  }
  try {
    const target = file === baseDir ? path.join(file, "index.html") : file;
    const body = await readFile(target);
    res.setHeader(
      "Content-Type",
      mime[path.extname(target)] || "application/octet-stream",
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const localUrl = `http://127.0.0.1:${server.address().port}`;
const testUrl = process.env.TEST_BASE_URL || localUrl;
let executablePath = process.env.CHROMIUM_PATH;
if (!executablePath) {
  try {
    await access("/usr/bin/chromium");
    executablePath = "/usr/bin/chromium";
  } catch {}
}
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox"],
});
const reports = [];
const lesson = lessons[0];

// Observe native media and Web Audio. No audio API or playback result is mocked.
async function instrument(page) {
  await page.addInitScript(() => {
    window.__media = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      const record = {
        src: this.src,
        playing: false,
        ended: false,
        time: 0,
        error: null,
      };
      window.__media.push(record);
      this.addEventListener("playing", () => {
        record.playing = true;
      });
      this.addEventListener("timeupdate", () => {
        record.time = this.currentTime;
      });
      this.addEventListener("ended", () => {
        record.ended = true;
      });
      this.addEventListener("error", () => {
        record.error = this.error?.code;
      });
      return play.apply(this, args);
    };
    window.__fx = { tones: 0, claps: 0, peak: 0, running: false };
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (...args) {
      const result = connect.apply(this, args);
      if (args[0] === this.context.destination) {
        const analyser = this.context.createAnalyser();
        analyser.fftSize = 512;
        connect.call(this, analyser);
        const samples = new Float32Array(analyser.fftSize);
        const timer = setInterval(() => {
          window.__fx.running = this.context.state === "running";
          analyser.getFloatTimeDomainData(samples);
          for (const sample of samples)
            window.__fx.peak = Math.max(window.__fx.peak, Math.abs(sample));
        }, 15);
        setTimeout(() => clearInterval(timer), 1500);
      }
      return result;
    };
    for (const [proto, key] of [
      [OscillatorNode.prototype, "tones"],
      [AudioBufferSourceNode.prototype, "claps"],
    ]) {
      const start = proto.start;
      proto.start = function (...args) {
        window.__fx[key]++;
        return start.apply(this, args);
      };
    }
  });
}

async function checkLayout(page, label) {
  const issues = await page.evaluate(() => {
    const problems = [];
    const app = document.querySelector("#app"),
      workspace = document.querySelector("#workspace");
    const box = workspace.getBoundingClientRect();
    if (
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight
    )
      problems.push("page scroll");
    for (const e of app.querySelectorAll("*")) {
      if (!e.getClientRects().length || e.closest(".fx-layer,.toast")) continue;
      const rect = e.getBoundingClientRect(),
        css = getComputedStyle(e);
      if (
        rect.left < -0.5 ||
        rect.right > innerWidth + 0.5 ||
        rect.top < -0.5 ||
        rect.bottom > innerHeight + 0.5
      )
        problems.push(`${e.className}: outside viewport`);
      // A line box that overflows is a failure even when the outer page cannot scroll.
      if (
        css.display !== "inline" &&
        (e.scrollWidth > e.clientWidth + 1 ||
          e.scrollHeight > e.clientHeight + 1)
      )
        problems.push(
          `${e.className}: internal overflow ${e.clientWidth}/${e.scrollWidth}, ${e.clientHeight}/${e.scrollHeight}`,
        );
      if (
        e.matches(
          ".study-row,.sentence-row,.word-card,.view-nav,.quiz-feedback,.result,.option-grid",
        ) &&
        (rect.top < box.top - 0.5 || rect.bottom > box.bottom + 0.5)
      )
        problems.push(`${e.className}: outside learning panel`);
      if (
        e.matches("[data-speak],.option,.next-button:not([hidden]),.round-nav")
      ) {
        if (rect.width < 44 || rect.height < 44)
          problems.push(`${e.className}: touch target below 44px`);
        if (!e.disabled) {
          const top = document.elementFromPoint(
            rect.x + rect.width / 2,
            rect.y + rect.height / 2,
          );
          if (!e.contains(top))
            problems.push(`${e.className}: touch target obstructed`);
        }
      }
    }
    for (const e of workspace.querySelectorAll(
      ".row-label,.row-kanji,.row-hiragana,.row-ko,.sentence-jp,.sentence-reading,.sentence-ko,.word-example-jp,.word-example-kana,.word-example-ko",
    )) {
      const range = document.createRange();
      range.selectNodeContents(e);
      const container = e
        .closest(".study-row,.sentence-row,.word-card")
        .getBoundingClientRect();
      for (const r of range.getClientRects())
        if (
          r.left < container.left - 0.5 ||
          r.right > container.right + 0.5 ||
          r.top < container.top - 0.5 ||
          r.bottom > container.bottom + 0.5
        )
          problems.push(`${e.className}: glyphs outside card`);
    }
    return problems;
  });
  assert.deepEqual(issues, [], label);
}
async function shot(page, prefix, name) {
  await checkLayout(page, `${prefix} ${name}`);
  await page.screenshot({ path: path.join(output, `${prefix}-${name}.png`) });
}
async function play(page, selector, expected) {
  const before = await page.evaluate(() => window.__media.length);
  await page.locator(selector).tap();
  await page.waitForFunction(
    ({ before, expected }) => {
      const a = window.__media[before];
      return (
        a?.playing && a.time > 0.05 && a.src.endsWith(expected) && !a.error
      );
    },
    { before, expected },
    { timeout: 7000 },
  );
  assert.equal(await page.locator(selector).getAttribute("aria-busy"), "true");
}

try {
  for (const [width, height] of [
    [320, 568],
    [360, 740],
    [390, 844],
    [430, 932],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await instrument(page);
    await page.goto(testUrl);
    await page.locator(".study-row").first().waitFor();
    const prefix = `${width}x${height}`;
    assert.equal(await page.locator(".study-row").count(), 7);
    assert.deepEqual(
      await page.locator(".row-kanji").allTextContents(),
      lesson.forms.map((f) => f.kanji),
    );
    assert.deepEqual(
      await page.locator(".row-hiragana").allTextContents(),
      lesson.forms.map((f) => f.jp),
    );
    assert.ok(
      await page
        .locator("#hero-image")
        .evaluate((img) => img.complete && img.naturalWidth > 0),
    );
    await shot(page, prefix, "train");
    for (let i = 0; i < 7; i++)
      await play(
        page,
        `[data-speak="train"][data-index="${i}"]`,
        `forms/${lesson.forms[i].id}.mp3`,
      );
    await page.locator('[data-tab="sentence"]').tap();
    assert.equal(await page.locator(".sentence-row").count(), 7);
    assert.deepEqual(
      await page.locator(".sentence-jp").allTextContents(),
      lesson.forms.map((f) => f.full),
    );
    assert.deepEqual(
      await page.locator(".sentence-reading").allTextContents(),
      lesson.forms.map((f) => f.kana),
    );
    assert.deepEqual(
      await page.locator(".sentence-ko").allTextContents(),
      lesson.forms.map((f) => f.meaning),
    );
    await shot(page, prefix, "sentence");
    for (let i = 0; i < 7; i++)
      await play(
        page,
        `[data-speak="sentence"][data-index="${i}"]`,
        `sentences/${lesson.forms[i].id}.mp3`,
      );
    await page.locator('[data-tab="word"]').tap();
    assert.equal(
      await page.locator('[data-nav="word-prev"]').isDisabled(),
      true,
    );
    for (let i = 0; i < 5; i++) {
      const w = lesson.words[i],
        f = lesson.forms.find((f) => f.id === w.sentenceId);
      assert.equal(await page.locator(".word-card").count(), 1);
      assert.equal(await page.locator(".vocab-jp").textContent(), w.jp);
      assert.equal(await page.locator(".vocab-kana").textContent(), w.kana);
      assert.equal(await page.locator(".vocab-meaning").textContent(), w.ko);
      assert.equal(
        await page.locator(".word-example-jp").textContent(),
        f.full,
      );
      assert.equal(
        await page.locator(".word-example-kana").textContent(),
        f.kana,
      );
      assert.equal(
        await page.locator(".word-example-ko").textContent(),
        f.meaning,
      );
      await page.locator(".word-photo").evaluate((img) => img.decode());
      const image = await page.locator(".word-photo").boundingBox();
      assert.ok(image.height >= 86 && image.height < height * 0.35);
      await shot(page, prefix, `word-${i + 1}`);
      await play(page, '[data-speak="word"]', `words/${w.sentenceId}.mp3`);
      await play(page, '[data-speak="word-example"]', `sentences/${f.id}.mp3`);
      if (i < 4) await page.locator('[data-nav="word-next"]').tap();
    }
    assert.equal(
      await page.locator('[data-nav="word-next"]').isDisabled(),
      true,
    );
    for (let i = 3; i >= 0; i--) {
      await page.locator('[data-nav="word-prev"]').tap();
      assert.equal(
        await page.locator(".vocab-jp").textContent(),
        lesson.words[i].jp,
      );
    }
    await page.locator('[data-tab="quiz"]').tap();
    await shot(page, prefix, "quiz");
    for (let i = 0; i < 7; i++) {
      assert.equal(await page.locator(".option").count(), 4);
      assert.equal(
        new Set(await page.locator(".option").allTextContents()).size,
        4,
      );
      await checkLayout(page, `${prefix} question ${i + 1}`);
      await page.locator(`[data-answer="${lesson.forms[i].id}"]`).tap();
      assert.equal(
        await page.locator(".quiz-score").textContent(),
        `★ ${Math.round(((i + 1) / 7) * 100)}점`,
      );
      assert.equal(await page.locator(".option:disabled").count(), 4);
      assert.equal(await page.locator(".confetti").count(), 22);
      if (i === 0) {
        await shot(page, prefix, "quiz-correct");
        await page.locator('[data-tab="word"]').tap();
        await page.locator('[data-tab="quiz"]').tap();
        assert.equal(await page.locator("#quiz-next").isVisible(), true);
        assert.equal(await page.locator(".option:disabled").count(), 4);
        assert.equal(await page.locator(".quiz-score").textContent(), "★ 14점");
      }
      await page.locator("#quiz-next").tap();
    }
    assert.equal(await page.locator(".result-score").textContent(), "100점");
    await page.waitForTimeout(450);
    await shot(page, prefix, "quiz-result");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("dayun:day-01")).last,
      ),
      100,
    );
    const fx = await page.evaluate(() => window.__fx);
    assert.ok(
      fx.tones >= 21 && fx.claps >= 56 && fx.peak > 0 && fx.running,
      `real celebration audio ${JSON.stringify(fx)}`,
    );
    await page.locator('[data-action="retry"]').tap();
    const beforeWrong = await page.evaluate(() => ({
      tones: window.__fx.tones,
      claps: window.__fx.claps,
    }));
    await page.locator('[data-answer="polite"]').tap();
    assert.equal(await page.locator(".option.wrong").count(), 1);
    assert.match(await page.locator("#quiz-feedback").textContent(), /아쉽다/);
    assert.equal(await page.locator(".quiz-score").textContent(), "★ 0점");
    const afterWrong = await page.evaluate(() => ({
      tones: window.__fx.tones,
      claps: window.__fx.claps,
    }));
    assert.equal(afterWrong.tones - beforeWrong.tones, 2);
    assert.equal(afterWrong.claps, beforeWrong.claps);
    await page.waitForTimeout(300);
    await shot(page, prefix, "quiz-wrong");
    // Finish a mixed run: a wrong answer cannot be counted as correct or award a second point.
    await page.locator("#quiz-next").tap();
    for (let i = 1; i < 7; i++) {
      await page.locator(`[data-answer="${lesson.forms[i].id}"]`).tap();
      await page.locator("#quiz-next").tap();
    }
    assert.equal(await page.locator(".result-score").textContent(), "86점");
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("dayun:day-01")).best,
      ),
      100,
    );
    await page.locator("#sound-toggle").tap();
    const muted = await page.evaluate(() => window.__fx.tones);
    await page.locator('[data-tab="train"]').tap();
    assert.equal(await page.evaluate(() => window.__fx.tones), muted);
    // Effect mute must not mute the lesson's pronunciation.
    await play(page, '[data-speak="train"][data-index="0"]', "forms/base.mp3");
    await page.locator('[data-tab="quiz"]').tap();
    await page.locator('[data-action="retry"]').tap();
    await page.locator('[data-answer="base"]').tap();
    assert.equal(await page.evaluate(() => window.__fx.tones), muted);
    const media = await page.evaluate(() => window.__media);
    assert.equal(media.length, 25);
    assert.ok(media.every((m) => m.playing && !m.error));
    assert.deepEqual(errors, []);
    reports.push({
      viewport: prefix,
      modes: "train:7 / sentence:7 / words:5 / quiz:7",
      layout: "pass",
      nativeAudioPlays: media.length,
      celebrationAudio: fx,
      wrongAnswer: "pass",
      scores: "100 / 86",
      touchTargets: "44px+",
      screenshots: 11,
    });
    console.log(
      `PASS ${prefix}: 4 modes, 7 rows, 5 photo cards, 25 native audio plays, 100/86 points, real effects`,
    );
    await context.close();
  }
  // Every bundled MP3 must decode to a non-silent waveform in the actual browser.
  const page = await browser.newPage();
  await page.goto(testUrl);
  const audio = await page.evaluate(async () => {
    const { lessons } = await import("./day01.js?v=6");
    const d = lessons[0];
    const paths = [
      ...d.forms.flatMap((f) => [`forms/${f.id}`, `sentences/${f.id}`]),
      ...d.words.map((w) => `words/${w.sentenceId}`),
    ];
    const ctx = new AudioContext(),
      result = [];
    for (const p of paths) {
      const r = await fetch(`./audio/${p}.mp3`);
      const b = await ctx.decodeAudioData(await r.arrayBuffer());
      let peak = 0;
      for (const n of b.getChannelData(0)) peak = Math.max(peak, Math.abs(n));
      result.push({ path: p, duration: b.duration, peak });
    }
    await ctx.close();
    return result;
  });
  assert.equal(audio.length, 19);
  assert.ok(audio.every((a) => a.duration > 0.2 && a.peak > 0.001));
  await writeFile(
    path.join(output, "report.json"),
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        url: testUrl,
        browser: await browser.version(),
        viewports: reports,
        audio,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS all 19 Japanese MP3s decoded with a non-silent waveform. Report: artifacts/mobile/report.json",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
