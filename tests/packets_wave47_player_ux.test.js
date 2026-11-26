// @vitest-environment jsdom
// Wave 47 Player UX Upgrades:
// 1. Consistent tile-placement UX in word_scramble.js (lift-in-place, swap/move, Put back, Escape/Backspace)
//    and mapping.js (lift-in-place + play placed chip audio on tap, swap/move, Put back, Escape/Backspace).
// 2. Global "Slower Audio (0.75x)" toggle in student Aa toolbar (data-tool-audio-speed, persisted via toolPref,
//    0.75x playbackRate clamped >= 0.5, speechSynthesis rate in vocabChoice/read_along, slowAudio support).
// 3. Practice-mode "Practice the N you missed" mastery loop (data-retry-missed, bonus banner, original
//    first-try score/results/JSON/storage preserved, never shown in Check/probe mode).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

delete window.AlloWordSoundsTakeHome;
new Function(read('word_sounds_take_home_loader.js'))();
const TH = window.AlloWordSoundsTakeHome;
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, loader } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const wav = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF');
  b.write('WAVE', 8);
  b.write(String(tag).slice(0, 12), 44);
  return 'data:audio/wav;base64,' + b.toString('base64');
};

function mountAdapter(adapter, item, opts = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://packet.test/' });
  opened.push(dom.window);
  const doc = dom.window.document;
  const root = doc.getElementById('root');
  let done = false;
  let attempts = 0;
  let keyHandler = null;
  const played = [];
  const supports = [];
  const announced = [];
  const L = Object.assign({
    hear_question: 'Hear the question',
    hear_word: 'Hear the word',
  }, adapter.labels || {});
  const el = (tag, attrs, children) => {
    const node = doc.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'hidden') node.hidden = !!v;
        else if (k === 'on') {
          for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
        } else node.setAttribute(k, String(v));
      }
    }
    if (Array.isArray(children)) {
      for (const ch of children) {
        if (ch == null) continue;
        node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
      }
    }
    return node;
  };
  const fmt = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? String(vars[k]) : ''));
  const ctx = {
    root,
    el,
    fmt,
    L,
    showLetters: opts.showLetters !== false,
    check: !!opts.check,
    noFocus: true,
    isDone: () => done,
    attempts: () => attempts,
    support: (name) => supports.push(name),
    announce: (text) => announced.push(text),
    play: (id, rate) => { played.push({ id, rate }); return Promise.resolve(true); },
    playAll: (ids) => { (ids || []).forEach((id) => played.push({ id })); return Promise.resolve(true); },
    stop: () => {},
    keys: (fn) => { keyHandler = fn; },
    answer: (_resp, right) => {
      attempts += 1;
      if (right) {
        done = true;
        if (handle && typeof handle.reveal === 'function') handle.reveal(true);
        return 'correct';
      }
      if (attempts >= 2 || opts.check) {
        done = true;
        if (handle && typeof handle.reveal === 'function') handle.reveal(false);
        return 'missed';
      }
      return 'retry';
    },
  };
  const handle = adapter.render(item, ctx) || {};
  return {
    dom,
    doc,
    root,
    ctx,
    handle,
    played,
    supports,
    announced,
    pressKey: (k) => (keyHandler ? keyHandler(k) : false),
  };
}

