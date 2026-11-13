// @vitest-environment jsdom
// Robustness pass of AlloFlow Packets files (2026-11-13; findings and measurements in
// C:/tmp/packets_build_1111/robust/FINDINGS.txt). Every screen test runs a REAL built file in jsdom.
// 1. Hear all: ONE document key listener for the whole file (hearStops). One for each Hear all button kept every
//    screen ever shown in memory: in a 481-item file in Chromium, 16,000 DOM nodes after 200 items, still growing.
// 2. Storage refused or full: the file keeps working and says so on every screen (saved_device_off), not only at the end.
//    Damaged saved data is not a refusal: the file starts afresh and says nothing.
// 3. The open page calls a damaged file damaged (below). 4. Results carry the time on the items (activeMs, active_s=):
//    durationMs is start to finish and spans days when a file is resumed (results review request, 2026-11-13).
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, builder } = tool.loadParts();
const TH = loader;

const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const fake = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log', 'hen', 'net', 'lip', 'bug', 'rug'];
const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const wsFile = async (activities) => (await builder.buildPacket({ words: CVC, activities, title: 'Ten words', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: KNOWN,
  createdAt: '2026-11-13T00:00:00.000Z' })).html;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OFF = TH.DEFAULT_LABELS.saved_device_off;

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
// storage: 'blocked' (every use throws, as with storage turned off), 'full' (reads work, every write throws, as a
// full device), or an object of items to start with.
function open(html, { storage = null } = {}) {
  const keyListeners = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 5); return Promise.resolve(); } pause() {} };
    const add = w.document.addEventListener.bind(w.document);
    w.document.addEventListener = (type, fn, capture) => { if (type === 'keydown') keyListeners.push(capture === true); return add(type, fn, capture); };
    if (storage === 'blocked') Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('The operation is insecure.', 'SecurityError'); } });
    else if (storage === 'full') { const set = w.Storage.prototype.setItem; w.Storage.prototype.setItem = function (k, v) { if (String(k).indexOf('alloflow-take-home:') === 0) throw new w.DOMException('full', 'QuotaExceededError'); return set.call(this, k, v); }; }
    else if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  return { w, d, seen, button, keyListeners,
    q: (s) => d.querySelector(s),
    start: () => { d.getElementById('learner-name').value = 'Fox1'; button('Start').click(); },
    key: (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })),
    marks: () => [...d.querySelectorAll('[data-hearing]')].map((n) => n.getAttribute('data-hearing')),
    off: () => [...d.querySelectorAll('[data-store-off]')].map((n) => n.textContent),
    // Answer the item on view: the first choice, then Next (two wrong tries end an item too).
    answer: async () => {
      for (let k = 0; k < 6 && !seen(d.querySelector('[data-next]')); k++) {
        const pick = [...d.querySelectorAll('#app li.choice button.primary')].find((b) => seen(b) && b.getAttribute('aria-disabled') !== 'true');
        if (!pick) break;
        pick.click(); await wait(1);
      }
      d.querySelector('[data-next]').click(); await wait(1);
    },
  };
}

describe('Hear all keeps no screen alive', () => {
  it('a file adds no key listener as its items go by, and the keys still stop Hear all on the screen on view', async () => {
    const html = await wsFile(['rhyming']);
    const f = open(html);
    f.start();
    await wait(1);
    const atFirst = f.keyListeners.length;
    for (let n = 0; n < 5; n++) await f.answer();
    expect(f.d.querySelector('#app h2').textContent).toMatch(/: 6 of \d+$/);
    expect(f.keyListeners.length, 'one listener for the file, none for each item').toBe(atFirst);
    // The keys 1-9, R and Esc stop Hear all on this screen, as before.
    for (const k of ['Escape', 'r', '3']) {
      const hear = f.q('[data-hear-all]');
      if (k === '3') { hear.click(); expect(f.marks()).toEqual(['1']); f.key(k); expect(f.marks(), k).toEqual([]); continue; }
      hear.click(); expect(f.marks()).toEqual(['1']);
      f.key(k); expect(f.marks(), k).toEqual([]);
    }
    // Another key does not.
    f.q('[data-hear-all]').click(); f.key('a'); expect(f.marks()).toEqual(['1']);
  });

  it('the shell has the one listener; hearAllIn adds none of its own', async () => {
    const html = await wsFile(['isolation']);
    const src = html.slice(html.indexOf('(function takeHomeShell('));
    const hear = src.slice(src.indexOf('var hearAllIn'), src.indexOf('var autoHear'));
    expect(hear.length).toBeGreaterThan(1000);
    expect(hear).not.toContain('doc.addEventListener');
    expect(hear).toContain('hearStops.push(');
    expect(src).toContain('hearNow = null; hearStops = [];');
  });
});

