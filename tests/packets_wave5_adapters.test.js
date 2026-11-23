// @vitest-environment jsdom
// Wave 5 Track A (2026-11-22): Remaining 12 Student Practice Adapters —
// Audio-chain Escape/Stop deadlock & stuck-outline fixes (7 adapters),
// 390px phone overflow & compact single-row fit (9 adapters),
// keyboard & screen-reader parity (sentence_match, missing_letter, counting + lang="en").
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, loader } = tool.loadParts();
const TH = loader;

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
const mounted = [];
afterEach(() => {
  while (mounted.length) { try { mounted.pop().remove(); } catch (_) {} }
  while (opened.length) { try { opened.pop().close(); } catch (_) {} }
});

const wait = (ms = 25) => new Promise((r) => setTimeout(r, ms));
const fmt = (s, params) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => (params && params[k] != null ? String(params[k]) : ''));

function makeEl(doc) {
  return (tag, attrs, kids) => {
    const n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      const v = attrs[k];
      if (k === 'text') n.textContent = v;
      else if (k === 'on') Object.keys(v || {}).forEach((ev) => n.addEventListener(ev, v[ev]));
      else if (k === 'hidden') n.hidden = !!v;
      else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : String(v));
    });
    (kids || []).forEach((c) => {
      if (c != null) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    });
    return n;
  };
}

function makeHearAll(doc, el) {
  return (spec) => {
    const button = el('button', { type: 'button', 'data-hear-all': '', text: (spec && spec.label) || 'Hear all' });
    const note = el('p', { class: 'hear-now muted', 'data-hear-now': '' });
    return { button, note, node: el('div', { class: 'row', 'data-hear-row': '' }, [button, note]), start() {}, halt() {}, auto: !spec || spec.auto !== false };
  };
}

function mountAdapter(id, item, over = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  mounted.push(root);
  const el = makeEl(document);
  const adapter = TH.ADAPTERS[id];
  const L = Object.assign({}, TH.DEFAULT_LABELS, adapter.labels, over.L || {});
  let keyHandler = null;
  let stops = 0;
  let done = false;
  const announced = [];
  const played = [];
  const ctx = {
    root,
    el,
    fmt,
    L,
    item,
    showLetters: over.showLetters !== undefined ? over.showLetters : true,
    skipDirections: !!over.skipDirections,
    noFocus: !!over.noFocus,
    soundGap: over.soundGap || (() => 50),
    image: over.image || ((x) => (x ? pngUri(1) : null)),
    hearAll: over.noHearAll ? undefined : makeHearAll(document, el),
    keys: (fn) => { keyHandler = fn; },
    play: over.play || ((clip) => { played.push(clip); return Promise.resolve(true); }),
    stop: () => { stops++; if (over.onStop) over.onStop(); },
    support: () => {},
    announce: (msg) => { announced.push(msg); },
    isDone: () => (typeof over.isDone === 'function' ? over.isDone() : done),
    attempts: () => 0,
    answer: over.answer || ((_, right) => { if (right) done = true; return right ? 'correct' : 'retry'; }),
  };
  const handle = adapter.render(item, ctx) || {};
  return {
    root,
    handle,
    ctx,
    played,
    announced,
    get stops() { return stops; },
    setDone: (v) => { done = !!v; },
    sendKey: (k) => (keyHandler ? keyHandler(k) : false),
  };
}

function openFile(html, { audioMs = 5, holdAudio = false } = {}) {
  const played = [];
  const activeAudios = [];
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/wave5.html',
    beforeParse(w) {
      w.Audio = class {
        play() {
          played.push(this.src);
          this.paused = false;
          activeAudios.push(this);
          const me = this;
          if (!holdAudio) {
            this._t = setTimeout(() => { if (!me.paused && me.onended) me.onended(); }, audioMs);
          }
          return Promise.resolve();
        }
        pause() {
          this.paused = true;
          if (this._t) clearTimeout(this._t);
        }
      };
    },
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  const q = (s) => d.querySelector(s);
  const seen = (n) => !!n && !n.closest('[hidden]');
  const btn = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const key = (k, target = d.body) => target.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  return {
    w, d, lesson, played, activeAudios, q, seen, btn, key,
    start: (name = 'Ana') => {
      const inp = d.getElementById('learner-name');
      if (inp) inp.value = name;
      btn('Start').click();
    },
  };
}

