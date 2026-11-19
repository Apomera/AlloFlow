// @vitest-environment jsdom
// Wave 6A (2026-11-19): In-App <-> Packets Activity Parity across all 9 player-side items
// (isolation middle/last + skipDirections, symbol_runner typing/auto-submit/r-b-g-y/retry audio,
// sentence_match retry feedback hold, mapping retry warn/drag/span dots/--soft,
// word_scramble typing/drag, orthography Easy letterBank/lengthHint/inputmode/shown,
// missing_letter .tried + typing/Enter, takeHomeVocab R replay + vocab_blank inline reveal,
// syllable_blending/segmentation soundGap + choices + syllable_counting focus & Space/Backspace).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, builder } = tool.loadParts();
const SR = require('../packet_symbol_runner_builder.js');
const V = require('../packet_vocab_builder.js');
const vocabBank = require('./fixtures/packets_vocab_bank_fixture.js');
await vocabBank.load();

const wavB64 = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF', 0); b.writeUInt32LE(56, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(20, 40); b.write(String(tag || '').slice(0, 20), 44);
  return b.toString('base64');
};
const wavUri = (tag) => 'data:audio/wav;base64,' + wavB64(tag);
const pngUri = (fill) => 'data:image/png;base64,' + Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, fill),
]).toString('base64');

const fakeBank = (name) => new Proxy({}, {
  get: (_, k) => (typeof k === 'string' ? wavUri(name + '/' + k) : undefined),
  getOwnPropertyDescriptor: (_, k) => (typeof k === 'string'
    ? { value: wavUri(name + '/' + k), enumerable: true, configurable: true, writable: false }
    : undefined),
});
const BANKS = { words: fakeBank('words'), phonemes: fakeBank('phonemes'), isolation: fakeBank('isolation'), instructions: fakeBank('instructions') };

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms = 25) => new Promise((r) => setTimeout(r, ms));