function openFile(html, { learner = 'Maya', seedStorage = null } = {}) {
  const playCalls = [];
  const spoken = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/wave47.html',
    beforeParse(w) {
      if (seedStorage) {
        for (const [k, v] of Object.entries(seedStorage)) w.localStorage.setItem(k, v);
      }
      w.Audio = class {
        constructor() {
          this.playbackRate = 1;
          this.defaultPlaybackRate = 1;
          this.paused = true;
        }
        play() {
          this.paused = false;
          const n = (this.n = (this.n || 0) + 1);
          playCalls.push({ src: this.src, playbackRate: this.playbackRate, defaultPlaybackRate: this.defaultPlaybackRate });
          setTimeout(() => {
            if (this.n === n) {
              this.paused = true;
              if (this.onended) this.onended();
            }
          }, 5);
          return Promise.resolve();
        }
        pause() {
          this.paused = true;
          this.n = (this.n || 0) + 1;
        }
      };
      w.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
          this.rate = 1;
        }
      };
      w.speechSynthesis = {
        getVoices: () => [{ localService: true, lang: 'en-US', name: 'Local English' }],
        cancel: () => {},
        speak: (u) => {
          spoken.push({ text: u.text, rate: u.rate });
          setTimeout(() => { if (u.onend) u.onend(); }, 5);
        },
      };
    },
  });
  opened.push(dom.window);
  const w = dom.window;
  const d = w.document;
  const startBtn = [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start');
  if (learner && d.getElementById('learner-name')) d.getElementById('learner-name').value = learner;
  if (startBtn) startBtn.click();
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  return {
    w,
    d,
    playCalls,
    spoken,
    seen,
    button: (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text),
    next: () => {
      const n = d.querySelector('[data-next]');
      if (n) { n.hidden = false; n.click(); }
    },
  };
}

