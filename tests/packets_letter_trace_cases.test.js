// Letter Trace in practice files (2026-11-13): the capital, then the lowercase, as the app traces them (tracingPhase
// "upper" then "lower"), or one of them (the maker's "Letter Trace: which letters to trace"); school letter shapes
// drawn from stroke data (single-story a and g) with writing lines and a numbered start dot and arrow per stroke;
// the letter's case said in the question; "Skip the lowercase letter"; the app's opening (trace_letter, the letter's
// name, "for", the word). The end screen of a file of tracing only says how much was done, not "0 of 0".
// jsdom has no canvas: the tracing check passes there, so the drawing itself is checked in a real browser
// (C:/tmp/packets_build_1111/polish_ws/src/pw_trace.cjs).
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;
const LT = TH.ADAPTERS.letter_tracing;
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const word = (w, board) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { letter_tracing: board || { letter: w[0] } } });
const BANKS = { instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta'), trace_letter: uri('tl'), for: uri('for'), letter_c: uri('lc'), letter_s: uri('ls'),
  now_try_lowercase: uri('ntl'), inst_letter_tracing: uri('inst') } };
const lessonOf = (words, banks = BANKS) => TH.lessonFromPack(words, { core, banks, activities: ['letter_tracing'], title: 'Trace' }).lesson;
const opened = [];
afterAll(() => opened.forEach((w) => w.close()));
function play(lesson) {
  const played = [];
  const dom = new JSDOM(TH.buildHtml(lesson, { core }), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { constructor(src) { this.src = src; } play() { played.push(this.src); return Promise.resolve(); } pause() {} };
  } });
  opened.push(dom.window);
  const d = dom.window.document;
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]') && !b.hidden).find((b) => b.textContent === text);
  d.getElementById('learner-name').value = 'Ana';
  button('Start').click();
  return { d, dom, button, played, text: () => d.getElementById('app').textContent };
}

describe('the letter shapes', () => {
  const PATTERN = /^(?:(?:[MLD] -?\d+(?:\.\d+)? -?\d+(?:\.\d+)?|E(?: -?\d+(?:\.\d+)?){6})(?: |$))+$/;
  it('every letter a-z and A-Z has strokes, in the stroke grammar, inside the writing lines', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    expect(Object.keys(LT.STROKES).sort()).toEqual(letters.slice().sort());
    const tall = 'bdfhklt', deep = 'gjpqy';
    for (const letter of letters) {
      const strokes = LT.STROKES[letter].split('|');
      for (const s of strokes) expect(s.trim(), letter).toMatch(PATTERN);
      // Every number pair (and every ellipse's reach) stays in the box: top line 0, base line 100, descenders to 145.
      const ys = [];
      for (const s of strokes) {
        const t = s.trim().split(/\s+/);
        for (let i = 0; i < t.length;) {
          if (t[i] === 'E') { ys.push(Number(t[i + 2]) - Number(t[i + 4]), Number(t[i + 2]) + Number(t[i + 4])); i += 7; } else { ys.push(Number(t[i + 2])); i += 3; }
        }
      }
      const top = Math.min(...ys), bottom = Math.max(...ys);
      if (letter === letter.toUpperCase()) { expect(top, letter).toBeGreaterThanOrEqual(0); expect(bottom, letter).toBeLessThanOrEqual(105); }
      else {
        expect(top, letter).toBeGreaterThanOrEqual(tall.includes(letter) ? 0 : letter === 'i' || letter === 'j' ? 20 : 48);
        expect(bottom, letter).toBeLessThanOrEqual(deep.includes(letter) ? 146 : 101);
      }
    }
  });

  it('a and g are single-story: a circle and a stick, no hook over the top', () => {
    for (const letter of ['a', 'g']) {
      const [bowl, stick] = LT.STROKES[letter].split('|');
      expect(bowl, letter).toMatch(/^E /);
      expect(stick, letter).toMatch(/^M 44 50 L 44 /);
    }
  });

  it('only the strokes of the letters an item traces go into the file', () => {
    const html = TH.buildHtml(lessonOf([word('cat')]), { core });
    expect(html).toContain(JSON.stringify(LT.STROKES.C).slice(1, -1));
    expect(html).toContain(JSON.stringify(LT.STROKES.c).slice(1, -1));
    expect(html).not.toContain(LT.STROKES.Q);
    expect(html).not.toContain('STROKES');
  });
});