function openFile(html, { voices = null, captureWaits = false, fastTimers = false } = {}) {
  const played = [], spoken = [], waits = [];
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/wave6.html',
    beforeParse(w) {
      w.Audio = class {
        play() {
          played.push(this.src);
          const me = this;
          setTimeout(() => { if (me.onended) me.onended(); }, 3);
          return Promise.resolve();
        }
        pause() {}
      };
      if (voices) {
        w.speechSynthesis = {
          getVoices: () => voices,
          cancel() {},
          speak(u) { if (u.text) spoken.push(u.text); setTimeout(() => { if (u.onend) u.onend(); }, 3); },
          addEventListener() {},
        };
        w.SpeechSynthesisUtterance = function (text) { this.text = text; };
      }
      if (captureWaits || fastTimers) {
        const real = w.setTimeout.bind(w);
        w.setTimeout = (fn, ms, ...rest) => {
          waits.push(ms);
          // Do not accelerate the 5000ms/20000ms audio safety watchdogs ahead of the 3ms Audio mock.
          return real(fn, fastTimers && ms < 2000 ? 0 : ms, ...rest);
        };
      }
    },
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (s) => d.querySelector(s);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const btn = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const key = (k, target = d.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const audioId = (src) => Object.keys(lesson.audio || {}).find((k) => lesson.audio[k] === src) || src;
  return {
    w, d, lesson, played, spoken, waits, q, seen, btn, key, audioId,
    playedIds: () => played.map(audioId),
    start: (name = 'Ana') => {
      const inp = d.getElementById('learner-name');
      if (inp) inp.value = name;
      btn('Start').click();
    },
  };
}

describe('Item #1 — Find Sounds (isolation) middle & last naming + clips + skipDirections', () => {
  const makeIsoRow = (w, phonemes, pos, correct, options) => ({
    word: w, targetWord: w, term: w, phonemes, phonemeCount: phonemes.length,
    _ttsAssets: { [w]: { mime: 'audio/wav', base64: wavB64('w-' + w) } },
    activityItems: { isolation: { position: pos, correctSound: correct, options } },
  });

  it('asks "first", "middle" (3-sound middle), "last" (final sound), and ordinals in between, using isolation.middle/last clips', async () => {
    const rows = [
      makeIsoRow('cat', ['k', 'a', 't'], 0, 'k', ['k', 'a', 't']),
      makeIsoRow('bat', ['b', 'a', 't'], 1, 'a', ['b', 'a', 't']),
      makeIsoRow('hat', ['h', 'a', 't'], 2, 't', ['h', 'a', 't']),
      makeIsoRow('frog', ['f', 'r', 'o', 'g'], 1, 'r', ['f', 'r', 'o', 'g']),
      makeIsoRow('clap', ['k', 'l', 'a', 'p'], 3, 'p', ['k', 'l', 'a', 'p']),
    ];
    const { lesson } = loader.lessonFromPack(rows, { core, banks: BANKS, activities: ['isolation'], title: 'Iso', lessonId: 'L-w6-iso' });
    const items = lesson.blocks[0].items;
    expect(items.map((it) => it.positionName || null)).toEqual([null, 'middle', 'last', null, 'last']);
    expect(lesson.audio[items[0].promptAudio]).toBe(wavUri('isolation/1st'));
    expect(lesson.audio[items[1].promptAudio]).toBe(wavUri('isolation/middle'));
    expect(lesson.audio[items[2].promptAudio]).toBe(wavUri('isolation/last'));
    expect(lesson.audio[items[3].promptAudio]).toBe(wavUri('isolation/2nd'));
    expect(lesson.audio[items[4].promptAudio]).toBe(wavUri('isolation/last'));

    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    const prompts = [];
    for (let i = 0; i < items.length; i++) {
      prompts.push(f.d.querySelector('#app p.letters').textContent);
      const ans = [...f.d.querySelectorAll('#app li.choice button.primary')][0];
      ans.click();
      if (!f.btn('Next') && !f.btn('See my results')) [...f.d.querySelectorAll('#app li.choice button.primary')][1].click();
      if (f.btn('Next')) f.btn('Next').click();
    }
    expect(prompts).toEqual([
      'What is the first sound in the word?',
      'What is the middle sound in the word?',
      'What is the last sound in the word?',
      'What is the second sound in the word?',
      'What is the last sound in the word?',
    ]);
  });

  it('skipDirections treats consecutive "last" items across different word lengths as same question, and replays when last changes to third', async () => {
    const rows = [
      makeIsoRow('cat', ['k', 'a', 't'], 2, 't', ['k', 'a', 't']),
      makeIsoRow('frog', ['f', 'r', 'o', 'g'], 3, 'g', ['f', 'r', 'o', 'g']),
      makeIsoRow('clap', ['k', 'l', 'a', 'p'], 2, 'a', ['k', 'l', 'a', 'p']),
    ];
    const { lesson } = loader.lessonFromPack(rows, { core, banks: BANKS, activities: ['isolation'], title: 'Iso skip', lessonId: 'L-w6-iso-skip', instructionsOnce: true });
    const items = lesson.blocks[0].items;
    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(30);
    // Item 1 (cat, last): plays promptAudio + wordAudio.
    expect(f.playedIds()).toEqual([items[0].promptAudio, items[0].wordAudio]);

    // Advance to item 2 (frog, last): same positionName 'last' -> skips promptAudio!
    f.d.querySelectorAll('#app li.choice button.primary')[2].click();
    await wait(20);
    f.played.length = 0;
    f.btn('Next').click();
    await wait(30);
    expect(f.playedIds()).toEqual([items[1].wordAudio]);

    // Advance to item 3 (clap, position 2 = third): different from 'last' -> plays full introAudio!
    f.d.querySelectorAll('#app li.choice button.primary')[3].click();
    await wait(20);
    f.played.length = 0;
    f.btn('Next').click();
    await wait(30);
    expect(f.playedIds()).toEqual([items[2].promptAudio, items[2].wordAudio]);
  });

  it('falls back cleanly to ordinal clip & text when a minimal bank omits isolation.last/middle', () => {
    const minBanks = {
      isolation: { '1st': wavUri('iso/1st'), '2nd': wavUri('iso/2nd'), '3rd': wavUri('iso/3rd') },
      phonemes: BANKS.phonemes,
      instructions: BANKS.instructions,
    };
    const { lesson } = loader.lessonFromPack([makeIsoRow('cat', ['k', 'a', 't'], 2, 't', ['k', 'a', 't'])], { core, banks: minBanks, activities: ['isolation'], title: 'Min', lessonId: 'L-min' });
    const item = lesson.blocks[0].items[0];
    expect(item.positionName).toBeUndefined();
    expect(lesson.audio[item.promptAudio]).toBe(wavUri('iso/3rd'));
  });
});

describe('Item #3 — Symbol Runner direct keyboard typing, prefix-guarded auto-submit, color_stroop r/b/g/y & retry audio', () => {
  const makeSrLesson = ({ title, isCheck = false, items, audio = {}, timeLimitS = null }) => {
    const srAdapter = loader.CHECK_ADAPTERS.symbol_runner;
    const prepared = items.map((spec, idx) => {
      const p = srAdapter.prepare(spec);
      expect(p.missing).toBeUndefined();
      return Object.assign({ id: 'symbol_runner-' + (idx + 1) }, p.item);
    });
    const lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: 'L-w6-sr-' + (isCheck ? 'chk' : 'prac'),
      revision: '1',
      title,
      mode: isCheck ? 'probe' : 'practice',
      timeLimitS: isCheck ? (timeLimitS || 60) : null,
      showLetters: true,
      blocks: [{ activity: 'symbol_runner', items: prepared }],
      audio,
      images: {},
      feedback: { correct: [], retry: null },
    };
    return isCheck ? loader.sealCheck(lesson) : lesson;
  };

  it('supports direct letter keys outside input, replays item.audio on practice retry, and auto-submits exact unambiguous typed match', async () => {
    const lesson = makeSrLesson({
      title: 'Confusable letters',
      items: [
        { word: 'b', answer: 'b', lane: 1, control: 'direct', choices: ['b', 'd', 'p', 'q'], audio: 'a1' },
        { word: 'the', answer: 'the', lane: 1, control: 'direct', choices: ['the', 'they', 'then'], audio: 'a2' },
        { word: 'd', answer: 'd', lane: 1, control: 'direct', choices: ['b', 'd', 'p', 'q'], audio: 'a3' },
      ],
      audio: { a1: wavUri('sym-b'), a2: wavUri('sym-the'), a3: wavUri('sym-d') },
    });
    const html = loader.buildHtml(lesson, { core });
    const f = openFile(html);
    f.start();
    await wait(20);
    f.played.length = 0;

    // Wrong direct key 'd' outside input triggers practice retry and replays anchor audio a1.
    f.key('d');
    await wait(20);
    expect(f.played).toContain(wavUri('sym-b'));
    expect(f.q('[data-sr-choice="d"]').disabled).toBe(true);

    // Pressing 'r' (not a choice) still triggers shell R replay of item.audio!
    f.played.length = 0;
    f.key('r');
    await wait(20);
    expect(f.played).toContain(wavUri('sym-b'));

    // Correct direct key 'b' outside input finishes item 1!
    f.key('b');
    await wait(20);
    expect(f.btn('Next')).toBeTruthy();

    // Item 2: prefix collision ('the' vs 'they'/'then') must NOT auto-submit on input!
    f.btn('Next').click();
    await wait(20);
    const inp2 = f.q('[data-sr-input]');
    inp2.value = 'the';
    inp2.dispatchEvent(new f.w.Event('input', { bubbles: true }));
    expect(f.btn('Next')).toBeFalsy();
    inp2.dispatchEvent(new f.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(f.btn('Next')).toBeTruthy();

    // Item 3: unambiguous exact match ('d') in textInput auto-submits immediately!
    f.btn('Next').click();
    await wait(20);
    const inp3 = f.q('[data-sr-input]');
    inp3.value = 'd';
    inp3.dispatchEvent(new f.w.Event('input', { bubbles: true }));
    expect(f.btn('See my results')).toBeTruthy();
  });

  it('supports color_stroop r/b/g/y shortcuts without replaying audio on stroop retry, and never auto-submits in check mode', async () => {
    const lesson = makeSrLesson({
      title: 'Colors',
      items: [
        { word: 'BLUE', answer: 'gold', lane: 1, control: 'direct', choices: ['red', 'blue', 'green', 'gold'], stroopInk: '#a16207', stroopShape: '★', audio: 'a1' },
      ],
      audio: { a1: wavUri('stroop-a1') },
    });
    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(20);
    f.played.length = 0;

    // 'r' picks 'red' (wrong) -> retry must NOT replay audio when stroopInk is set.
    f.key('r');
    await wait(20);
    expect(f.q('[data-sr-choice="red"]').disabled).toBe(true);
    expect(f.played).not.toContain(wavUri('stroop-a1'));

    // 'y' picks 'gold' (right)!
    f.key('y');
    await wait(20);
    expect(f.btn('See my results')).toBeTruthy();

    // Check mode: typing into textInput does NOT auto-submit.
    const checkBuilt = SR.lessonFromSymbolRunner({ loader, mode: 'letters_lower', packetMode: 'check', timeLimitS: 60, length: 4 });
    const checkHtml = SR.buildSymbolRunnerPacket({ lesson: checkBuilt.lesson, loader }).html;
    const c = openFile(checkHtml);
    c.d.getElementById('learner-name').value = 'Ana';
    c.btn('Next').click();
    await wait(20);
    // Advance past any check practice screens to scored run if present.
    for (let guard = 0; guard < 5 && !c.q('[data-check-begin]'); guard++) {
      const cover = c.q('[data-sr-cover]');
      if (cover && !cover.hidden) { cover.click(); await wait(20); }
      const firstChoice = c.q('[data-sr-choice]');
      if (firstChoice) { await wait(270); firstChoice.click(); await wait(20); }
      const pNext = c.q('[data-practice-next]');
      if (pNext) { pNext.click(); await wait(20); }
    }
    c.q('[data-check-begin]').click();
    await wait(270);
    const cinp = c.q('[data-sr-input]');
    const firstVal = c.q('[data-sr-choice]').getAttribute('data-sr-choice');
    cinp.value = firstVal;
    cinp.dispatchEvent(new c.w.Event('input', { bubbles: true }));
    expect(c.q('[data-sr-input]')).toBeTruthy(); // still on the item until Enter/Check
  });
});

describe('Item #4 — Picture the Sentence per-slot retry feedback hold + early clear on next tap', () => {
  const makeSentenceFile = () => {
    const row = {
      word: 'cat', targetWord: 'cat', term: 'cat',
      _ttsAssets: {
        'Read the sentence. Match the pictures to it.': { mime: 'audio/wav', base64: wavB64('sm-p') },
        'The cat saw a dog.': { mime: 'audio/wav', base64: wavB64('sm-s') },
      },
      _aacAssets: { cat: pngUri(1), dog: pngUri(2), sun: pngUri(3) },
      activityItems: { sentence_match: { sentence: 'The cat saw a dog.', sequence: ['cat', 'dog'], extras: ['sun'] } },
    };
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['sentence_match'], title: 'SM', lessonId: 'L-w6-sm' });
    return loader.buildHtml(lesson, { core });
  };

  it('marks right slot --ok and wrong slot --warn on retry, and clears immediately when next tile is tapped', async () => {
    const f = openFile(makeSentenceFile());
    f.start();
    await wait(20);
    const tile = (w) => [...f.d.querySelectorAll('#app ul.choices button')].find((b) => b.getAttribute('aria-label') === 'Picture of ' + w);
    const slots = () => [...f.d.querySelectorAll('#app ul.slots button')];

    // Place cat (right) in slot 0, sun (wrong) in slot 1 -> triggers retry hold.
    tile('cat').click();
    tile('sun').click();
    expect(slots()[0].getAttribute('data-retry-mark')).toBe('ok');
    expect(slots()[0].style.borderColor).toBe('var(--ok)');
    expect(slots()[0].style.background).toBe('var(--ok-bg)');
    expect(slots()[1].getAttribute('data-retry-mark')).toBe('warn');
    expect(slots()[1].style.borderColor).toBe('var(--warn)');
    expect(slots()[1].style.background).toBe('var(--warn-bg)');

    // Tapping 'cat' immediately during the hold cancels the hold, clears old slots, and places 'cat' into slot 0!
    tile('cat').click();
    expect(slots()[0].getAttribute('data-retry-mark')).toBeNull();
    expect(slots()[0].getAttribute('aria-label')).toContain('cat');
    expect(slots()[1].getAttribute('aria-label')).toContain('empty');

    // Finish with 'dog' -> correct!
    tile('dog').click();
    expect(f.btn('See my results')).toBeTruthy();
  });

  it('clears retry marks automatically after the brief hold timer', async () => {
    const f = openFile(makeSentenceFile(), { captureWaits: true });
    f.start();
    await wait(20);
    const tile = (w) => [...f.d.querySelectorAll('#app ul.choices button')].find((b) => b.getAttribute('aria-label') === 'Picture of ' + w);
    const slots = () => [...f.d.querySelectorAll('#app ul.slots button')];
    f.waits.length = 0;
    tile('sun').click();
    tile('dog').click();
    expect(slots()[0].getAttribute('data-retry-mark')).toBe('warn');
    expect(slots()[1].getAttribute('data-retry-mark')).toBe('ok');
    expect(f.waits.some((ms) => ms >= 1100 && ms <= 1400)).toBe(true);
    await wait(1350);
    expect(slots()[0].getAttribute('data-retry-mark')).toBeNull();
    expect(slots()[0].getAttribute('aria-label')).toContain('empty');
  });
});