describe('1. Consistent tile-placement UX (word_scramble + mapping)', () => {
  it('word_scramble: tapping a filled box lifts in place, swaps/moves, deselects on re-tap/Escape, and returns via Put back or Backspace', () => {
    const adapter = TH.ADAPTERS.word_scramble;
    const prep = adapter.prepare(
      { activityItems: { word_scramble: { letters: ['t', 'c', 'a'] } } },
      { word: 'cat', wordClip: () => 'w_cat', bankClip: () => 'p_ws' },
    );
    const m = mountAdapter(adapter, Object.assign({ word: 'cat' }, prep.item));
    const putBackLi = m.root.querySelector('[data-ws-put-back-item]');
    const putBackBtn = m.root.querySelector('[data-ws-put-back]');
    expect(putBackLi.hidden).toBe(true);

    // Place tile 0 ('t') into box 0 and tile 1 ('c') into box 1
    m.root.querySelector('[data-ws-tile="0"]').click();
    m.root.querySelector('[data-ws-box="0"]').click();
    m.root.querySelector('[data-ws-tile="1"]').click();
    m.root.querySelector('[data-ws-box="1"]').click();
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-ws-box="1"]').textContent).toBe('c');

    // Tap filled box 0 -> lifts in place (does NOT eject!), lights up Put back
    m.root.querySelector('[data-ws-box="0"]').click();
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-ws-box="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(putBackLi.hidden).toBe(false);

    // Tap same box again -> deselects in place without removing
    m.root.querySelector('[data-ws-box="0"]').click();
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-ws-box="0"]').getAttribute('aria-pressed')).toBe('false');
    expect(putBackLi.hidden).toBe(true);

    // Lift box 0 again -> press Escape -> deselects in place without removing
    m.root.querySelector('[data-ws-box="0"]').click();
    expect(m.root.querySelector('[data-ws-box="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(m.pressKey('Escape')).toBe(true);
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-ws-box="0"]').getAttribute('aria-pressed')).toBe('false');
    expect(putBackLi.hidden).toBe(true);

    // Lift box 0 ('t') and tap filled box 1 ('c') -> swaps them!
    m.root.querySelector('[data-ws-box="0"]').click();
    m.root.querySelector('[data-ws-box="1"]').click();
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('c');
    expect(m.root.querySelector('[data-ws-box="1"]').textContent).toBe('t');
    expect(putBackLi.hidden).toBe(true);

    // Lift box 1 ('t') and tap empty box 2 -> moves it!
    m.root.querySelector('[data-ws-box="1"]').click();
    m.root.querySelector('[data-ws-box="2"]').click();
    expect(m.root.querySelector('[data-ws-box="1"]').textContent).toBe('');
    expect(m.root.querySelector('[data-ws-box="2"]').textContent).toBe('t');

    // Lift box 2 ('t') and tap Put back -> returns it to tray
    m.root.querySelector('[data-ws-box="2"]').click();
    expect(putBackLi.hidden).toBe(false);
    putBackBtn.click();
    expect(m.root.querySelector('[data-ws-box="2"]').textContent).toBe('');
    expect(m.root.querySelector('[data-ws-tile="0"]').closest('li').hidden).toBe(false);
    expect(putBackLi.hidden).toBe(true);

    // Lift box 0 ('c') and press Backspace -> returns it to tray
    m.root.querySelector('[data-ws-box="0"]').click();
    expect(m.pressKey('Backspace')).toBe(true);
    expect(m.root.querySelector('[data-ws-box="0"]').textContent).toBe('');
    expect(m.root.querySelector('[data-ws-tile="1"]').closest('li').hidden).toBe(false);
  });

  it('mapping: tapping a filled slot plays its phoneme/grapheme audio while lifting in place, and supports swap/move/Put back/Escape/Backspace', () => {
    const adapter = TH.ADAPTERS.mapping;
    const prep = adapter.prepare(
      { phonemes: ['c', 'a', 't'], activityItems: { mapping: { graphemes: ['c', 'a', 't'], chipOrder: [{ id: 2, text: 't' }, { id: 0, text: 'c' }, { id: 1, text: 'a' }] } } },
      { word: 'cat', label: (p) => String(p), wordClip: () => 'w_cat', bankClip: () => 'p_map', phonemeClip: (g) => 'ph_' + g },
    );
    const m = mountAdapter(adapter, Object.assign({ word: 'cat' }, prep.item));
    const putBackLi = m.root.querySelector('[data-map-put-back-item]');
    const putBackBtn = m.root.querySelector('[data-map-put-back]');
    expect(putBackLi.hidden).toBe(true);

    // Place tile 0 ('t') into slot 0, tile 1 ('c') into slot 1
    m.root.querySelector('[data-map-tile="0"]').click();
    m.root.querySelector('[data-map-slot="0"]').click();
    m.root.querySelector('[data-map-tile="1"]').click();
    m.root.querySelector('[data-map-slot="1"]').click();
    m.played.length = 0;

    // Tap filled slot 0 ('t') -> lifts in place AND plays 'ph_t'!
    m.root.querySelector('[data-map-slot="0"]').click();
    expect(m.root.querySelector('[data-map-slot="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-map-slot="0"]').getAttribute('aria-pressed')).toBe('true');
    expect(putBackLi.hidden).toBe(false);
    expect(m.played.map((p) => p.id)).toContain('ph_t');

    // Tap same slot again -> deselects in place
    m.root.querySelector('[data-map-slot="0"]').click();
    expect(m.root.querySelector('[data-map-slot="0"]').textContent).toBe('t');
    expect(m.root.querySelector('[data-map-slot="0"]').getAttribute('aria-pressed')).toBe('false');
    expect(putBackLi.hidden).toBe(true);

    // Tap slot 1 ('c') -> plays 'ph_c', then Escape -> deselects in place
    m.played.length = 0;
    m.root.querySelector('[data-map-slot="1"]').click();
    expect(m.played.map((p) => p.id)).toContain('ph_c');
    expect(m.pressKey('Escape')).toBe(true);
    expect(m.root.querySelector('[data-map-slot="1"]').textContent).toBe('c');
    expect(m.root.querySelector('[data-map-slot="1"]').getAttribute('aria-pressed')).toBe('false');

    // Swap slot 0 ('t') and slot 1 ('c') via tap-lift + tap-slot
    m.root.querySelector('[data-map-slot="0"]').click();
    m.root.querySelector('[data-map-slot="1"]').click();
    expect(m.root.querySelector('[data-map-slot="0"]').textContent).toBe('c');
    expect(m.root.querySelector('[data-map-slot="1"]').textContent).toBe('t');

    // Lift slot 1 ('t') and tap Put back -> returns 't' to tray
    m.root.querySelector('[data-map-slot="1"]').click();
    expect(putBackLi.hidden).toBe(false);
    putBackBtn.click();
    expect(m.root.querySelector('[data-map-slot="1"]').textContent).toBe('2');
    expect(m.root.querySelector('[data-map-tile="0"]').closest('li').hidden).toBe(false);

    // Lift slot 0 ('c') and press Backspace -> returns 'c' to tray
    m.root.querySelector('[data-map-slot="0"]').click();
    expect(m.pressKey('Backspace')).toBe(true);
    expect(m.root.querySelector('[data-map-slot="0"]').textContent).toBe('1');
  });

  it('preserves letter_tracing and symbol_runner adapters intact and registers all new adapter labels in ui_strings.js', () => {
    expect(TH.ADAPTERS.letter_tracing.labels.letter_tracing_demo).toBe('Show how');
    expect(TH.CHECK_ADAPTERS.symbol_runner).toBeTruthy();
    const ui = JSON.parse(read('ui_strings.js')).word_sounds;
    for (const k of [
      'word_scramble_put_back', 'word_scramble_put_back_label', 'word_scramble_selected',
      'mapping_put_back', 'mapping_put_back_label', 'mapping_selected',
      'tools_audio_speed', 'tools_audio_speed_1',
      'retry_missed_one', 'retry_missed_many', 'retry_missed_banner',
    ]) {
      expect(typeof ui['take_home_player_' + k], k).toBe('string');
    }
  });
});

