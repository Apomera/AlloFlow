import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto, createHash } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM, VirtualConsole } from 'jsdom';

// "Open a practice file" (packets-open.html, packets-open.js, packets-open.css, packets_handoff.js), 2026-11-12: a
// practice file or a check run on a phone or a tablet. Part 1 reads the page as text, by the rules
// tests/packets_site_pages.test.js applies to the other pages. Part 2 runs it in jsdom with real built files: what it
// says about a file, the sandboxed frame it runs the file in, the place it keeps for the file (and refuses to give to
// another file), the results file it saves for it, and "Change this file". The file's side of the place and the
// results is in tests/packets_open_bridge.test.js; a real Chromium and WebKit pass is described in the report of
// 2026-11-12 (C:\tmp\packets_build_1111\open_page).
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const PAGE = 'packets-open.html';
const SCRIPT = 'packets-open.js';
const SCRIPTS = ['packets-page.js', 'packets_verify_core.js', 'packets_handoff.js', SCRIPT];
const RULE = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src data: blob:; "
  + "frame-src blob:; form-action 'none'; base-uri 'none'; connect-src https://script.google.com https://script.googleusercontent.com";
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const NAME = 'AlloFlow Packets';
const parse = (file) => new JSDOM(read(file)).window.document;
// The code without its comments (the comments say what the code does, in plain words, and may name what it never does).
const code = (file) => read(file).split(/\r?\n/).filter((line) => !/^\s*\/\//.test(line)).join(' ');

// Files made with the real loader and builders.
const g = { crypto: webcrypto }; g.window = g;
new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
const TH = g.AlloWordSoundsTakeHome;
const PC = require('../packet_check_builder.js');
const MP = require('../packet_math_practice_builder.js');
const V = require('../packet_vocab_builder.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');
const core = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = { isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') }, phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') } };
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } }, activityItems: { isolation: { position, correctSound: correct, options } } });
const WORDS_FILE = TH.buildHtml(TH.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])], { core, banks: BANKS, title: 'Short a', lessonId: 'L-open-page' }).lesson, { core });
const CHECK_FILE = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts to 20', problems: PC.parseProblems('7+8,12-5,3+4'), timeLimitS: 60 }), loader: TH }).html;
const MATH_FILE = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'mul-7' }), loader: TH }).html;
await bank.load();
const vocabRows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell').words, bank });
const VOCAB_FILE = V.buildVocabPacket({ lesson: V.lessonFromVocab({ loader: TH, rows: vocabRows, types: ['meaning'], mode: 'practice' }), loader: TH, rows: vocabRows, bank }).html;
// A file made before the place could be kept on this page: the same file without the code that reads the data block.
// 2026-11-13: its rule names its script's hash, as a file made then does (the page calls a file whose script its rule
// does not name damaged: tests/packets_robustness_2026_11_13.test.js).
const reseal = (html) => { const at = html.indexOf('<script>') + 8; const s = html.slice(at, html.indexOf('</script>', at)); return html.replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'sha256-" + createHash('sha256').update(s, 'utf8').digest('base64') + "'"); };
const OLDER_FILE = reseal(WORDS_FILE.split("getElementById('packet-store-snapshot')").join("getElementById('x')"));
const KEY = 'alloflow-take-home:L-open-page:' + JSON.parse(/var lesson=(.*);\nvar labels=/.exec(WORDS_FILE)[1]).revision;
const sha = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

// ---------------------------------------------------------------------------
// 1. The page as a file
// ---------------------------------------------------------------------------
describe('the page as a file', () => {
  const doc = parse(PAGE);
  it('carries its rule before anything is loaded, loads only its own files, and has no inline code', () => {
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(meta.getAttribute('content')).toBe(RULE);
    const head = [...doc.head.children];
    expect(head.slice(0, head.indexOf(meta)).every((node) => node.tagName === 'META')).toBe(true);
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(SCRIPTS);
    expect([...doc.querySelectorAll('script')].every((s) => s.defer && !s.textContent.trim())).toBe(true);
    expect([...doc.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.getAttribute('href'))).toEqual(['packets.css', 'packets-open.css']);
    expect(doc.querySelectorAll('style, [style]')).toHaveLength(0);
    for (const node of doc.querySelectorAll('*')) for (const a of node.attributes) expect(/^on/i.test(a.name), node.tagName + ' ' + a.name).toBe(false);
    // The two addresses are the class mailbox's, in the rule only; the page's own code fetches nothing.
    expect((read(PAGE).match(/https?:\/\/[^\s"';]+/g) || [])).toEqual(['https://script.google.com', 'https://script.googleusercontent.com']);
    for (const file of [SCRIPT, 'packets_handoff.js', 'packets-open.css']) expect(read(file), file).not.toMatch(/https?:\/\/|\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|document\.write|\beval\s*\(|new Function|\.cookie\b/);
    // The frame: scripts and downloads, never the site's origin.
    expect(read(SCRIPT)).toContain("frame.setAttribute('sandbox', 'allow-scripts allow-downloads');");
    expect(code(SCRIPT) + read(PAGE).replace(/<!--[\s\S]*?-->/g, '')).not.toContain('allow-same-origin');
    expect(read(SCRIPT)).not.toMatch(/allow-(?:popups|top-navigation|forms|modals)/);
  });

  it('has one h1, headings in order, a name for every control, landmarks, and the product name once', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('h1').textContent).toBe('Open a practice file');
    expect(read(PAGE).split(NAME).length - 1).toBe(1);
    expect(doc.getElementById('product-name').textContent).toBe(NAME);
    const levels = [...doc.querySelectorAll('h1, h2, h3')].map((n) => Number(n.tagName[1]));
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    for (const node of doc.querySelectorAll('input, button')) {
      const named = node.getAttribute('aria-label') || node.textContent.trim();
      expect(!!named, node.outerHTML.slice(0, 80)).toBe(true);
      if (node.tagName === 'BUTTON') expect(node.getAttribute('type')).toBe('button');
    }
    for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
      for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), id).toBeTruthy();
    }
    expect(doc.getElementById('file').getAttribute('accept')).toBe('.html,.htm,text/html');
    expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
    expect(doc.querySelector('header') && doc.querySelector('main#main') && doc.querySelector('footer')).toBeTruthy();
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable|maximum-scale/);
    expect(new Set([...doc.querySelectorAll('[id]')].map((n) => n.id)).size).toBe(doc.querySelectorAll('[id]').length);
    expect([...doc.querySelectorAll('link[rel="icon"]')].map((l) => l.getAttribute('href'))).toEqual(['packets-mark.svg']);
    // The running file: a dialog with a name and a Close button.
    const run = doc.getElementById('run');
    expect([run.getAttribute('role'), run.getAttribute('aria-modal'), run.hidden]).toEqual(['dialog', 'true', true]);
    expect(doc.getElementById('run-close').textContent).toBe('Close');
    expect(doc.getElementById('run-said').getAttribute('role')).toBe('status');
  });

  it('speaks plainly: American spelling, "student" and "check", AI only to say there is none, and only what is true', () => {
    for (const file of [PAGE, SCRIPT, 'packets-open.css', 'packets_handoff.js']) expect(BRITISH.exec(read(file)), file).toBeNull();
    const visible = doc.body.textContent + ' ' + doc.title + ' ' + doc.querySelector('meta[name="description"]').getAttribute('content');
    const said = [...code(SCRIPT).matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((m) => m[1]).join(' ');
    for (const text of [visible, said]) expect(text).not.toMatch(/\blearners?\b|\btests?\b|\bquiz|\bassessment|\bexam\b|\bsecure\b|\bsafe\b|\bencrypt/i);
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((s) => /\bAI\b/.test(s));
    // The one sentence, in the line under the header (it follows the product name in the text of the page).
    expect(sentences(visible).map((s) => s.replace(/^.*?(?=This page)/, ''))).toEqual(['This page runs without AI.']);
    for (const line of read(SCRIPT).split('\n')) if (/\bAI\b/.test(line)) expect(line.trim().startsWith('//')).toBe(true);
    // The list of files it loads is the list of files it loads.
    const loads = [...doc.querySelectorAll('details.proof li')].find((li) => li.textContent.startsWith('This page loads')).textContent;
    expect(loads).toContain('eight files');
    for (const file of [...SCRIPTS, 'packets.css', 'packets-open.css']) expect(loads, file).toContain(file);
  });
});

// ---------------------------------------------------------------------------
// 2. The page, run in jsdom
// ---------------------------------------------------------------------------
// IndexedDB, as small as the handoff needs: stores with a key path, values kept as they are (an ArrayBuffer too).
function tinyIndexedDB() {
  const dbs = new Map();
  return {
    dbs,
    open(name) {
      const request = {};
      queueMicrotask(() => {
        let fresh = false;
        if (!dbs.has(name)) { dbs.set(name, new Map()); fresh = true; }
        const stores = dbs.get(name);
        const db = {
          objectStoreNames: { contains: (s) => stores.has(s) },
          createObjectStore(s, o) { stores.set(s, { keyPath: o.keyPath, rows: new Map() }); },
          close() {},
          transaction(s) {
            const store = stores.get(s), tx = {};
            let pending = 0;
            const done = () => queueMicrotask(() => { if (!pending && tx.oncomplete) tx.oncomplete(); });
            const ask = (run) => { const r = {}; pending++; queueMicrotask(() => { r.result = run(); if (r.onsuccess) r.onsuccess(); pending--; done(); }); return r; };
            tx.objectStore = () => ({ put: (v) => ask(() => { store.rows.set(v[store.keyPath], v); }), get: (k) => ask(() => store.rows.get(k)), delete: (k) => ask(() => { store.rows.delete(k); }) });
            return tx;
          },
        };
        request.result = db;
        if (fresh && request.onupgradeneeded) request.onupgradeneeded();
        request.onsuccess();
      });
      return request;
    },
  };
}

const opened = [];
afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) {} }));
const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
async function openPage({ storage = null, activation = null, idb = true } = {}) {
  const saved = [], said = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => said.push(String(error.message)));
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-open.html', virtualConsole });
  const w = dom.window, d = w.document;
  opened.push(w);
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  Object.defineProperty(w, 'crypto', { configurable: true, value: webcrypto });
  if (idb) Object.defineProperty(w, 'indexedDB', { configurable: true, value: tinyIndexedDB() });
  if (activation) Object.defineProperty(w.navigator, 'userActivation', { configurable: true, value: activation });
  w.URL.createObjectURL = (blob) => { saved.push({ blob }); return 'blob:file-' + saved.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
  if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  for (const src of SCRIPTS) w.eval(read(src));
  const $ = (id) => d.getElementById(id);
  const page = {
    w, d, $, saved, said,
    choose: async (text, name = 'file.html') => {
      const input = $('file');
      Object.defineProperty(input, 'files', { configurable: true, value: [new w.File([text], name, { type: 'text/html' })] });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 100 && $('found').hidden && $('problem').hidden; i++) await wait(10);
    },
    frame: () => d.querySelector('#run-host iframe'),
    // A message from the running file (or from somewhere else).
    post: (data, { source, origin = 'null' } = {}) => w.dispatchEvent(new w.MessageEvent('message', { data, origin, source: source === undefined ? page.frame().contentWindow : source })),
    kept: () => Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)])),
  };
  return page;
}
const snapshotOf = (srcdoc) => {
  const m = /<script type="application\/json" id="packet-store-snapshot">(.*?)<\/script><\/head>/.exec(srcdoc);
  return m ? JSON.parse(m[1]) : null;
};