describe('Item #5 — Sound Mapping retry error marking, drag-and-drop, ● ● spanning cue & --soft filled contrast', () => {
  it('marks wrong slots --warn + "check this one" on retry, uses --soft on filled slots, shows ● ● on spanning slots, and supports drag-and-drop', async () => {
    const row = {
      word: 'queen', targetWord: 'queen', term: 'queen',
      phonemes: ['k', 'w', 'ee', 'n'], phonemeCount: 4,
      graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1],
      _ttsAssets: { queen: { mime: 'audio/wav', base64: wavB64('w-queen') } },
      activityItems: { mapping: { graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1], chipOrder: [{ id: 2, text: 'n' }, { id: 0, text: 'qu' }, { id: 1, text: 'ee' }] } },
    };
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['mapping'], title: 'Map', lessonId: 'L-w6-map' });
    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(20);

    const pick = (s) => [...f.d.querySelectorAll('[data-map-tile]')].find((b) => b.textContent === s);
    const slot = (i) => f.q('[data-map-slot="' + i + '"]');

    // Tray chip keeps exact textContent 'qu' (no dots in tray).
    expect(pick('qu').textContent).toBe('qu');

    // Drag 'qu' onto slot 0!
    const drag = (from, to) => {
      const ev = (type, x, y) => from.dispatchEvent(new f.w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      f.d.elementFromPoint = () => to;
      ev('pointerdown', 10, 10); ev('pointermove', 40, 40); ev('pointerup', 40, 40);
      from.dispatchEvent(new f.w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    };
    drag(pick('qu'), slot(0));
    expect(slot(0).getAttribute('data-span')).toBe('2');
    expect(slot(0).style.background).toBe('var(--soft)');
    expect(slot(0).querySelector('[data-span-dots][aria-hidden="true"]').textContent).toBe('●●');

    // Place wrong order for last two slots ('n' at slot 2, 'ee' at slot 3) -> retry marks slots 2 and 3 wrong, leaves slot 0 clean.
    await wait(420);
    pick('n').click(); slot(2).click();
    pick('ee').click(); slot(3).click();
    expect(slot(0).getAttribute('data-mapping-error')).toBeNull();
    expect(slot(2).getAttribute('data-mapping-error')).toBe('true');
    expect(slot(2).style.borderColor).toBe('var(--warn)');
    expect(slot(2).style.background).toBe('var(--warn-bg)');
    expect(slot(2).getAttribute('aria-label')).toContain('check this one');
    expect(slot(3).getAttribute('aria-label')).toContain('check this one');

    // Drag slot 2 onto slot 3 to swap them -> auto-grades correct!
    await wait(420);
    drag(slot(2), slot(3));
    expect(f.btn('See my results')).toBeTruthy();
  });
});

