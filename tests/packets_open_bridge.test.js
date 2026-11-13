// @vitest-environment jsdom
// The file's side of "Open a practice file" (packets-open.html), 2026-11-12, run on REAL built files in jsdom.
// On that page a file runs in a sandboxed frame that has no storage. The page puts the file's kept place in a data
// block (#packet-store-snapshot); the player (takeHomeShell, linked()) reads it, sends each change to the page and
// hands the results file to the page to save. It does so ONLY when the storage refuses, in a frame, with that block
// there. A file opened any other way does what it did before: these tests also show that.
// Also here: the line for phones and tablets in the note a preview shows when it does not run the file.
import { afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
const SOURCE = readFileSync('word_sounds_take_home_loader.js', 'utf8');
new Function(SOURCE)();
const TH = window.AlloWordSoundsTakeHome;
const verify = require('../packets_verify_core.js');
const PC = require('../packet_check_builder.js');

const wav = (tag) => { const b = Buffer.alloc(64); b.write('RIFF'); b.write('WAVE', 8); b.write(String(tag).slice(0, 8), 44); return b.toString('base64'); };
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};
const word = (w, position, correct, options) => ({ word: w, targetWord: w, term: w, _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
  activityItems: { isolation: { position, correctSound: correct, options } } });
const build = (labels) => TH.buildHtml(TH.lessonFromPack([word('cat', 0, 'k', ['k', 'a', 't', 'm']), word('map', 2, 'p', ['m', 'a', 'p', 's'])],
  { core, banks: BANKS, title: 'Short a', lessonId: 'L-open-bridge' }).lesson, { core, labels });
const FILE = build();
const KEY = 'alloflow-take-home:' + JSON.parse(/var lesson=(.*);\nvar labels=/.exec(FILE)[1]).lessonId + ':' + JSON.parse(/var lesson=(.*);\nvar labels=/.exec(FILE)[1]).revision;
// What the page does before the file starts (packets-open.js, withSnapshot), written out here.
const withSnapshot = (html, items, kind = 'alloflow-packet-store') => html.replace('</head>', '<script type="application/json" id="packet-store-snapshot">'
  + JSON.stringify({ kind, items }).replace(/</g, '\\u003c') + '</script></head>');

const opened = [];
afterAll(() => opened.forEach((w) => { try { w.close(); } catch (_) {} }));
// framed: window.parent is another window (the page); refuse: the storage throws, as in a sandboxed frame.
function open(html, { framed = false, refuse = false, storage = null } = {}) {
  const posts = [], clicks = [], blobs = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://take-home.test/', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { clicks.push(this.getAttribute('download')); };
    if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
    if (refuse) Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('The document is sandboxed.', 'SecurityError'); } });
    if (framed) Object.defineProperty(w, 'parent', { configurable: true, value: { postMessage: (message, origin) => posts.push({ message: JSON.parse(JSON.stringify(message)), origin }) } });
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const button = (text) => [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent === text);
  const key = (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  return { w, d, posts, clicks, blobs, button, key, app: () => d.getElementById('app').textContent };
}
// Name, Start, the first item right (its number key), Next.
function playOne(t) {
  t.d.getElementById('learner-name').value = 'Ana';
  t.button('Start').click();
  t.key('1');
  t.button('Next').click();
}

describe('a file opened any other way does what it did before', () => {
  it('on its own (not in a frame): the storage keeps the place, nothing is sent to a parent, the browser downloads the file', () => {
    const t = open(withSnapshot(FILE, { [KEY]: '{"items":[]}' }));
    playOne(t);
    expect(t.posts).toEqual([]);
    expect(JSON.parse(t.w.localStorage.getItem(KEY))).toMatchObject({ name: 'Ana', index: 1 });
    t.key('3');
    t.button('See my results').click();
    t.d.querySelector('[data-save-csv]').click();
    expect(t.clicks).toEqual([expect.stringMatching(/^Short-a__Ana__\d{4}-\d\d-\d\d\.csv$/)]);
    expect(t.posts).toEqual([]);
  });

  it('in a frame with working storage (a frame the file is allowed to keep things in): the same', () => {
    const t = open(withSnapshot(FILE, {}), { framed: true });
    playOne(t);
    expect(t.posts).toEqual([]);
    expect(t.w.localStorage.getItem(KEY)).toBeTruthy();
  });

  it('storage refused in a frame with no data block (the preview of Try it, an older page): no place kept, nothing sent, the browser downloads', () => {
    const t = open(FILE, { framed: true, refuse: true });
    playOne(t);
    t.key('3');
    t.button('See my results').click();
    expect(t.app()).toContain(TH.DEFAULT_LABELS.saved_device_off);
    t.d.querySelector('[data-save-csv]').click();
    expect(t.clicks).toHaveLength(1);
    expect(t.posts).toEqual([]);
  });

  it('storage refused with a data block but not in a frame, or with a block of another kind: not used', () => {
    for (const html of [withSnapshot(FILE, {})]) {
      const t = open(html, { refuse: true });
      playOne(t);
      expect(t.posts).toEqual([]);
    }
    const other = open(withSnapshot(FILE, {}, 'something-else'), { framed: true, refuse: true });
    playOne(other);
    expect(other.posts).toEqual([]);
  });
});