describe('choosing a file', () => {
  it('says what each kind of file is, in plain words, and offers Start', async () => {
    const cases = [
      [WORDS_FILE, 'Word Sounds practice', 'Short a', '2 questions.'],
      [CHECK_FILE, 'A check', 'Facts to 20', '3 questions.'],
      [MATH_FILE, 'Math fact practice', null, null],
      [VOCAB_FILE, 'Vocabulary practice', null, '4 questions.'],
    ];
    for (const [html, kind, title, line] of cases) {
      const p = await openPage();
      await p.choose(html);
      expect(p.$('found').hidden, kind).toBe(false);
      expect(p.$('found-kind').textContent).toBe(kind);
      if (title) expect(p.$('found-title').textContent).toBe(title);
      if (line) expect(p.$('found-line').textContent).toBe(line);
      expect(p.$('older-note').hidden).toBe(true);
      expect(p.$('drop').hidden).toBe(true);
      expect(p.d.activeElement).toBe(p.$('found'));
    }
    // A file made for one student says so.
    const made = WORDS_FILE.replace('"kind":"alloflow-packet-manifest",', '"kind":"alloflow-packet-manifest","learner":"BlueHeron7",');
    const p = await openPage();
    await p.choose(made);
    expect(p.$('found-line').textContent).toBe('2 questions. Made for BlueHeron7.');
  });

  it('a results file, another page, an empty file: a plain message, and nothing to start', async () => {
    const p = await openPage();
    await p.choose('\uFEFF"format","session_id"\r\n"alloflow-packet-result/1","S-1"\r\n', 'results.csv');
    expect(p.$('problem-line').textContent).toBe('This is a results file, not a practice file. A teacher adds it up on Add up results.');
    expect(p.$('problem-link').getAttribute('href')).toBe('packets-results.html');
    expect(p.$('found').hidden).toBe(true);
    expect(p.d.activeElement).toBe(p.$('problem'));
    const other = await openPage();
    await other.choose('<!doctype html><html><head><title>x</title></head><body><script>var lesson=1;</script></body></html>');
    expect(other.$('problem-line').textContent).toBe('This is not a practice file or a check. Choose the .html file your teacher sent.');
    expect(other.$('problem-more').hidden).toBe(true);
    const empty = await openPage();
    await empty.choose('');
    expect(empty.$('problem-line').textContent).toBe('This file is empty. Ask your teacher to send it again.');
  });

  it('a file made before this page could keep a place runs, and the page says the place is lost on Close', async () => {
    const p = await openPage();
    await p.choose(OLDER_FILE);
    expect(p.$('older-note').hidden).toBe(false);
    expect(p.$('older-note').textContent).toBe("This file was made before this page could keep a student's place, so the place is lost when you close it. Finish it in one go, or ask your teacher for a new copy.");
    p.$('start').click();
    expect(snapshotOf(p.frame().srcdoc)).toBeNull();
    expect(p.frame().srcdoc).toBe(OLDER_FILE);
  });
});