// ---------------------------------------------------------------------------
// 1. Audio-Chain Escape / Stop Deadlock & Stuck Outlines (7 Adapters)
// ---------------------------------------------------------------------------
describe('1. Audio-chain Escape / Stop deadlock fixes & stuck outline clearing', () => {
  const sylItem = {
    id: 'syllable_blending-0',
    word: 'sunset',
    target: 'sunset',
    syllables: ['sun', 'set'],
    units: ['u1', 'u2'],
    promptAudio: 'p0',
    choices: [{ text: 'sunset', audio: 'c1' }, { text: 'cupcake', audio: 'c2' }],
  };

  it('syllable_blending: Escape and toolbar Stop audio break pending ctx.play() deadlock, unlock buttons, clear highlight, and cancel timers', async () => {
    // Pending play() that NEVER resolves (exact behavior of shell stop() incrementing playToken++).
    const played = [];
    const m = mountAdapter('syllable_blending', sylItem, {
      skipDirections: true,
      soundGap: () => 80,
      play: (id) => { played.push(id); return new Promise(() => {}); },
    });
    const slots = [...m.root.querySelectorAll('.slot')];
    const listenBtns = [...m.root.querySelectorAll('li.choice button:not(.primary)')];
    const hearBtn = m.root.querySelector('[data-hear-all]');

    // While audio is hanging, syllable 0 is lit and Listen / Hear all are locked.
    expect(played).toEqual(['u1']);
    expect(slots[0].style.background).toBe('var(--accent)');
    expect(listenBtns[0].getAttribute('aria-disabled')).toBe('true');
    expect(hearBtn.getAttribute('aria-disabled')).toBe('true');

    // Pressing Escape unlocks busy, clears highlight, resolves opening(false), and invokes ctx.stop().
    expect(m.sendKey('Escape')).toBe(true);
    expect(m.stops).toBe(1);
    expect(await m.handle.opening).toBe(false);
    expect(slots[0].style.background).toBe('');
    expect(listenBtns[0].getAttribute('aria-disabled')).toBeNull();
    expect(hearBtn.getAttribute('aria-disabled')).toBeNull();

    // Now test toolbar [data-player-stop-audio] click during playback AND during inter-clip gap!
    const stopBarBtn = document.createElement('button');
    stopBarBtn.setAttribute('data-player-stop-audio', '');
    document.body.appendChild(stopBarBtn);
    mounted.push(stopBarBtn);

    let resolveStep = null;
    const played2 = [];
    const m2 = mountAdapter('syllable_blending', sylItem, {
      skipDirections: true,
      soundGap: () => 60,
      play: (id) => {
        played2.push(id);
        return new Promise((r) => { resolveStep = r; });
      },
    });
    expect(played2).toEqual(['u1']);
    // Finish u1 so adapter enters 60ms setTimeout gap before u2.
    resolveStep(true);
    await wait(10);
    // Click toolbar Stop audio during the inter-clip gap!
    stopBarBtn.click();
    expect(await m2.handle.opening).toBe(false);
    await wait(90);
    // u2 MUST NOT play after toolbar Stop audio!
    expect(played2).toEqual(['u1']);
    expect(m2.root.querySelectorAll('.slot')[0].style.background).toBe('');
    expect(m2.root.querySelector('[data-hear-all]').getAttribute('aria-disabled')).toBeNull();
  });

  it('syllable_blending end-to-end in built HTML: Escape & toolbar Stop audio never freeze the screen, and replay/reveal behave cleanly', async () => {
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
    const { lesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['syllable_blending'], title: 'SB', lessonId: 'L-w5-sb' });
    const f = openFile(loader.buildHtml(lesson, { core }), { holdAudio: true });
    f.start();
    // Audio clip 0 is now actively playing and toolbar Stop audio is visible.
    const toolbarStop = f.q('[data-player-stop-audio]');
    expect(toolbarStop.hidden).toBe(false);
    expect(f.q('li.choice button:not(.primary)').getAttribute('aria-disabled')).toBe('true');

    // Click toolbar Stop audio -> must unlock Listen & Hear all immediately (not deadlocked!).
    toolbarStop.click();
    expect(f.q('li.choice button:not(.primary)').getAttribute('aria-disabled')).toBeNull();
    expect(f.q('[data-hear-all]').getAttribute('aria-disabled')).toBeNull();

    // Now click Play the syllables and let both syllables end -> Choose unlocks!
    f.btn('▶ Play the syllables').click();
    expect(f.q('.slot').style.background).toBe('var(--accent)');
    // Press Escape mid-replay -> unlocks Listen & clears highlight!
    f.key('Escape');
    expect(f.q('.slot').style.background).toBe('');
    expect(f.q('li.choice button:not(.primary)').getAttribute('aria-disabled')).toBeNull();

    // Finish a full syllable run and answer -> reveal() marks post-completion no-op buttons aria-disabled="true".
    const { lesson: shownLesson } = loader.lessonFromPack([row], { core, banks: BANKS, activities: ['syllable_blending'], title: 'SB', lessonId: 'L-w5-sb2', showLetters: true });
    const f2 = openFile(loader.buildHtml(shownLesson, { core }), { audioMs: 2 });
    f2.start();
    await wait(900);
    const sunsetChoose = [...f2.d.querySelectorAll('li.choice button.primary')].find((b) => b.textContent === 'sunset');
    expect(sunsetChoose.getAttribute('aria-disabled')).toBeNull();
    // Replaying syllables locks Choose while playing, then pressing Escape unlocks Choose cleanly (since syllables were already delivered).
    const playBtn = [...f2.d.querySelectorAll('#app button')].find((b) => b.textContent.includes('Play the syllables'));
    playBtn.click();
    expect(sunsetChoose.getAttribute('aria-disabled')).toBe('true');
    f2.key('Escape');
    expect(sunsetChoose.getAttribute('aria-disabled')).toBeNull();
    // Answer -> reveal() marks Play the syllables, Hear the question, and Hear all aria-disabled="true".
    sunsetChoose.click();
    expect(f2.q('[data-hear-all]').getAttribute('aria-disabled')).toBe('true');
    const qBtn = [...f2.d.querySelectorAll('#app button')].find((b) => b.textContent === 'Hear the question');
    expect(playBtn.getAttribute('aria-disabled')).toBe('true');
    expect(qBtn.getAttribute('aria-disabled')).toBe('true');
  });

  const chainCases = [
    {
      id: 'blending',
      item: {
        id: 'blending-0', word: 'cat', target: 'cat', instruction: 'i0', question: 'q0',
        sounds: ['s1'],
        choices: [{ text: 'cat', audio: 'c1' }, { text: 'dog', audio: 'c2' }],
      },
      // Steps: s1 -> q0 -> c1 (hi:0) -> c2 (hi:1). Interrupt during c1->c2 gap!
      stopAfterClip: 'c1',
    },
    {
      id: 'manipulation',
      item: {
        id: 'manipulation-0', word: 'cat', target: 'hat', type: 'substitution',
        instructionText: 'Change /k/ to /h/.', instruction: ['i0'], wordAudio: 'w0',
        choices: [{ text: 'hat', audio: 'c1' }, { text: 'dog', audio: 'c2' }],
      },
      stopAfterClip: 'c1',
    },
    {
      id: 'rhyming',
      item: {
        id: 'rhyming-0', word: 'cat', target: 'hat', promptAudio: 'p0', wordAudio: 'w0',
        choices: [{ text: 'hat', audio: 'c1', ok: true, answer: true }, { text: 'dog', audio: 'c2', ok: false, answer: false }],
      },
      stopAfterClip: 'c1',
    },
    {
      id: 'sound_sort',
      item: {
        id: 'sound_sort-0', word: 'cat', mode: 'first', sound: 'k', instruction: ['i0'], wordAudio: 'w0',
        chips: [{ text: 'cup', audio: 'c1', member: true }, { text: 'dog', audio: 'c2', member: false }],
      },
      stopAfterClip: 'c1',
    },
    {
      id: 'word_families',
      item: {
        id: 'word_families-0', word: 'cat', mode: 'rime', rime: 'at', instruction: ['i0'], wordAudio: 'w0',
        chips: [{ text: 'hat', audio: 'c1', member: true }, { text: 'dog', audio: 'c2', member: false }],
      },
      stopAfterClip: 'c1',
    },
  ];

  for (const tc of chainCases) {
    it(tc.id + ': Escape during inter-clip setTimeout gap clears stuck outline and stops next clip; handle.stop() halts cleanly', async () => {
      const played = [];
      let reachedStop = null;
      const m = mountAdapter(tc.id, tc.item, {
        skipDirections: true,
        soundGap: () => 5,
        play: (id) => {
          played.push(id);
          if (id === tc.stopAfterClip && reachedStop) reachedStop();
          return Promise.resolve(true);
        },
      });
      await new Promise((resolve) => {
        if (played.includes(tc.stopAfterClip)) { resolve(); return; }
        reachedStop = resolve;
      });
      // Give the microtask a tick so the gap timer for c2 is armed while c1's outline is still visible.
      await wait(10);
      const firstBox = m.root.querySelector('li.choice');
      expect(firstBox.style.outline).toBe('4px solid var(--accent)');

      // Press Escape during the inter-clip gap!
      expect(m.sendKey('Escape')).toBe(true);
      expect(m.stops).toBe(1);
      expect(firstBox.style.outline).toBe('');
      expect(firstBox.style.outlineOffset).toBe('');

      // Wait past the 350ms gap: c2 must NEVER play!
      await wait(420);
      expect(played).not.toContain('c2');
      expect(typeof m.handle.stop).toBe('function');

      // Also verify handle.stop() clears an active replay chain.
      m.handle.replay();
      const countAtStop = played.length;
      m.handle.stop();
      await wait(260);
      expect(played.length).toBe(countAtStop);
    });
  }

  it('sound_sort and word_families keep render identical, support -again prefix, and mark Hear all aria-disabled on reveal()', () => {
    expect(TH.ADAPTERS.sound_sort.render.toString()).toBe(TH.ADAPTERS.word_families.render.toString());

    for (const id of ['sound_sort', 'word_families']) {
      const item = id === 'sound_sort'
        ? { id: 'sound_sort-0-again', word: 'cat', mode: 'first', sound: 'k', instruction: ['i0'], wordAudio: 'w0',
            chips: [{ text: 'cup', audio: 'c1', member: true }, { text: 'dog', audio: 'c2', member: false }] }
        : { id: 'word_families-0-again', word: 'cat', mode: 'rime', rime: 'at', instruction: ['i0'], wordAudio: 'w0',
            chips: [{ text: 'hat', audio: 'c1', member: true }, { text: 'dog', audio: 'c2', member: false }] };
      const m = mountAdapter(id, item, { isDone: () => true });
      const hearBtn = m.root.querySelector('[data-hear-all]');
      expect(hearBtn.textContent).toBe('Hear all');
      m.handle.reveal();
      expect(hearBtn.getAttribute('aria-disabled')).toBe('true');

      // Without ctx.hearAll (fallback button): also marked aria-disabled on reveal().
      const m2 = mountAdapter(id, item, { isDone: () => true, noHearAll: true });
      const fallbackHear = [...m2.root.querySelectorAll('button')].find((b) => b.textContent === 'Hear all');
      expect(fallbackHear).toBeTruthy();
      m2.handle.reveal();
      expect(fallbackHear.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('read_passage: Escape, handle.stop(), and handle.replay() clear stuck readBack green line highlight and halt remaining lines', async () => {
    const item = {
      id: 'read_passage-0', word: 'cat', target: 'cat', prompt: 'p0',
      lines: [{ before: 'The ', after: ' sat.', answer: 'cat' }, { text: 'It ran fast.' }],
      options: ['cat', 'dog'],
      readBack: ['r1', 'r2'], readBackByLine: true,
    };
    const played = [];
    let resolveClip = null;
    const m = mountAdapter('read_passage', item, {
      play: (id) => {
        played.push(id);
        return new Promise((r) => { resolveClip = r; });
      },
    });
    const linePs = [...m.root.querySelectorAll('[data-read] p')];
    m.handle.payoff();
    expect(played).toEqual(['r1']);
    expect(linePs[0].style.background).toBe('var(--ok-bg)');
    expect(linePs[0].getAttribute('aria-current')).toBe('true');

    // Escape stops readBack, clears green line highlight & aria-current, and prevents r2 from playing.
    expect(m.sendKey('Escape')).toBe(true);
    expect(m.stops).toBe(1);
    expect(linePs[0].style.background).toBe('');
    expect(linePs[0].getAttribute('aria-current')).toBeNull();
    resolveClip(true);
    await wait(20);
    expect(played).toEqual(['r1']);

    // replay() clears any active readBack line highlight and plays item.prompt.
    m.handle.payoff();
    expect(linePs[0].style.background).toBe('var(--ok-bg)');
    m.handle.replay();
    expect(linePs[0].style.background).toBe('');
    expect(linePs[0].getAttribute('aria-current')).toBeNull();
    expect(played[played.length - 1]).toBe('p0');

    // handle.stop() halts readBack cleanly too.
    m.handle.payoff();
    expect(linePs[0].style.background).toBe('var(--ok-bg)');
    m.handle.stop();
    expect(linePs[0].style.background).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 2. 390px Phone Overflow & Compact Single-Row Fit (9 Adapters)
// ---------------------------------------------------------------------------
describe('2. 390px phone overflow fixes & compact single-row fit', () => {
  it('decoding & sentence_match: responsive picture containment, High Contrast badge border, and clamped prompts/slots', () => {
    const dec = mountAdapter('decoding', {
      id: 'decoding-0', word: 'caterpillar', target: 'caterpillar', printed: 'caterpillar', prompt: 'p0',
      choices: [{ text: 'caterpillar', image: 'img1' }, { text: 'butterfly', image: 'img2' }],
    });
    const decImg = dec.root.querySelector('img.picture');
    expect(decImg.getAttribute('style')).toContain('max-width:min(100%,160px)');
    expect(decImg.getAttribute('style')).toContain('height:auto');
    expect(decImg.getAttribute('style')).toContain('object-fit:contain');
    const decBadge = dec.root.querySelector('[data-key-number]');
    expect(decBadge.getAttribute('style')).toContain('border:1px solid var(--accent-ink)');
    const decWord = dec.root.querySelector('p.letters[lang="en"]');
    expect(decWord.getAttribute('style')).toContain('clamp(');

    const sm = mountAdapter('sentence_match', {
      id: 'sentence_match-0', word: 'cat', target: 'cat dog sun hat',
      sentence: 'The cat and dog saw the sun and a hat.',
      sequence: ['cat', 'dog', 'sun', 'hat'],
      prompt: 'p0',
      tiles: [
        { text: 'cat', image: 'i1' }, { text: 'dog', image: 'i2' },
        { text: 'sun', image: 'i3' }, { text: 'hat', image: 'i4' },
      ],
    });
    const smImg = sm.root.querySelector('img.picture');
    expect(smImg.getAttribute('style')).toContain('max-width:min(100%,160px)');
    expect(smImg.getAttribute('style')).toContain('height:auto');
    expect(smImg.getAttribute('style')).toContain('object-fit:contain');
    const smBadge = sm.root.querySelector('[data-key-number]');
    expect(smBadge.getAttribute('style')).toContain('border:1px solid var(--accent-ink)');
    const smSlot = sm.root.querySelector('ul.slots button.slot');
    expect(smSlot.getAttribute('style')).toContain('min-width:clamp(');
    expect(smSlot.getAttribute('style')).toContain('min-height:clamp(');
    expect(sm.root.querySelector('p[data-read]').getAttribute('style')).toContain('clamp(');
  });

  it('read_sentence, read_passage, missing_letter, counting, and syllable_blending use compact 390px sizing', () => {
    const rs = mountAdapter('read_sentence', {
      id: 'read_sentence-0', word: 'cat', target: 'cat', before: 'The ', after: ' sat.', answer: 'cat',
      options: ['cat', 'dog'], picture: null, prompt: 'p0',
    });
    expect(rs.root.querySelector('[data-read]').getAttribute('style')).toContain('clamp(');

    const rp = mountAdapter('read_passage', {
      id: 'read_passage-0', word: 'cat', target: 'cat', prompt: 'p0',
      lines: [{ before: 'The ', after: ' sat.', answer: 'cat' }], options: ['cat', 'dog'], readBack: [],
    });
    expect(rp.root.querySelector('[data-read]').getAttribute('style')).toContain('clamp(');

    const ml = mountAdapter('missing_letter', {
      id: 'missing_letter-0', word: 'plant', target: 'a',
      letters: ['p', 'l', '', 'n', 't'], hiddenIndex: 2, options: ['a', 'e', 'i', 'o'],
      wordAudio: 'w0', promptAudio: 'p0',
    });
    const mlSlot = ml.root.querySelector('li.slot');
    expect(mlSlot.getAttribute('style')).toContain('min-width:clamp(36px,11vw,56px)');
    expect(mlSlot.getAttribute('style')).toContain('min-height:clamp(44px,12vw,60px)');

    const cnt = mountAdapter('counting', {
      id: 'counting-0', word: 'cat', target: '3', wordAudio: 'w0', promptAudio: 'p0',
    });
    expect(cnt.root.querySelector('ul.counting-numbers').getAttribute('style')).toContain('gap:8px');
    expect(cnt.root.querySelector('li.choice.solo').getAttribute('style')).toContain('padding:4px');
    const cntBtnStyle = cnt.root.querySelector('li.choice.solo button').getAttribute('style');
    expect(cntBtnStyle).toContain('min-width:56px');
    expect(cntBtnStyle).toContain('min-height:56px');

    const sb = mountAdapter('syllable_blending', {
      id: 'syllable_blending-0', word: 'sunset', target: 'sunset',
      syllables: ['sun', 'set'], units: ['u1', 'u2'], promptAudio: 'p0',
      choices: [{ text: 'sunset', audio: 'c1' }, { text: 'cupcake', audio: 'c2' }],
    }, { isDone: () => true });
    expect(sb.root.querySelector('.slot').getAttribute('style')).toContain('padding:0 12px');
  });

  it('manipulation, rhyming, and syllable_blending inline Hear all + note inside the existing audio .row (no separate data-hear-row)', () => {
    const cases = [
      ['manipulation', {
        id: 'manipulation-0', word: 'cat', target: 'hat', type: 'substitution',
        instructionText: 'Change /k/ to /h/.', instruction: ['i0'], wordAudio: 'w0',
        choices: [{ text: 'hat', audio: 'c1' }, { text: 'dog', audio: 'c2' }],
      }],
      ['rhyming', {
        id: 'rhyming-0', word: 'cat', target: 'hat', promptAudio: 'p0', wordAudio: 'w0',
        choices: [{ text: 'hat', audio: 'c1', ok: true, answer: true }, { text: 'dog', audio: 'c2', ok: false, answer: false }],
      }],
      ['syllable_blending', {
        id: 'syllable_blending-0', word: 'sunset', target: 'sunset',
        syllables: ['sun', 'set'], units: ['u1', 'u2'], promptAudio: 'p0',
        choices: [{ text: 'sunset', audio: 'c1' }, { text: 'cupcake', audio: 'c2' }],
      }],
    ];
    for (const [id, item] of cases) {
      const m = mountAdapter(id, item, { isDone: () => true });
      expect(m.root.querySelector('[data-hear-row]'), id + ' should not wrap hear in a second row').toBeNull();
      const hearBtn = m.root.querySelector('[data-hear-all]');
      const hearNote = m.root.querySelector('[data-hear-now]');
      expect(hearBtn && hearBtn.parentElement.classList.contains('row'), id).toBe(true);
      expect(hearNote && hearNote.parentElement === hearBtn.parentElement, id).toBe(true);
      // Audio row contains at least one other audio button beside Hear all.
      expect(hearBtn.parentElement.querySelectorAll('button').length, id).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Keyboard & Screen-Reader Parity + lang="en" Spans
// ---------------------------------------------------------------------------
describe('3. Keyboard & screen-reader parity + lang="en" spans', () => {
  it('sentence_match: Backspace pops last filled slot, Escape clears filled slots & retryMarks, stop() cancels retryTimer, and announce fires on place/remove/clear', async () => {
    const smItem = {
      id: 'sentence_match-0', word: 'cat', target: 'cat dog',
      sentence: 'The cat saw a dog.',
      sequence: ['cat', 'dog'],
      prompt: 'p0',
      tiles: [{ text: 'cat', image: 'i1' }, { text: 'dog', image: 'i2' }, { text: 'sun', image: 'i3' }],
    };
    const m = mountAdapter('sentence_match', smItem);
    const tile = (w) => [...m.root.querySelectorAll('ul.choices button')].find((b) => b.getAttribute('aria-label') === 'Picture of ' + w);
    const slots = () => [...m.root.querySelectorAll('ul.slots button')];

    // Nothing filled -> Backspace/Escape return false.
    expect(m.sendKey('Backspace')).toBe(false);
    expect(m.sendKey('Escape')).toBe(false);

    // Place 'cat' in slot 1 -> announces placement.
    tile('cat').click();
    expect(slots()[0].getAttribute('aria-label')).toContain('cat');
    expect(m.announced[m.announced.length - 1]).toBe('cat is in slot 1.');

    // Backspace pops slot 1 and announces removal.
    expect(m.sendKey('Backspace')).toBe(true);
    expect(slots()[0].getAttribute('aria-label')).toContain('empty');
    expect(m.announced[m.announced.length - 1]).toBe('cat taken out of slot 1.');

    // Place 'cat', click slot 1 to remove -> announces removal.
    tile('cat').click();
    slots()[0].click();
    expect(slots()[0].getAttribute('aria-label')).toContain('empty');
    expect(m.announced[m.announced.length - 1]).toBe('cat taken out of slot 1.');

    // Place 'cat' -> Escape clears all filled slots and announces clear.
    tile('cat').click();
    expect(m.sendKey('Escape')).toBe(true);
    expect(slots()[0].getAttribute('aria-label')).toContain('empty');
    expect(m.announced[m.announced.length - 1]).toBe('All the slots are empty again.');

    // Trigger retry hold (cat + sun -> retryMarks) -> Backspace clears retryMarks & slots immediately.
    tile('cat').click();
    tile('sun').click();
    expect(slots()[1].getAttribute('data-retry-mark')).toBe('warn');
    expect(m.sendKey('Backspace')).toBe(true);
    expect(slots()[0].getAttribute('data-retry-mark')).toBeNull();
    expect(slots()[0].getAttribute('aria-label')).toContain('empty');

    // Trigger retry hold again -> handle.stop() clears retryTimer cleanly.
    tile('cat').click();
    tile('sun').click();
    expect(slots()[1].getAttribute('data-retry-mark')).toBe('warn');
    expect(typeof m.handle.stop).toBe('function');
    m.handle.stop();
    expect(slots()[1].getAttribute('data-retry-mark')).toBe('warn'); // stopRetryHold(false) preserves DOM until unmount while canceling timer
  });

  it('missing_letter: Backspace/Escape clears selected letter, retry shifts focus from Check answer (unless noFocus), and reveal() appends (the answer)', () => {
    const mlItem = {
      id: 'missing_letter-0', word: 'cat', target: 'a',
      letters: ['c', '', 't'], hiddenIndex: 1, options: ['e', 'a', 'i', 'o'],
      wordAudio: 'w0', promptAudio: 'p0',
    };
    const m = mountAdapter('missing_letter', mlItem);
    const choiceBtn = (l) => [...m.root.querySelectorAll('li.choice button')].find((b) => b.textContent === l);
    const checkBtn = [...m.root.querySelectorAll('button')].find((b) => b.textContent === 'Check answer');

    expect(m.sendKey('Backspace')).toBe(false);
    expect(m.sendKey('Escape')).toBe(false);

    // Select 'e', then clear with Backspace.
    choiceBtn('e').click();
    expect(choiceBtn('e').getAttribute('aria-pressed')).toBe('true');
    expect(m.sendKey('Backspace')).toBe(true);
    expect(choiceBtn('e').getAttribute('aria-pressed')).toBe('false');
    expect(checkBtn.getAttribute('aria-disabled')).toBe('true');

    // Select 'e', then clear with Escape.
    choiceBtn('e').click();
    expect(m.sendKey('Escape')).toBe(true);
    expect(choiceBtn('e').getAttribute('aria-pressed')).toBe('false');

    // Select wrong letter 'e', focus Check answer, submit -> retry shifts focus to first untried choice ('a').
    choiceBtn('e').click();
    checkBtn.focus();
    expect(document.activeElement).toBe(checkBtn);
    checkBtn.click();
    expect(document.activeElement).toBe(choiceBtn('a'));

    // With noFocus: true, retry does NOT move focus.
    const mNoFocus = mountAdapter('missing_letter', mlItem, { noFocus: true });
    const nfChoice = (l) => [...mNoFocus.root.querySelectorAll('li.choice button')].find((b) => b.textContent === l);
    const nfCheck = [...mNoFocus.root.querySelectorAll('button')].find((b) => b.textContent === 'Check answer');
    nfChoice('e').click();
    nfCheck.focus();
    nfCheck.click();
    expect(document.activeElement).toBe(nfCheck);

    // reveal() appends "(the answer)" to the target button's aria-label (idempotently).
    m.handle.reveal();
    expect(choiceBtn('a').getAttribute('aria-label')).toBe('Letter a (the answer)');
    m.handle.reveal();
    expect(choiceBtn('a').getAttribute('aria-label')).toBe('Letter a (the answer)');
    expect(choiceBtn('i').getAttribute('aria-label')).toBe('Letter i');
  });

  it('counting: keys 0 -> 10 and +/= -> 11+ work when present, ignore when absent (Easy), and reveal() appends (the answer)', () => {
    const picked = [];
    const m = mountAdapter('counting', {
      id: 'counting-0', word: 'hippopotamus', target: '11+', wordAudio: 'w0', promptAudio: 'p0',
    }, {
      answer: (v, right) => { picked.push(v); return right ? 'correct' : 'retry'; },
    });
    // Key '0' clicks '10' (wrong -> tried + disabled).
    expect(m.sendKey('0')).toBe(true);
    expect(picked).toEqual(['10']);
    // Pressing '0' again while '10' is aria-disabled returns false.
    expect(m.sendKey('0')).toBe(false);
    // Key '+' clicks '11+'.
    expect(m.sendKey('+')).toBe(true);
    expect(picked).toEqual(['10', '11+']);

    // Key '=' also maps to '11+'.
    const pickedEq = [];
    const mEq = mountAdapter('counting', {
      id: 'counting-1', word: 'hippopotamus', target: '11+', wordAudio: 'w0', promptAudio: 'p0',
    }, {
      answer: (v, right) => { pickedEq.push(v); return right ? 'correct' : 'retry'; },
    });
    expect(mEq.sendKey('=')).toBe(true);
    expect(pickedEq).toEqual(['11+']);
    mEq.handle.reveal();
    const btn11 = [...mEq.root.querySelectorAll('li.choice button')].find((b) => b.textContent === '11+');
    expect(btn11.getAttribute('aria-label')).toBe('11+ — 11 or more sounds (the answer)');
    mEq.handle.reveal();
    expect(btn11.getAttribute('aria-label')).toBe('11+ — 11 or more sounds (the answer)');

    // Easy values without 10 or 11+: '0', '+', '=' return false; data-key 1-9 preserved.
    const mEasy = mountAdapter('counting', {
      id: 'counting-2', word: 'cat', target: '3', values: ['2', '3', '4', '5', '6'], wordAudio: 'w0', promptAudio: 'p0',
    });
    expect(mEasy.sendKey('0')).toBe(false);
    expect(mEasy.sendKey('+')).toBe(false);
    expect(mEasy.sendKey('=')).toBe(false);
    expect([...mEasy.root.querySelectorAll('li.choice[data-key]')].map((li) => li.getAttribute('data-key'))).toEqual(['2', '3', '4', '5', '6']);
    mEasy.handle.reveal();
    const btn3 = [...mEasy.root.querySelectorAll('li.choice button')].find((b) => b.textContent === '3');
    expect(btn3.getAttribute('aria-label')).toBe('3 sounds (the answer)');
  });

  it('English word spans carry lang="en" across blending, manipulation, rhyming, sound_sort, word_families, and syllable_blending', () => {
    const cases = [
      ['blending', { id: 'blending-0', word: 'cat', target: 'cat', question: 'q0', sounds: ['s1'], choices: [{ text: 'cat', audio: 'c1' }] }],
      ['manipulation', { id: 'manipulation-0', word: 'cat', target: 'hat', type: 'substitution', instructionText: 'Change /k/ to /h/.', instruction: ['i0'], wordAudio: 'w0', choices: [{ text: 'hat', audio: 'c1' }] }],
      ['rhyming', { id: 'rhyming-0', word: 'cat', target: 'hat', promptAudio: 'p0', wordAudio: 'w0', choices: [{ text: 'hat', audio: 'c1', ok: true, answer: true }] }],
      ['sound_sort', { id: 'sound_sort-0', word: 'cat', mode: 'first', sound: 'k', instruction: ['i0'], wordAudio: 'w0', chips: [{ text: 'cup', audio: 'c1', member: true }] }],
      ['word_families', { id: 'word_families-0', word: 'cat', mode: 'rime', rime: 'at', instruction: ['i0'], wordAudio: 'w0', chips: [{ text: 'hat', audio: 'c1', member: true }] }],
      ['syllable_blending', { id: 'syllable_blending-0', word: 'sunset', target: 'sunset', syllables: ['sun', 'set'], units: ['u1', 'u2'], promptAudio: 'p0', choices: [{ text: 'sunset', audio: 'c1' }] }],
    ];
    for (const [id, item] of cases) {
      const m = mountAdapter(id, item, { showLetters: true, isDone: () => true });
      const wordSpans = [...m.root.querySelectorAll('li.choice button.primary span.letters')];
      expect(wordSpans.length, id).toBeGreaterThan(0);
      for (const sp of wordSpans) expect(sp.getAttribute('lang'), id).toBe('en');
      if (id === 'manipulation') {
        const instP = [...m.root.querySelectorAll('p.letters')].find((p) => p.textContent === item.instructionText);
        expect(instP && instP.getAttribute('lang')).toBe('en');
      }
    }
  });
});