describe('2. Global Slower Audio (0.75x) toggle in student Aa toolbar', () => {
  it('persists via toolPref, multiplies playbackRate by 0.75 (clamped >= 0.5), and records slowAudio support', () => {
    const row = {
      word: 'cat',
      targetWord: 'cat',
      _ttsAssets: { cat: wav('cat') },
      activityItems: { spelling_bee: {} },
    };
    const made = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['spelling_bee'], title: 'Audio Speed Test', lessonId: 'L-speed' });
    const html = loader.buildHtml(made.lesson, { core });

    const t = openFile(html);
    const aaBtn = t.d.querySelector('[data-tools-open]');
    aaBtn.click();
    const slowBtn = t.d.querySelector('[data-tool-audio-speed]');
    expect(slowBtn).toBeTruthy();
    expect(slowBtn.textContent).toContain('0.75x');
    expect(slowBtn.getAttribute('aria-pressed')).toBe('false');

    // Turn Slower (0.75x) ON
    slowBtn.click();
    expect(slowBtn.getAttribute('aria-pressed')).toBe('true');
    expect(t.d.documentElement.getAttribute('data-audio-speed')).toBe('0.75');

    // Saved via toolPref in localStorage
    const savedKey = Object.keys(t.w.localStorage)[0];
    const savedState = JSON.parse(t.w.localStorage.getItem(savedKey));
    expect(savedState.tools.audioSpeed).toBe(1);

    // Normal Hear the word plays at 0.75x
    t.playCalls.length = 0;
    t.button('Hear the word').click();
    expect(t.playCalls.length).toBeGreaterThan(0);
    expect(t.playCalls[t.playCalls.length - 1].playbackRate).toBe(0.75);

    // Spelling Bee "Slow" button (rate 0.5) clamps 0.5 * 0.75 = 0.375 -> 0.5 (never < 0.5)
    t.playCalls.length = 0;
    const slowWordBtn = t.button('Hear it slowly');
    expect(slowWordBtn).toBeTruthy();
    slowWordBtn.click();
    expect(t.playCalls[t.playCalls.length - 1].playbackRate).toBe(0.5);

    // Records slowAudio in supports
    const updatedState = JSON.parse(t.w.localStorage.getItem(savedKey));
    expect(updatedState.items[0].supports.slowAudio).toBeGreaterThanOrEqual(1);

    // Persists across reload
    const t2 = openFile(html, { seedStorage: { [savedKey]: t.w.localStorage.getItem(savedKey) } });
    t2.d.querySelector('[data-tools-open]').click();
    expect(t2.d.querySelector('[data-tool-audio-speed]').getAttribute('aria-pressed')).toBe('true');
  });

  it('applies 0.75 rate to speechSynthesis in vocabChoice when not already slower and records slowAudio', () => {
    const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://packet.test/' });
    opened.push(dom.window);
    const w = dom.window;
    const spoken = [];
    w.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; this.rate = 1; }
    };
    w.speechSynthesis = {
      getVoices: () => [{ localService: true, lang: 'en-US', name: 'Local English' }],
      cancel: () => {},
      speak: (u) => {
        spoken.push({ text: u.text, rate: u.rate });
        if (u.onend) u.onend();
      },
    };
    const supports = [];
    const el = (tag, attrs, children) => {
      const node = w.document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (v == null || v === false) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => node.addEventListener(ev, fn));
        else node.setAttribute(k, v === true ? '' : String(v));
      });
      (children || []).forEach((c) => { if (c) node.appendChild(typeof c === 'string' ? w.document.createTextNode(c) : c); });
      return node;
    };
    const ctx = {
      root: w.document.getElementById('root'),
      el,
      fmt: (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')),
      L: {
        vocab_meaning_question: 'What does this word mean?',
        vocab_meaning_read: 'Read aloud',
        vocab_meaning_listen: 'Listen to choice {n}',
        vocab_meaning_choose: 'Choose {choice}',
        vocab_meaning_choices: 'Choices',
        vocab_meaning_correct: 'Right!',
        vocab_meaning_missed: 'Missed',
      },
      isDone: () => false,
      speedRate: () => 1,
      toolPref: (k) => (k === 'audioSpeed' ? 1 : 0),
      support: (name) => supports.push(name),
      announce: () => {},
      play: () => Promise.resolve(true),
      answer: () => 'correct',
    };
    TH._vocabChoice({
      word: 'sun',
      ask: 'sun',
      target: 'star',
      read: true,
      lang: 'en',
      choices: [{ text: 'star' }, { text: 'moon' }, { text: 'cloud' }],
    }, ctx, 'vocab_meaning_', false);

    // Click "Read aloud" to trigger speechSynthesis
    const readBtn = ctx.root.querySelector('[data-read-aloud="question"]');
    expect(readBtn).toBeTruthy();
    readBtn.click();
    const realSpoken = spoken.filter((s) => s.text);
    expect(realSpoken.length).toBeGreaterThan(0);
    expect(realSpoken[0].rate).toBe(0.75);
    expect(supports).toContain('slowAudio');
  });
});

