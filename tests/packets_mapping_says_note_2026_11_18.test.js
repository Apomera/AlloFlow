// @vitest-environment jsdom
// 2026-11-18 (owner: "s sounds like z"): in a practice file's Sound Mapping, each spelling chip plays the
// word's OWN sound, so the s of "dogs" plays /z/. That is right, but it surprised the owner. Now a short
// note explains it ("s says /z/ here.") the first time the child plays such a chip, and it stays for that
// word; a missed answer shows every note of the word. Only well-known patterns (s for /z/ /sh/ /zh/, soft
// c and g, ch for /k/ /sh/, x for /gz/, -ed for /t/ /d/, ti and ci for /sh/); vowels and ordinary
// spellings get none. Every screen test runs a REAL built file in jsdom.
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, builder } = tool.loadParts();
const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
const fake = (name) => new Proxy({}, {
  get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
  getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
});
const BANKS = { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
const build = async (words) => (await builder.buildPacket({ words, activities: ['mapping'], title: 'Mapping', seed: 7, core, dictionary, banks: BANKS, loader, knownWords: words, createdAt: '2026-11-18T00:00:00.000Z' })).html;

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
function open(html) {
  const played = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html', beforeParse(w) {
    w.Audio = class { play() { played.push(this.src); const me = this; setTimeout(() => { if (me.onended) me.onended(); }, 5); return Promise.resolve(); } pause() {} };
  } });
  const w = dom.window, d = w.document;
  opened.push(w);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const buttons = () => [...d.querySelectorAll('#app button')].filter(seen);
  return { w, d, played,
    start: () => { d.getElementById('learner-name').value = 'Fox1'; buttons().find((b) => b.textContent === 'Start').click(); },
    word: () => { const p = [...d.querySelectorAll('#app p')].find((n) => /^The word: /.test(n.textContent)); return p ? p.textContent.replace('The word: ', '') : ''; },
    pick: (spelling) => buttons().find((b) => b.getAttribute('aria-label') === 'Pick up ' + spelling),
    notes: () => [...d.querySelectorAll('[data-mapping-says]')].map((n) => n.textContent),
  };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

describe('Sound Mapping notes for surprising spellings', () => {
  it('explains the s of "dogs" the first time it is played, and keeps the note (with no redundant Listen button)', async () => {
    const f = open(await build(['dogs']));
    f.start(); await wait(20);
    expect(f.word()).toBe('dogs');
    expect([...f.d.querySelectorAll('#app button')].filter((b) => /^Listen to the sound of /.test(b.getAttribute('aria-label') || ''))).toHaveLength(0);
    expect(f.notes()).toEqual([]);
    f.pick('s').click(); await wait(20);
    expect(f.played.some((src) => src === clip('phonemes/z'))).toBe(true);
    expect(f.notes()).toEqual(['s says /z/ here.']);
    f.pick('s').click(); await wait(20);
    f.pick('d').click(); await wait(20);
    expect(f.notes()).toEqual(['s says /z/ here.']);
    expect(f.d.querySelector('[data-mapping-notes]').getAttribute('aria-live')).toBe('polite');
  });

  it('adds no note where the spelling says its usual sound', async () => {
    const f = open(await build(['cats']));
    f.start(); await wait(20);
    expect(f.word()).toBe('cats');
    f.pick('s').click(); await wait(20);
    f.pick('c').click(); await wait(20);
    expect(f.notes()).toEqual([]);
  });

  // 2026-11-18 (owner, later): a note shown while the child works counts as help ("spellingNotes", once per
  // chip, in the results like soundListens); the notes shown with the answer after a miss do not; and no
  // note ever shows in a check (ctx.check), where it would give away what the check measures. Check files
  // hold only check activities today, so the check case runs Sound Mapping's render with a check context.
  it('counts a shown note as help once, in the saved results', async () => {
    const html = await build(['dogs']);
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    const f = open(html);
    f.start(); await wait(20);
    f.pick('s').click(); await wait(20);
    f.pick('s').click(); await wait(20);
    const saved = JSON.parse(f.w.localStorage.getItem('alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision));
    expect(saved.items[0].supports.spellingNotes).toBe(1);
    const plain = open(await build(['cats']));
    plain.start(); await wait(20);
    plain.pick('s').click(); await wait(20);
    const lessonCats = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(await build(['cats']))[1]);
    const savedCats = JSON.parse(plain.w.localStorage.getItem('alloflow-take-home:' + lessonCats.lessonId + ':' + lessonCats.revision));
    expect(savedCats.items[0].supports.spellingNotes).toBeUndefined();
  });

  it('shows no note in a check and counts no help there', async () => {
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(await build(['dogs']))[1]);
    const item = lesson.blocks[0].items[0];
    expect(item.chips.find((c) => c.text === 's').says).toBe('z');
    const run = (check) => {
      const d = new JSDOM('<!doctype html><div id="root"></div>').window.document;
      opened.push(d.defaultView);
      const el = (tag, attrs, kids) => {
        const n = d.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
          if (v == null) return;
          if (k === 'text') n.textContent = v; else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => n.addEventListener(ev, fn)); else if (k === 'class') n.className = v; else n.setAttribute(k, v);
        });
        (kids || []).forEach((c) => n.append(c));
        return n;
      };
      const supports = [];
      const L = Object.assign({}, loader.DEFAULT_LABELS, loader.ADAPTERS.mapping.labels);
      const ctx = { root: d.getElementById('root'), el, L, check, fmt: (s, p) => String(s).replace(/\{(\w+)\}/g, (m, k) => (p && k in p ? p[k] : m)),
        play() {}, playAll() {}, stop() {}, announce() {}, support: (name) => supports.push(name), isDone: () => false, answer: () => 'retry', attempts: () => 0 };
      loader.ADAPTERS.mapping.render(item, ctx);
      const chip = [...d.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Pick up s');
      chip.click();
      return { notes: [...d.querySelectorAll('[data-mapping-says]')].map((n) => n.textContent), supports };
    };
    expect(run(true)).toEqual({ notes: [], supports: ['soundListens'] });
    expect(run(false)).toEqual({ notes: ['s says /z/ here.'], supports: ['soundListens', 'spellingNotes'] });
  });

  it('marks only the surprising spellings when the file is built', async () => {
    for (const [word, expected] of [['dogs', { s: 'z' }], ['cats', {}], ['city', { c: 's' }], ['jumped', { ed: 't' }]]) {
      const f = open(await build([word]));
      f.start(); await wait(20);
      expect(f.word(), word).toBe(word);
      const chips = [...f.d.querySelectorAll('#app button')].filter((b) => /^Pick up /.test(b.getAttribute('aria-label') || ''));
      for (const b of chips) { b.click(); await wait(10); }
      const got = Object.fromEntries(f.notes().map((t) => { const m = /^(\w+) says \/(\w+)\/ here\.$/.exec(t); return [m[1], m[2]]; }));
      expect(got, word).toEqual(expected);
    }
  });
});