describe('capital and lowercase', () => {
  it('both by default, capital first; one of them when the board says so', () => {
    const parts = (board) => lessonOf([word('cat', board)]).blocks[0].items[0].parts.map((p) => p.kind + ':' + p.letter + ':' + (p.strokes ? 'strokes' : 'font'));
    expect(parts()).toEqual(['capital:C:strokes', 'lowercase:c:strokes']);
    expect(parts({ letter: 'c', cases: 'capital' })).toEqual(['capital:C:strokes']);
    expect(parts({ letter: 'c', cases: 'lowercase' })).toEqual(['lowercase:c:strokes']);
    expect(parts({ letter: 'c', cases: 'nonsense' })).toEqual(['capital:C:strokes', 'lowercase:c:strokes']);
    // A capitalized word (a name) still traces C, then c; a letter with no strokes falls back to the font.
    expect(lessonOf([word('Cal', { letter: 'C' })]).blocks[0].items[0].parts.map((p) => p.letter)).toEqual(['C', 'c']);
    expect(lessonOf([word('élan')]).blocks[0].items[0].parts.map((p) => p.kind + ':' + p.letter + ':' + (p.strokes ? 'strokes' : 'font'))).toEqual(['capital:É:font', 'lowercase:é:font']);
    // The result row still names the word's first letter.
    expect(lessonOf([word('cat')]).blocks[0].items[0]).toMatchObject({ target: 'c', letter: 'c' });
  });

  it('opens as the app does: "trace the letter", its name, "for", the word; else the old instruction', () => {
    const item = lessonOf([word('cat')]).blocks[0].items[0];
    const lesson = lessonOf([word('cat')]);
    const src = (id) => lesson.audio[id];
    expect(item.introAudio.map(src)).toEqual([uri('tl'), uri('lc'), uri('for'), 'data:audio/wav;base64,' + wav('cat')]);
    expect(src(item.letterAudio)).toBe(uri('lc'));
    expect(src(item.lowerAudio)).toBe(uri('ntl'));
    const plain = lessonOf([word('cat')], { instructions: { inst_letter_tracing: uri('inst') } });
    expect(plain.blocks[0].items[0].introAudio.map((id) => plain.audio[id])).toEqual([uri('inst'), 'data:audio/wav;base64,' + wav('cat')]);
    expect(plain.blocks[0].items[0].letterAudio).toBeUndefined();
  });

  it('in the file: the capital, then the lowercase, each named; then it is recorded as traced', async () => {
    const t = play(lessonOf([word('cat'), word('sun')]));
    const q = () => t.d.querySelector('[data-trace-question]').textContent;
    const part = () => t.d.querySelector('[data-trace-part]').textContent;
    expect(q()).toBe('Trace the capital letter C.');
    expect(part()).toBe('Part 1 of 2');
    // The word in print, as the app's "for cat".
    expect(t.d.querySelector('[data-trace-word]').textContent).toBe('The word: cat');
    expect(t.d.querySelector('[data-trace-word] span').getAttribute('lang')).toBe('en');
    expect(t.d.querySelector('[data-trace-pen]').getAttribute('aria-label')).toBe('Tracing area for the capital letter C');
    expect(t.d.querySelector('[data-trace-how]').textContent).toBe('Start at the green dot. Follow the arrow.');
    expect(t.d.querySelector('[data-trace-skip-lowercase]').hidden).toBe(true);
    expect(t.button('Hear the letter')).toBeTruthy();
    t.button('I traced it').click();
    expect(q()).toBe('Trace the lowercase letter c.');
    expect(part()).toBe('Part 2 of 2');
    expect(t.text()).toContain('Nice tracing! Now trace the lowercase letter c.');
    expect(t.d.querySelector('[data-trace-skip-lowercase]').hidden).toBe(false);
    expect(t.d.querySelector('[data-next]').hidden).toBe(true);
    t.button('I traced it').click();
    expect(t.d.querySelector('[data-next]').hidden).toBe(false);
    expect(t.d.querySelector('[data-feedback]').textContent).toBe('Nice tracing!');
    // The second word: skip the lowercase. It counts as traced, and the skip is recorded as a support.
    t.d.querySelector('[data-next]').click();
    expect(q()).toBe('Trace the capital letter S.');
    t.button('I traced it').click();
    t.button('Skip the lowercase letter').click();
    t.d.querySelector('[data-next]').click();
    // A file of tracing only: the end screen says how much was done, never "0 of 0".
    expect(t.text()).toContain('Practice, not scored: 2 of 2 done.');
    expect(t.text()).not.toContain('0 of 0');
    const rec = JSON.parse(t.dom.window.localStorage.getItem(Object.keys(t.dom.window.localStorage).find((k) => /take-home|packet|allo/i.test(k)) || ''));
    expect(rec.items.map((r) => r.practice)).toEqual(['traced', 'traced']);
    expect(rec.items[1].supports).toMatchObject({ lowercaseSkipped: 1 });
  });

  it('Skip (not traced) ends the item at any part; a mixed file lists Letter Trace practice in its rows', () => {
    const words = [word('cat'), word('sun')];
    words.forEach((w) => { w.activityItems.isolation = { position: 0, correctSound: w.word === 'cat' ? 'k' : 's', options: ['k', 's', 'a'] }; });
    const banks = { ...BANKS, isolation: { '1st': uri('q1') }, phonemes: { k: uri('k'), s: uri('s'), a: uri('a') } };
    const lesson = TH.lessonFromPack(words, { core, banks, activities: ['letter_tracing', 'isolation'], title: 'Mixed' }).lesson;
    const t = play(lesson);
    t.button('Skip (not traced)').click();
    t.d.querySelector('[data-next]').click();
    t.button('I traced it').click();
    t.button('Skip (not traced)').click();
    t.d.querySelector('[data-next]').click();
    for (let i = 0; i < 2; i++) { t.d.dispatchEvent(new t.dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true })); t.d.querySelector('[data-next]').click(); }
    const rows = [...t.d.querySelectorAll('.tally li')].map((li) => li.textContent);
    expect(rows[0]).toBe('Letter TracePractice, not scored: 2 of 2 done.');
    expect(rows[1]).toMatch(/^Find Sounds/);
    expect(t.text()).toMatch(/Right on the first try: \d of 2\./);
  });
});