describe('Item #6 — Word Scramble keyboard typing (a-z, Backspace, Enter) & pointer drag-and-drop', () => {
  it('places letters with keyboard, pops with Backspace, submits with Enter, and supports pointer drag-and-drop', async () => {
    const built = await builder.buildPacket({ words: ['cat'], activities: ['word_scramble'], title: 'WS', seed: 1, core, dictionary, banks: BANKS, loader, knownWords: ['cat'] });
    const f = openFile(built.html);
    f.start();
    await wait(20);
    const box = (i) => f.q('[data-ws-box="' + i + '"]');

    // Type c, a, x (ignored), Backspace (pops a), a, t, Enter (submits!).
    f.key('c');
    f.key('a');
    expect(box(0).textContent).toBe('c');
    expect(box(1).textContent).toBe('a');
    f.key('Backspace');
    expect(box(1).textContent).toBe('');
    f.key('a');
    f.key('t');
    f.key('Enter');
    expect(f.btn('See my results')).toBeTruthy();

    // Drag-and-drop in a fresh instance: drag tile onto box, swap boxes, drag back to tray.
    const f2 = openFile(built.html);
    f2.start();
    await wait(20);
    const tileC = [...f2.d.querySelectorAll('[data-ws-tile]')].find((b) => b.textContent === 'c');
    const b0 = f2.q('[data-ws-box="0"]'), b1 = f2.q('[data-ws-box="1"]'), tray = f2.q('[data-ws-tray]');
    const drag = (from, to) => {
      const ev = (type, x, y) => from.dispatchEvent(new f2.w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      f2.d.elementFromPoint = () => to;
      ev('pointerdown', 10, 10); ev('pointermove', 40, 40); ev('pointerup', 40, 40);
    };
    drag(tileC, b0);
    expect(b0.textContent).toBe('c');
    await wait(420);
    drag(b0, b1);
    expect(b0.textContent).toBe('');
    expect(b1.textContent).toBe('c');
    await wait(420);
    drag(b1, tray);
    expect(b1.textContent).toBe('');
  });
});

describe('Item #7 (Player Half) — Sight & Spell letterBank, lengthHint, inputmode & shown capitalization', () => {
  it('renders Easy letterBank tiles & _ _ _ placeholder, sets inputmode none/text, and preserves capitalized item.shown', async () => {
    const rows = [
      {
        word: 'Sam', targetWord: 'Sam', term: 'Sam',
        _ttsAssets: { Sam: { mime: 'audio/wav', base64: wavB64('w-Sam') } },
        activityItems: { orthography: { letterBank: ['a', 'b', 'm', 'p', 's', 't'], lengthHint: true } },
      },
      {
        word: 'café', targetWord: 'café', term: 'café',
        _ttsAssets: { 'café': { mime: 'audio/wav', base64: wavB64('w-cafe') } },
        activityItems: {},
      },
    ];
    const { lesson } = loader.lessonFromPack(rows, { core, banks: BANKS, activities: ['orthography'], title: 'Ortho', lessonId: 'L-w6-ortho' });
    const [sam, cafe] = lesson.blocks[0].items;
    expect(sam.shown).toBe('Sam');
    expect(sam.letterBank).toEqual(['a', 'b', 'm', 'p', 's', 't']);
    expect(sam.lengthHint).toBe(true);
    expect(cafe.letterBank).toBeUndefined();
    expect(cafe.lengthHint).toBeUndefined();

    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(20);
    const inp1 = f.q('#app input[type="text"]');
    expect(inp1.getAttribute('inputmode')).toBe('none');
    expect(inp1.getAttribute('placeholder')).toBe('_ _ _');
    const tiles1 = [...f.d.querySelectorAll('#app [aria-label="Letters"] button')].map((b) => b.textContent);
    expect(tiles1).toEqual(['a', 'b', 'm', 'p', 's', 't']);

    // Spell "sam" -> feedback & revealed answer line show capitalized "Sam".
    inp1.value = 'sam';
    f.btn('Check spelling').click();
    expect(f.d.querySelector('[data-feedback]').textContent).toContain('Sam');
    expect(f.d.body.textContent).toContain('The word is spelled: Sam');

    // Item 2: accented word without letterBank -> full 26 + é tiles, inputmode="text", no placeholder.
    f.btn('Next').click();
    await wait(20);
    const inp2 = f.q('#app input[type="text"]');
    expect(inp2.getAttribute('inputmode')).toBe('text');
    expect(inp2.getAttribute('placeholder')).toBeNull();
    const tiles2 = [...f.d.querySelectorAll('#app [aria-label="Letters"] button')].map((b) => b.textContent);
    expect(tiles2.length).toBe(27);
    expect(tiles2).toContain('é');
  });

  it('end-to-end Easy orthography packet built with word_sounds_packet_builder renders scaffolded letterBank and _ _ _ placeholder', async () => {
    const easy = await builder.buildPacket({ words: ['cat'], activities: ['orthography'], choices: 'easy', title: 'Easy Ortho', seed: 1, core, dictionary, banks: BANKS, loader, knownWords: ['cat'] });
    const hard = await builder.buildPacket({ words: ['cat'], activities: ['orthography'], choices: 'all', title: 'Hard Ortho', seed: 1, core, dictionary, banks: BANKS, loader, knownWords: ['cat'] });
    const fe = openFile(easy.html);
    fe.start();
    await wait(20);
    const easyTiles = [...fe.d.querySelectorAll('#app [aria-label="Letters"] button')].map((b) => b.textContent);
    expect(easyTiles.length).toBeLessThanOrEqual(7);
    expect(easyTiles).toEqual(expect.arrayContaining(['c', 'a', 't']));
    expect(fe.q('#app input[type="text"]').getAttribute('placeholder')).toBe('_ _ _');

    const fh = openFile(hard.html);
    fh.start();
    await wait(20);
    const hardTiles = [...fh.d.querySelectorAll('#app [aria-label="Letters"] button')].map((b) => b.textContent);
    expect(hardTiles.length).toBe(26);
    expect(fh.q('#app input[type="text"]').getAttribute('placeholder')).toBeNull();
  });
});

describe('Item #8 — Missing Letter .tried on retry + direct letter key & Enter support', () => {
  it('marks wrong choice .tried + aria-disabled on retry and supports typing the choice letter + Enter', async () => {
    const row = {
      word: 'cat', targetWord: 'cat', term: 'cat',
      _ttsAssets: { cat: { mime: 'audio/wav', base64: wavB64('w-cat') } },
      activityItems: { missing_letter: { hiddenIndex: 1, correctLetter: 'a', options: ['a', 'e', 'i', 'o'] } },
    };
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['missing_letter'], title: 'ML', lessonId: 'L-w6-ml' });
    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(20);

    // Type 'e' then Enter -> wrong, retry marks 'e' as .tried + aria-disabled="true".
    f.key('e');
    const btnE = [...f.d.querySelectorAll('#app li.choice button')].find((b) => b.textContent === 'e');
    expect(btnE.getAttribute('aria-pressed')).toBe('true');
    f.key('Enter');
    expect(btnE.parentNode.classList.contains('tried')).toBe(true);
    expect(btnE.getAttribute('aria-disabled')).toBe('true');

    // Pressing 'e' again does not re-select the tried letter.
    f.key('e');
    expect(btnE.getAttribute('aria-pressed')).toBe('false');

    // Pressing 'a' then Enter selects and submits correctly!
    f.key('a');
    f.key('Enter');
    expect(f.btn('See my results')).toBeTruthy();
  });
});