describe('running the file', () => {
  it('in a sandboxed frame that takes the screen, with the data block in its head; Close puts the page back', async () => {
    const p = await openPage();
    await p.choose(WORDS_FILE);
    p.$('start').click();
    const frame = p.frame();
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-downloads');
    expect(frame.getAttribute('allow')).toBe('autoplay; clipboard-write');
    expect(frame.title).toBe('Short a');
    expect(p.$('run').hidden).toBe(false);
    expect(p.$('run-title').textContent).toBe('Short a');
    expect(p.d.body.classList.contains('is-running')).toBe(true);
    expect(snapshotOf(frame.srcdoc)).toEqual({ kind: 'alloflow-packet-store', items: {} });
    // The file is otherwise the file: the block is the only change, and the file's own rule and script are as they were.
    expect(frame.srcdoc.replace(/<script type="application\/json" id="packet-store-snapshot">.*?<\/script>/, '')).toBe(WORDS_FILE);
    p.$('start').click();
    expect(p.d.querySelectorAll('#run-host iframe')).toHaveLength(1);
    p.$('run-close').click();
    expect(p.frame()).toBeNull();
    expect(p.$('run').hidden).toBe(true);
    expect(p.d.body.classList.contains('is-running')).toBe(false);
    expect(p.d.activeElement).toBe(p.$('start'));
  });

  it('keeps the place the file sends, under its own name, and gives it back to the same file only', async () => {
    const p = await openPage();
    await p.choose(WORDS_FILE);
    p.$('start').click();
    const place = JSON.stringify({ name: 'Ana', index: 1, items: [] });
    p.post({ kind: 'alloflow-packet-store', key: KEY, value: place });
    p.post({ kind: 'alloflow-packet-store', key: KEY + ':blueheron7', value: place });
    expect(p.kept()[KEY]).toBe(place);
    expect(JSON.parse(p.kept()['alloflow-packets-open:owners'])).toEqual({ [KEY]: sha(WORDS_FILE), [KEY + ':blueheron7']: sha(WORDS_FILE) });
    // Refused: another frame, another origin, another name, not JSON, not an object, too large.
    const before = JSON.stringify(p.kept());
    p.post({ kind: 'alloflow-packet-store', key: KEY, value: '{"x":1}' }, { source: p.w });
    p.post({ kind: 'alloflow-packet-store', key: KEY, value: '{"x":1}' }, { origin: 'https://site.test' });
    for (const bad of [{ key: 'alloflow-packets-vocab/1', value: '{}' }, { key: 'alloflow-take-home:other:r1', value: '{}' }, { key: KEY + 'x', value: '{}' },
      { key: KEY, value: 'not json' }, { key: KEY, value: '[1]' }, { key: KEY, value: 7 }, { key: KEY, value: JSON.stringify({ big: 'x'.repeat(600 * 1024) }) }]) {
      p.post({ kind: 'alloflow-packet-store', ...bad });
    }
    p.post('alloflow-packet-store');
    expect(JSON.stringify(p.kept())).toBe(before);
    p.$('run-close').click();
    expect(p.$('place-line').hidden).toBe(false);
    expect(p.$('place-line').textContent).toBe('Your place in this file is kept on this device. Start goes on from there.');
    // Started again: the place is in the data block.
    p.$('start').click();
    expect(snapshotOf(p.frame().srcdoc).items).toEqual({ [KEY]: place, [KEY + ':blueheron7']: place });
    // A removal (Start over) removes it.
    p.post({ kind: 'alloflow-packet-store', key: KEY + ':blueheron7', value: null });
    expect(p.kept()[KEY + ':blueheron7']).toBeUndefined();
    p.$('run-close').click();
    // Another file that says it is this lesson gets nothing, and cannot overwrite the place.
    const impostor = WORDS_FILE.replace('<title>Short a</title>', '<title>Short a!</title>');
    const q = await openPage({ storage: p.kept() });
    await q.choose(impostor);
    expect(q.$('place-line').hidden).toBe(true);
    q.$('start').click();
    expect(snapshotOf(q.frame().srcdoc).items).toEqual({});
    q.post({ kind: 'alloflow-packet-store', key: KEY, value: '{"name":"Eve"}' });
    expect(q.kept()[KEY]).toBe(place);
    // The same file on that device gets it back.
    const same = await openPage({ storage: p.kept() });
    await same.choose(WORDS_FILE);
    expect(same.$('place-line').hidden).toBe(false);
    // Forget the places: all of them go.
    same.$('forget').click();
    expect(Object.keys(same.kept())).toEqual([]);
    expect(same.$('forget-said').textContent).toBe('Done. No places are kept on this device now.');
    expect(same.$('place-line').hidden).toBe(true);
  });

  it('a file keeps at most 12 names', async () => {
    const p = await openPage();
    await p.choose(WORDS_FILE);
    p.$('start').click();
    for (let i = 0; i < 20; i++) p.post({ kind: 'alloflow-packet-store', key: KEY + ':s' + i, value: '{}' });
    expect(Object.keys(p.kept()).filter((k) => k.startsWith(KEY))).toHaveLength(12);
  });

  it('saves the results file the file sends: a plain name, its own type, after a press in the file', async () => {
    const p = await openPage();
    await p.choose(WORDS_FILE);
    p.$('start').click();
    const csv = '\uFEFF"format"\r\n';
    p.post({ kind: 'alloflow-packet-save', name: 'Short-a__Ana__2026-11-12.csv', type: 'text/csv;charset=utf-8', text: csv });
    expect(p.saved.map((s) => [s.name, s.blob.type])).toEqual([['Short-a__Ana__2026-11-12.csv', 'text/csv;charset=utf-8']]);
    expect(Buffer.from(await p.saved[0].blob.arrayBuffer()).toString('utf8')).toBe(csv);
    // 2026-11-13 (engine fixes): the page cannot see a download finish either.
    expect(p.$('run-said').textContent).toBe('Your browser is saving Short-a__Ana__2026-11-12.csv. If nothing appears, press Save it again.');
    expect(p.$('run-again').hidden).toBe(false);
    p.$('run-again').click();
    expect(p.saved).toHaveLength(2);
    // Too soon after the last one, or not a results file: nothing is saved.
    await wait(900);
    for (const bad of [{ name: 'a.html', type: 'text/html', text: 'x' }, { name: '../a.csv', type: 'text/csv;charset=utf-8', text: 'x' }, { name: 'a.csv', type: 'text/html', text: 'x' },
      { name: 'a.json', type: 'application/json', text: 7 }, { name: 'a\nb.csv', type: 'text/csv;charset=utf-8', text: 'x' }, { name: 'a.csv', type: 'text/csv;charset=utf-8', text: 'x' }]) {
      p.post({ kind: 'alloflow-packet-save', ...bad }, bad.name === 'a.csv' && bad.type === 'text/csv;charset=utf-8' ? { origin: 'https://elsewhere.test' } : {});
    }
    expect(p.saved).toHaveLength(2);
    p.post({ kind: 'alloflow-packet-save', name: 'Short-a__Ana__2026-11-12.json', type: 'application/json', text: '{}' });
    expect(p.saved).toHaveLength(3);
    // With no press in the file (the browser says so), the page waits for Save it again.
    const q = await openPage({ activation: { isActive: false } });
    await q.choose(WORDS_FILE);
    q.$('start').click();
    q.post({ kind: 'alloflow-packet-save', name: 'Short-a__Ana__2026-11-12.csv', type: 'text/csv;charset=utf-8', text: csv });
    expect(q.saved).toHaveLength(0);
    expect(q.$('run-said').textContent).toBe('Press Save it again to save Short-a__Ana__2026-11-12.csv.');
    q.$('run-again').click();
    expect(q.saved.map((s) => s.name)).toEqual(['Short-a__Ana__2026-11-12.csv']);
  });
});