describe('3. Practice-mode "Practice the N you missed" mastery loop', () => {
  const makeTwoWordLesson = () => {
    const rows = ['cat', 'dog'].map((w) => ({
      word: w,
      targetWord: w,
      _ttsAssets: { [w]: wav(w) },
      activityItems: { spelling_bee: {} },
    }));
    const made = loader.lessonFromPack(rows, { core, banks: BANKS, activities: ['spelling_bee'], title: 'Retry Missed Test', lessonId: 'L-retry' });
    return loader.buildHtml(made.lesson, { core });
  };

  const typeAndCheck = (t, word) => {
    const inp = t.d.querySelector('#app input');
    inp.value = word;
    inp.dispatchEvent(new t.w.Event('input', { bubbles: true }));
    t.button('Check spelling').click();
  };

  it('shows "Practice the 1 you missed" when 1 item is missed, runs only missed item with banner, and preserves original score/results', () => {
    const html = makeTwoWordLesson();
    const t = openFile(html);

    // Item 1 ('cat'): get right on first try
    typeAndCheck(t, 'cat');
    t.next();

    // Item 2 ('dog'): miss twice (exhaust attempts -> missed)
    typeAndCheck(t, 'dug');
    typeAndCheck(t, 'dig');
    t.next();

    // Now on summary screen!
    expect(t.d.querySelector('#app').textContent).toContain('Right on the first try: 1 of 2.');
    const retryBtn = t.d.querySelector('[data-retry-missed]');
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.textContent).toBe('Practice the 1 you missed');
    expect(retryBtn.classList.contains('primary')).toBe(false);

    // Snapshot original localStorage state before bonus retry
    const key = Object.keys(t.w.localStorage)[0];
    const beforeRaw = t.w.localStorage.getItem(key);
    const beforeState = JSON.parse(beforeRaw);
    expect(beforeState.items[0].correct).toBe(true);
    expect(beforeState.items[1].correct).toBe(false);

    // Click "Practice the 1 you missed"
    retryBtn.click();
    const banner = t.d.querySelector('[data-bonus-retry-banner]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Bonus practice');
    expect(banner.textContent).toContain('saved score stays unchanged');

    // Answer the missed item ('dog') RIGHT during bonus practice
    typeAndCheck(t, 'dog');
    expect(t.d.querySelector('[data-feedback]').textContent).toContain('dog');
    t.next();

    // Returned to summary screen with original score completely preserved!
    expect(t.d.querySelector('#app').textContent).toContain('Right on the first try: 1 of 2.');
    expect(t.d.querySelector('[data-retry-missed]').textContent).toBe('Practice the 1 you missed');
    const afterState = JSON.parse(t.w.localStorage.getItem(key));
    expect(afterState.items).toEqual(beforeState.items);
    expect(afterState.finishedAt).toBe(beforeState.finishedAt);
  });

  it('uses plural "Practice the 2 you missed" when 2 items missed, hides button when 0 missed, and never renders in Check/probe mode', () => {
    const html = makeTwoWordLesson();

    // Case A: 2 missed -> plural label
    const tMissed = openFile(html);
    typeAndCheck(tMissed, 'cot');
    typeAndCheck(tMissed, 'cut');
    tMissed.next();
    typeAndCheck(tMissed, 'dug');
    typeAndCheck(tMissed, 'dig');
    tMissed.next();
    const btn2 = tMissed.d.querySelector('[data-retry-missed]');
    expect(btn2).toBeTruthy();
    expect(btn2.textContent).toBe('Practice the 2 you missed');

    // Case B: 0 missed -> no retry-missed button
    const tPerfect = openFile(html);
    typeAndCheck(tPerfect, 'cat');
    tPerfect.next();
    typeAndCheck(tPerfect, 'dog');
    tPerfect.next();
    expect(tPerfect.d.querySelector('[data-retry-missed]')).toBeNull();

    // Case C: Check (probe) mode -> NEVER renders data-retry-missed
    const checksMod = {};
    new Function('window', read('packet_check_builder.js')).call(checksMod, checksMod);
    const C = checksMod.AlloPacketChecks;
    const { html: checkHtml } = C.buildCheckPacket({
      lesson: C.lessonFromMathProblems({ title: 'Math Check', problems: C.parseProblems('2+2,3+3'), timeLimitS: null }),
      loader,
    });
    const tChk = openFile(checkHtml);
    let fakeNow = 1000;
    Object.defineProperty(tChk.w.performance, 'now', { configurable: true, value: () => fakeNow });
    // Advance through intro, practice (if any), and both check items answering wrong
    for (let step = 0; step < 8 && !tChk.d.querySelector('#app').textContent.includes('You finished'); step++) {
      fakeNow += 500;
      const pad9 = tChk.d.querySelector('[data-key="9"]');
      const padNext = tChk.d.querySelector('[data-key="next"]');
      if (pad9 && padNext && tChk.seen(pad9)) {
        pad9.click();
        padNext.click();
      } else {
        const go = tChk.button('Start') || tChk.button('Next');
        if (go) go.click();
      }
    }
    expect(tChk.d.querySelector('#app').textContent).toContain('You finished');
    expect(tChk.d.querySelector('[data-retry-missed]')).toBeNull();
  });
});