describe('vocabulary items keep no item alive through the device voice', () => {
  const V = require('../packet_vocab_builder.js');
  const bank = require('./fixtures/packets_vocab_bank_fixture.js');
  it('one voices handler, the item on view\'s, and voices that arrive late still show its read buttons', async () => {
    await bank.load();
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage, ancient').words, bank });
    const html = V.buildVocabPacket({ lesson: V.lessonFromVocab({ loader: TH, rows, types: ['meaning', 'word'], mode: 'practice' }), loader: TH, rows, bank }).html;
    let voices = [];
    const added = [];
    const synth = { getVoices: () => voices, cancel() {}, speak(u) { setTimeout(() => { if (u.onend) u.onend(); }, 2); }, addEventListener(type) { added.push(type); }, onvoiceschanged: null };
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/v.html', beforeParse(w) {
      w.Audio = class { play() { const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 2); return Promise.resolve(); } pause() {} };
      w.speechSynthesis = synth; w.SpeechSynthesisUtterance = function (text) { this.text = text; };
    } });
    opened.push(dom.window);
    const d = dom.window.document;
    const seen = (n) => !!n && !n.closest('[hidden]');
    d.getElementById('learner-name').value = 'Fox1';
    [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start').click();
    for (let n = 0; n < 4; n++) {
      for (let k = 1; k <= 4 && !seen(d.querySelector('[data-next]')); k++) { const b = d.querySelector('[data-choice="' + k + '"]'); if (b && b.getAttribute('aria-disabled') !== 'true') b.click(); await wait(1); }
      d.querySelector('[data-next]').click(); await wait(1);
    }
    expect(added, 'no listener added for each item').toEqual([]);
    expect(typeof synth.onvoiceschanged).toBe('function');
    // No voice yet: no Read aloud. The voices arrive: this item's Read aloud shows.
    const read = d.querySelector('[data-read-aloud="question"]');
    expect(seen(read)).toBe(false);
    voices = [{ lang: 'en-US', localService: true, name: 'On device' }];
    synth.onvoiceschanged();
    expect(seen(read)).toBe(true);
  });
});