describe('Change this file', () => {
  it('hands a Word Sounds or vocabulary file to its maker in this tab; the maker takes it once', async () => {
    for (const [html, href] of [[WORDS_FILE, 'packets-make.html'], [VOCAB_FILE, 'packets-vocab.html']]) {
      const p = await openPage();
      await p.choose(html, 'mine.html');
      p.$('change').click();
      // jsdom does not leave the page: it says it would have.
      for (let i = 0; i < 50 && !p.said.some((m) => /navigation/.test(m)); i++) await wait(10);
      expect(p.said.some((m) => /navigation/.test(m))).toBe(true);
      expect(p.$('change-link').getAttribute('href')).toBe(href);
      const back = await p.w.AlloPacketHandoff.take();
      expect(back.name).toBe('mine.html');
      expect(new TextDecoder().decode(back.bytes)).toBe(html);
      expect(await p.w.AlloPacketHandoff.take()).toBeNull();
    }
  });

  it('a check or math fact practice: the maker cannot open a saved file yet, and the page says so with a link', async () => {
    for (const [html, line, href] of [[CHECK_FILE, 'Make a math check cannot open a saved file yet. To change this one, make it again there.', 'packets-check.html'],
      [MATH_FILE, 'Make math fact practice cannot open a saved file yet. To change this one, make it again there.', 'packets-math-practice.html']]) {
      const p = await openPage();
      await p.choose(html);
      p.$('change').click();
      expect(p.$('change-line').textContent).toBe(line);
      expect(p.$('change-link').getAttribute('href')).toBe(href);
      expect(p.d.activeElement).toBe(p.$('change-note'));
    }
  });

  it('a browser with no IndexedDB: the page says how to do it by hand', async () => {
    const p = await openPage({ idb: false });
    await p.choose(WORDS_FILE);
    p.$('change').click();
    for (let i = 0; i < 50 && p.$('change-note').hidden; i++) await wait(10);
    expect(p.$('change-line').textContent).toBe('This browser could not hand the file over. Open Make Word Sounds practice, then press Open a file I made there and choose this file.');
  });

  it('a waiting file older than ten minutes is not given', async () => {
    const H = require('../packets_handoff.js');
    expect(H.LIFETIME_MS).toBe(10 * 60 * 1000);
    expect(H.HASH).toBe('#open-file');
    const p = await openPage();
    await p.w.AlloPacketHandoff.put({ name: 'a.html', bytes: new TextEncoder().encode('x').buffer });
    const realNow = p.w.Date.now;
    p.w.Date.now = () => realNow() + 11 * 60 * 1000;
    expect(await p.w.AlloPacketHandoff.take()).toBeNull();
    p.w.Date.now = realNow;
  });
});

