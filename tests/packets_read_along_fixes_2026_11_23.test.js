// Read-along fixes of 2026-11-23 (owner-approved review of AlloFlow Packets, read-along part).
// Each fix is checked by what a real file or the real maker page DOES in jsdom: a file is built with
// packet_read_along_builder.js and driven the way a child would (review harness: C:\tmp\packets_review_1123\student).
//   1. "Check your understanding" answers stay after a page turn and a reload, and go into the saved results.
//   2. A page the file turned to and read out by itself is recorded "played"; "read" is the child's own page.
//   3. Time on a page adds up across visits in one opening; "resumed" means an earlier opening only.
//   4. Device voice: late voices (Chrome), no voice for the language, no voice at all.
//   5. Microphone wording is true beside "Save my recording"; a recording does not pass to the next child.
//   6. The maker warns before a typed passage is lost.  7. A blocked voice download is said in plain words.
//   8. Page wording: never a bare "No AI"; no wrong file count.  9. Symbol Runner says its task on Get ready.
//  10. The always-visible words of the player are labels.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const SR = require('../packet_symbol_runner_builder.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');
const PAGE_HTML = read('packets-read-along.html');

function loadLoader() {
  const g = { crypto: webcrypto };
  g.window = g;
  new Function('window', LOADER_SRC).call(g, g);
  return g.AlloWordSoundsTakeHome;
}
const loader = loadLoader();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (test, what, tries = 1200) => { for (let i = 0; i < tries; i++) { if (test()) return; await sleep(15); } throw new Error('Timed out waiting for ' + what); };
const mp3 = (text) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + text).toString('base64');
const clipsFor = (sentences) => Object.fromEntries(sentences.map((row) => [RA.clipKey(row.text), mp3(row.text)]));
const THREE_PAGES = 'The kite sailed over the trees. Mia smiled all afternoon.\n---\nThen she went home. She ate soup.\n---\nShe slept well. The end came soon.';

function buildFile(text, options = {}) {
  const sentences = RA.splitPassage(text);
  const made = RA.lessonFromReadAlong(Object.assign({ loader, title: 'Kite Story', sentences, clips: options.silent ? {} : clipsFor(sentences), pageMode: 'custom' }, options.lesson || {}));
  return RA.buildReadAlongPacket({ made, loader });
}

// A file opened as a child opens it. o.storage: what an earlier opening kept; o.clock: { t } stands in for the page clock;
// o.voices: { list } the device's voices (o.voices.arrive(list) hands over a new list, with the browser's event).
function open(html, o = {}) {
  const log = { downloads: [], clicked: [], spoken: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/file.html',
    beforeParse(w) {
      if (o.storage) for (const [k, v] of Object.entries(o.storage)) w.localStorage.setItem(k, v);
      w.Audio = class {
        constructor(src) { this.src = src || ''; this.playbackRate = 1; this.defaultPlaybackRate = 1; this.currentTime = 0; this.duration = 1; this.paused = true; }
        play() {
          this.paused = false;
          const me = this, src = this.src;
          setTimeout(() => { if (!me.paused && me.src === src && me.onended) { me.paused = true; me.onended(); } }, 3);
          return Promise.resolve();
        }
        pause() { this.paused = true; }
      };
      w.URL.createObjectURL = (blob) => { log.downloads.push(blob); return 'blob:x/' + log.downloads.length; };
      w.URL.revokeObjectURL = () => {};
      w.HTMLAnchorElement.prototype.click = function () { log.clicked.push(this.getAttribute('download')); };
      w.Element.prototype.scrollIntoView = function () {};
      if (o.clock) w.performance.now = () => o.clock.t;
      if (o.voices) {
        const listeners = [];
        w.SpeechSynthesisUtterance = function (t) { this.text = t; };
        w.speechSynthesis = {
          getVoices() { return o.voices.list; },
          speak(u) { log.spoken.push({ text: u.text, voice: u.voice && u.voice.name }); setTimeout(() => u.onend && u.onend(), 3); },
          cancel() {},
          addEventListener(type, fn) { if (type === 'voiceschanged') listeners.push(fn); },
          removeEventListener(type, fn) { const at = listeners.indexOf(fn); if (at >= 0) listeners.splice(at, 1); },
        };
        o.voices.arrive = (list) => { o.voices.list = list; listeners.slice().forEach((fn) => fn()); };
      }
      if (o.mic) {
        Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop() {} }] }) }, configurable: true });
        w.MediaRecorder = class {
          constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
          start() { this.state = 'recording'; }
          stop() { this.state = 'inactive'; if (this.ondataavailable) this.ondataavailable({ data: new w.Blob(['abc'], { type: 'audio/webm' }) }); if (this.onstop) this.onstop(); }
        };
      }
    },
  });
  const w = dom.window, d = w.document;
  const q = (s) => d.querySelector(s);
  const qa = (s) => Array.from(d.querySelectorAll(s));
  const click = (s) => { const n = typeof s === 'string' ? q(s) : s; if (!n) throw new Error('no node ' + s); n.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); return n; };
  const store = () => { const out = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); out[k] = w.localStorage.getItem(k); } return out; };
  const state = () => { const s = store(), k = Object.keys(s)[0]; return k ? JSON.parse(s[k]) : null; };
  const start = async (name) => { q('#learner-name').value = name; click(qa('.card button.primary').find((b) => !b.hidden)); await sleep(10); };
  const type = (sel, text) => { const n = q(sel); n.value = text; n.dispatchEvent(new w.Event('input', { bubbles: true })); };
  const page = () => (q('[data-read-along-page]') ? q('[data-read-along-page]').textContent : '');
  const savedJson = async () => { click('[data-save-json]'); await sleep(10); return JSON.parse(await log.downloads[log.downloads.length - 1].text()); };
  const savedCsv = async () => { click('[data-save-csv]'); await sleep(10); return (await log.downloads[log.downloads.length - 1].text()).replace(/^\uFEFF/, ''); };
  const visible = (sel) => { const n = q(sel); return !!n && !n.hidden && !n.closest('[hidden]'); };
  return { dom, w, d, q, qa, click, store, state, start, type, page, savedJson, savedCsv, visible, log, close: () => w.close() };
}