describe('storage refused or full: the file keeps working and says so', () => {
  it('storage turned off: the start screen and every item say so; the finish screen says it once', async () => {
    const html = await wsFile(['counting']);
    const f = open(html, { storage: 'blocked' });
    expect(f.off()).toEqual([OFF]);
    expect(f.q('[data-store-off]').getAttribute('role')).toBe('status');
    f.start();
    await wait(1);
    expect(f.d.querySelector('#app h2').textContent).toContain('1 of 10');
    expect(f.off()).toEqual([OFF]);
    for (let n = 0; n < 10; n++) await f.answer();
    expect(f.d.querySelector('#app h2').textContent).toBe(TH.DEFAULT_LABELS.done_title);
    expect(f.off(), 'not twice on the finish screen').toEqual([]);
    expect([...f.d.querySelectorAll('#app [role=status]')].map((n) => n.textContent)).toContain(OFF);
    expect(f.q('[data-save-csv]')).toBeTruthy();
  });

  it('a full device: nothing said before Start; said from the first item on, and the work goes on', async () => {
    const html = await wsFile(['counting']);
    const f = open(html, { storage: 'full' });
    expect(f.off()).toEqual([]);
    f.start();
    await wait(1);
    expect(f.off()).toEqual([OFF]);
    await f.answer();
    expect(f.d.querySelector('#app h2').textContent).toContain('2 of 10');
    expect(f.off()).toEqual([OFF]);
  });

  it('storage that works: nothing is said', async () => {
    const html = await wsFile(['counting']);
    const f = open(html);
    expect(f.off()).toEqual([]);
    f.start(); await wait(1); await f.answer();
    expect(f.off()).toEqual([]);
  });

  it('damaged saved data is not a refusal: the file starts afresh, says nothing, and saves over it', async () => {
    const html = await wsFile(['counting']);
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    const key = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    const f = open(html, { storage: { [key]: '{"index":3,"items":[' } });
    expect(f.off()).toEqual([]);
    expect(f.button(TH.DEFAULT_LABELS.continue)).toBeUndefined();
    f.start(); await wait(1);
    expect(f.off()).toEqual([]);
    expect(JSON.parse(f.w.localStorage.getItem(key)).name).toBe('Fox1');
  });
});