describe('on Open a practice file: the place and the results go through the page', () => {
  it('each change of place is sent to the page under the file\'s own name; the place comes back from the data block', () => {
    const t = open(withSnapshot(FILE, {}), { framed: true, refuse: true });
    playOne(t);
    expect(t.posts.length).toBeGreaterThan(0);
    for (const post of t.posts) {
      expect(post.origin).toBe('*');
      expect(Object.keys(post.message).sort()).toEqual(['key', 'kind', 'value']);
      expect(post.message.kind).toBe('alloflow-packet-store');
      expect(post.message.key).toBe(KEY);
    }
    const last = t.posts[t.posts.length - 1].message.value;
    expect(JSON.parse(last)).toMatchObject({ name: 'Ana', index: 1 });
    // Opened again with what the page kept: Continue where I left off, at item 2.
    const again = open(withSnapshot(FILE, { [KEY]: last }), { framed: true, refuse: true });
    expect(again.button(TH.DEFAULT_LABELS.continue)).toBeTruthy();
    again.button(TH.DEFAULT_LABELS.continue).click();
    expect(again.app()).toContain('2 of 2');
    // A kept place under another name (another student's code name) is not this file's place.
    const someoneElse = open(withSnapshot(FILE, { [KEY + ':bo']: last }), { framed: true, refuse: true });
    expect(someoneElse.button(TH.DEFAULT_LABELS.continue)).toBeFalsy();
  });

  it('Start over sends a removal; the results file goes to the page to save, not to a download in the frame', () => {
    const t = open(withSnapshot(FILE, {}), { framed: true, refuse: true });
    playOne(t);
    t.key('3');
    t.button('See my results').click();
    t.d.querySelector('[data-save-csv]').click();
    const saves = t.posts.filter((p) => p.message.kind === 'alloflow-packet-save').map((p) => p.message);
    expect(saves).toHaveLength(1);
    expect(saves[0].name).toMatch(/^Short-a__Ana__\d{4}-\d\d-\d\d\.csv$/);
    expect(saves[0].type).toBe('text/csv;charset=utf-8');
    expect(saves[0].text.slice(0, 9)).toBe(String.fromCharCode(0xFEFF) + '"format"');
    expect(t.clicks).toEqual([]);
    expect(t.blobs).toEqual([]);
    expect(t.app()).toContain(saves[0].name);
    // The place now says the file was saved, as it would on a device.
    const stores = t.posts.filter((p) => p.message.kind === 'alloflow-packet-store');
    expect(JSON.parse(stores[stores.length - 1].message.value).savedFile).toBe(saves[0].name);
    t.d.querySelector('[data-save-json]').click();
    const json = t.posts.filter((p) => p.message.kind === 'alloflow-packet-save').pop().message;
    expect([json.type, JSON.parse(json.text).kind]).toEqual(['application/json', 'alloflow-take-home-result']);
  });

  it('a check keeps its place the same way', () => {
    const html = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Facts', problems: PC.parseProblems('2+2,3+3'), timeLimitS: null }), loader: TH }).html;
    const t = open(withSnapshot(html, {}), { framed: true, refuse: true });
    t.d.getElementById('learner-name').value = 'Ana';
    const next = [...t.d.querySelectorAll('#app button')].find((b) => b.textContent === 'Next' && !b.closest('[hidden]'));
    if (next) next.click();
    const start = [...t.d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start' && !b.closest('[hidden]'));
    start.click();
    expect(t.posts.some((p) => p.message.kind === 'alloflow-packet-store' && /^alloflow-take-home:/.test(p.message.key))).toBe(true);
  });
});

describe('the code that does it', () => {
  it('is small, uses the storage only under the one name, and the file still reads as closed on Look inside a file', () => {
    const shell = SOURCE.slice(SOURCE.indexOf('  function takeHomeShell('), SOURCE.indexOf('  function takeHomeShell(') + 40000);
    expect(shell.match(/localStorage\.\w+\(([^,)]*)/g)).toEqual(['localStorage.setItem(storageKey', 'localStorage.removeItem(storageKey', 'localStorage.getItem(storageKey']);
    expect(shell.match(/postMessage\(/g)).toHaveLength(1);
    expect(shell).toContain("win.parent !== win && JSON.parse(doc.getElementById('packet-store-snapshot').textContent)");
    const report = verify.verifyPacket(FILE);
    expect(report.result).toBe('closed');
    expect(verify.readParts(withSnapshot(FILE, { [KEY]: '{}' })).ok).toBe(true);
  });
});

describe('the note a preview shows when it does not run the file', () => {
  it('in a file in English, a second line says where a phone or tablet runs it; the player replaces both', () => {
    const line = 'Phone or tablet? Open this file at apomera.github.io/AlloFlow/packets-open.html';
    expect(FILE).toContain('<div id="app"><p data-no-script>' + TH.DEFAULT_LABELS.no_script + '</p><p data-no-script data-open-here>' + line + '</p></div>');
    const still = new JSDOM(FILE).window.document;
    expect([...still.querySelectorAll('#app p')].map((p) => p.textContent)).toEqual([TH.DEFAULT_LABELS.no_script, line]);
    const run = open(FILE);
    expect(run.d.querySelector('[data-no-script]')).toBeNull();
    // Another language has no such line unless the maker gives one; '' gives none.
    expect(build({ lang: 'es', no_script: 'Si no empieza.' })).not.toContain('data-open-here');
    expect(build({ open_here: '' })).not.toContain('data-open-here');
    expect(build({ lang: 'es', open_here: 'Teléfono o tableta: apomera.github.io/AlloFlow/packets-open.html' })).toContain('<p data-no-script data-open-here>Teléfono o tableta: apomera.github.io/AlloFlow/packets-open.html</p>');
    // No web address that a scan or the file's own policy would treat as a place to connect to.
    expect(line).not.toMatch(/\/\//);
  });
});