describe('where people are pointed to it', () => {
  it('the four makers say it after saving, and the front door says it twice, briefly', () => {
    const LINE = 'On a phone or tablet, a student opens the file on Open a practice file: apomera.github.io/AlloFlow/packets-open.html.';
    for (const file of ['packets-make.html', 'packets-check.html', 'packets-vocab.html', 'packets-math-practice.html']) {
      const after = parse(file).getElementById('after-save');
      const p = after.querySelector('p.after-phone');
      expect(p.textContent, file).toBe(LINE);
      expect(p.querySelector('a').getAttribute('href')).toBe('packets-open.html');
      expect(p.previousElementSibling.tagName).toBe('OL');
    }
    const door = parse('packets.html');
    expect([...door.querySelectorAll('a[href="packets-open.html"]')].map((a) => a.textContent)).toEqual(['Open a practice file']);
    expect(door.getElementById('what').textContent).toContain('On a phone or tablet, the student opens it on Open a practice file.');
    // The makers that can open a file again take the handed file.
    for (const file of ['packets-make.html', 'packets-vocab.html']) expect([...parse(file).querySelectorAll('script')].map((s) => s.getAttribute('src')), file).toContain('packets_handoff.js');
    expect(read('packets-make.js')).toContain('window.location.hash === handoff.HASH');
    expect(read('packets-vocab.js')).toContain('window.location.hash !== handoff.HASH');
  });
});