describe('1. Check your understanding: the answers are kept and reach the teacher', () => {
  const questions = [
    { prompt: 'Who smiled?', kind: 'mc', choices: ['Mia', 'The kite', 'Soup'], answer: 0 },
    { prompt: 'What did you like?', kind: 'open' },
    { prompt: 'Which word fits you today?', kind: 'mc', choices: ['Glad', 'Tired'] },
  ];
  const built = buildFile('The kite sailed over the trees. Mia smiled all afternoon.\n---\nThen she went home. She ate soup.', { lesson: { questions } });

  it('typed words and a picked choice are still there after Previous page and Next page, and after the file is opened again', async () => {
    const p = open(built.html);
    let again = null;
    try {
      await p.start('Ana');
      p.click('[data-read-along-done]');
      await sleep(10);
      expect(p.page()).toBe('Page 2 of 2');
      // The note under the heading says where the answers go (it said "Stays on this device only.").
      expect(p.q('[data-read-along-checks]').textContent).not.toContain('Stays on this device only');
      expect(p.q('[data-check-note]').textContent).toBe('Your answers are saved with your results. Your teacher sees them when you hand in your work.');
      p.type('[data-check-open="q2"]', 'I liked the kite part a lot');
      p.click(p.q('[data-check-q="q1"] [data-check-choice="1"]'));
      expect(p.q('[data-check-feedback="q1"]').textContent).toBe('Try another choice.');
      p.click('[data-read-along-prev]');
      await sleep(10);
      expect(p.page()).toBe('Page 1 of 2');
      p.click('[data-read-along-done]');
      await sleep(10);
      expect(p.page()).toBe('Page 2 of 2');
      expect(p.q('[data-check-open="q2"]').value).toBe('I liked the kite part a lot');
      expect(p.qa('[data-check-q="q1"] [data-check-choice]').map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
      expect(p.q('[data-check-feedback="q1"]').textContent).toBe('Try another choice.');
      // The file is closed and opened again (the same browser storage).
      again = open(built.html, { storage: p.store() });
      again.click('[data-continue]');
      await sleep(10);
      expect(again.page()).toBe('Page 2 of 2');
      expect(again.q('[data-check-open="q2"]').value).toBe('I liked the kite part a lot');
      expect(again.qa('[data-check-q="q1"] [data-check-choice]').map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    } finally { p.close(); if (again) again.close(); }
  });

  it('the saved results carry each answer on its page, capped at 240 characters, and nothing becomes a score', async () => {
    // The maker gives every choice question a keyed answer. A file whose third question has none (the player allows it):
    const sentences = RA.splitPassage('The kite sailed over the trees. Mia smiled all afternoon.\n---\nThen she went home. She ate soup.');
    const lesson = JSON.parse(JSON.stringify(RA.lessonFromReadAlong({ loader, title: 'Kite Story', sentences, clips: clipsFor(sentences), pageMode: 'custom', questions }).lesson));
    delete lesson.blocks[0].items[1].questions[2].answer;
    const p = open(loader.buildHtml(lesson, { core: { soundAnswerMatches: () => false } }));
    try {
      await p.start('Ana');
      p.click('[data-read-along-done]');
      await sleep(10);
      p.click(p.q('[data-check-q="q1"] [data-check-choice="1"]'));
      p.click(p.q('[data-check-q="q1"] [data-check-choice="0"]'));
      expect(p.q('[data-check-feedback="q1"]').textContent).toBe('Nice work!');
      p.type('[data-check-open="q2"]', 'I liked it, "really".\nA lot ' + 'x'.repeat(300));
      p.click(p.q('[data-check-q="q3"] [data-check-choice="1"]'));
      p.click('[data-read-along-done]');
      await sleep(20);
      const file = await p.savedJson();
      expect(file.items[0].responses).toEqual(['read']);
      const typed = ('I liked it, "really". A lot ' + 'x'.repeat(300)).slice(0, 240);
      // 1: a keyed choice, right at the second pick. 2: the words typed. 3: a choice with no keyed answer.
      expect(file.items[1].responses).toEqual(['read', '1: Mia (right, try 2)', '2: ' + typed, '3: Tired']);
      expect(file.items[1].responses[2].length).toBe(243);
      // Still listening practice: not scored, one "try" (the page), and no count in the summary moved.
      expect(file.items.map((it) => [it.practice, it.attempts, it.correct, it.firstTry])).toEqual([['read', 1, false, false], ['read', 1, false, false]]);
      expect(file.summary).toMatchObject({ items: 0, done: 0, firstTry: 0, afterRetry: 0, missed: 0, practised: 2, itemsGiven: 0, attempted: 0, correct: 0 });
      expect(file.items[1].supports).toEqual({ comprehensionCheck: 1 });
      // The spreadsheet file has them in the page's responses cell, and the file still checks out when read back.
      const csv = await p.savedCsv();
      expect(csv).toContain('"read | 1: Mia (right, try 2) | 2: ' + typed.replace(/"/g, '""') + ' | 3: Tired"');
      const back = loader.parseResult(JSON.stringify(file));
      expect(back.ok).toBe(true);
      expect(back.result.integrity).toBe('ok');
      expect(back.result.items[1].responses).toEqual(file.items[1].responses);
      expect(back.result.summary).toMatchObject({ items: 0, practised: 2 });
    } finally { p.close(); }
  });

  it('a wrong last pick is recorded as not right, with the number of picks', async () => {
    const p = open(built.html);
    try {
      await p.start('Ben');
      p.click('[data-read-along-done]');
      await sleep(10);
      p.click(p.q('[data-check-q="q1"] [data-check-choice="2"]'));
      expect((await (async () => { p.click('[data-read-along-done]'); await sleep(20); return p.savedJson(); })()).items[1].responses).toEqual(['read', '1: Soup (not right)']);
    } finally { p.close(); }
  });
});

describe('2. "read" is the child\'s own page; a page the file turned to and read out by itself is "played"', () => {
  const built = buildFile(THREE_PAGES);

  it('one press of Read to me: page 1 is read, pages 2 and 3 (turned to and read out by the file) are played', async () => {
    const p = open(built.html);
    try {
      await p.start('Ana');
      p.click('[data-read-along-play]');
      await until(() => p.state().index === 2, 'the file to turn to page 3 by itself');
      let st = p.state();
      expect(st.items.map((r) => [r.done, r.practice || '', r.responses])).toEqual([[true, 'read', ['read']], [true, 'played', ['played']], [false, '', []]]);
      expect(st.items[0].supports).toEqual({ readThroughs: 1 });
      expect(st.items[1].supports).toEqual({});
      // The last page was turned to by the file too. Finish alone does not make it "read".
      p.click('[data-read-along-done]');
      await sleep(20);
      const file = await p.savedJson();
      expect(file.items.map((it) => ({ practice: it.practice, responses: it.responses, attempts: it.attempts, done: it.done, correct: it.correct, firstTry: it.firstTry, flag: it.flag })))
        .toEqual([
          { practice: 'read', responses: ['read'], attempts: 1, done: true, correct: false, firstTry: false, flag: '' },
          { practice: 'played', responses: ['played'], attempts: 1, done: true, correct: false, firstTry: false, flag: '' },
          { practice: 'played', responses: ['played'], attempts: 1, done: true, correct: false, firstTry: false, flag: '' },
        ]);
      // Played pages are practice that is done, like read ones: counted apart, never scored.
      expect(file.summary).toMatchObject({ items: 0, practised: 3, itemsGiven: 0 });
      const rows = (await p.savedCsv()).split('\r\n').filter((line) => line.startsWith('"alloflow-packet-result/1"')).map((line) => line.split('","'));
      expect(rows.map((cells) => [cells[14], cells[17]])).toEqual([['0', 'read'], ['0', 'played'], ['0', 'played']]);
      const back = loader.parseResult(JSON.stringify(file));
      expect(back.result.items.map((it) => it.practice)).toEqual(['read', 'played', 'played']);
      expect(back.result.integrity).toBe('ok');
    } finally { p.close(); }
  });

  it('a played page the child goes back to and turns themselves becomes read; so does one they start something on', async () => {
    const p = open(built.html);
    try {
      await p.start('Ana');
      p.click('[data-read-along-play]');
      await until(() => p.state().index === 2, 'page 3');
      p.click('[data-read-along-prev]');
      await sleep(10);
      expect(p.page()).toBe('Page 2 of 3');
      expect(p.state().items[1].practice).toBe('played');
      p.click('[data-read-along-done]');
      await sleep(10);
      expect(p.page()).toBe('Page 3 of 3');
      // One record for the page, now "read": not two tries.
      expect(p.state().items[1]).toMatchObject({ practice: 'read', responses: ['read'], attempts: 1, done: true });
      p.click('[data-read-along-done]');
      await sleep(20);
      expect(p.state().items[2]).toMatchObject({ practice: 'read', responses: ['read'] });
    } finally { p.close(); }
    // A page the file turned to, on which the child presses a sentence to hear it: their own page.
    const p2 = open(built.html);
    try {
      await p2.start('Ben');
      p2.click('[data-read-along-play]');
      await until(() => p2.state().index === 1 && !!p2.q('[data-read-along-line="1"]') && p2.page() === 'Page 2 of 3', 'page 2');
      p2.click('[data-read-along-line="1"]');
      p2.click('[data-read-along-done]');
      await sleep(10);
      expect(p2.state().items[1]).toMatchObject({ practice: 'read', responses: ['read'] });
    } finally { p2.close(); }
  });

  it('One sentence with Auto pace (a timer, no sound): the page it was started on is read, the pages it turned to are played', async () => {
    const quiet = buildFile('The kite sailed away.\n---\nThen she went home.\n---\nShe slept well.', { silent: true });
    const p = open(quiet.html);
    try {
      await p.start('Cy');
      p.click('[data-read-along-chunk]');
      p.type('[data-chunk-pace]', '1000');
      p.click('[data-chunk-auto-timer]');
      await until(() => p.state().index === 2, 'the timer to reach page 3');
      expect(p.state().items.map((r) => r.practice || '')).toEqual(['read', 'played', '']);
    } finally { p.close(); }
  });
});

describe('3. time on a page adds up across visits in one opening, and "resumed" means an earlier opening', () => {
  const built = buildFile(THREE_PAGES);

  it('looking back a page neither resets the time nor sets the flag', async () => {
    const clock = { t: 1000 };
    const p = open(built.html, { clock });
    let later = null;
    try {
      await p.start('Ana');
      clock.t += 700;
      p.click('[data-read-along-done]');      // page 1 done after 0.7 s
      await sleep(10);
      clock.t += 600;                           // 0.6 s on page 2
      p.click('[data-read-along-prev]');      // look back at page 1
      await sleep(10);
      expect(p.state().items[1]).toMatchObject({ ms: 600, done: false });
      clock.t += 300;                           // 0.3 s more on page 1
      p.click('[data-read-along-done]');
      await sleep(10);
      expect(p.page()).toBe('Page 2 of 3');
      clock.t += 200;                           // 0.2 s more on page 2
      p.click('[data-read-along-done]');
      await sleep(10);
      const st = p.state();
      expect(st.items.slice(0, 2).map((r) => [r.ms, r.flag || ''])).toEqual([[1000, ''], [800, '']]);
      // Page 3 was shown, 0.4 s passed, and the file is closed. Opened again: an earlier opening, so "resumed", from 0.
      clock.t += 400;
      p.click('[data-read-along-prev]');
      await sleep(10);
      expect(p.state().items[2].ms).toBe(400);
      const clock2 = { t: 50 };
      later = open(built.html, { storage: p.store(), clock: clock2 });
      later.click('[data-continue]');
      await sleep(10);
      expect(later.page()).toBe('Page 2 of 3');
      later.click('[data-read-along-done]');
      await sleep(10);
      clock2.t += 250;
      later.click('[data-read-along-done]');
      await sleep(20);
      const file = await later.savedJson();
      expect(file.items.map((it) => [it.ms, it.flag])).toEqual([[1000, ''], [800, ''], [250, 'resumed']]);
      expect(file.activeMs).toBe(2050);
    } finally { p.close(); if (later) later.close(); }
  });
});

describe('4. the device voice', () => {
  const EN = [{ name: 'Local English', lang: 'en-US', localService: true }];
  const ES = [{ name: 'Voz local', lang: 'es-ES', localService: true }];
  const PROMISE = 'tap a word to hear it with this device voice';
  const voiceFile = (text, lang) => buildFile(text, { silent: true, lesson: Object.assign({ deviceVoice: true }, lang ? { lang } : {}) });

  it('voices that arrive after the page opened (Chrome) bring the button, on the first page and on the start screen', async () => {
    const built = voiceFile('The kite sailed over the trees. Mia smiled.\n---\nThen she went home.');
    const voices = { list: [] };
    const p = open(built.html, { voices });
    try {
      // The start screen does not promise a voice the device has not shown yet.
      expect(p.q('[data-intro]').textContent).not.toContain(PROMISE);
      await p.start('Ana');
      expect(p.q('[data-read-along-device-read]')).toBeNull();
      expect(p.q('[data-read-along-no-voice]').getAttribute('data-read-along-no-voice')).toBe('none');
      voices.arrive(EN);
      expect(p.q('[data-read-along-device-read]').textContent).toBe('Read with device voice');
      expect(p.q('[data-read-along-no-voice]')).toBeNull();
      expect(p.page()).toBe('Page 1 of 2');
      p.click('[data-read-along-device-read]');
      await until(() => p.log.spoken.length > 0, 'the device voice');
      expect(p.log.spoken[0]).toEqual({ text: 'The kite sailed over the trees.', voice: 'Local English' });
    } finally { p.close(); }
    const late = { list: [] };
    const s = open(built.html, { voices: late });
    try {
      const before = s.q('[data-intro]').textContent;
      late.arrive(EN);
      expect(before).not.toContain(PROMISE);
      expect(s.q('[data-intro]').textContent).toContain(PROMISE);
    } finally { s.close(); }
  });

  it('a Spanish passage is not read by an English voice: the child is told this device has no voice for the language', async () => {
    const built = voiceFile('El gato duerme en la casa. La niña come una manzana.', 'es');
    const p = open(built.html, { voices: { list: EN } });
    try {
      expect(p.q('[data-intro]').textContent).not.toContain(PROMISE);
      await p.start('Ana');
      expect(p.q('[data-read-along-device-read]')).toBeNull();
      expect(p.q('[data-read-along-no-voice]').textContent).toBe('This device has no voice for the language of this passage, so it cannot read it aloud. You can still read the words yourself.');
      await sleep(30);
      expect(p.log.spoken).toEqual([]);
    } finally { p.close(); }
    // With a Spanish voice on the device, it reads, with that voice.
    const ok = open(built.html, { voices: { list: EN.concat(ES) } });
    try {
      expect(ok.q('[data-intro]').textContent).toContain(PROMISE);
      await ok.start('Ana');
      ok.click('[data-read-along-device-read]');
      await until(() => ok.log.spoken.length > 0, 'the Spanish voice');
      expect(ok.log.spoken[0].voice).toBe('Voz local');
    } finally { ok.close(); }
  });

  it('with no on-device voice at all, the start screen promises none and the page says so plainly', async () => {
    const built = voiceFile('The kite sailed over the trees. Mia smiled.');
    const p = open(built.html, { voices: { list: [{ name: 'Network voice', lang: 'en-US', localService: false }] } });
    try {
      expect(p.q('[data-intro]').textContent).toBe('Read the passage on screen. This device has no voice that can read this passage aloud. Use Reading tools to change text size, colors, spacing or syllables.');
      await p.start('Cy');
      expect(p.q('[data-read-along-device-read]')).toBeNull();
      expect(p.q('[data-read-along-no-voice]').textContent).toBe('This device has no voice of its own, so it cannot read this aloud. You can still read the words yourself.');
    } finally { p.close(); }
  });
});

describe('5. the microphone', () => {
  const built = buildFile('The kite sailed over the trees. Mia smiled all afternoon.\n---\nThen she went home. She ate soup.', { lesson: { studentMic: true } });
  const TRUE_NOTE = 'Your recording stays in this browser and is never sent. It is saved only if you press Save my recording, and then only to this device.';

  it('the words beside Save my recording are true: kept in the browser, never sent, saved only by that button', async () => {
    const p = open(built.html, { mic: true });
    try {
      const about = Array.from(p.q('#about-panel').querySelectorAll('li')).map((li) => li.textContent).join(' ');
      expect(about).toContain('It uses the microphone only when you press Record my voice. Your recording stays in the memory of this browser and is never sent. It is saved only if you press Save my recording, and then only as a file on this device.');
      expect(about).not.toMatch(/never saved|Nothing is saved/);
      expect(built.manifest.microphone).toContain('It is saved as a file on this device only when the student presses Save my recording.');
      expect(built.manifest.microphone).not.toMatch(/never saves/);
      await p.start('Ana');
      expect(p.q('[data-student-rec-status]').textContent).toBe(TRUE_NOTE);
      p.click('[data-student-rec]');
      await sleep(20);
      p.click('[data-student-rec]');
      await sleep(20);
      expect(p.visible('[data-student-rec-save]')).toBe(true);
      p.click('[data-student-rec-save]');
      expect(p.log.clicked).toEqual(['my-reading-page-1-sentence-1.webm']);
      // Nothing of the recording is in the browser storage or in the results.
      expect(JSON.stringify(p.store())).not.toMatch(/blob:|webm|micClips/);
    } finally { p.close(); }
  });

  it('a recording made by one child is gone when the next child starts on the same device', async () => {
    const p = open(built.html, { mic: true });
    try {
      await p.start('Ana');
      p.click('[data-student-rec]');
      await sleep(20);
      p.click('[data-student-rec]');
      await sleep(20);
      expect(p.visible('[data-student-rec-play]')).toBe(true);
      p.click('[data-read-along-done]');
      await sleep(10);
      p.click('[data-read-along-done]');
      await sleep(20);
      await p.savedCsv();
      p.click('[data-practice-again]');
      await sleep(20);
      expect(p.q('#learner-name').value).toBe('');
      await p.start('Ben');
      expect(p.page()).toBe('Page 1 of 2');
      expect(p.visible('[data-student-rec-play]')).toBe(false);
      expect(p.visible('[data-student-rec-save]')).toBe(false);
      expect(p.q('[data-student-rec-status]').textContent).toBe(TRUE_NOTE);
    } finally { p.close(); }
  });
});

// ---- the maker page (packets-read-along.html), with a stand-in voice --------------------------------------------
async function openMaker({ voiceInit } = {}) {
  const dom = new JSDOM(PAGE_HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-read-along.html' });
  const w = dom.window, d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  const page = { w, d, dom, saved: [] };
  w.fetch = async (url) => {
    if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  w.URL.createObjectURL = () => 'blob:https://packets.test/1';
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { if (this.download) page.saved.push(this.download); };
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = { init: voiceInit || (async () => true), speak: async () => null };
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(LOADER_SRC);
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('packets_voice_engine.js'));
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  w.eval(read('packets_handoff.js'));
  w.eval(read('packets_zip.js'));
  w.eval(read('packets-read-along.js'));
  page.$ = (id) => d.getElementById(id);
  page.type = (id, text) => { page.$(id).value = text; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  // What the browser does when the tab is closed: true when the page asks it to warn.
  page.warnsOnLeave = () => { const ev = new w.Event('beforeunload', { cancelable: true }); w.dispatchEvent(ev); return ev.defaultPrevented; };
  return page;
}

describe('6. the maker does not lose a typed passage without a warning', () => {
  it('typing the passage or the title arms the leave warning, and a saved file clears it', async () => {
    const page = await openMaker();
    try {
      expect(page.warnsOnLeave()).toBe(false);
      page.type('f-text', 'The fox ran to the den. It hid in the tall grass.');
      expect(page.warnsOnLeave()).toBe(true);
      await until(() => !page.$('save').hidden && !page.$('save').disabled, 'the file to be ready');
      page.$('save').click();
      expect(page.saved).toHaveLength(1);
      expect(page.warnsOnLeave()).toBe(false);
      // Editing after a save is new work again; so is a new title.
      page.type('f-text', 'The fox ran to the den. It hid in the tall grass. Then it slept.');
      expect(page.warnsOnLeave()).toBe(true);
      await until(() => !page.$('save').hidden && !page.$('save').disabled, 'the file to be ready again');
      page.$('save').click();
      expect(page.warnsOnLeave()).toBe(false);
      page.type('f-title', 'The fox');
      expect(page.warnsOnLeave()).toBe(true);
    } finally { page.dom.window.close(); }
    // An empty page has nothing to lose: no warning for a title box emptied again.
    const empty = await openMaker();
    try {
      empty.type('f-title', '');
      empty.type('f-text', '   ');
      expect(empty.warnsOnLeave()).toBe(false);
    } finally { empty.dom.window.close(); }
  });
});

describe('7. a voice download that is blocked is said in plain words', () => {
  it('no browser wording, no stuck progress line, and what the teacher can do instead', async () => {
    let late = null;
    const page = await openMaker({ voiceInit: async (onProgress) => { late = onProgress; onProgress({ stage: 'Downloading voice model (~88MB)', pct: 0.1 }); throw new TypeError('Failed to fetch'); } });
    try {
      page.type('f-text', 'The fox ran to the den.');
      page.$('get-voice').click();
      await until(() => page.$('voice-problem').textContent !== '', 'the problem line');
      const said = page.$('voice-problem').textContent;
      expect(said).not.toMatch(/Failed to fetch|TypeError/);
      expect(said).toBe('The computer voice could not be downloaded here. A school or office network may block the download (it comes from huggingface.co).'
        + ' Nothing was changed, and your passage is still here. You can try again, or try on another network.'
        + ' You can also make the file without the computer voice: record your own voice in step 3, or save it with no recordings.'
        + ' A file with no recordings still shows the passage with the Reading tools, and if you tick "Tap a word to hear it (local device voice)" in step 4 it can read with a voice already on the student\'s device.');
      // The progress line is gone, and a late report from the download does not bring it back.
      expect(page.$('voice-making').hidden).toBe(true);
      expect(page.$('voice-line').textContent).toBe('');
      late({ stage: 'Downloading voice model (~88MB)', pct: 0.1 });
      expect(page.$('voice-making').hidden).toBe(true);
      expect(page.$('voice-line').textContent).not.toContain('10 percent');
      expect(page.$('get-voice').disabled).toBe(false);
      // What it says is true: the passage is still there, and a file with no recordings can be saved.
      expect(page.$('f-text').value).toBe('The fox ran to the den.');
      await until(() => !page.$('save').hidden && !page.$('save').disabled, 'a file with no recordings');
    } finally { page.dom.window.close(); }
  });
});

describe('8. the words on the maker page', () => {
  const doc = new JSDOM(PAGE_HTML).window.document;
  const hint = (id) => doc.getElementById(id).closest('label').querySelector('small.hint').textContent;

  it('never a bare "No AI": each reading support says what is true for it', () => {
    expect(doc.body.textContent).not.toMatch(/\bNo AI\./);
    expect(hint('f-pos')).toMatch(/Runs without AI\.$/);
    // The meanings come from the Packets word list, where some were checked with AI help (packets-vocab.html says so too).
    expect(hint('f-dict')).toContain('Runs without AI: nothing is generated. Some meanings were checked and corrected ahead of time with AI help, not by a person');
    expect(hint('f-dict-pics')).toMatch(/Runs without AI: pictures are looked up by word, and none is generated\.$/);
    // The file says the same under About this file.
    const sentences = RA.splitPassage('The fox ran to the den.');
    const made = RA.lessonFromReadAlong({ loader, title: 'Fox', sentences, clips: {}, dictionary: (w) => (w === 'fox' ? { word: 'fox', pos: 'noun', def: 'A small wild animal with a bushy tail.', example: 'The fox ran.' } : null) });
    expect(made.dictionary).toMatchObject({ words: 1 });
    const credits = JSON.stringify(RA.buildReadAlongPacket({ made, loader }).manifest.attributions);
    expect(credits).not.toMatch(/\bNo AI\./);
    expect(credits).toContain('Some meanings were checked and corrected ahead of time with AI help, not by a person.');
  });

  it('states no count of files it cannot keep, and names what the reading supports load', () => {
    const proof = doc.querySelector('details.proof').textContent;
    expect(proof).not.toMatch(/\b(sixteen|seventeen|16|17) files\b/);
    // Every file the page itself asks for at the start is named.
    const asked = Array.from(doc.querySelectorAll('link[rel="stylesheet"][href], script[src]')).map((n) => n.getAttribute('href') || n.getAttribute('src'));
    expect(asked.length).toBe(15);
    for (const name of asked) expect(proof).toContain(name);
    for (const name of ['packets_audio_kit.js', 'lame.min.js', 'packets_vocab_bank_en.js', 'word_sounds_symbols_en.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js', 'word_picture_matcher.js', 'packets_my_words.js']) expect(proof).toContain(name);
    // The microphone lines agree with the file's Save my recording button.
    expect(doc.body.textContent).not.toMatch(/never saved or sent/);
    expect(hint('f-student-mic')).toContain('It is saved only if the student presses Save my recording');
  });
});

describe('9. a Symbol Runner check says what to do before the clock starts', () => {
  it('Get ready shows the task line, and the grown-up line names the button by its word', async () => {
    const made = SR.lessonFromSymbolRunner({ loader, mode: 'color_word_stroop', packetMode: 'check', title: 'Ink colors' });
    const built = SR.buildSymbolRunnerPacket({ lesson: made.lesson || made, plan: made.plan, made, loader, teacherCode: '2468' });
    const clock = { t: 1000 };
    const p = open(built.html, { clock });
    try {
      const realNow = p.w.Date.now.bind(p.w.Date);
      let skew = 0;
      p.w.Date.now = () => realNow() + skew;
      await p.start('Ana');
      for (let i = 0; i < 12 && !p.q('[data-check-begin]'); i++) {
        skew += 500; clock.t += 500;
        const choice = p.qa('[data-sr-choice]').find((x) => !x.disabled);
        if (choice) p.click(choice);
        await sleep(5);
        const next = p.q('[data-practice-next]');
        if (next && !next.hidden) p.click(next);
        await sleep(5);
      }
      const begin = p.q('[data-check-begin]');
      expect(begin).not.toBeNull();
      const card = begin.closest('.card');
      expect(card.querySelector('p.letters').textContent).toBe('Name the ink color');
      expect(card.textContent).toContain('You get one try for each one.');
      expect(begin.textContent).toBe('Start');
    } finally { p.close(); }
    expect(loader.CHECK_LABELS.check_ready_adult).toContain('before the student presses ' + loader.CHECK_LABELS.check_begin + '.');
    expect(loader.CHECK_LABELS.check_ready_adult_hear).toContain('before the student presses ' + loader.CHECK_LABELS.check_begin + '.');
  });
});

describe('10. the always-visible words of the player are labels', () => {
  it('a file given other words for them shows those words', async () => {
    const sentences = RA.splitPassage(THREE_PAGES);
    const made = RA.lessonFromReadAlong({ loader, title: 'Kite Story', sentences, clips: clipsFor(sentences), pageMode: 'custom', simpleBar: true });
    const words = { read_along_jump: 'J-jump', read_along_page_n: 'P-{n}', read_along_bookmark: 'B-mark', read_along_bookmarked: 'B-marked', read_along_bookmark_go_n: 'B-go {n}',
      read_along_more_tools: 'M-more', read_along_fewer_tools: 'M-fewer', read_along_helpers: 'H-helpers', read_along_keys: 'K-keys', read_along_keys_text: 'K-text',
      continue_page: '(P {n}/{total})' };
    const html = loader.buildHtml(made.lesson, { core: { soundAnswerMatches: () => false }, labels: words });
    const p = open(html);
    let again = null;
    try {
      await p.start('Ana');
      expect(p.q('[data-read-along-jump]').getAttribute('aria-label')).toBe('J-jump');
      expect(Array.from(p.q('[data-read-along-jump]').options).map((o) => o.textContent)).toEqual(['P-1', 'P-2', 'P-3']);
      expect(p.q('[data-read-along-bookmark]').textContent).toBe('B-mark');
      p.click('[data-read-along-bookmark]');
      expect(p.q('[data-read-along-bookmark]').textContent).toBe('B-marked');
      expect(p.q('[data-read-along-tools-bar]').getAttribute('aria-label')).toBe('H-helpers');
      expect(p.q('[data-read-along-more-tools]').textContent).toBe('M-more');
      p.click('[data-read-along-more-tools]');
      expect(p.q('[data-read-along-more-tools]').textContent).toBe('M-fewer');
      expect(p.q('[data-read-along-keys-hint] summary').textContent).toBe('K-keys');
      expect(p.q('[data-read-along-keys-hint] p').textContent).toBe('K-text');
      p.click('[data-read-along-done]');
      await sleep(10);
      expect(p.q('[data-read-along-bookmark-go]').textContent).toBe('B-go 1');
      again = open(html, { storage: p.store() });
      expect(again.q('[data-continue-progress]').textContent).toBe('(P 2/3)');
    } finally { p.close(); if (again) again.close(); }
    // Left alone, the English words are the ones the page had before.
    const plain = open(RA.buildReadAlongPacket({ made, loader }).html);
    try {
      await plain.start('Ben');
      expect(plain.q('[data-read-along-bookmark]').textContent).toBe('Bookmark');
      expect(plain.q('[data-read-along-keys-hint] summary').textContent).toBe('Keyboard shortcuts');
      expect(Array.from(plain.q('[data-read-along-jump]').options).map((o) => o.textContent)).toEqual(['Page 1', 'Page 2', 'Page 3']);
    } finally { plain.close(); }
  });
});