// 2026-11-13 (later): every start dot and its number can be read. Stroke 1's dot is at its real start; a later dot
// that would sit on or beside an earlier one moves along its stroke or beside its start; no arrow is drawn over a
// dot; dot 1 is drawn last (on top); every dot is inside the box. The render runs in jsdom with a stand-in 2D
// context that records what is drawn (the real drawing: C:/tmp/packets_build_1111/polish_ws/dots/shots/).
describe('the start dots and arrows', () => {
  const R = 12, SIZE = 280;
  const dom = new JSDOM('<!doctype html><body></body>');
  afterAll(() => dom.window.close());
  const doc = dom.window.document;
  const contexts = new Map();
  dom.window.HTMLCanvasElement.prototype.getContext = function () {
    const log = []; let path = []; let started = false;
    const state = {};
    const g = new Proxy(state, { get(t, k) {
      if (k === 'beginPath') return () => { path = []; };
      if (k === 'arc') return (x, y, r) => { path.push({ arc: [x, y, r] }); };
      if (k === 'moveTo' || k === 'lineTo') return (x, y) => { path.push({ pt: [x, y] }); };
      if (k === 'closePath') return () => { path.push({ close: true }); };
      if (k === 'fill') return () => { log.push({ fill: path.slice() }); };
      if (k === 'stroke') return () => { if (!started && path.length) { started = true; log.push({ firstStroke: path[0].pt }); } };
      if (k === 'fillText') return (s, x, y) => { log.push({ text: String(s), x, y }); };
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (k in t) return t[k];
      return () => {};
    }, set(t, k, v) { t[k] = v; return true; } });
    contexts.set(this, log);
    return g;
  };
  const el = (tag, attrs, kids) => { const n = doc.createElement(tag); Object.keys(attrs || {}).forEach((k) => { if (k === 'text') n.textContent = attrs[k]; else if (k !== 'on' && attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]); }); (kids || []).forEach((c) => c && n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c)); return n; };
  const drawn = (letter) => {
    const root = doc.createElement('div'); doc.body.appendChild(root);
    LT.render({ letter, parts: [{ letter, kind: 'capital', strokes: LT.STROKES[letter] }] }, { root, el, L: LT.labels, fmt: (s) => s, isDone: () => false, play() {}, support() {}, practice() {} });
    const log = contexts.get(root.querySelector('canvas'));
    root.remove();
    const dots = [], arrows = [], texts = [];
    let start = null;
    log.forEach((e) => {
      if (e.firstStroke) start = e.firstStroke;
      else if (e.text) texts.push(e);
      else if (e.fill.length === 1 && e.fill[0].arc && e.fill[0].arc[2] === R) dots.push(e.fill[0].arc);
      else if (e.fill.some((q) => q.close)) arrows.push(e.fill.filter((q) => q.pt).map((q) => q.pt));
    });
    return { dots, arrows, texts, start, strokes: LT.STROKES[letter].split('|').length };
  };
  const seg = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const inTri = (p, [a, b, c]) => { const s = (u, v, w) => (u[0] - w[0]) * (v[1] - w[1]) - (v[0] - w[0]) * (u[1] - w[1]); const d = [s(p, a, b), s(p, b, c), s(p, c, a)]; return !(d.some((x) => x < 0) && d.some((x) => x > 0)); };
  const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  it('no two start dots of a letter overlap, and every dot is inside the box (all 52 letters)', () => {
    for (const letter of letters) {
      const { dots, strokes } = drawn(letter);
      expect(dots.length, letter).toBe(strokes);
      for (const [x, y] of dots) { expect(x - R, letter).toBeGreaterThanOrEqual(0); expect(y - R, letter).toBeGreaterThanOrEqual(0); expect(x + R, letter).toBeLessThanOrEqual(SIZE); expect(y + R, letter).toBeLessThanOrEqual(SIZE); }
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        expect(Math.hypot(dots[i][0] - dots[j][0], dots[i][1] - dots[j][1]), letter + ' dots ' + i + ',' + j).toBeGreaterThanOrEqual(2 * R);
      }
    }
  });

  it('no arrow is drawn over a dot; one arrow per stroke that is not a dot', () => {
    for (const letter of letters) {
      const { dots, arrows } = drawn(letter);
      expect(arrows.length, letter).toBe(LT.STROKES[letter].split('|').filter((s) => !/^D /.test(s.trim())).length);
      for (const tri of arrows) for (const p of dots) {
        const gap = inTri(p, tri) ? 0 : Math.min(seg(p, tri[0], tri[1]), seg(p, tri[1], tri[2]), seg(p, tri[2], tri[0]));
        expect(gap, letter).toBeGreaterThan(R);
      }
    }
  });

  it('dot 1 is at the real start, drawn last; numbers only when there are several strokes', () => {
    for (const letter of letters) {
      const { dots, texts, start, strokes } = drawn(letter);
      const one = dots[dots.length - 1];
      expect(Math.hypot(one[0] - start[0], one[1] - start[1]), letter).toBeLessThan(0.01);
      if (strokes === 1) { expect(texts, letter).toEqual([]); continue; }
      // Each number sits in its own dot, last first.
      expect(texts.map((t) => t.text), letter).toEqual(Array.from({ length: strokes }, (_, i) => String(strokes - i)));
      texts.forEach((t, i) => expect(Math.hypot(t.x - dots[i][0], t.y - 1 - dots[i][1]), letter).toBeLessThan(0.01));
    }
  });
});