describe('Item #9 — Vocabulary R replay shortcut (practice & check) + inline vocab_blank reveal in var(--ok)', () => {
  const VOICES = [{ lang: 'en-US', localService: true, name: 'On device' }];
  const makeVocab = (mode = 'practice', readAloud = true) => {
    const rows = V.draftRows({ words: V.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage, ancient').words, bank: vocabBank });
    const lesson = V.lessonFromVocab({ loader, rows, types: ['blank'], mode, readAloud });
    return V.buildVocabPacket({ lesson, loader, rows, bank: vocabBank, readAloud });
  };

  it('replays question on R in practice mode, ignores R when readAloud is off, and fills ___ inline in var(--ok) on reveal', async () => {
    const f = openFile(makeVocab('practice', true).html, { voices: VOICES });
    f.start();
    await wait(20);
    f.spoken.length = 0;
    f.key('r');
    await wait(20);
    expect(f.spoken.length).toBeGreaterThan(0);

    // Answer the first vocab_blank item (may need 2 tries if first choice wrong) and verify inline reveal!
    const item = f.lesson.blocks[0].items[0];
    const rightIdx = item.choices.findIndex((c) => c.text.slice(0, 80) === item.answer);
    f.q('[data-choice="' + (rightIdx + 1) + '"]').click();
    const filled = f.q('[data-blank-filled]');
    expect(filled).toBeTruthy();
    expect(filled.textContent).toBe(item.choices[rightIdx].text);
    expect(filled.style.color).toBe('var(--ok)');
    expect(f.q('[data-read]').textContent).not.toContain('___');

    // With readAloud off, R does nothing.
    const off = openFile(makeVocab('practice', false).html, { voices: VOICES });
    off.start();
    await wait(20);
    off.spoken.length = 0;
    off.key('R');
    await wait(20);
    expect(off.spoken).toEqual([]);
  });

  it('replays question on R in Check mode when Read Aloud is active', async () => {
    const c = openFile(makeVocab('check', true).html, { voices: VOICES });
    c.d.getElementById('learner-name').value = 'Ana';
    c.btn('Next').click();
    await wait(20);
    // Advance past any practice item(s) to the Get ready screen.
    while (!c.q('[data-check-begin]')) {
      await wait(260);
      c.q('[data-choice="1"]').click();
      await wait(20);
      c.q('[data-practice-next]').click();
      await wait(20);
    }
    c.q('[data-check-begin]').click();
    await wait(20);
    c.spoken.length = 0;
    c.key('r');
    await wait(20);
    expect(c.spoken.length).toBeGreaterThan(0);
  });
});

describe('Item #10 — Syllable Blending & Break it Down soundGap + choices, and Syllable Claps focus/Space/Backspace', () => {
  const makeSylBlendHtml = () => {
    const row = {
      word: 'sunset', targetWord: 'sunset', term: 'sunset',
      _ttsAssets: {
        sunset: { mime: 'audio/wav', base64: wavB64('w-sunset') },
        sun: { mime: 'audio/wav', base64: wavB64('w-sun') },
        set: { mime: 'audio/wav', base64: wavB64('w-set') },
        cupcake: { mime: 'audio/wav', base64: wavB64('w-cupcake') },
      },
      activityItems: {
        syllable_blending: {
          version: 1, language: 'en', targetWord: 'sunset', supported: true, contentStatus: 'curated_compound',
          syllables: ['sun', 'set'],
          audioUnits: [{ text: 'sun', key: 'sun', audio: 'sun' }, { text: 'set', key: 'set', audio: 'set' }],
          options: ['sunset', 'cupcake'], answer: 'sunset',
        },
      },
    };
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['syllable_blending'], title: 'SB', lessonId: 'L-w6-sb' });
    return loader.buildHtml(lesson, { core });
  };

  it('syllable_blending enables Space between sounds + Read the choices and uses ctx.soundGap() & auto-reads choices after syllables finish', async () => {
    const html = makeSylBlendHtml();
    const f = openFile(html, { captureWaits: true, fastTimers: true });
    f.q('[data-tools-open]').click();
    expect(f.q('[data-tool-group="sounds"]').hidden).toBe(false);
    expect(f.q('[data-tool-group="choices"]').hidden).toBe(false);
    f.q('[data-tool="sounds-1"]').click(); // More = 800 ms
    f.q('[data-tool="choices-1"]').click(); // Read the choices = On
    f.waits.length = 0;
    f.start();
    await wait(80);
    // Opening used 800 ms soundGap between syllables!
    expect(f.waits).toContain(800);
    // And once syllables finished, Hear all auto-started and played the choice clips!
    const sbItem = f.lesson.blocks[0].items[0];
    expect(f.played).toContain(f.lesson.audio[sbItem.choices[0].audio]);
    expect(f.played).toContain(f.lesson.audio[sbItem.choices[1].audio]);
  });

  it('segmentation enables Space between sounds and uses ctx.soundGap() in Play my sounds', async () => {
    const built = await builder.buildPacket({ words: ['cat'], activities: ['segmentation'], title: 'Seg', seed: 1, core, dictionary, banks: BANKS, loader, knownWords: ['cat'] });
    const f = openFile(built.html, { captureWaits: true, fastTimers: true });
    f.q('[data-tools-open]').click();
    expect(f.q('[data-tool-group="sounds"]').hidden).toBe(false);
    f.q('[data-tool="sounds-2"]').click(); // Less = 250 ms
    f.start();
    await wait(30);
    // Place one sound in box 0, then click "Play my sounds".
    f.q('[data-seg-tile="0"]').click();
    f.q('[data-seg-box="0"]').click();
    f.waits.length = 0;
    f.btn('Play my sounds').click();
    await wait(60);
    expect(f.waits).toContain(250);
    expect(f.waits).toContain(350); // empty box = gap + 100
  });

  it('syllable_counting wires Space (clap), Backspace (undo), and restores focus to Clap button on Undo/Reset/retry Submit', async () => {
    const row = {
      word: 'sunset', targetWord: 'sunset', term: 'sunset', syllables: ['sun', 'set'],
      _ttsAssets: { sunset: { mime: 'audio/wav', base64: wavB64('w-sunset') } },
      activityItems: {
        syllable_counting: { supported: true, count: 2, targetWord: 'sunset', language: 'en', source: 'curated_compound' },
      },
    };
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['syllable_counting'], title: 'SC', lessonId: 'L-w6-sc' });
    const f = openFile(loader.buildHtml(lesson, { core }));
    f.start();
    await wait(40);
    const clapBtn = f.d.querySelector('button[aria-label="Tap to count syllables"]');
    const undoBtn = f.btn('Undo last tap');
    const resetBtn = f.btn('Reset');
    const checkBtn = f.btn('Check');

    // Space claps once; Backspace undoes to 0 and restores focus to Clap button!
    f.key(' ');
    expect(f.d.querySelector('#app p[aria-hidden="true"]').textContent).toBe('1');
    undoBtn.focus();
    f.key('Backspace');
    expect(f.d.querySelector('#app p[aria-hidden="true"]').textContent).toBe('0');
    expect(f.d.activeElement).toBe(clapBtn);

    // Space on Clap button claps once (no duplicate native click) and Reset restores focus to Clap button.
    clapBtn.focus();
    f.key(' ', clapBtn);
    expect(f.d.querySelector('#app p[aria-hidden="true"]').textContent).toBe('1');
    resetBtn.focus();
    resetBtn.click();
    expect(f.d.activeElement).toBe(clapBtn);

    // Wrong Check (1 clap instead of 2) triggers retry, resets taps to 0, and restores focus to Clap button!
    f.key(' ');
    checkBtn.focus();
    checkBtn.click();
    expect(f.d.querySelector('#app p[aria-hidden="true"]').textContent).toBe('0');
    expect(f.d.activeElement).toBe(clapBtn);
  });
});