// ---------------------------------------------------------------------------
// 3. The open page (packets-open.js): a damaged file is called damaged, before it runs. A browser refuses a script
//    its rule does not name, so such a file showed only its note for previews, which sends the student to this page.
// ---------------------------------------------------------------------------
describe('the open page and a damaged file', () => {
  const { readFileSync } = require('node:fs');
  const { webcrypto, createHash } = require('node:crypto');
  const { TextDecoder, TextEncoder } = require('node:util');
  const DAMAGED = 'This file is damaged, so it cannot run. Ask your teacher to send it again.';
  async function choose(text) {
    const dom = new JSDOM(readFileSync('packets-open.html', 'utf8'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-open.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'crypto', { configurable: true, value: webcrypto });
    for (const src of ['packets-page.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets-open.js']) w.eval(readFileSync(src, 'utf8'));
    const input = d.getElementById('file');
    Object.defineProperty(input, 'files', { configurable: true, value: [new w.File([text], 'file.html', { type: 'text/html' })] });
    input.dispatchEvent(new w.Event('change', { bubbles: true }));
    for (let i = 0; i < 200 && d.getElementById('found').hidden && d.getElementById('problem').hidden; i++) await wait(10);
    return { found: !d.getElementById('found').hidden, problem: d.getElementById('problem').hidden ? '' : d.getElementById('problem-line').textContent };
  }
  it('an intact file opens, and so does the same file with Windows line ends', async () => {
    const html = await wsFile(['counting']);
    expect(await choose(html)).toEqual({ found: true, problem: '' });
    expect(await choose(html.replace(/\n/g, '\r\n'))).toEqual({ found: true, problem: '' });
    // A byte-order mark, and a byte that is not UTF-8 in the title (the script itself is whole): it opens.
    expect(await choose(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(html)]))).toEqual({ found: true, problem: '' });
    const at = html.indexOf('<title>') + 7;
    expect(await choose(Buffer.concat([Buffer.from(html.slice(0, at)), Buffer.from([0xFF]), Buffer.from(html.slice(at))]))).toEqual({ found: true, problem: '' });
  });
  it('a download cut short, or one byte of the script changed: damaged, and nothing to start', async () => {
    const html = await wsFile(['counting']);
    for (const bad of [html.slice(0, Math.floor(html.length / 2)), html.slice(0, html.length - 300), html.replace('function takeHomeShell(', 'function takeHomeShelX(')]) {
      expect(await choose(bad)).toEqual({ found: false, problem: DAMAGED });
    }
  });
  it('a script its rule names (re-hashed) runs as before; a rule with no hash is not judged', async () => {
    const html = (await wsFile(['counting'])).replace('function takeHomeShell(', 'function takeHomeShelX(');
    const at = html.indexOf('<script>') + 8;
    const sealed = html.replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'sha256-" + createHash('sha256').update(html.slice(at, html.indexOf('</script>', at)), 'utf8').digest('base64') + "'");
    expect(await choose(sealed)).toEqual({ found: true, problem: '' });
    expect(await choose(html.replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'unsafe-inline'"))).toEqual({ found: true, problem: '' });
  });
  it('another page is still "not a practice file"', async () => {
    expect((await choose('<!doctype html><title>x</title><p>Hello</p>')).problem).toBe('This is not a practice file or a check. Choose the .html file your teacher sent.');
  });
});

describe('the time on the items in the results (activeMs, active_s=)', () => {
  const saved = (f, selector) => new Promise((resolve) => {
    f.w.URL.createObjectURL = (blob) => { const r = new f.w.FileReader(); r.onload = () => resolve(r.result); r.readAsText(blob); return 'blob:x'; };
    f.w.URL.revokeObjectURL = () => {};
    f.d.querySelector(selector).click();
  });
  it('a finished file: activeMs is its items\' ms added up, and "#summary" ends with active_s=, after the title', async () => {
    const html = await wsFile(['counting']);
    const f = open(html);
    f.start(); await wait(1);
    for (let n = 0; n < 10; n++) { await wait(15); await f.answer(); }
    const json = JSON.parse(await saved(f, '[data-save-json]'));
    const sum = json.items.reduce((n, it) => n + it.ms, 0);
    expect(sum).toBeGreaterThan(0);
    expect(json.activeMs).toBe(sum);
    expect(json.durationMs).toBeGreaterThanOrEqual(0);
    const csv = await saved(f, '[data-save-csv]');
    const row = csv.split('\r\n').find((l) => l.startsWith('"#summary"'));
    expect(row.endsWith('","title=Ten words","active_s=' + Math.round(sum / 1000) + '"')).toBe(true);
    expect(row).toContain('"accuracy_pct=');
    // The teacher's side keeps it.
    expect(TH.parseResult(JSON.stringify(json)).result.activeMs).toBe(sum);
  });
  it('a results file saved before has no active_s= cell and no activeMs, as before', () => {
    const older = { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 's-1', packet: { id: 'p', version: '1', form: '', mode: 'practice' }, lessonId: 'p', revision: '1', lessonTitle: 'Short a',
      learner: 'A', items: [{ n: 1, itemId: 'i1', activity: 'isolation', word: 'cat', target: 'k', responses: ['k'], attempts: 1, firstTry: true, correct: true, done: true, ms: 1200, supports: {} }], durationMs: 5000 };
    const row = TH.resultsCsv(older).text({ method: 'fnv1a', value: 'x' }).split('\r\n').find((l) => l.startsWith('"#summary"'));
    expect(row).toBe('"#summary","s-1","items_given=1","attempted=1","correct=1","first_try=1","accuracy_pct=100","title=Short a"');
    expect('activeMs' in TH.parseResult(JSON.stringify(older)).result).toBe(false);
    // The value is not covered by the integrity value (a trailer row), so adding it changes nothing there.
    expect(TH.resultsCsv({ ...older, activeMs: 1200 }).basis).toBe(TH.resultsCsv(older).basis);
  });
});

describe('a check under forced colors (Windows contrast themes)', () => {
  it('draws its time bar in the system highlight color, as the progress bar is, and a practice file carries no such rule', async () => {
    const PC = require('../packet_check_builder.js');
    const check = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('7+8,12-5'), timeLimitS: 60 }), loader: TH }).html;
    expect(check).toContain('@media (forced-colors:active){.timebar{border:1px solid CanvasText}.timebar span{forced-color-adjust:none;background:Highlight}}');
    expect(await wsFile(['counting'])).not.toContain('.timebar');
  });
});
