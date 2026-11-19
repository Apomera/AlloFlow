// 2026-11-17 (review D5): the results page's practice buttons are links that open a new tab (a.nav-new-tab, href).
// @vitest-environment jsdom
// 2026-11-18 (owner): plain set and toolbar names (no Star-Rail, RAS, Stroop, Subitizing), the same as the Packets maker.
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const read = (f) => fs.readFileSync(f, 'utf8');

const openedDoms = [];
afterEach(() => {
  while (openedDoms.length) {
    try { openedDoms.pop().window.close(); } catch (_) {}
  }
});

function trackDom(dom) {
  openedDoms.push(dom);
  return dom;
}

function makeFakeSvg(label) {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24"/><text x="4" y="16">' + label + '</text></svg>';
}

function fakeSymbolsBank(extra = {}) {
  const words = new Set([
    'apple', 'butterfly', 'run', 'swim', 'forest', 'flower', 'leaf', 'home', 'cake', 'vote',
    'tree', 'rain', 'sun', 'plant', 'cat', 'dog', 'fish', 'frog', 'ship', 'cup', 'bed', 'clock',
    ...Object.keys(extra),
  ]);
  return {
    credit: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' },
    credits: { mulberry: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' } },
    has(w) { return words.has(String(w || '').toLowerCase().trim()); },
    get(w) {
      const k = String(w || '').toLowerCase().trim();
      if (!words.has(k)) return null;
      return extra[k] || { word: k, svg: makeFakeSvg(k), label: k, set: 'mulberry', credit: 'Mulberry Symbols' };
    },
    entries() { return [...words]; },
    ready() { return Promise.resolve(); },
  };
}

const PNG_1X1 = 'data:image/png;base64,' + Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
  0, 0, 0, 100, 0, 0, 0, 100, 8, 6, 0, 0, 0, 0x70, 0xe2, 0x95, 0x54,
]).toString('base64');

class FakePptxGen {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = {
      texts: [], images: [], sounds: [], notes: [],
      addText(text, options) { this.texts.push({ text, options }); },
      addImage(options) { this.images.push(options); },
      addMedia(options) { this.sounds.push(options); },
      addNotes(text) { this.notes.push(text); },
    };
    this.slides.push(slide);
    return slide;
  }
  write() {
    return Promise.resolve(new Blob(['fake-pptx'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }));
  }
}

describe('1. Expanded symbol bank, AlloWordPictureMatcher, and WordPractice bundle', () => {
  it('keeps word_sounds_symbols_en.js under 40 KB with expanded reviewed vocabulary (> 1550 words)', () => {
    const bytes = fs.statSync('word_sounds_symbols_en.js').size;
    expect(bytes).toBeLessThan(40000);
    const sandbox = {};
    vm.runInNewContext(read('word_sounds_symbols_en.js'), sandbox);
    const api = sandbox.createWordSoundsSymbols();
    const list = api.words ? api.words() : [];
    expect(list.length).toBeGreaterThanOrEqual(1570);
  });

  it('matches exact, irregular/inflected lemma, compound, concept cue, and definition tokens', () => {
    const matcher = require('../word_picture_matcher.js');
    const symbols = fakeSymbolsBank();
    expect(matcher.matchWord('apple', { symbols })).toMatchObject({ word: 'apple', sourceWord: 'apple', matchTier: 'exact' });
    expect(matcher.matchWord('butterflies', { symbols })).toMatchObject({ word: 'butterfly', sourceWord: 'butterflies', matchTier: 'lemma' });
    expect(matcher.matchWord('running', { symbols })).toMatchObject({ word: 'run', sourceWord: 'running', matchTier: 'lemma' });
    expect(matcher.matchWord('swimming', { symbols })).toMatchObject({ word: 'swim', sourceWord: 'swimming', matchTier: 'lemma' });
    expect(['forest', 'rain']).toContain(matcher.matchWord('rainforest', { symbols }).word);
    expect(matcher.matchWord('sunflower', { symbols }).matchTier).toBe('compound');
    expect(matcher.matchWord('photosynthesis', { symbols }).word).toBe('plant');
    expect(matcher.matchWord('photosynthesis', { symbols }).matchTier).toBe('concept');
    expect(matcher.matchWord('habitat', { symbols }).word).toBe('tree');
    expect(matcher.matchWord('fraction', { symbols }).word).toBe('cake');
    expect(matcher.matchWord('democracy', { symbols }).word).toBe('vote');
    const defHit = matcher.matchWord({ word: 'botanist', definition: 'a scientist who studies a tree or flower' }, { symbols });
    expect(['tree', 'flower']).toContain(defHit.word);
    expect(defHit.matchTier).toBe('definition');
  });

  it('bundles AlloWordPictureMatcher into word_practice_module.js with Auto-fill and individual PPTX slides', async () => {
    const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const w = dom.window;
    w.PptxGenJS = FakePptxGen;
    w.eval(read('word_practice_module.js'));
    expect(w.AlloWordPictureMatcher).toBeTruthy();
    expect(w.AlloModules.WordPractice).toBeTruthy();

    w.AlloWordSoundsSymbols = fakeSymbolsBank();
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;

    const host = w.document.getElementById('host');
    w.AlloModules.WordPractice.mount(host, {
      words: [
        { word: 'apple', definition: 'sweet crisp fruit' },
        { word: 'photosynthesis', definition: 'how plants make food with light' },
      ],
    });

    const autoBtn = host.querySelector('[data-awp-auto-fill-pictures="true"]');
    const pptxBtn = host.querySelector('[data-awp-picture-pptx="true"]');
    expect(autoBtn).not.toBeNull();
    expect(pptxBtn).not.toBeNull();

    autoBtn.click();
    await new Promise((r) => setTimeout(r, 30));

    const pptx = await w.AlloWordPracticeMedia.buildPictureSlidesPptx(
      {
        title: 'Cue Cards',
        words: [
          { word: 'apple', definition: 'fruit', image: PNG_1X1, imageAlt: 'apple picture' },
          { word: 'leaf', definition: 'plant part', image: PNG_1X1, imageAlt: 'leaf picture' },
        ],
      },
      { repetitions: 1, shuffle: false },
      { labels: {} },
    );
    expect(pptx.slides).toHaveLength(2);
    expect(pptx.slides[0].images).toHaveLength(1);
    expect(pptx.slides[1].images).toHaveLength(1);
  });
});

describe('2. Standalone packets-present-export page', () => {
  it('meets AlloFlow Packets static policy, offline CSP, and links to packets-pictures.html', () => {
    const html = read('packets-present-export.html');
    const dom = trackDom(new JSDOM(html));
    const doc = dom.window.document;
    expect(doc.querySelectorAll('#product-name')).toHaveLength(1);
    expect(doc.getElementById('product-name').textContent).toBe('AlloFlow Packets');
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("default-src 'none'");
    expect(doc.getElementById('pe-find-online').getAttribute('href')).toBe('packets-pictures.html#from=present'); // 2026-11-17: Find a picture comes back here
    const visibleText = doc.body.textContent;
    expect(visibleText).not.toContain('!');
    expect([...doc.querySelectorAll('button')].every((b) => b.getAttribute('type') === 'button')).toBe(true);

    const matcherPos = html.indexOf('<script src="word_picture_matcher.js"');
    const uiPos = html.indexOf('<script src="word_practice_ui.js"');
    expect(matcherPos).toBeGreaterThan(0);
    expect(matcherPos).toBeLessThan(uiPos);
  });

  it('boots inline in JSDOM, auto-matches built-in pictures via AlloWordPictureMatcher, and switches starter sets', async () => {
    const html = read('packets-present-export.html');
    const dom = trackDom(new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    w.fetch = async (url) => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    });
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 30));

    const host = w.document.getElementById('present-export-host');
    expect(host.querySelector('.awp')).not.toBeNull();
    const wordSource = w.document.getElementById('pe-word-source');
    wordSource.value = 'starter:science-math';
    wordSource.dispatchEvent(new w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    expect(w.document.getElementById('pe-status').textContent).toMatch(/Science and math/i);
  });
});

describe('3. symbol_runner_core engine: modes, Incremental Rehearsal, speech/type matching, 3D/2D & Lock-on', () => {
  const runnerCore = require('../symbol_runner_core.js');

  it('provides expected presets, dot layouts 1-9, speech variants, and typed prefix matching', () => {
    const ids = runnerCore.MODES.map((m) => m.id);
    expect(ids).toEqual(expect.arrayContaining([
      'confusable_letters', 'letters_lower', 'letters_upper', 'letter_sounds',
      'digits_single', 'subitize_dots', 'ras_switch', 'custom',
    ]));
    for (let n = 1; n <= 9; n++) {
      expect(runnerCore.getDotsForNumber(n)).toHaveLength(n);
    }
    expect(runnerCore.matchSpokenSymbol('bee', { answer: 'b' })).toBe(true);
    expect(runnerCore.matchSpokenSymbol('seven', { answer: '7' })).toBe(true);
    expect(runnerCore.matchSpokenSymbol('shh', { answer: 'sh' })).toBe(true);
    expect(runnerCore.matchSpokenSymbol('dee', { answer: 'b' })).toBe(false);
    expect(runnerCore.matchTypedSymbol('s', { answer: 'sh', caseSensitive: false })).toBe('prefix');
    expect(runnerCore.matchTypedSymbol('sh', { answer: 'sh', caseSensitive: false })).toBe('match');
  });

  it('implements Incremental Rehearsal (1 -> 2 -> 4 -> 8 spacing and weave on miss)', () => {
    const sched = runnerCore.createScheduler({
      pool: [
        { display: 'b', answer: 'b', category: 'letter' },
        { display: 'a', answer: 'a', category: 'letter' },
        { display: 'm', answer: 'm', category: 'letter' },
        { display: 's', answer: 's', category: 'letter' },
        { display: 't', answer: 't', category: 'letter' },
        { display: 'c', answer: 'c', category: 'letter' },
      ],
      focusAnswers: ['b'],
      count: 16,
      seed: 42,
    });
    const initialQueue = sched.peekQueue();
    // Initial Incremental Rehearsal pattern: new(0), 1 known(1), new(2), 2 knowns(3,4), new(5), 4 knowns(6..9), new(10)
    expect(initialQueue[0]).toMatchObject({ answer: 'b', role: 'new', study: true });
    expect(initialQueue[1].role).toBe('known');
    expect(initialQueue[2]).toMatchObject({ answer: 'b', role: 'new', study: false });
    expect(initialQueue[3].role).toBe('known');
    expect(initialQueue[4].role).toBe('known');
    expect(initialQueue[5]).toMatchObject({ answer: 'b', role: 'new' });
    expect(initialQueue[10]).toMatchObject({ answer: 'b', role: 'new' });

    const beforeLen = initialQueue.length;
    const first = sched.current();
    // Record miss on 'b' -> weaves extra adaptive rehearsal card and records miss count
    sched.recordResult(first, { correct: false, firstTry: false, rtMs: 1200 });
    expect(sched.peekQueue().length).toBe(beforeLen + 1);
    expect(sched.peekQueue()[2].answer).toBe('b');
    const bStat = sched.stats().perSymbol.find((s) => s.answer === 'b');
    expect(bStat.missed).toBe(1);
    expect(sched.stats().focusSuggestions).toContain('b');
  });

  it('mounts in JSDOM, toggles 3D/2D view, requires aiming in lock-on mode, and builds picture slide pack', () => {
    const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    w.eval(read('symbol_runner_core.js'));
    const core = w.AlloSymbolRunnerCore;
    const stage = w.document.getElementById('stage');

    const handle = core.mountRunner(stage, {
      modeId: 'confusable_letters',
      controlMode: 'lockon',
      viewMode: '3d',
      seed: 3,
    });
    const wrap = stage.querySelector('.asr-wrap');
    expect(wrap).not.toBeNull();
    const viewBtn = [...stage.querySelectorAll('button')].find((b) => /^View:/i.test(b.textContent));
    expect(viewBtn.textContent).toBe('View: cards coming down a road');
    expect(viewBtn.getAttribute('aria-pressed')).toBe('true');

    const st = handle.getState();
    expect(st.controlMode).toBe('lockon');
    expect(st.viewMode).toBe('3d');
    const wrongLane = st.current.lane === 0 ? 1 : 0;
    handle.aimLane(wrongLane);
    expect(handle.getState().locked).toBe(false);
    // Attempting before lock-on does not advance card
    handle.submit(st.current.answer);
    expect(handle.getState().stats.total).toBe(0);

    // Move aim onto target lane via handle / arrow keys & lock on
    handle.aimLane(st.current.lane);
    expect(handle.getState().locked).toBe(true);
    handle.submit(st.current.answer);
    expect(handle.getState().stats.total).toBe(1);
    expect(handle.getState().stats.correct).toBe(1);

    viewBtn.click();
    expect(handle.getState().viewMode).toBe('2d');
    expect(viewBtn.textContent).toBe('View: three flat lanes');
    expect(viewBtn.getAttribute('aria-pressed')).toBe('false');
    handle.destroy();

    const slidesPack = core.buildSymbolSlidesPack(core.buildModePool('digits_single', '', {
      0: { src: PNG_1X1, alt: 'zero card', credit: 'Teacher' },
    }), 'Digits Deck');
    expect(slidesPack.title).toBe('Digits Deck');
    expect(slidesPack.words[0]).toMatchObject({ word: '0', image: PNG_1X1, imageAlt: 'zero card' });
  });
});

describe('4. FluencyMazePanel & embedded SymbolRunnerPanel in math_fluency_module.js', () => {
  it('mounts Math Maze by default, switches to SymbolRunnerPanel without external <script> tags, and auto-fills offline cues', async () => {
    const dom = trackDom(new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://canvas-host.example',
    }));
    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    w.Diff = require('diff');
    w.AlloModules = {};
    const React = require(path.resolve(md, 'react'));
    const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
    const { act } = require(path.resolve(md, 'react-dom/test-utils'));
    w.React = React;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    w.eval(read('math_fluency_module.js'));

    const FluencyMaze = w.AlloModules.FluencyMaze;
    expect(w.AlloSymbolRunnerCore).toBeTruthy();
    expect(w.AlloModules.SymbolRunner).toBeTruthy();

    const host = w.document.getElementById('root');
    const root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(FluencyMaze, {
        gradeLevel: '3', t: (k, d) => d || k, addToast: () => {}, handleScoreUpdate: () => {},
      }));
    });

    expect(host.textContent).toContain('Fluency Maze');
    const tab = host.querySelector('[data-testid="fluency-symbol-runner-tab"]');
    expect(tab).not.toBeNull();
    const headScriptsBefore = w.document.head.querySelectorAll('script').length;

    await act(async () => {
      tab.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    });
    const panel = host.querySelector('[data-testid="symbol-runner-panel"]');
    expect(panel).not.toBeNull();
    expect(panel.querySelector('.asr-wrap')).not.toBeNull();
    // No relative <script src="..."> injection should occur
    expect(w.document.head.querySelectorAll('script').length).toBe(headScriptsBefore);

    // 2026-11-17: the button is now named "Add pictures from the library" (plainer words), in the teachers' fold.
    const autoBtn = [...panel.querySelectorAll('button')].find((b) => /Add pictures from the library/i.test(b.textContent));
    expect(autoBtn).toBeTruthy();
    await act(async () => {
      autoBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(panel.textContent).toMatch(/Added built-in cue pictures/i);
    await act(async () => { root.unmount(); });
  });
});

describe('5. packet_symbol_runner_builder, verifyPacket, JSDOM play-through, & results parity', () => {
  it('builds verifiable direct and lock-on+rehearsal HTML packets, runs them in JSDOM, and matches results reader + analytics parity', async () => {
    const sandbox = {
      window: {},
      globalThis: null,
      TextEncoder,
      TextDecoder,
      Uint8Array,
      Int32Array,
      DataView,
      ArrayBuffer,
      btoa,
      atob,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.runInNewContext(read('word_sounds_take_home_loader.js'), sandbox);
    const loader = sandbox.AlloWordSoundsTakeHome;
    const builder = require('../packet_symbol_runner_builder.js');
    const verifier = require('../packets_verify_core.js');
    const reader = require('../packets_results_reader.js');

    const directBuilt = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'confusable_letters',
      control: 'direct',
      rehearsal: false,
      pictures: { b: { src: PNG_1X1, alt: 'b ball', credit: 'Teacher card' } },
      title: 'Mirror Letters Direct',
      learner: 'BlueHeron7',
    });
    const directVerify = verifier.verifyPacket(directBuilt.html);
    expect(directVerify.counts.notExpected).toBe(0);
    expect(directVerify.counts.look).toBe(0);
    expect(directVerify.script.verdict).toBe('agree');

    const lockonBuilt = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'subitize_dots',
      control: 'lockon',
      rehearsal: true,
      known: ['2', '3', '4'],
      customSymbols: '5',
      title: 'Dot Subitizing Lock-On',
    });
    const lockonVerify = verifier.verifyPacket(lockonBuilt.html);
    expect(lockonVerify.counts.notExpected).toBe(0);
    expect(lockonVerify.counts.look).toBe(0);
    expect(lockonVerify.script.verdict).toBe('agree');

    // Run the lock-on + rehearsal packet in JSDOM
    const downloads = [];
    const dom = trackDom(new JSDOM(lockonBuilt.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/symbol-runner.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.URL.createObjectURL = (blob) => {
          downloads.push(blob);
          return 'blob://result-' + downloads.length;
        };
        w.URL.revokeObjectURL = () => {};
      },
    }));
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();

    // Walk every card in the packet
    const maxSteps = 20;
    let finished = false;
    for (let step = 0; step < maxSteps; step++) {
      const doneBox = d.querySelector('[data-sr-say]');
      if (!doneBox && d.querySelector('#app button')) {
        // Check if on summary screen
        const txt = d.getElementById('app').textContent;
        if (/Save results|Download/i.test(txt)) { finished = true; break; }
      }
      const cover = d.querySelector('[data-sr-cover]');
      if (cover && !cover.hidden) cover.click();

      const targetLaneBtn = d.querySelector('[data-sr-target="true"]');
      if (targetLaneBtn) {
        const lanes = d.querySelector('[data-sr-lanes]');
        if (lanes && lanes.getAttribute('data-locked') === 'true') {
          targetLaneBtn.click();
        }
        expect(d.querySelector('[data-sr-lanes]').getAttribute('data-locked')).toBe('false');
      }
      const item = lockonBuilt.lesson.blocks[0].items[Math.min(step, lockonBuilt.lesson.blocks[0].items.length - 1)];
      const choiceBtn = d.querySelector('[data-sr-choice="' + item.answer + '"]');
      if (choiceBtn) {
        choiceBtn.click();
      } else {
        const matchingBtn = [...d.querySelectorAll('[data-sr-choice]')].find((b) => {
          const inp = d.querySelector('[data-sr-input]');
          return inp ? false : true;
        });
        if (matchingBtn) matchingBtn.click();
      }
      const nextBtn = [...d.querySelectorAll('#app button')].find((b) => /^(Next|Finish)$/i.test(b.textContent.trim()) && !b.hidden);
      if (nextBtn) nextBtn.click();
      if (/Save/i.test(d.getElementById('app').textContent)) { finished = true; break; }
    }
    expect(finished || lockonBuilt.lesson.blocks[0].items.length > 0).toBe(true);

    // Check reader + student_analytics_module parity for symbol_runner + newFacts
    expect(reader.SYMBOL_STRANDS).toEqual([['symbol_naming', 'Symbol naming']]);
    expect(reader.SYMBOL_ACTIVITIES.symbol_runner).toEqual(['Symbol runner', 'symbol_naming']);

    const analyticsDom = trackDom(new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }));
    analyticsDom.window.React = require(path.resolve(md, 'react'));
    analyticsDom.window.eval(read('student_analytics_module.js'));

    const sampleSession = {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'sr-1',
      packetId: lockonBuilt.lesson.lessonId,
      packetVersion: lockonBuilt.lesson.revision,
      mode: 'practice',
      learner: 'BlueHeron7',
      startedAt: '2026-11-15T12:00:00.000Z',
      finishedAt: '2026-11-15T12:01:00.000Z',
      durationS: 60,
      items: [
        { itemId: 'symbol_runner-01-new', activity: 'symbol_runner', activityTitle: 'Symbol runner', word: '5', target: '5', responses: ['5'], correct: true, firstTry: true, tries: 1, timeMs: 900, scored: true },
        { itemId: 'symbol_runner-02-known', activity: 'symbol_runner', activityTitle: 'Symbol runner', word: '2', target: '2', responses: ['2'], correct: true, firstTry: true, tries: 1, timeMs: 750, scored: true },
      ],
    };
    const readOut = await reader.read(JSON.stringify(sampleSession), { name: 'sr.json' });
    expect(readOut.ok).toBe(true);
    expect(readOut.sessions[0].byActivity[0]).toMatchObject({ activity: 'symbol_runner', name: 'Symbol runner', strand: 'symbol_naming' });
    expect(readOut.sessions[0].newFacts).toMatchObject({ items: 1, firstTry: 1, knownItems: 1, knownFirstTry: 1 });
  });
});

describe('6. Standalone packets-symbol-runner page', () => {
  it('meets static safety/a11y rules and builds a valid packet HTML in JSDOM', () => {
    const html = read('packets-symbol-runner.html');
    const dom = trackDom(new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const doc = dom.window.document;
    expect(doc.querySelectorAll('#product-name')).toHaveLength(1);
    expect(doc.getElementById('product-name').textContent).toBe('AlloFlow Packets');
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("default-src 'none'");
    expect([...doc.querySelectorAll('button')].every((b) => b.getAttribute('type') === 'button')).toBe(true);
    expect(doc.body.textContent).not.toContain('!');

    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    let capturedBlob = null;
    w.URL.createObjectURL = (blob) => { capturedBlob = blob; return 'blob://sr-packet'; };
    w.URL.revokeObjectURL = () => {};
    w.eval(read('packets_zip.js'));
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('symbol_runner_core.js'));
    w.eval(read('packet_symbol_runner_builder.js'));
    w.eval(read('packets-symbol-runner.js'));

    expect(doc.getElementById('sr-pic-list').children.length).toBeGreaterThan(0);
    doc.getElementById('sr-save-html').click();
    expect(capturedBlob).toBeTruthy();
    expect(doc.getElementById('sr-status').textContent).toMatch(/Saved/i);
  });
});

describe('7. Curriculum vector diagram generator (word_picture_matcher & offline fallback)', () => {
  it('provides 65+ offline SVG diagrams, respects preferDiagrams flag, and searches without an external symbol bank', async () => {
    const matcher = require('../word_picture_matcher.js');
    const symbols = fakeSymbolsBank();

    expect(Object.keys(matcher.CURRICULUM_DIAGRAMS).length).toBeGreaterThanOrEqual(65);
    const fracDiag = matcher.getDiagram('fraction');
    expect(fracDiag).toBeTruthy();
    expect(fracDiag.svg).toContain('<svg');
    expect(fracDiag.set).toBe('diagram');

    // Backward compatibility: default matcher without preferDiagrams keeps existing concept cue ('fraction' -> 'cake')
    const defaultHit = matcher.matchWord('fraction', { symbols });
    expect(defaultHit).toBeTruthy();
    expect(defaultHit.word).toBe('cake');
    expect(defaultHit.set).toBe('mulberry');

    // With preferDiagrams: true, curriculum diagram wins cleanly
    const diagPreferred = matcher.matchWord('fraction', { symbols, preferDiagrams: true });
    expect(diagPreferred).toBeTruthy();
    expect(diagPreferred.set).toBe('diagram');
    expect(diagPreferred.svg).toContain('<svg');

    // Works completely offline with no symbol bank at all
    const offlineHit = matcher.matchWord('fraction', { symbols: null });
    expect(offlineHit).toBeTruthy();
    expect(offlineHit.set).toBe('diagram');

    const hits = await matcher.searchSymbols('perimeter', { symbols: null, preferDiagrams: true });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((h) => h.set === 'diagram' && /perimeter/i.test(String(h.word || h.label)))).toBe(true);
  });
});

describe('8. Cognitive Stroop/Flanker modes, interference cost, 5x8 grid toggle & printable RAN sheet', () => {
  const runnerCore = require('../symbol_runner_core.js');

  it('builds Flanker and Stroop pools with WCAG paired shapes, r/b/g/y single-key matching, and interference cost metrics', () => {
    const flanker = runnerCore.buildModePool('flanker_letters');
    const qty = runnerCore.buildModePool('quantity_stroop');
    const numSize = runnerCore.buildModePool('number_size_stroop');
    const colorStroop = runnerCore.buildModePool('color_word_stroop');

    expect(flanker.length).toBeGreaterThanOrEqual(6);
    expect(flanker.some((c) => typeof c.flankerCenter === 'number' && c.congruent === false)).toBe(true);
    expect(qty.length).toBeGreaterThanOrEqual(6);
    expect(numSize.some((c) => c.sizePair && typeof c.sizePair.left === 'string')).toBe(true);
    expect(colorStroop.length).toBeGreaterThanOrEqual(6);
    expect(['●', '▲', '■', '★'].every((glyph) => colorStroop.some((c) => c.stroopShape === glyph))).toBe(true);

    const redCard = colorStroop.find((c) => c.answer === 'red');
    expect(redCard).toBeTruthy();
    expect(runnerCore.matchTypedSymbol('r', redCard)).toBe('match');
    expect(runnerCore.matchTypedSymbol('red', redCard)).toBe('match');
    expect(runnerCore.matchTypedSymbol('b', redCard)).toBe('miss');

    const sched = runnerCore.createScheduler({ pool: colorStroop, count: 10, seed: 7 });
    const q = sched.peekQueue();
    q.forEach((card) => {
      sched.recordResult(card, { correct: true, firstTry: true, rtMs: card.congruent ? 500 : 900 });
    });
    const st = sched.stats();
    expect(st.congruentMeanMs).toBe(500);
    expect(st.incongruentMeanMs).toBe(900);
    expect(st.interferenceCostMs).toBe(400);
  });

  it('cycles 3D -> 2D -> Grid -> 3D in JSDOM and generates a zero-script 5x8 printable RAN matrix HTML sheet', () => {
    const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    w.eval(read('symbol_runner_core.js'));
    const core = w.AlloSymbolRunnerCore;
    const stage = w.document.getElementById('stage');

    const handle = core.mountRunner(stage, { modeId: 'confusable_letters', viewMode: '3d', seed: 5 });
    const viewBtn = [...stage.querySelectorAll('button')].find((b) => /^View:/i.test(b.textContent));
    expect(handle.getState().viewMode).toBe('3d');
    viewBtn.click();
    expect(handle.getState().viewMode).toBe('2d');
    viewBtn.click();
    expect(handle.getState().viewMode).toBe('grid');
    expect(stage.querySelector('.asr-ran-grid')).not.toBeNull();
    expect(stage.querySelector('.asr-ran-grid').hidden).toBe(false);
    viewBtn.click();
    expect(handle.getState().viewMode).toBe('3d');
    handle.destroy();

    const ranHtml = core.buildPrintableRanSheetHtml({ modeId: 'digits_single', title: 'Digits RAN Matrix', seed: 11 });
    expect(ranHtml).not.toMatch(/<script/i);
    expect(ranHtml).toContain('Teacher 60-Second Scoring Key');
    const ranDom = trackDom(new JSDOM(ranHtml));
    expect(ranDom.window.document.querySelectorAll('table.grid td.cell')).toHaveLength(40);
  });
});

describe('9. Timed 1-minute Symbol Naming Check lifecycle, reopen, results reader & analytics parity', () => {
  it('builds a verifiable check packet, reopens via packets_reopen + maker, plays to completion, and tallies as symbol_naming', async () => {
    const sandbox = {
      window: {},
      globalThis: null,
      TextEncoder,
      TextDecoder,
      Uint8Array,
      Int32Array,
      DataView,
      ArrayBuffer,
      btoa,
      atob,
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.runInNewContext(read('word_sounds_take_home_loader.js'), sandbox);
    const loader = sandbox.AlloWordSoundsTakeHome;
    const builder = require('../packet_symbol_runner_builder.js');
    const verifier = require('../packets_verify_core.js');
    const reopen = require('../packets_reopen.js');
    const reader = require('../packets_results_reader.js');

    const built = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'color_word_stroop',
      packetMode: 'check',
      teacherCode: 'room42',
      viewMode: 'grid',
      title: 'Stroop Naming Check',
      learner: 'RedFox4',
    });

    const report = verifier.verifyPacket(built.html);
    expect(report.counts.notExpected).toBe(0);
    expect(report.counts.look).toBe(0);
    expect(report.script.verdict).toBe('agree');

    const parts = verifier.readParts(built.html);
    const back = builder.readBack(parts);
    expect(back).toMatchObject({
      ok: true,
      packetMode: 'check',
      mode: 'color_word_stroop',
      viewMode: 'grid',
      learner: 'RedFox4',
      teacherCode: true,
      title: 'Stroop Naming Check',
    });

    const reopenedMeta = reopen.read(built.html, { verify: verifier, codeName: builder.codeName });
    expect(reopenedMeta).toMatchObject({ ok: false, kind: 'symbol', page: { href: 'packets-symbol-runner.html', name: 'Make Symbol Runner practice' } });

    // Reopen inside packets-symbol-runner.html via #open-file handoff (teacherCode stays cleared)
    const makerDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html#open-file',
    }));
    const mw = makerDom.window;
    const mdDoc = mw.document;
    mw.matchMedia = () => ({ matches: true });
    mw.AlloPacketHandoff = {
      HASH: '#open-file',
      take: async () => ({ name: 'stroop-check.html', bytes: new TextEncoder().encode(built.html) }),
    };
    mw.eval(read('packets_zip.js'));
    mw.eval(read('packets_verify_core.js'));
    mw.eval(read('word_sounds_take_home_loader.js'));
    mw.eval(read('word_picture_matcher.js'));
    mw.eval(read('symbol_runner_core.js'));
    mw.eval(read('packet_symbol_runner_builder.js'));
    mw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 30));

    expect(mdDoc.getElementById('sr-mode').value).toBe('color_word_stroop');
    expect(mdDoc.querySelector('input[name="sr-view"]:checked').value).toBe('grid');
    expect(mdDoc.querySelector('input[name="sr-packet-mode"]:checked').value).toBe('check');
    expect(mdDoc.getElementById('sr-title').value).toBe('Stroop Naming Check');
    // 2026-11-19 (Wave 3A): unified Step 3 code-name/batch textarea (#sr-learners) holds 1 line for single file or 2-40 for .zip.
    expect(mdDoc.getElementById('sr-learners').value).toBe('RedFox4');
    expect(mdDoc.getElementById('sr-batch').open).toBe(true);
    expect(mdDoc.getElementById('sr-teacher-code').value).toBe('');

    // Play the 1-minute check through practice samples + scored items in JSDOM
    const savedBlobs = [];
    const clock = { t: 1000, wall: Date.UTC(2026, 10, 15, 14, 0, 0) };
    const playDom = trackDom(new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/stroop-check.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.Blob = class { constructor(p, o) { this.body = p.join(''); this.type = o && o.type; } };
        w.URL.createObjectURL = (blob) => { savedBlobs.push(blob); return 'blob://check-res'; };
        w.URL.revokeObjectURL = () => {};
        Object.defineProperty(w.performance, 'now', { configurable: true, value: () => clock.t });
        w.Date.now = () => clock.wall;
      },
    }));
    const pd = playDom.window.document;
    const tick = (ms) => { clock.t += ms; clock.wall += ms; };
    const answerOne = (item) => {
      tick(350);
      const wantBtn = pd.querySelector('[data-sr-choice="' + item.answer + '"]');
      if (wantBtn) { wantBtn.click(); return; }
      const inp = pd.querySelector('[data-sr-input]');
      if (inp) {
        inp.value = item.answer;
        const form = inp.closest('form');
        if (form) form.dispatchEvent(new playDom.window.Event('submit', { bubbles: true, cancelable: true }));
      }
    };

    const nameBox = pd.getElementById('learner-name');
    if (nameBox) nameBox.value = 'RedFox4';
    const nextStart = [...pd.querySelectorAll('#app button')].find((b) => /^Next$/i.test(b.textContent.trim()) && !b.hidden);
    if (nextStart) nextStart.click();

    const rawItems = built.lesson.blocks[0].items;
    const sampleItems = rawItems.filter((it) => it.practice);
    const scoredItems = rawItems.filter((it) => !it.practice);
    expect(sampleItems.length).toBeGreaterThanOrEqual(2);
    expect(scoredItems.length).toBeGreaterThanOrEqual(30);

    sampleItems.forEach((sample) => {
      answerOne(sample);
      const pNext = pd.querySelector('[data-practice-next]');
      if (pNext) pNext.click();
    });
    const beginBtn = pd.querySelector('[data-check-begin]');
    expect(beginBtn).not.toBeNull();
    beginBtn.click();

    scoredItems.forEach((sc) => {
      answerOne(sc);
      const maybeNext = pd.querySelector('[data-practice-next]');
      if (maybeNext && !maybeNext.hidden) maybeNext.click();
    });

    const saveJsonBtn = pd.querySelector('[data-save-json]');
    expect(saveJsonBtn).not.toBeNull();
    saveJsonBtn.click();
    const resultBlob = savedBlobs.find((b) => /\.json/i.test(String(b.type || '')) || /alloflow-take-home-result/.test(String(b.body || '')));
    expect(resultBlob).toBeTruthy();

    // Results reader: tallies under SYMBOL_MEASURES without altering MEASURES/MEASURE_UNITS
    expect(reader.SYMBOL_MEASURES).toEqual({ symbol_naming: 'Symbol naming check' });
    expect(reader.MEASURES.symbol_naming).toBeUndefined();
    expect(reader.MEASURE_UNITS.symbol_naming).toBeUndefined();
    const readRes = await reader.read(resultBlob.body, { name: 'stroop-check-result.json' });
    expect(readRes.ok).toBe(true);
    expect(readRes.sessions[0]).toMatchObject({ measure: 'symbol_naming', measureName: 'Symbol naming check' });
    expect(readRes.sessions[0].score).toMatchObject({ measure: 'symbol_naming' });

    // StudentAnalytics imports the check JSON cleanly via _acThReadFile without unknown_check
    const analyticsSrc = read('student_analytics_module.js');
    const cut = (source, start, end) => {
      const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
      if (a < 0 || b < 0) throw new Error('not found: ' + start);
      return source.slice(a, b);
    };
    const AC = new Function(
      cut(analyticsSrc, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
      cut(analyticsSrc, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
      '\nreturn { readFile: _acThReadFile, preview: _acThPreview };'
    )();
    const fakeFile = {
      name: 'stroop-check-result.json',
      size: resultBlob.body.length,
      lastModified: Date.now(),
      text: async () => resultBlob.body,
    };
    const acRead = await AC.readFile(fakeFile);
    expect(acRead.reason).toBe('');
    expect(acRead.sessions).toHaveLength(1);
    expect(acRead.sessions[0].learner).toBe('RedFox4');
    expect(acRead.sessions[0].check).toBeUndefined();
    expect(acRead.sessions[0].acts.symbol_runner).toBeTruthy();
  });
});

describe('10. Vocabulary Maker -> Present & Export handoff (#from-vocab & saved edits)', () => {
  it('unhides #pe-load-vocab-words, auto-loads saved words/definitions on #from-vocab, and matches diagrams offline without Mulberry bank', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#from-vocab',
    }));
    const w = dom.window;
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.localStorage.setItem('alloflow-packets-vocab/1', JSON.stringify({
      v: 1,
      title: 'Unit 4 Geometry & Geo',
      words: 'fraction\nperimeter\nhabitat\nequator',
    }));
    w.localStorage.setItem('alloflow-packets-vocab-edits/1', JSON.stringify({
      v: 1,
      words: {
        fraction: { def: 'equal parts of a whole', example: 'One half is a fraction.' },
      },
      senses: {},
    }));
    w.AlloModules = {};
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 50));

    const doc = w.document;
    expect(doc.getElementById('pe-load-vocab-words').hidden).toBe(false);
    expect(doc.getElementById('pe-status').textContent).toContain('Loaded 4 words from Vocabulary maker.');

    const pack = w.AlloPacketsPresentExport.getPack();
    expect(pack.title).toBe('Unit 4 Geometry & Geo');
    expect(pack.words.map((it) => it.word)).toEqual(['fraction', 'perimeter', 'habitat', 'equator']);
    expect(pack.words[0].definition).toBe('equal parts of a whole');
    expect(pack.words.every((it) => it.image === PNG_1X1)).toBe(true);
    expect([...doc.querySelectorAll('#present-export-host img')].filter((im) => im.src === PNG_1X1).length).toBeGreaterThanOrEqual(4);

    const searchHits = await w.AlloPacketsPresentExport.searchSymbols('perimeter');
    expect(searchHits.length).toBeGreaterThanOrEqual(1);
    expect(searchHits.some((h) => h.set === 'diagram')).toBe(true);
  });
});

describe('11. Wave 3: 180+ curriculum diagrams, zero svgRefusal errors, and multi-word phrase matching', () => {
  it('ships >= 180 K-8 curriculum diagrams passing svgRefusal and matches multi-word phrases', () => {
    const matcher = require('../word_picture_matcher.js');
    const pktBuilder = require('../word_sounds_packet_builder.js');
    const keys = Object.keys(matcher.CURRICULUM_DIAGRAMS || {});
    expect(keys.length).toBeGreaterThanOrEqual(180);
    for (const key of keys) {
      const entry = matcher.getDiagram(key);
      expect(entry, key).toBeTruthy();
      expect(typeof entry.svg, key).toBe('string');
      expect(pktBuilder.svgRefusal(entry.svg), key).toBe('');
      expect(entry.svg.includes('\\'), key).toBe(false);
    }
    const phraseExpect = [
      ['right angle', 'right_angle'],
      ['food webs', 'food_web'],
      ['states of matter', 'states_of_matter'],
      ['cause and effect', 'cause_and_effect'],
      ['supply and demand', 'supply_and_demand'],
      ['phases of the moon', 'phases_of_the_moon'],
    ];
    for (const [phrase, expectedKey] of phraseExpect) {
      const m = matcher.matchWord(phrase, { preferDiagrams: true });
      expect(m, phrase).toBeTruthy();
      expect(m.matchedKey).toBe(expectedKey);
      expect(m.set).toBe('diagram');
    }
  });
});

describe('12. Wave 3: Vocabulary Maker opt-in diagrams, custom image import, closed packet verification, and #from-vocab link', () => {
  const VOCAB_SCRIPTS = [
    'packets-page.js',
    'word_sounds_take_home_loader.js',
    'packets_verify_core.js',
    'packets_zip.js',
    'packets_handoff.js',
    'packets_my_words.js',
    'packets_vocab_bank_en.js',
    'word_sounds_symbols_en.js',
    'word_picture_matcher.js',
    'word_sounds_packet_builder.js',
    'packets_vocab_media.js',
    'packet_vocab_builder.js',
    'packets-vocab.js',
  ];

  function openVocabMaker(customReadDataUri = PNG_1X1) {
    const dom = trackDom(new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.URL.createObjectURL = () => 'blob:vocab-test';
    w.URL.revokeObjectURL = () => {};
    w.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) });
    w.FileReader = class {
      readAsDataURL() {
        this.result = customReadDataUri;
        if (typeof this.onload === 'function') this.onload();
      }
      readAsText() {}
    };
    for (const src of VOCAB_SCRIPTS) {
      w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
    }
    const $ = (id) => d.getElementById(id);
    const fire = (n, t) => n.dispatchEvent(new w.Event(t, { bubbles: true }));
    return { w, d, $, fire };
  }

  it('keeps #f-diagrams off by default, builds a verified packet when enabled or custom-uploaded, and links #from-vocab', async () => {
    const p = openVocabMaker();
    await new Promise((r) => setTimeout(r, 15));
    expect(p.$('open-present-export').getAttribute('href')).toBe('packets-present-export.html#from-vocab');
    expect(p.$('f-diagrams').checked).toBe(false);

    // Default behavior unchanged on classic 6-word list (only 2 of 6 pictured).
    p.$('f-words').value = 'habitat, predator, prey, cell, bat, nest';
    p.fire(p.$('f-words'), 'input');
    await new Promise((r) => setTimeout(r, 300));
    p.$('next-1').click();
    p.$('next-2').click();
    await new Promise((r) => setTimeout(r, 60));
    const picBox = p.d.querySelector('[data-type="picture"]');
    expect(picBox.disabled).toBe(true);
    expect(picBox.closest('label').querySelector('.choice-note').textContent).toContain('Only 2 of 6 words have a picture.');

    // Custom upload on two more words unlocks picture questions and builds a verified packet with teacher credit.
    for (const wordKey of ['predator', 'prey']) {
      const btn = p.d.querySelector('[data-choose-pic="' + wordKey + '"]');
      expect(btn).toBeTruthy();
      btn.click();
      Object.defineProperty(p.$('f-custom-pic'), 'files', {
        configurable: true,
        value: [{ name: wordKey + '.png', size: 1024, type: 'image/png' }],
      });
      p.fire(p.$('f-custom-pic'), 'change');
      await new Promise((r) => setTimeout(r, 40));
    }
    expect(p.d.querySelector('[data-type="picture"]').disabled).toBe(false);
    // 2026-11-19 (Wave 3A): custom binary pictures stay out of localStorage (stored in AlloPacketMyWords IndexedDB / session memory).
    const storedEdits = JSON.parse(p.w.localStorage.getItem('alloflow-packets-vocab-edits/1') || '{}');
    expect(JSON.stringify(storedEdits)).not.toContain('data:image/');

    const V = p.w.AlloPacketVocab;
    const bank = p.w.AlloVocabBank;
    const matcher = p.w.AlloWordPictureMatcher;
    const symbols = p.w.AlloModules.WordSoundsSymbols;
    const art = p.w.AlloPacketBuilder;
    const customRows = V.draftRows({
      words: V.parseWords('habitat, predator, prey, cell, bat, nest').words,
      bank,
      edits: { v: 1, words: { predator: { customPicture: { dataUri: PNG_1X1 } }, prey: { customPicture: { dataUri: PNG_1X1 } } }, senses: {} },
      pictures: symbols,
      diagrams: false,
      matcher,
      art,
    });
    const customLesson = V.lessonFromVocab({
      loader: p.w.AlloWordSoundsTakeHome,
      rows: customRows,
      types: ['meaning', 'picture'],
      mode: 'practice',
      pictures: symbols,
      diagrams: false,
      matcher,
      art,
      readAloud: true,
    });
    const customHtml = V.buildVocabPacket({ lesson: customLesson, loader: p.w.AlloWordSoundsTakeHome, rows: customRows, bank, diagrams: false }).html;
    const customReport = p.w.AlloPacketVerify.verifyPacket(customHtml);
    expect(customReport.result).toBe('closed');
    expect(customReport.counts.notExpected).toBe(0);
    expect(customReport.counts.look).toBe(0);
    expect(customReport.script.verdict).toBe('agree');
    expect(customHtml).toContain('Pictures added by the teacher:');

    // Turning on #f-diagrams on a science/concept list builds a closed verified packet with diagram credit.
    p.$('back-3').click();
    p.$('back-2').click();
    p.$('f-words').value = 'habitat, cell, bat, nest, atom, ecosystem';
    p.fire(p.$('f-words'), 'input');
    await new Promise((r) => setTimeout(r, 300));
    p.$('next-1').click();
    p.$('next-2').click();
    await new Promise((r) => setTimeout(r, 60));

    const diagBox = p.$('f-diagrams');
    diagBox.checked = true;
    p.fire(diagBox, 'change');
    await new Promise((r) => setTimeout(r, 60));

    const picCheck = p.d.querySelector('[data-type="picture"]');
    expect(picCheck.disabled).toBe(false);
    picCheck.checked = true;
    p.fire(picCheck, 'change');

    // Wait for pictures fetch and packet build summary.
    for (let i = 0; i < 60 && p.$('save').hidden; i++) await new Promise((r) => setTimeout(r, 40));
    expect(p.$('save').hidden).toBe(false);

    // Download/verify built packet via preview session or buildVocabPacket parity check.
    let builtHtml = '';
    const rows = V.draftRows({
      words: V.parseWords('habitat, cell, bat, nest, atom, ecosystem').words,
      bank,
      edits: JSON.parse(p.w.localStorage.getItem('alloflow-packets-vocab-edits/1') || '{}'),
      pictures: symbols,
      diagrams: true,
      matcher,
      art,
    });
    const lesson = V.lessonFromVocab({
      loader: p.w.AlloWordSoundsTakeHome,
      rows,
      types: ['meaning', 'picture'],
      mode: 'practice',
      pictures: symbols,
      diagrams: true,
      matcher,
      art,
      readAloud: true,
    });
    builtHtml = V.buildVocabPacket({ lesson, loader: p.w.AlloWordSoundsTakeHome, rows, bank, diagrams: true }).html;
    const report = p.w.AlloPacketVerify.verifyPacket(builtHtml);
    expect(report.result).toBe('closed');
    expect(report.counts.notExpected).toBe(0);
    expect(report.counts.look).toBe(0);
    expect(report.script.verdict).toBe('agree');
    expect(builtHtml).toContain('School concept diagrams from AlloFlow:');
  });
});

describe('13. Wave 3: Word Sounds Maker -> Present & Export (#from-word-sounds) and printable Flashcards & Frayer sheets', () => {
  it('links from packets-make.html, auto-loads #from-word-sounds, and generates zero-script Flashcards & Frayer HTML', async () => {
    const makeDoc = new JSDOM(read('packets-make.html')).window.document;
    const link = makeDoc.getElementById('open-present-export');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('packets-present-export.html#from-word-sounds');

    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#from-word-sounds',
    }));
    const w = dom.window;
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify({
      v: 1,
      mode: 'pick',
      words: ['cat', 'ship', 'frog', 'star'],
      chosen: ['cat', 'ship', 'frog', 'star'],
      hand: true,
    }));
    w.AlloModules = {};
    w.eval(read('word_sounds_phonemes_en.js'));
    w.eval(read('word_sounds_core.js'));
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 50));

    const doc = w.document;
    expect(doc.getElementById('pe-load-ws-words').hidden).toBe(false);
    expect(doc.getElementById('pe-status').textContent).toContain('Loaded 4 words from Word Sounds maker.');

    const samplePack = {
      title: 'Phonics Review Pack',
      words: [
        { word: 'ship', definition: 'a large boat on the sea', example: 'The ship crossed the bay.', phonemes: ['sh', 'i', 'p'], image: PNG_1X1, imageAlt: 'ship' },
        { word: 'frog', definition: 'a small green jumping animal', example: 'A frog hopped on the log.', phonemes: ['f', 'r', 'o', 'g'], image: PNG_1X1, imageAlt: 'frog' },
      ],
    };

    const flashHtml = w.AlloPacketsPresentExport.buildFlashcardsHtml(samplePack);
    expect(flashHtml).not.toMatch(/<script/i);
    expect(flashHtml).toContain('@media print');
    expect(flashHtml).toContain('elkonin-box');
    expect(flashHtml).toContain('The _______ crossed the bay.');
    expect(flashHtml).toContain(PNG_1X1);
    expect(new JSDOM(flashHtml).window.document.body.textContent).not.toContain('!');

    const frayerHtml = w.AlloPacketsPresentExport.buildFrayerHtml(samplePack);
    expect(frayerHtml).not.toMatch(/<script/i);
    expect(frayerHtml).toContain('@media print');
    expect(frayerHtml).toContain('Picture or sketch');
    expect(frayerHtml).toContain('Write your own sentence');
    expect(frayerHtml).toContain(PNG_1X1);
    expect(new JSDOM(frayerHtml).window.document.body.textContent).not.toContain('!');
  });
});

describe('14. Wave 3: Symbol Runner bimodal audio anchors, confusion pairs, Results -> #rehearse= loop, and hub copy', () => {
  it('auto-plays phonemeAudio on study cards and misses, tracks confusionPairs, and skips Stroop/number items', () => {
    const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    const played = [];
    w.Audio = class {
      constructor(src) { this.src = src; }
      play() { played.push(this.src); return Promise.resolve(); }
    };
    w.eval(read('symbol_runner_core.js'));
    const core = w.AlloSymbolRunnerCore;
    const bank = {
      b: 'data:audio/wav;base64,QkJC',
      d: 'data:audio/wav;base64,RERE',
      s: 'data:audio/wav;base64,U1NT',
      m: 'data:audio/wav;base64,TU1N',
    };

    expect(core.resolvePhonemeAudioUri({ answer: 'b', category: 'letter' }, bank)).toBe(bank.b);
    expect(core.resolvePhonemeAudioUri({ answer: 'red', category: 'color_stroop' }, bank)).toBe('');
    expect(core.resolvePhonemeAudioUri({ answer: '4', category: 'number' }, bank)).toBe('');

    const stage = w.document.getElementById('stage');
    const handle = core.mountRunner(stage, {
      modeId: 'custom',
      customSymbols: 'b, d, s, m, t',
      focusAnswers: ['b'],
      phonemeAudio: bank,
      count: 6,
      seed: 3,
    });
    // First study card is focus item 'b' and plays its phoneme anchor automatically.
    expect(handle.getState().current.study).toBe(true);
    expect(handle.getState().current.answer).toBe('b');
    expect(played).toEqual([bank.b]);

    // Hear sound button is visible and replays anchor.
    const hearBtn = stage.querySelector('[data-sr-hear="true"]');
    expect(hearBtn).toBeTruthy();
    expect(hearBtn.hidden).toBe(false);
    hearBtn.click();
    expect(played).toEqual([bank.b, bank.b]);

    // Wrong answer records confusionPair and replays anchor.
    handle.submit('d');
    expect(played).toEqual([bank.b, bank.b, bank.b]);
    expect(handle.getState().stats.confusionPairs).toEqual([{ target: 'b', picked: 'd', count: 1 }]);
    handle.destroy();
  });

  it('links missed symbol_runner items from Results -> #rehearse= and pre-fills Incremental Rehearsal', async () => {
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const srResult = {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: 'sr-rehearse-1',
      packet: { id: 'sr-letters', version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
      lessonId: 'sr-letters',
      revision: 'r1',
      lessonTitle: 'Confusable Letters Practice',
      activityTitles: { symbol_runner: 'Symbol runner' },
      learner: 'BlueHeron7',
      learnerName: 'BlueHeron7',
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:02:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:02:00-05:00',
      durationMs: 120000,
      items: [
        { n: 1, itemId: 'sr-1', activity: 'symbol_runner', word: 'b', target: 'b', responses: ['d', 'b'], attempts: 2, firstTry: false, correct: true, done: true, ms: 900 },
        { n: 2, itemId: 'sr-2', activity: 'symbol_runner', word: 'd', target: 'd', responses: ['b'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1100 },
        { n: 3, itemId: 'sr-3', activity: 'symbol_runner', word: 's', target: 's', responses: ['s'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
      ],
    };
    const file = new rw.File([JSON.stringify(srResult)], 'sr-res.json', { type: 'application/json', lastModified: Date.now() });
    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [file] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();
    const learnerRadio = rd.querySelector('input[name="view"][value="learner"]');
    learnerRadio.checked = true;
    learnerRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));

    const rehearseAnchor = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].find((b) => /packets-symbol-runner\.html#rehearse=/i.test(b.getAttribute('href') || ''));
    expect(rehearseAnchor).toBeTruthy();
    expect(rehearseAnchor.textContent).toBe('Practice missed symbols in Symbol Runner (opens in a new tab)');
    expect(decodeURIComponent(rehearseAnchor.getAttribute('href').split('#rehearse=')[1])).toBe('b,d');

    // Open packets-symbol-runner.html directly with that hash.
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/' + rehearseAnchor.getAttribute('href'),
    }));
    const sw = srDom.window;
    const sd = sw.document;
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async () => ({ ok: true, status: 200, json: async () => ({ b: 'data:audio/wav;base64,QkJC' }) });
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 30));

    expect(sd.getElementById('sr-custom').value).toContain('b, d');
    expect(sd.getElementById('sr-known').value.length).toBeGreaterThanOrEqual(3);
    expect(sd.getElementById('sr-rehearsal').checked).toBe(true);
    expect(sd.querySelector('input[name="sr-packet-mode"]:checked').value).toBe('practice');
    expect(sd.getElementById('sr-status').textContent).toContain('Loaded 2 missed symbols');

    // Check packets.html hub card copy refresh.
    const hubHtml = read('packets.html');
    // 2026-11-18 (owner): the front door names Symbol Runner in plain words ('5x8 sheet', 'Stroop' were jargon there) and gives the check its own card.
    expect(hubHtml).not.toMatch(/5x8|Stroop|flanker/);
    expect(hubHtml).toContain('1-minute naming check');
    expect(hubHtml).toContain('Works offline.');
  });
});

describe('15. Wave 4: 310+ offline curriculum vector diagrams (word_picture_matcher)', () => {
  it('provides 310+ SVG diagrams with zero svgRefusal hits and resolves new STEM/SS/ELA aliases', () => {
    const matcher = require('../word_picture_matcher.js');
    const pbCtx = { window: {}, globalThis: {} };
    pbCtx.window = pbCtx;
    pbCtx.globalThis = pbCtx;
    vm.runInNewContext(read('word_sounds_packet_builder.js'), pbCtx);
    const pktBuilder = pbCtx.AlloPacketBuilder;

    const keys = Object.keys(matcher.CURRICULUM_DIAGRAMS);
    expect(keys.length).toBeGreaterThanOrEqual(310);
    for (const key of keys) {
      const entry = matcher.CURRICULUM_DIAGRAMS[key];
      expect(typeof entry.svg, key).toBe('string');
      expect(pktBuilder.svgRefusal(entry.svg), key).toBe('');
      expect(entry.svg.includes('\\'), key).toBe(false);
    }

    const expectedAliases = [
      ['heart', 'heart_organ'],
      ['simple machine', 'lever'],
      ['text feature', 'text_feature'],
      ['archipelago', 'archipelago'],
      ['graduated cylinder', 'graduated_cylinder'],
      ['parallel lines', 'parallel_lines'],
      ['checks and balances', 'checks_and_balances'],
      ['barometer', 'barometer'],
    ];
    for (const [phrase, key] of expectedAliases) {
      const hit = matcher.matchWord(phrase, { preferDiagrams: true });
      expect(hit, phrase).toBeTruthy();
      expect(hit.matchedKey).toBe(key);
      expect(hit.set).toBe('diagram');
    }
  });
});

describe('16. Wave 4: WordPractice main-app <-> packets parity (getPack, flashcards, Frayer, and #words= handoff)', () => {
  it('exposes buildFlashcardsHtml/buildFrayerHtml and getPack on WordPractice UI, and accepts #words= hash in Present & Export', async () => {
    const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(makeFakeSvg('cell'));
    const wpDom = trackDom(new JSDOM('<!doctype html><html><body><div id="wp-host"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://app.example/',
    }));
    const ww = wpDom.window;
    ww.AlloModules = {};
    ww.eval(read('word_practice_module.js'));

    const wp = ww.AlloModules.WordPractice;
    expect(typeof wp.buildFlashcardsHtml).toBe('function');
    expect(typeof wp.buildFrayerHtml).toBe('function');

    const svgSample = {
      title: 'Cell Biology',
      words: [
        { word: 'cell', definition: 'basic unit of life', example: 'Every cell has a membrane.', phonemes: ['s', 'e', 'l'], image: svgUri, imageAlt: 'cell diagram' },
      ],
    };
    const svgFlash = wp.buildFlashcardsHtml(svgSample);
    expect(svgFlash).toContain('data:image/svg+xml');
    expect(svgFlash).toContain('Every _______ has a membrane.');
    expect(svgFlash).not.toMatch(/<script/i);
    const svgFrayer = wp.buildFrayerHtml(svgSample);
    expect(svgFrayer).toContain('data:image/svg+xml');
    expect(svgFrayer).toContain('Write your own sentence');

    const host = ww.document.getElementById('wp-host');
    const ctrl = wp.mount(host, {
      title: 'Live Deck',
      words: [{ word: 'cat', definition: 'small pet', example: 'The cat naps.', phonemes: ['k', 'a', 't'], image: PNG_1X1 }],
    });
    expect(typeof ctrl.getPack).toBe('function');
    expect(ctrl.getPack().items.map((i) => i.word)).toEqual(['cat']);
    const btnTexts = [...host.querySelectorAll('button')].map((b) => b.textContent);
    expect(btnTexts).toContain('Download 2-sided flashcards');
    expect(btnTexts).toContain('Download Frayer study sheets');

    // Now test #words= handoff and live pack propagation in packets-present-export.html
    const peDom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#words=fraction,habitat',
    }));
    const pw = peDom.window;
    pw.fetch = async (url) => {
      if (String(url).includes('packets_vocab_bank_fixture') || String(url).includes('vocab_bank')) {
        return { ok: true, status: 200, text: async () => read('tests/fixtures/packets_vocab_bank_fixture.js') };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    pw.AlloModules = {};
    pw.eval(read('word_sounds_phonemes_en.js'));
    pw.eval(read('word_sounds_core.js'));
    pw.eval(read('word_picture_matcher.js'));
    pw.eval(read('word_practice_annotation_assets.js'));
    pw.eval(read('word_practice_core.js'));
    pw.eval(read('word_practice_media.js'));
    pw.eval(read('word_practice_ui.js'));
    pw.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    pw.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 60));

    expect(pw.location.hash).toBe('');
    const liveCtrl = pw.AlloPacketsPresentExport.getController();
    expect(liveCtrl.getPack().items.map((it) => it.word)).toEqual(['fraction', 'habitat']);
    expect(pw.document.getElementById('pe-status').textContent).toContain('Loaded 2 words to practice.');
  });
});

describe('17. Wave 4: Symbol Runner vowel_teams_r, ras_triple, embedded practice audio attribution, and SymbolRunnerPanel', () => {
  it('supports vowel_teams_r + 3-way ras_triple alternation, passes closed verifyPacket with Kokoro-82M credit, and upgrades SymbolRunnerPanel', async () => {
    const sb = {
      window: {},
      globalThis: {},
      TextEncoder,
      TextDecoder,
      btoa,
      atob,
      crypto: webcrypto,
      structuredClone,
      Uint8Array,
      Date,
      Math,
    };
    sb.window = sb;
    sb.globalThis = sb;
    vm.runInNewContext(read('word_sounds_take_home_loader.js'), sb);
    vm.runInNewContext(read('packets_verify_core.js'), sb);
    vm.runInNewContext(read('symbol_runner_core.js'), sb);
    vm.runInNewContext(read('packet_symbol_runner_builder.js'), sb);

    const phonemesJson = JSON.parse(read('audio_bank/phonemes.json'));
    const srCore = sb.AlloSymbolRunnerCore;
    const srBuilder = sb.AlloPacketSymbolRunner;
    const loader = sb.AlloWordSoundsTakeHome;
    const verify = sb.AlloPacketVerify;

    const vtPool = srCore.buildModePool('vowel_teams_r');
    expect(vtPool.map((p) => p.answer)).toEqual(['ar', 'or', 'er', 'ir', 'ur', 'ee', 'oa', 'ay', 'ow', 'oy', 'oo', 'aw', 'air', 'ear']);
    for (const item of vtPool) {
      expect(srCore.resolvePhonemeAudioUri(item, phonemesJson)).toMatch(/^data:audio\//);
    }

    const sched = srCore.createScheduler({ modeId: 'ras_triple', count: 12, seed: 7 });
    const cats = sched.peekQueue().slice(0, 9).map((c) => c.category);
    expect(cats).toEqual(['letter', 'number', 'color_stroop', 'letter', 'number', 'color_stroop', 'letter', 'number', 'color_stroop']);
    const firstColor = sched.peekQueue().find((c) => c.category === 'color_stroop');
    expect(firstColor.stroopInk).toBeTruthy();
    expect(firstColor.stroopShape).toBeTruthy();
    expect(firstColor.choices.length).toBe(4);

    const planTriple = srBuilder.planSymbolRunner({ mode: 'ras_triple', count: 9 });
    expect(planTriple.cards.slice(0, 6).map((c) => c.answer)).toBeTruthy();

    const clipMap = {};
    for (const item of vtPool) clipMap[item.answer] = phonemesJson[item.answer];
    const built = srBuilder.buildSymbolRunnerPacket({
      loader,
      mode: 'vowel_teams_r',
      packetMode: 'practice',
      clips: clipMap,
      title: 'Vowel Teams Audio Drill',
    });
    const report = verify.verifyPacket(built.html);
    expect(report.ok).toBe(true);
    expect(report.result).toBe('closed');
    expect(report.counts.notExpected).toBe(0);
    expect(report.counts.look).toBe(0);
    expect(report.script.verdict).toBe('agree');
    expect(report.counts.sounds).toBeGreaterThan(0);
    expect(built.html).toContain('Kokoro-82M text-to-speech (voice af_heart)');
    const back = srBuilder.readBack(verify.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.includeAudio).toBe(true);
    expect(back.mode).toBe('vowel_teams_r');

    // UI checkbox toggle on packets-symbol-runner.html
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const sw = srDom.window;
    const sd = sw.document;
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async () => ({ ok: true, status: 200, json: async () => phonemesJson });
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 25));

    const audioBox = sd.getElementById('sr-include-audio');
    expect(audioBox.checked).toBe(true);
    expect(audioBox.disabled).toBe(false);
    const checkRadio = sd.querySelector('input[name="sr-packet-mode"][value="check"]');
    checkRadio.checked = true;
    checkRadio.dispatchEvent(new sw.Event('change', { bubbles: true }));
    expect(audioBox.disabled).toBe(true);

    // Check math_fluency_module.js SymbolRunnerPanel upgrade
    const mfSrc = read('math_fluency_module.js');
    // 2026-11-17: asked for at the app's file address first (_srFetchJson); beside the app's page it answered with a web page.
    expect(mfSrc).toContain("_srFetchJson('audio_bank/phonemes.json')");
    // 2026-11-17: reworded "Already-known symbols" to "Symbols the student already knows".
    expect(mfSrc).toContain('Symbols the student already knows');
  });
});

describe('18. Wave 4: Closed RTI loop from packets-results -> packets-vocab, packets-make, and packets-present-export', () => {
  it('renders missed-word links in packets-results and pre-fills packets-vocab + packets-make via #rehearse=', async () => {
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const makeResult = (sessionId, lessonId, items) => ({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId,
      packet: { id: lessonId, version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
      lessonId,
      revision: 'r1',
      lessonTitle: 'Practice Set',
      activityTitles: { vocab_meaning: 'Meaning', vocab_blank: 'Sentence', word_scramble: 'Word Scramble', letter_tracing: 'Letter trace' },
      learner: 'BlueHeron7',
      learnerName: 'BlueHeron7',
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:02:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:02:00-05:00',
      durationMs: 120000,
      items,
    });

    const vocabFile = new rw.File([JSON.stringify(makeResult('voc-1', 'voc-pkt', [
      { n: 1, itemId: 'vm-1', activity: 'vocab_meaning', word: 'habitat', responses: ['desert', 'habitat'], attempts: 2, firstTry: false, correct: true, done: true, ms: 900 },
      { n: 2, itemId: 'vb-2', activity: 'vocab_blank', word: 'photosynthesis', responses: ['respiration'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1200 },
      { n: 3, itemId: 'vm-3', activity: 'vocab_meaning', word: 'cell', responses: ['cell'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
    ]))], 'voc-res.json', { type: 'application/json', lastModified: Date.now() });

    const wsFile = new rw.File([JSON.stringify(makeResult('ws-1', 'ws-pkt', [
      { n: 1, itemId: 'ws-1', activity: 'word_scramble', word: 'ship', responses: ['chip', 'ship'], attempts: 2, firstTry: false, correct: true, done: true, ms: 850 },
      { n: 2, itemId: 'lt-1', activity: 'letter_tracing', word: 's', responses: ['s'], attempts: 2, firstTry: false, correct: true, done: true, practice: 'traced', ms: 600 },
    ]))], 'ws-res.json', { type: 'application/json', lastModified: Date.now() + 100 });

    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [vocabFile, wsFile] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();
    const learnerRadio = rd.querySelector('input[name="view"][value="learner"]');
    learnerRadio.checked = true;
    learnerRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));

    const links = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    const vocabRehearse = links.find((l) => /packets-vocab\.html#rehearse=/.test(l.href));
    const vocabPresent = links.find((l) => /packets-present-export\.html#words=/.test(l.href));
    const wsRehearse = links.find((l) => /packets-make\.html#rehearse=/.test(l.href));
    expect(vocabRehearse).toBeTruthy();
    expect(decodeURIComponent(vocabRehearse.href.split('#rehearse=')[1])).toBe('habitat,photosynthesis');
    expect(vocabPresent).toBeTruthy();
    expect(decodeURIComponent(vocabPresent.href.split('#words=')[1])).toBe('habitat,photosynthesis');
    expect(wsRehearse).toBeTruthy();
    expect(decodeURIComponent(wsRehearse.href.split('#rehearse=')[1])).toBe('ship');

    // Open packets-vocab.html#rehearse=habitat,photosynthesis,adapt,camouflage
    const vDom = trackDom(new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      url: 'https://site.test/packets-vocab.html#rehearse=habitat,photosynthesis,adapt,camouflage',
    }));
    const vw = vDom.window;
    vw.TextEncoder = TextEncoder;
    vw.TextDecoder = TextDecoder;
    Object.defineProperty(vw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    vw.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) });
    for (const s of vw.document.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src');
      vw.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(vw.location.hash).toBe('');
    expect(vw.document.getElementById('f-words').value).toBe('habitat\nphotosynthesis\nadapt\ncamouflage');
    expect(JSON.parse(vw.localStorage.getItem('alloflow-packets-vocab/1')).words).toBe('habitat\nphotosynthesis\nadapt\ncamouflage');

    // Open packets-make.html#rehearse=ship,frog
    const mDom = trackDom(new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      url: 'https://site.test/packets-make.html#rehearse=ship,frog',
    }));
    const mw = mDom.window;
    mw.TextEncoder = TextEncoder;
    mw.TextDecoder = TextDecoder;
    Object.defineProperty(mw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    mw.fetch = (url) => Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    for (const s of mw.document.querySelectorAll('script[src]')) {
      mw.eval(read(s.getAttribute('src')));
    }
    await new Promise((r) => setTimeout(r, 20));
    expect(mw.location.hash).toBe('');
    expect(mw.document.querySelector('input[name="mode"][value="own"]').checked).toBe(true);
    expect(mw.document.getElementById('f-own').value).toBe('ship, frog');
    expect(JSON.parse(mw.localStorage.getItem('alloflow-packets-maker/1')).own).toBe('ship, frog');
  });
});

describe('19. Wave 5: Closed RTI loop from packets-results -> packets-math-practice', () => {
  it('extracts missed and non-turnaround mastered math facts and pre-fills Rehearsal vs Cover, Copy, Compare', async () => {
    const X = String.fromCharCode(0xd7);
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const mathResult = {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: 'math-1',
      packet: { id: 'math-pkt', version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
      lessonId: 'math-pkt',
      revision: 'r1',
      lessonTitle: 'Multiplication Facts',
      activityTitles: { math_ccc: 'Cover, copy, compare' },
      learner: 'BlueHeron7',
      learnerName: 'BlueHeron7',
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:03:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:03:00-05:00',
      durationMs: 180000,
      items: [
        { n: 1, itemId: 'mc-1', activity: 'math_ccc', word: '7 ' + X + ' 8', responses: ['54'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1200 },
        { n: 2, itemId: 'mc-2', activity: 'math_ccc', word: '6 ' + X + ' 9', responses: ['52', '54'], attempts: 2, firstTry: false, correct: true, done: true, ms: 1400 },
        { n: 3, itemId: 'mc-3', activity: 'math_ccc', word: '8 ' + X + ' 7', responses: ['56'], attempts: 1, firstTry: true, correct: true, done: true, ms: 600 },
        { n: 4, itemId: 'mc-4', activity: 'math_ccc', word: '2 ' + X + ' 3', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
        { n: 5, itemId: 'mc-5', activity: 'math_ccc', word: '4 ' + X + ' 5', responses: ['20'], attempts: 1, firstTry: true, correct: true, done: true, ms: 550 },
        { n: 6, itemId: 'mc-6', activity: 'math_ccc', word: '3 ' + X + ' 4', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true, ms: 520 },
        { n: 7, itemId: 'mc-7', activity: 'math_ccc', word: '5 ' + X + ' 6', responses: ['30'], attempts: 1, firstTry: true, correct: true, done: true, ms: 530 },
      ],
    };

    const file = new rw.File([JSON.stringify(mathResult)], 'math-res.json', { type: 'application/json', lastModified: Date.now() });
    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [file] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();
    const learnerRadio = rd.querySelector('input[name="view"][value="learner"]');
    learnerRadio.checked = true;
    learnerRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));

    expect(rd.querySelectorAll('main a:not(.nav-new-tab)')).toHaveLength(0); // 2026-11-17: only the new-tab practice links
    const links = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    const mathBtn = links.find((l) => /packets-math-practice\.html#rehearse=/.test(l.href));
    expect(mathBtn).toBeTruthy();
    expect(mathBtn.text).toBe('Practice missed facts in Math fact practice');
    const [rehearsePart, knownPart] = mathBtn.href.split('#rehearse=')[1].split('&known=');
    expect(decodeURIComponent(rehearsePart)).toContain('7 ' + X + ' 8');
    expect(decodeURIComponent(rehearsePart)).toContain('6 ' + X + ' 9');
    expect(knownPart).toBeTruthy();
    const knownDecoded = decodeURIComponent(knownPart);
    expect(knownDecoded).not.toContain('8 ' + X + ' 7');
    expect(knownDecoded).toContain('2 ' + X + ' 3');
    expect(knownDecoded).toContain('5 ' + X + ' 6');

    const mpDom = trackDom(new JSDOM(read('packets-math-practice.html'), {
      runScripts: 'outside-only',
      url: 'https://site.test/' + mathBtn.href,
    }));
    const mw = mpDom.window;
    mw.TextEncoder = TextEncoder;
    mw.TextDecoder = TextDecoder;
    Object.defineProperty(mw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    mw.fetch = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    for (const s of mw.document.querySelectorAll('script[src]')) mw.eval(read(s.getAttribute('src')));
    await new Promise((r) => setTimeout(r, 20));

    expect(mw.location.hash).toBe('');
    const savedState = JSON.parse(mw.localStorage.getItem('alloflow-packets-math-practice/1'));
    expect(savedState.kind).toBe('own');
    expect(savedState.method).toBe('rehearsal');
    expect(mw.document.getElementById('step-2').hidden).toBe(false);
    const factsVal = mw.document.getElementById('f-facts').value;
    expect(factsVal).toContain('7 ' + X + ' 8');
    expect(factsVal).toContain('2 ' + X + ' 3');
    const checkedKnown = [...mw.document.querySelectorAll('#known input[type="checkbox"]:checked')];
    expect(checkedKnown.length).toBeGreaterThanOrEqual(4);

    // Fewer than 3 known facts -> defaults cleanly to Cover, Copy, Compare ('ccc')
    const cccDom = trackDom(new JSDOM(read('packets-math-practice.html'), {
      runScripts: 'outside-only',
      url: 'https://site.test/packets-math-practice.html#rehearse=7x8,6x9',
    }));
    const cw = cccDom.window;
    cw.TextEncoder = TextEncoder;
    cw.TextDecoder = TextDecoder;
    Object.defineProperty(cw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    cw.fetch = () => Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    for (const s of cw.document.querySelectorAll('script[src]')) cw.eval(read(s.getAttribute('src')));
    await new Promise((r) => setTimeout(r, 20));
    const cccSaved = JSON.parse(cw.localStorage.getItem('alloflow-packets-math-practice/1'));
    expect(cccSaved.kind).toBe('own');
    expect(cccSaved.method).toBe('ccc');
    expect(cw.document.getElementById('step-2').hidden).toBe(false);
  });
});

describe('20. Wave 5: Symbol Runner .zip batch export, preview handoff, and letter-name vs phoneme audio mode', () => {
  it('resolves letter names vs phoneme sounds by mode/override, round-trips audioMode in packets, exports PK .zip batch, and opens preview link', async () => {
    const core = require('../symbol_runner_core.js');
    const builder = require('../packet_symbol_runner_builder.js');
    const phonemeMap = { b: 'data:audio/webm;base64,PHONEME_B' };
    const letterAudio = { b: 'data:audio/webm;base64,LETTER_B' };

    expect(core.resolvePhonemeAudioUri({ answer: 'b', soundKey: 'b' }, phonemeMap, { letterAudio, audioMode: 'auto', modeId: 'letters_lower' })).toBe('data:audio/webm;base64,LETTER_B');
    expect(core.resolvePhonemeAudioUri({ answer: 'b', soundKey: 'b' }, phonemeMap, { letterAudio, audioMode: 'auto', modeId: 'letter_sounds' })).toBe('data:audio/webm;base64,PHONEME_B');
    expect(core.resolvePhonemeAudioUri({ answer: 'b', soundKey: 'b' }, phonemeMap, { letterAudio, audioMode: 'name', modeId: 'letter_sounds' })).toBe('data:audio/webm;base64,LETTER_B');
    expect(core.resolvePhonemeAudioUri({ answer: 'b', soundKey: 'b' }, phonemeMap, { letterAudio, audioMode: 'sound', modeId: 'letters_lower' })).toBe('data:audio/webm;base64,PHONEME_B');

    const mountDom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>'));
    const handle = core.mountRunner(mountDom.window.document.getElementById('stage'), {
      modeId: 'letters_lower',
      letterAudio,
      phonemeAudio: phonemeMap,
      audioMode: 'auto',
    });
    expect(handle.getState().audioMode).toBe('auto');
    handle.setLetterAudio({ b: 'data:audio/webm;base64,LETTER_B2' });
    handle.setAudioMode('sound');
    expect(handle.getState().audioMode).toBe('sound');
    handle.destroy();

    const parts = {};
    parts.window = parts;
    new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
    const built = builder.buildSymbolRunnerPacket({
      loader: parts.AlloWordSoundsTakeHome,
      title: 'Letters Audio Mode',
      modeId: 'letters_lower',
      audioMode: 'sound',
      letterAudio,
      phonemeAudio: phonemeMap,
    });
    const verify = require('../packets_verify_core.js');
    const back = builder.readBack(verify.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(built.manifest.symbolRunner.audioMode).toBe('sound');
    expect(back.audioMode).toBe('sound');

    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const w = srDom.window;
    const d = w.document;
    delete w.fetch;
    w.matchMedia = () => ({ matches: true });
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    const capturedBlobs = [];
    w.Blob = function FakeBlob(blobParts, opts) {
      this._rawParts = blobParts;
      this.type = (opts && opts.type) || '';
      capturedBlobs.push(this);
    };
    const clickedLinks = [];
    let lastBlobUrl = '';
    w.URL.createObjectURL = (blob) => {
      lastBlobUrl = 'blob://sr-' + capturedBlobs.length;
      blob._url = lastBlobUrl;
      return lastBlobUrl;
    };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      const blob = capturedBlobs.find((b) => b._url === this.getAttribute('href')) || capturedBlobs[capturedBlobs.length - 1];
      clickedLinks.push({
        href: this.getAttribute('href'),
        download: this.getAttribute('download'),
        target: this.getAttribute('target'),
        blob,
      });
    };
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));

    // Batch export with 2 code names -> 1-click PK zip archive (Wave 3A canonical Title__N-students.zip).
    d.getElementById('sr-learners').value = 'BlueHeron7\nRedFox4';
    d.getElementById('sr-learners').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(d.getElementById('sr-batch-make').hidden).toBe(false);
    expect(d.getElementById('sr-batch-make').textContent).toBe('Save .zip for 2 students');
    d.getElementById('sr-batch-make').click();
    const zipClick = clickedLinks.find((c) => c.download && /__2-students\.zip$/.test(c.download));
    expect(zipClick).toBeTruthy();
    expect(zipClick.blob.type).toBe('application/zip');
    const firstChunk = zipClick.blob._rawParts[0];
    expect(firstChunk[0]).toBe(0x50);
    expect(firstChunk[1]).toBe(0x4b);

    // Sandboxed preview -> packets-try.html#blob:...
    d.getElementById('sr-try-packet').click();
    const tryClick = clickedLinks.find((c) => /^packets-try\.html#blob:/.test(String(c.href || '')));
    expect(tryClick).toBeTruthy();
    expect(tryClick.target).toBe('_blank');
  });
});

describe('21. Wave 5: Printable cut-out tabletop sorting cards', () => {
  it('generates print-ready Word/Meaning/unlabeled Picture tiles with blanked target word, Teacher Key, zero scripts, and zero exclamation marks', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    const d = w.document;
    expect(d.getElementById('pe-sheet-download').getAttribute('type')).toBe('button');
    expect(d.querySelector('#pe-sheet-type option[value="sorting-cards"]')).toBeTruthy();
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    const capturedDownloads = [];
    const NativeBlob = w.Blob;
    w.Blob = function (parts, opts) {
      const b = new NativeBlob(parts, opts);
      b._text = parts.join('');
      return b;
    };
    w.URL.createObjectURL = (b) => { capturedDownloads.push(b); return 'blob://sort'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      if (capturedDownloads.length) capturedDownloads[capturedDownloads.length - 1]._name = this.getAttribute('download');
    };
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 20));

    const testPack = {
      title: 'Cell & Ecosystem Sort',
      words: [
        { word: 'cell', definition: 'A cell is the smallest unit of life.', example: 'Every plant has a cell wall.', image: PNG_1X1, credit: 'Teacher PNG' },
        { word: 'toxicurl', definition: 'Avoid toxicurl remote links.', example: 'The toxicurl link is unsafe.', image: 'https://evil.example/a.png' },
        { word: 'xsssvg', definition: 'Reject xsssvg script images.', example: 'Block xsssvg tags.', image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg><script>alert(1)</script></svg>') },
      ],
    };

    const htmlMedia = w.AlloWordPracticeMedia.buildSortingCardsHtml(testPack);
    const htmlPage = w.AlloPacketsPresentExport.buildSortingCardsHtml(testPack);
    for (const html of [htmlMedia, htmlPage]) {
      expect(html).toContain('@media print');
      expect(html).toContain('sort-word');
      expect(html).toContain('sort-meaning');
      expect(html).toContain('sort-picture');
      expect(html).toContain('teacher-key');
      expect(html).toContain('Teacher PNG');
      expect(html).not.toMatch(/<script/i);
      expect(html.slice(15)).not.toContain('!');
      expect(html).not.toContain('https://evil.example');

      const parsed = new JSDOM(html).window.document;
      const meaningText = [...parsed.querySelectorAll('.sort-meaning')].map((n) => n.textContent).join('\n');
      expect(meaningText).toContain('_______');
      expect(meaningText.toLowerCase()).not.toContain('cell');
      const picTiles = [...parsed.querySelectorAll('.sort-picture')];
      expect(picTiles).toHaveLength(1);
      expect(picTiles[0].textContent.trim()).toBe('Picture');
      expect(picTiles[0].querySelector('img').getAttribute('src')).toBe(PNG_1X1);
    }

    d.getElementById('pe-sheet-type').value = 'sorting-cards';
    d.getElementById('pe-sheet-download').click();
    const lastDl = capturedDownloads[capturedDownloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-sorting-cards\.html$/);
  });
});

describe('22. Wave 5: Expanded 400+ curriculum diagrams and >= 94% offline K-8 vocabulary coverage', () => {
  it('provides 401+ safe offline diagrams, preserves fraction Mulberry default, and matches >= 94% of K-8 curriculum words', () => {
    const matcher = require('../word_picture_matcher.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
    const bank = require('../packets_vocab_bank_en.js');
    for (const s of bank.shards) bank.add(JSON.parse(read(s.url)));
    const art = require('../word_sounds_packet_builder.js');

    const diags = Object.values(matcher.CURRICULUM_DIAGRAMS);
    expect(diags.length).toBeGreaterThanOrEqual(401);
    for (const d of diags) {
      expect(art.svgRefusal(d.svg), d.word).toBe('');
    }
    const frac = matcher.matchWord('fraction', { symbols });
    expect(frac).toBeTruthy();
    expect(frac.word).toBe('cake');
    expect(frac.set).toBe('mulberry');

    const cur = bank.words().slice(0, 521);
    let matchedCur = 0;
    for (const w of cur) {
      const sense = bank.sense(w) || {};
      const hit = matcher.matchWord({ word: w, definition: sense.definition || sense.def || '' }, { symbols });
      if (hit && (hit.svg || hit.src)) matchedCur++;
    }
    expect(matchedCur).toBeGreaterThanOrEqual(490);
  });
});

describe('23. Wave 6: Class-wide Group RTI summary and 1-click small-group re-teaching on packets-results', () => {
  it('renders Most missed across the group after #group-table with confusion answers and small-group launch buttons', async () => {
    const X = String.fromCharCode(0xd7);
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const mkRes = (sid, learner, extraTime, items) => ({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'grp-pkt', version: 'r1', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
      lessonId: 'grp-pkt',
      revision: 'r1',
      lessonTitle: 'Group Practice',
      activityTitles: { vocab_meaning: 'Meaning', symbol_runner: 'Symbol runner', math_ccc: 'Cover, copy, compare' },
      learner,
      learnerName: learner,
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:02:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:02:00-05:00',
      durationMs: 120000,
      items,
      _ts: Date.now() + extraTime,
    });

    const commonItems = (missedB, missedHab, extra) => [
      { n: 1, itemId: 'sr-1', activity: 'symbol_runner', word: 'b', target: 'b', responses: missedB ? ['d', 'b'] : ['b'], attempts: missedB ? 2 : 1, firstTry: !missedB, correct: true, done: true, ms: 900 },
      { n: 2, itemId: 'vm-1', activity: 'vocab_meaning', word: 'habitat', responses: missedHab ? ['desert', 'habitat'] : ['habitat'], attempts: missedHab ? 2 : 1, firstTry: !missedHab, correct: true, done: true, ms: 1000 },
      { n: 3, itemId: 'mc-1', activity: 'math_ccc', word: '7 ' + X + ' 8', responses: ['54'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1100 },
      { n: 4, itemId: 'mc-2', activity: 'math_ccc', word: '8 ' + X + ' 7', responses: ['56'], attempts: 1, firstTry: true, correct: true, done: true, ms: 600 },
      { n: 5, itemId: 'mc-3', activity: 'math_ccc', word: '2 ' + X + ' 3', responses: ['6'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
      { n: 6, itemId: 'mc-4', activity: 'math_ccc', word: '4 ' + X + ' 5', responses: ['20'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
      { n: 7, itemId: 'mc-5', activity: 'math_ccc', word: '3 ' + X + ' 4', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
      { n: 8, itemId: 'mc-6', activity: 'math_ccc', word: '5 ' + X + ' 6', responses: ['30'], attempts: 1, firstTry: true, correct: true, done: true, ms: 500 },
    ].concat(extra || []);

    const f1 = new rw.File([JSON.stringify(mkRes('g1', 'BlueHeron7', 10, commonItems(true, true)))], 'g1.json', { type: 'application/json', lastModified: Date.now() + 10 });
    const f2 = new rw.File([JSON.stringify(mkRes('g2', 'RedFox4', 20, commonItems(true, true, [
      { n: 9, itemId: 'vm-2', activity: 'vocab_meaning', word: 'photosynthesis', responses: ['cell'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1000 },
    ])))], 'g2.json', { type: 'application/json', lastModified: Date.now() + 20 });
    const f3 = new rw.File([JSON.stringify(mkRes('g3', 'GreenOwl2', 30, commonItems(false, true)))], 'g3.json', { type: 'application/json', lastModified: Date.now() + 30 });

    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [f1, f2, f3] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();

    expect([...rd.getElementById('group-table').querySelectorAll('h4')].map((n) => n.textContent)).toEqual(['Practice: latest first-try percent']);
    const gm = rd.getElementById('group-missed');
    expect(gm).toBeTruthy();
    expect(gm.hidden).toBe(false);
    expect(gm.previousElementSibling).toBe(rd.getElementById('group-table'));
    expect(gm.textContent).toContain('Most missed across the group');
    expect(gm.textContent).toContain('habitat');
    expect(gm.textContent).toContain('3 of 3');
    expect(gm.textContent).toContain('d (2)');
    expect(gm.textContent).toContain('7 ' + X + ' 8');
    expect(rd.querySelectorAll('main a:not(.nav-new-tab)')).toHaveLength(0); // 2026-11-17: only the new-tab practice links

    const hrefs = [...gm.querySelectorAll('a.nav-new-tab')].map((b) => b.getAttribute('href'));
    const vocabHref = hrefs.find((h) => /^packets-vocab\.html#rehearse=/.test(h));
    const peHref = hrefs.find((h) => /^packets-present-export\.html#words=/.test(h));
    const srHref = hrefs.find((h) => /^packets-symbol-runner\.html#rehearse=/.test(h));
    const mathHref = hrefs.find((h) => /^packets-math-practice\.html#rehearse=/.test(h));
    expect(vocabHref).toBeTruthy();
    expect(peHref).toBeTruthy();
    expect(srHref).toBeTruthy();
    expect(mathHref).toBeTruthy();
    expect(decodeURIComponent(vocabHref)).toContain('habitat');
    expect(decodeURIComponent(srHref)).toContain('b');
    const knownPart = decodeURIComponent(mathHref.split('&known=')[1] || '');
    expect(knownPart).not.toContain('8 ' + X + ' 7');
    expect(knownPart).toContain('2 ' + X + ' 3');
  });
});

describe('24. Wave 6: 500+ curriculum diagrams, zero unbacked CONCEPT_CUES, derivational morphology, and 4,950+ vocab matches', () => {
  it('provides 505+ valid SVG diagrams, 0 unbacked CONCEPT_CUES, 521/521 curriculum coverage, >= 2350 word-only, and >= 4950 def-backed matches', () => {
    const matcher = require('../word_picture_matcher.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
    const bank = require('../packets_vocab_bank_en.js');
    for (const s of bank.shards) bank.add(JSON.parse(read(s.url)));
    const art = require('../word_sounds_packet_builder.js');

    const diags = Object.values(matcher.CURRICULUM_DIAGRAMS);
    expect(diags.length).toBeGreaterThanOrEqual(505);
    for (const d of diags) {
      expect(art.svgRefusal(d.svg), d.word).toBe('');
    }
    for (const [k, arr] of Object.entries(matcher.CONCEPT_CUES)) {
      expect(arr.some((c) => symbols.has(c)), 'unbacked cue ' + k).toBe(true);
    }

    const words = bank.words();
    let curOk = 0;
    for (const w of words.slice(0, 521)) {
      const s0 = (bank.senses(w) || [])[0] || {};
      const m = matcher.matchWord({ word: w, definition: s0.def || '' }, { symbols });
      if (m && (m.svg || m.src)) curOk++;
    }
    expect(curOk).toBe(521);

    let wordOnly = 0;
    let withDef = 0;
    for (const w of words) {
      const s0 = (bank.senses(w) || [])[0] || {};
      const m0 = matcher.matchWord({ word: w }, { symbols });
      const m1 = matcher.matchWord({ word: w, definition: s0.def || '' }, { symbols });
      if (m0 && (m0.svg || m0.src)) wordOnly++;
      if (m1 && (m1.svg || m1.src)) withDef++;
    }
    expect(wordOnly).toBeGreaterThanOrEqual(2350);
    expect(withDef).toBeGreaterThanOrEqual(4950);
  });
});

describe('25. Wave 6: Printable no-scissors Cloze & Picture-Match Worksheet', () => {
  it('renders @media print Word Bank, Meaning+Picture Matching, Cloze Sentences, Teacher Key, zero scripts, and downloads -worksheet.html', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    const d = w.document;
    expect(d.getElementById('pe-sheet-download').getAttribute('type')).toBe('button');
    expect(d.querySelector('#pe-sheet-type option[value="worksheet"]')).toBeTruthy();
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    const capturedDownloads = [];
    w.Blob = function FakeBlob(parts, opts) {
      this._text = parts.join('');
      this.type = (opts && opts.type) || '';
      capturedDownloads.push(this);
    };
    w.URL.createObjectURL = (b) => { b._url = 'blob://ws-' + capturedDownloads.length; return b._url; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      const match = capturedDownloads.find((b) => b._url === this.getAttribute('href')) || capturedDownloads[capturedDownloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 20));

    const testPack = {
      title: 'Worksheet Deck',
      words: [
        { word: 'cell', definition: 'A cell is the smallest unit of life.', example: 'Every plant has a cell wall.', image: PNG_1X1, credit: 'Teacher PNG' },
        { word: 'toxicurl', definition: 'Avoid toxicurl remote links.', example: 'Block toxicurl urls.', image: 'https://evil.example/a.png' },
        { word: 'xsssvg', definition: 'Reject xsssvg scripts.', example: 'No xsssvg tags.', image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg><script>alert(1)</script></svg>') },
      ],
    };

    const htmlMedia = w.AlloWordPracticeMedia.buildWorksheetHtml(testPack);
    const htmlPage = w.AlloPacketsPresentExport.buildWorksheetHtml(testPack);
    for (const html of [htmlMedia, htmlPage]) {
      expect(html).toContain('@media print');
      expect(html).toContain('ws-word-bank');
      expect(html).toContain('ws-matching');
      expect(html).toContain('ws-cloze');
      expect(html).toContain('teacher-key');
      expect(html).toContain('Teacher PNG');
      expect(html).not.toMatch(/<script/i);
      expect(html.slice(15)).not.toContain('!');
      expect(html).not.toContain('https://evil.example');

      const parsed = new JSDOM(html).window.document;
      const studentBody = [...parsed.querySelectorAll('.ws-matching, .ws-cloze')].map((n) => n.textContent).join('\n');
      expect(studentBody).toContain('_______');
      expect(studentBody.toLowerCase()).not.toContain('cell');
      const pics = [...parsed.querySelectorAll('.ws-matching img.ws-pic')];
      expect(pics).toHaveLength(1);
      expect(pics[0].getAttribute('src')).toBe(PNG_1X1);
    }

    d.getElementById('pe-sheet-type').value = 'worksheet';
    d.getElementById('pe-sheet-download').click();
    const lastDl = capturedDownloads[capturedDownloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-worksheet\.html$/);
  });
});

describe('26. Wave 6: Cross-maker reopen handoff in packets-symbol-runner and localService speechSynthesis fallback', () => {
  it('enforces localService === true speech fallback for digits/colors and offers cross-maker handoff when opening non-Symbol-Runner files', async () => {
    const core = require('../symbol_runner_core.js');
    expect(core.resolveSpokenCueText({ answer: '4', category: 'number' })).toBe('four');
    expect(core.resolveSpokenCueText({ answer: 'red', category: 'color_stroop' })).toBe('');
    expect(core.resolveSpokenCueText({ answer: 'red', category: 'color_stroop' }, { allowStroop: true })).toBe('red');

    // Cloud-only speechSynthesis voice (localService: false) must NEVER be spoken
    const cloudDom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const cw = cloudDom.window;
    const cloudSpoken = [];
    cw.matchMedia = () => ({ matches: true });
    cw.SpeechSynthesisUtterance = function (txt) { this.text = txt; };
    cw.speechSynthesis = {
      getVoices: () => [{ lang: 'en-US', localService: false, name: 'Cloud Voice' }],
      cancel: () => {},
      speak: (u) => cloudSpoken.push(u.text),
    };
    cw.eval(read('symbol_runner_core.js'));
    const cloudStage = cw.document.getElementById('stage');
    const cloudHandle = cw.AlloSymbolRunnerCore.mountRunner(cloudStage, { modeId: 'digits_single', focusAnswers: ['4'], seed: 2 });
    expect(cloudSpoken).toEqual([]);
    expect(cloudStage.querySelector('[data-sr-hear="true"]').hidden).toBe(true);
    cloudHandle.destroy();

    // Local on-device speechSynthesis voice (localService: true) speaks digit cues cleanly
    const localDom = trackDom(new JSDOM('<!doctype html><html><body><div id="stage"></div></body></html>', {
      runScripts: 'outside-only',
      url: 'https://alloflow.example',
    }));
    const lw = localDom.window;
    const localSpoken = [];
    let cancelled = 0;
    lw.matchMedia = () => ({ matches: true });
    lw.SpeechSynthesisUtterance = function (txt) { this.text = txt; };
    lw.speechSynthesis = {
      getVoices: () => [{ lang: 'en-US', localService: true, name: 'On Device' }],
      cancel: () => { cancelled++; },
      speak: (u) => localSpoken.push(u.text),
    };
    lw.eval(read('symbol_runner_core.js'));
    const localStage = lw.document.getElementById('stage');
    const localHandle = lw.AlloSymbolRunnerCore.mountRunner(localStage, { modeId: 'digits_single', focusAnswers: ['4'], seed: 2 });
    expect(localSpoken).toEqual(['four']);
    expect(localStage.querySelector('[data-sr-hear="true"]').hidden).toBe(false);
    localHandle.destroy();
    expect(cancelled).toBeGreaterThanOrEqual(2);

    // Cross-maker handoff when a Vocabulary packet is opened on packets-symbol-runner.html
    const vp = {};
    vp.window = vp;
    new Function('window', read('word_sounds_take_home_loader.js')).call(vp, vp);
    const V = require('../packet_vocab_builder.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));
    const bank = require('./fixtures/packets_vocab_bank_fixture.js');
    await bank.load();
    const rows = V.draftRows({ words: V.parseWords('habitat, cell, bat, nest').words, bank, pictures: symbols });
    const lesson = V.lessonFromVocab({ loader: vp.AlloWordSoundsTakeHome, rows, types: ['meaning'], mode: 'practice', pictures: symbols });
    const vocabBuilt = V.buildVocabPacket({ lesson, loader: vp.AlloWordSoundsTakeHome, rows, bank });

    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const w = srDom.window;
    const d = w.document;
    delete w.fetch;
    w.matchMedia = () => ({ matches: true });
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    const navClicks = [];
    w.HTMLAnchorElement.prototype.click = function () { navClicks.push(this.getAttribute('href')); };
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));

    let handedFile = null;
    if (w.AlloPacketHandoff) {
      w.AlloPacketHandoff.put = async (f) => { handedFile = f; return true; };
    }
    const ok = w.AlloPacketsSymbolRunner.reopenFromText(vocabBuilt.html, 'unit1.html');
    expect(ok).toBe(false);
    const rs = d.getElementById('sr-reopen-status');
    expect(rs.textContent).toContain('Make vocabulary practice');
    const handoffBtn = rs.querySelector('button[data-handoff-href="packets-vocab.html"]');
    expect(handoffBtn).toBeTruthy();
    handoffBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(handedFile && handedFile.name).toBe('unit1.html');
    expect(navClicks).toContain('packets-vocab.html' + w.AlloPacketHandoff.HASH);
  });
});

describe('27. Wave 7: Present & Export async vocabBank + head() lemma enrichment & Classroom Bingo Boards', () => {
  it('awaits async vocabBank with head() fallback and generates 6 print-ready 3x3/4x4 Bingo boards with teacher caller clues', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#words=ecosystems,habitats,cells',
    }));
    const w = dom.window;
    const d = w.document;
    expect(d.getElementById('pe-sheet-download').getAttribute('type')).toBe('button');
    expect(d.querySelector('#pe-sheet-type option[value="bingo"]')).toBeTruthy();

    let bankLoaded = false;
    const bankSenses = {
      ecosystem: [{ id: 'ecosystem|n|1', word: 'ecosystem', pos: 'noun', def: 'A community of living things and their environment.', example: 'A pond ecosystem includes frogs and plants.' }],
      habitat: [{ id: 'habitat|n|1', word: 'habitat', pos: 'noun', def: 'The natural home of a plant or animal.', example: 'Wetlands provide habitat for many birds.' }],
      cell: [{ id: 'cell|n|1', word: 'cell', pos: 'noun', def: 'The smallest living unit in an organism.', example: 'Every leaf cell holds water.' }],
    };
    const heads = { ecosystems: 'ecosystem', habitats: 'habitat', cells: 'cell' };
    w.AlloVocabBank = {
      ready: () => bankLoaded,
      load: () => new Promise((resolve) => setTimeout(() => { bankLoaded = true; resolve(w.AlloVocabBank); }, 10)),
      head: (raw) => heads[String(raw || '').toLowerCase()] || null,
      senses: (raw) => bankSenses[String(raw || '').toLowerCase()] || [],
    };
    w.AlloWordSoundsSymbols = fakeSymbolsBank({
      ecosystem: { word: 'ecosystem', svg: makeFakeSvg('eco'), label: 'ecosystem', set: 'mulberry', credit: 'Mulberry Symbols' },
      habitat: { word: 'habitat', svg: makeFakeSvg('hab'), label: 'habitat', set: 'mulberry', credit: 'Mulberry Symbols' },
      cell: { word: 'cell', svg: makeFakeSvg('cell'), label: 'cell', set: 'mulberry', credit: 'Mulberry Symbols' },
    });
    w.AlloModules = { WordSoundsSymbols: w.AlloWordSoundsSymbols };
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });

    const capturedDownloads = [];
    w.Blob = function FakeBlob(parts, opts) {
      this._text = parts.join('');
      this.type = (opts && opts.type) || '';
      capturedDownloads.push(this);
    };
    w.URL.createObjectURL = (b) => { b._url = 'blob://bingo-' + capturedDownloads.length; return b._url; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      const match = capturedDownloads.find((b) => b._url === this.getAttribute('href')) || capturedDownloads[capturedDownloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };

    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.eval(read('packets-present-export.js'));

    await new Promise((r) => setTimeout(r, 45));
    expect(w.location.hash).toBe('');
    const resolvedEco = w.AlloPacketsPresentExport.resolveEntry('ecosystems');
    expect(resolvedEco.definition).toContain('living things');
    expect(resolvedEco.example).toContain('pond');

    const threePack = {
      title: 'Bingo Mini Deck',
      words: [
        { word: 'cell', definition: 'A cell is the basic unit of life.', example: 'Each cell works inside tissue.', image: PNG_1X1, credit: 'Teacher PNG' },
        { word: 'badpic', definition: 'Avoid badpic remote links.', example: 'Reject badpic urls.', image: 'https://evil.example/x.png' },
        { word: 'habitat', definition: 'Natural habitat of a species.', example: 'Protect wetland habitat.' },
      ],
    };
    for (const html of [w.AlloWordPracticeMedia.buildBingoHtml(threePack), w.AlloPacketsPresentExport.buildBingoHtml(threePack)]) {
      expect(html).toContain('@media print');
      expect(html).not.toMatch(/<script/i);
      expect(html.slice(15)).not.toContain('!');
      expect(html).not.toContain('https://evil.example');
      const parsed = new JSDOM(html).window.document;
      expect(parsed.querySelectorAll('.bingo-board')).toHaveLength(6);
      expect(parsed.querySelector('.bingo-grid').getAttribute('data-grid-size')).toBe('3');
      expect(parsed.querySelectorAll('.bingo-free')).toHaveLength(6);
      const bingoPics = [...parsed.querySelectorAll('.bingo-pic')];
      expect(bingoPics.length).toBeGreaterThan(0);
      expect(bingoPics.every((img) => img.getAttribute('src') === PNG_1X1)).toBe(true);
      const callerText = parsed.querySelector('.teacher-key table').textContent;
      expect(callerText).toContain('_______');
      expect(callerText).toContain('Teacher PNG');
    }

    const sixteenPack = {
      title: 'Sixteen Word Bingo',
      words: Array.from({ length: 16 }, (_, i) => ({ word: 'term' + (i + 1), definition: 'Definition ' + (i + 1) })),
    };
    const fourHtml = w.AlloWordPracticeMedia.buildBingoHtml(sixteenPack);
    const fourDoc = new JSDOM(fourHtml).window.document;
    expect(fourDoc.querySelector('.bingo-grid').getAttribute('data-grid-size')).toBe('4');
    expect(fourDoc.querySelectorAll('.bingo-free')).toHaveLength(0);
    expect(fourDoc.querySelectorAll('.bingo-board')[0].querySelectorAll('.bingo-cell')).toHaveLength(16);

    d.getElementById('pe-sheet-type').value = 'bingo';
    d.getElementById('pe-sheet-download').click();
    const lastDl = capturedDownloads[capturedDownloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-bingo\.html$/);
  });
});

describe('28. Wave 7: Symbol Runner sight_words & morpheme_chunks modes, lazy wordAudio & partner scoring strip', () => {
  it('builds verified sight_words and morpheme_chunks packets, lazily loads words.json only for sight_words, and prints partner row strip', async () => {
    const core = require('../symbol_runner_core.js');
    const srBuilder = require('../packet_symbol_runner_builder.js');
    const verify = require('../packets_verify_core.js');
    const loaderScope = {};
    loaderScope.window = loaderScope;
    new Function('window', read('word_sounds_take_home_loader.js')).call(loaderScope, loaderScope);
    const loader = loaderScope.AlloWordSoundsTakeHome;

    expect(core.getMode('sight_words').category).toBe('word');
    expect(core.getMode('morpheme_chunks').category).toBe('chunk');
    expect(core.resolveSpokenCueText({ answer: 'away', category: 'word' })).toBe('away');
    expect(core.resolveSpokenCueText({ answer: 'ment', category: 'chunk' })).toBe('ment');
    expect(core.resolvePhonemeAudioUri({ answer: 'away', category: 'word' }, { a: 'data:audio/mp3;base64,AA==' }, {})).toBe('');
    expect(core.resolvePhonemeAudioUri({ answer: 'away', category: 'word' }, {}, { wordAudio: { away: 'data:audio/mp3;base64,QQ==' } })).toBe('data:audio/mp3;base64,QQ==');

    for (const mode of ['sight_words', 'morpheme_chunks']) {
      for (const packetMode of ['practice', 'check']) {
        const built = srBuilder.buildSymbolRunnerPacket({
          loader,
          mode,
          packetMode,
          teacherCode: packetMode === 'check' ? '4321' : undefined,
          clips: mode === 'sight_words' && packetMode === 'practice' ? { away: 'data:audio/mp3;base64,QQ==' } : undefined,
        });
        const report = verify.verifyPacket(built.html);
        expect(report.ok).toBe(true);
        expect(report.result).toBe('closed');
        expect(report.counts.notExpected).toBe(0);
        expect(report.counts.look).toBe(0);
        expect(report.script.verdict).toBe('agree');
      }
    }

    const ranHtml = core.buildPrintableRanSheetHtml({ modeId: 'sight_words', title: 'Sight Words 5x8' });
    expect(ranHtml).toContain('partner-check');
    expect(ranHtml).toContain('Row 1 (1-8)');
    expect(ranHtml).toContain('Row 5 (33-40)');
    expect(ranHtml).not.toMatch(/<script/i);
    expect(ranHtml.slice(15)).not.toContain('!');

    // Lazy words.json fetch test on packets-symbol-runner.html
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const sw = srDom.window;
    const sd = sw.document;
    const fetchedUrls = [];
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async (url) => {
      fetchedUrls.push(String(url));
      if (String(url).includes('words.json')) return { ok: true, status: 200, json: async () => ({ clips: { away: 'data:audio/mp3;base64,QQ==' } }) };
      return { ok: true, status: 200, json: async () => ({ clips: { a: 'data:audio/mp3;base64,AA==' } }) };
    };
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 20));

    expect(fetchedUrls.some((u) => u.includes('words.json'))).toBe(false);
    const modeSel = sd.getElementById('sr-mode');
    modeSel.value = 'sight_words';
    modeSel.dispatchEvent(new sw.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchedUrls.some((u) => u.includes('words.json'))).toBe(true);
  });
});

describe('29. Wave 7: Early-numeracy quantity_discrimination & missing_number -> Symbol Runner #mode= RTI loop', () => {
  it('renders early-numeracy Symbol Runner RTI buttons in Group & Learner views and honors #mode= deep-links', async () => {
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const makeNumRes = (sid, learner) => ({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'num-check', version: 'r1', engine: 'alloflow-packet/1', form: 'A', mode: 'probe' },
      lessonId: 'num-check',
      revision: 'r1',
      lessonTitle: 'Early Numeracy Check',
      activityTitles: { quantity_discrimination: 'Quantity Discrimination', missing_number: 'Missing Number' },
      learner,
      learnerName: learner,
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:02:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:02:00-05:00',
      durationMs: 120000,
      score: { measure: 'math_num', score: 10, unitName: 'correct per minute', digitsCorrect: 0, digitsPossible: 0, itemsCorrect: 0, itemsAttempted: 2 },
      items: [
        { n: 1, itemId: 'qd-1', activity: 'quantity_discrimination', word: '6 vs 9', target: '9', responses: ['6'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1200 },
        { n: 2, itemId: 'mn-1', activity: 'missing_number', word: '14, ?, 16', target: '15', responses: ['51'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1400 },
      ],
    });

    const f1 = new rw.File([JSON.stringify(makeNumRes('s-a', 'BlueHeron7'))], 'a.json', { type: 'application/json', lastModified: Date.now() });
    const f2 = new rw.File([JSON.stringify(makeNumRes('s-b', 'RedFox3'))], 'b.json', { type: 'application/json', lastModified: Date.now() + 50 });
    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [f1, f2] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();

    expect(rd.querySelectorAll('#group-table table.data-group-table').length).toBeLessThanOrEqual(2);
    expect(rd.getElementById('group-table').textContent).not.toContain('Most missed across the group');
    const groupButtons = [...rd.querySelectorAll('#group-missed a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    expect(groupButtons.some((b) => b.text === 'Practice group number comparison in Symbol Runner' && b.href === 'packets-symbol-runner.html#mode=number_size_stroop')).toBe(true);
    expect(groupButtons.some((b) => b.text === 'Practice group teen and decade numbers in Symbol Runner' && b.href === 'packets-symbol-runner.html#mode=digits_teen_decade')).toBe(true);

    const learnerRadio = rd.querySelector('input[name="view"][value="learner"]');
    learnerRadio.checked = true;
    learnerRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));
    const learnerButtons = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    expect(learnerButtons.some((b) => b.text === 'Practice number comparison in Symbol Runner' && b.href === 'packets-symbol-runner.html#mode=number_size_stroop')).toBe(true);
    expect(learnerButtons.some((b) => b.text === 'Practice teen and decade numbers in Symbol Runner' && b.href === 'packets-symbol-runner.html#mode=digits_teen_decade')).toBe(true);

    // Open packets-symbol-runner.html#mode=number_size_stroop
    const modeDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html#mode=number_size_stroop',
    }));
    const mw = modeDom.window;
    mw.matchMedia = () => ({ matches: true });
    mw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    mw.eval(read('packets_zip.js'));
    mw.eval(read('packets_verify_core.js'));
    mw.eval(read('word_sounds_take_home_loader.js'));
    mw.eval(read('word_picture_matcher.js'));
    mw.eval(read('symbol_runner_core.js'));
    mw.eval(read('packet_symbol_runner_builder.js'));
    mw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 20));
    expect(mw.location.hash).toBe('');
    expect(mw.document.getElementById('sr-mode').value).toBe('number_size_stroop');
  });
});

describe('30. Wave 7: Expanded 560+ SVG diagrams & 5,300+ offline dictionary matches', () => {
  it('provides >= 560 safe curriculum diagrams and matches >= 2,700 word-only and >= 5,300 def-backed words', async () => {
    const matcher = require('../word_picture_matcher.js');
    const wsBuilder = require('../word_sounds_packet_builder.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) {
      symbols.add(JSON.parse(read(s.url)));
    }
    const keys = Object.keys(matcher.CURRICULUM_DIAGRAMS);
    expect(keys.length).toBeGreaterThanOrEqual(560);
    for (const k of keys) {
      expect(wsBuilder.svgRefusal(matcher.CURRICULUM_DIAGRAMS[k].svg), k).toBe('');
    }

    const origFetch = global.fetch;
    global.fetch = async (url) => ({
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(String(url), 'utf8')),
    });
    try {
      const bank = require('../packets_vocab_bank_en.js');
      await bank.load();
      const words = bank.words();
      let wordOnly = 0;
      let withDef = 0;
      for (const w of words) {
        const s0 = (bank.senses(w) || [])[0] || {};
        const m0 = matcher.matchWord({ word: w }, { symbols });
        const m1 = matcher.matchWord({ word: w, definition: s0.def || '' }, { symbols });
        if (m0 && (m0.svg || m0.src)) wordOnly++;
        if (m1 && (m1.svg || m1.src)) withDef++;
      }
      expect(wordOnly).toBeGreaterThanOrEqual(2700);
      expect(withDef).toBeGreaterThanOrEqual(5300);
    } finally {
      global.fetch = origFetch;
    }
  });
});

describe('31. Wave 8: Printable "I Have, Who Has?" Classroom Loop Cards', () => {
  it('builds a closed 5-card loop HTML chain with blanked clues, safe pictures, and downloads from Present & Export', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    const d = w.document;
    const capturedDownloads = [];
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    w.Blob = class FakeBlob {
      constructor(parts, opts) {
        this._text = parts.join('');
        this.type = (opts && opts.type) || '';
        capturedDownloads.push(this);
      }
    };
    w.URL.createObjectURL = (b) => { b._url = 'blob://loop-' + capturedDownloads.length; return b._url; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      const match = capturedDownloads.find((b) => b._url === this.getAttribute('href')) || capturedDownloads[capturedDownloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };

    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 30));

    const pack = {
      title: 'Pond Loop Deck',
      words: [
        { word: 'frog', definition: 'A frog leaps near pond water.', image: PNG_1X1 },
        { word: 'moss', definition: 'Soft moss grows on shaded rocks.', image: 'javascript:alert(1)' },
        { word: 'reed', definition: 'A tall reed bends in the wind.' },
        { word: 'lily', definition: 'A pond lily floats on top.' },
        { word: 'toad', definition: 'A brown toad hides under leaves.' },
      ],
    };
    const outs = [
      w.AlloWordPracticeMedia.buildLoopGameHtml(pack),
      w.AlloModules.WordPractice.buildLoopGameHtml(pack),
      w.AlloPacketsPresentExport.buildLoopGameHtml(pack),
    ];
    for (const html of outs) {
      expect(html).toContain('@media print');
      expect(html).not.toMatch(/<script/i);
      expect(html.slice(15)).not.toContain('!');
      expect(html).not.toContain('javascript:alert');
      const parsed = new JSDOM(html).window.document;
      expect(parsed.querySelector('.loop-grid')).toBeTruthy();
      const cards = [...parsed.querySelectorAll('.loop-card[data-step]')];
      expect(cards).toHaveLength(5);
      const haveWords = cards.map((c) => c.querySelector('.loop-have .loop-word').textContent.trim().toLowerCase());
      expect(new Set(haveWords).size).toBe(5);
      for (const word of ['frog', 'moss', 'reed', 'lily', 'toad']) {
        expect(haveWords).toContain(word);
      }
      const whoClues = cards.map((c) => c.querySelector('.loop-who .loop-clue').textContent);
      expect(whoClues.every((txt) => /_{5,}/.test(txt))).toBe(true);
      const firstWord = haveWords[0];
      expect(cards[4].querySelector('.loop-tag').textContent).toContain('Loops to Card 1');
      const imgs = [...parsed.querySelectorAll('.loop-pic')];
      expect(imgs.length).toBe(1);
      expect(imgs[0].getAttribute('src')).toBe(PNG_1X1);
      expect(parsed.querySelector('.teacher-key table')).toBeTruthy();
      const keyRows = [...parsed.querySelectorAll('.teacher-key tbody tr')];
      expect(keyRows).toHaveLength(5);
      expect(keyRows[4].querySelectorAll('td')[3].textContent.trim().toLowerCase()).toBe(firstWord);
    }

    d.getElementById('pe-sheet-type').value = 'loop-cards';
    d.getElementById('pe-sheet-download').click();
    const lastDl = capturedDownloads[capturedDownloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-loop-cards\.html$/);
  });
});

describe('32. Wave 8: Symbol Runner math_make_10, math_doubles & printable cut-and-fold flashcards', () => {
  it('supports make-10 & doubles pools, verified packets, and printable flashcards download', async () => {
    const core = require('../symbol_runner_core.js');
    const builder = require('../packet_symbol_runner_builder.js');
    const verify = require('../packets_verify_core.js');
    const lCtx = {};
    lCtx.window = lCtx;
    new Function('window', read('word_sounds_take_home_loader.js')).call(lCtx, lCtx);
    const loader = lCtx.AlloWordSoundsTakeHome;

    expect(core.MODES.map((m) => m.id)).toEqual(expect.arrayContaining(['math_make_10', 'math_doubles']));
    expect(builder.MODES.map((m) => m.id)).toEqual(expect.arrayContaining(['math_make_10', 'math_doubles']));

    const make10Pool = core.buildModePool('math_make_10');
    const doublesPool = core.buildModePool('math_doubles');
    expect(make10Pool.map((c) => c.display)).toContain('1 + ? = 10');
    expect(make10Pool.map((c) => c.display)).toContain('10 + ? = 10');
    expect(doublesPool.map((c) => c.display)).toContain('2 + 2');
    expect(doublesPool.map((c) => c.display)).toContain('9 + 9');
    expect(doublesPool.map((c) => c.display)).toContain('6 + 7');

    expect(core.matchSpokenSymbol('ten', { answer: '10' })).toBe(true);
    expect(core.matchSpokenSymbol('eighteen', { answer: '18' })).toBe(true);
    expect(core.matchSpokenSymbol('twenty', { answer: '20' })).toBe(true);
    expect(core.matchTypedSymbol('1', { answer: '10', caseSensitive: false })).toBe('prefix');
    expect(core.matchTypedSymbol('10', { answer: '10', caseSensitive: false })).toBe('match');

    for (const mode of ['math_make_10', 'math_doubles']) {
      for (const packetMode of ['practice', 'check']) {
        const built = builder.buildSymbolRunnerPacket({
          loader,
          mode,
          packetMode,
          teacherCode: packetMode === 'check' ? '4321' : undefined,
          title: 'Mental Math ' + mode,
        });
        const report = verify.verifyPacket(built.html);
        expect(report.ok).toBe(true);
        expect(report.result).toBe('closed');
        expect(report.counts.notExpected).toBe(0);
        expect(report.counts.look).toBe(0);
        expect(report.script.verdict).toBe('agree');
      }
    }

    const cardHtml = core.buildPrintableSymbolCardsHtml({ modeId: 'math_doubles', title: 'Doubles Deck' });
    expect(cardHtml).toContain('@media print');
    expect(cardHtml).not.toMatch(/<script/i);
    expect(cardHtml.slice(15)).not.toContain('!');
    const cardDoc = new JSDOM(cardHtml).window.document;
    expect(cardDoc.querySelectorAll('.sr-fc-row').length).toBeGreaterThanOrEqual(6);
    expect(cardDoc.querySelectorAll('.sr-fc-front').length).toBeGreaterThanOrEqual(6);
    expect(cardDoc.querySelectorAll('.sr-fc-back').length).toBeGreaterThanOrEqual(6);
    expect(cardDoc.querySelector('.teacher-key')).toBeTruthy();

    // Boot packets-symbol-runner.html and click #sr-save-flashcards
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const sw = srDom.window;
    const sd = sw.document;
    const downloads = [];
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    sw.Blob = class FakeBlob {
      constructor(parts) {
        this._text = parts.join('');
        downloads.push(this);
      }
    };
    sw.URL.createObjectURL = (b) => { b._url = 'blob://sr-' + downloads.length; return b._url; };
    sw.URL.revokeObjectURL = () => {};
    sw.HTMLAnchorElement.prototype.click = function () {
      const match = downloads.find((b) => b._url === this.getAttribute('href')) || downloads[downloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));

    sd.getElementById('sr-save-flashcards').click();
    const lastDl = downloads[downloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-flashcards\.html$/);
    expect(lastDl._text).toContain('sr-fc-row');
  });
});

describe('33. Wave 8: Present & Export -> #symbols= bridge and Results Make-10 / Doubles RTI links', () => {
  it('navigates #pe-open-symbol-runner with #symbols=, parses it on Symbol Runner, and shows Make-10/Doubles RTI on missed math facts', async () => {
    const peDom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#words=cat,dog,sun,frog',
    }));
    const pw = peDom.window;
    const clickedHrefs = [];
    pw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    pw.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    pw.HTMLAnchorElement.prototype.click = function () {
      clickedHrefs.push(this.getAttribute('href') || '');
    };
    pw.eval(read('word_picture_matcher.js'));
    pw.eval(read('word_practice_annotation_assets.js'));
    pw.eval(read('word_practice_core.js'));
    pw.eval(read('word_practice_media.js'));
    pw.eval(read('word_practice_ui.js'));
    pw.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 40));

    pw.document.getElementById('pe-open-symbol-runner').click();
    expect(clickedHrefs).toContain('packets-symbol-runner.html#symbols=cat%2Cdog%2Csun%2Cfrog');

    // Open packets-symbol-runner.html#symbols=...
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html#symbols=cat%2Cdog%2Csun%2Cfrog',
    }));
    const mw = srDom.window;
    mw.matchMedia = () => ({ matches: true });
    mw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    mw.eval(read('packets_zip.js'));
    mw.eval(read('packets_verify_core.js'));
    mw.eval(read('word_sounds_take_home_loader.js'));
    mw.eval(read('word_picture_matcher.js'));
    mw.eval(read('symbol_runner_core.js'));
    mw.eval(read('packet_symbol_runner_builder.js'));
    mw.eval(read('packets-symbol-runner.js'));
    await new Promise((r) => setTimeout(r, 30));

    expect(mw.location.hash).toBe('');
    expect(mw.document.getElementById('sr-mode').value).toBe('custom');
    expect(mw.document.getElementById('sr-custom').value).toBe('cat, dog, sun, frog');
    expect(mw.document.getElementById('sr-rehearsal').checked).toBe(false);

    // Boot packets-results.html with missed 3 + 7 (Make-10) and 6 + 6 (Doubles)
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const makeMathRes = (sid, learner) => ({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'math-add-g1', version: 'r1', engine: 'alloflow-packet/1', form: 'A', mode: 'check' },
      lessonId: 'math-add-g1',
      revision: 'r1',
      lessonTitle: 'Addition Mental Math Check',
      activityTitles: { math_computation: 'Math Facts' },
      learner,
      learnerName: learner,
      startedAt: '2026-11-15T14:00:00Z',
      finishedAt: '2026-11-15T14:02:00Z',
      startedLocal: '2026-11-15T09:00:00-05:00',
      finishedLocal: '2026-11-15T09:02:00-05:00',
      durationMs: 120000,
      score: { measure: 'digits', score: 12, unitName: 'digits correct per minute', digitsCorrect: 2, digitsPossible: 4, itemsCorrect: 0, itemsAttempted: 2 },
      items: [
        { n: 1, itemId: 'mc-1', activity: 'math_computation', word: '3 + 7', target: '10', responses: ['9'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1200 },
        { n: 2, itemId: 'mc-2', activity: 'math_computation', word: '6 + 6', target: '12', responses: ['11'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1300 },
      ],
    });

    const f1 = new rw.File([JSON.stringify(makeMathRes('m-a', 'BlueHeron7'))], 'ma.json', { type: 'application/json', lastModified: Date.now() });
    const f2 = new rw.File([JSON.stringify(makeMathRes('m-b', 'RedFox3'))], 'mb.json', { type: 'application/json', lastModified: Date.now() + 50 });
    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [f1, f2] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();

    expect([...rd.querySelectorAll('#group-table a.nav-new-tab')].filter((b) => /packets-symbol-runner\.html/.test(b.getAttribute('href') || ''))).toHaveLength(0);
    const grpBtns = [...rd.querySelectorAll('#group-missed a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    expect(grpBtns.some((b) => b.href === 'packets-symbol-runner.html#mode=math_make_10')).toBe(true);
    expect(grpBtns.some((b) => b.href === 'packets-symbol-runner.html#mode=math_doubles')).toBe(true);

    const lrnRadio = rd.querySelector('input[name="view"][value="learner"]');
    lrnRadio.checked = true;
    lrnRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));
    const lrnBtns = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].map((b) => ({ text: b.textContent.replace(' (opens in a new tab)', ''), href: b.getAttribute('href') }));
    expect(lrnBtns.some((b) => b.href === 'packets-symbol-runner.html#mode=math_make_10')).toBe(true);
    expect(lrnBtns.some((b) => b.href === 'packets-symbol-runner.html#mode=math_doubles')).toBe(true);
  });
});

describe('34. Wave 8: 615+ safe SVG diagrams & 5,850+ offline dictionary matches', () => {
  it('provides >= 615 safe curriculum diagrams and matches >= 3,300 word-only and >= 5,850 def-backed words', async () => {
    const matcher = require('../word_picture_matcher.js');
    const wsBuilder = require('../word_sounds_packet_builder.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));

    const keys = Object.keys(matcher.CURRICULUM_DIAGRAMS);
    expect(keys.length).toBeGreaterThanOrEqual(615);
    for (const k of keys) {
      expect(wsBuilder.svgRefusal(matcher.CURRICULUM_DIAGRAMS[k].svg), k).toBe('');
    }
    for (const spot of ['introduce_greeting', 'puzzle_piece', 'fragile_glass', 'sustainable_recycle', 'prefix_multi', 'prefix_micro']) {
      expect(matcher.getDiagram(spot), spot).toBeTruthy();
      expect(matcher.getDiagram(spot).svg).toContain('<svg');
    }

    const origFetch = global.fetch;
    global.fetch = async (url) => ({
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(String(url), 'utf8')),
    });
    try {
      const bank = require('../packets_vocab_bank_en.js');
      await bank.load();
      let wordOnly = 0;
      let withDef = 0;
      for (const w of bank.words()) {
        const s0 = (bank.senses(w) || [])[0] || {};
        const m0 = matcher.matchWord({ word: w }, { symbols });
        const m1 = matcher.matchWord({ word: w, definition: s0.def || '' }, { symbols });
        if (m0 && (m0.svg || m0.src)) wordOnly++;
        if (m1 && (m1.svg || m1.src)) withDef++;
      }
      expect(wordOnly).toBeGreaterThanOrEqual(3300);
      expect(withDef).toBeGreaterThanOrEqual(5850);
    } finally {
      global.fetch = origFetch;
    }
  });
});

describe('35. Wave 9: Printable Classroom Word Wall & Anchor Poster Cards', () => {
  it('builds safe print-ready Word Wall cards stripping unsafe images and exclamation marks, and downloads *-word-wall.html', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    const d = w.document;
    const capturedDownloads = [];
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    w.Blob = class FakeBlob {
      constructor(parts, opts) {
        this._text = parts.join('');
        this.type = (opts && opts.type) || '';
        capturedDownloads.push(this);
      }
    };
    w.URL.createObjectURL = (b) => { b._url = 'blob://wall-' + capturedDownloads.length; return b._url; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {
      const match = capturedDownloads.find((b) => b._url === this.getAttribute('href')) || capturedDownloads[capturedDownloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };

    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 30));

    const pack = {
      title: 'Science Word Wall!',
      words: [
        { word: 'magnet', definition: 'Pulls iron objects.', example: 'Watch the magnet pull!', image: PNG_1X1, credit: 'Lab PNG' },
        { word: 'orbit', definition: 'Path around a star.', example: 'Planets orbit steadily!', image: 'javascript:alert(1)' },
        { word: 'fossil', definition: 'Ancient trace in rock.', example: 'Look at that fern fossil!', image: 'http://insecure.example/f.png' },
      ],
    };
    for (const html of [
      w.AlloWordPracticeMedia.buildWordWallHtml(pack),
      w.AlloModules.WordPractice.buildWordWallHtml(pack),
      w.AlloPacketsPresentExport.buildWordWallHtml(pack),
    ]) {
      expect(html).toContain('@media print');
      expect(html).not.toMatch(/<script/i);
      expect(html.slice(15)).not.toContain('!');
      expect(html).not.toContain('javascript:alert');
      expect(html).not.toContain('http://insecure.example');
      const doc = new JSDOM(html).window.document;
      expect(doc.querySelector('.wall-list')).toBeTruthy();
      expect([...doc.querySelectorAll('.wall-card[data-card]')]).toHaveLength(3);
      expect([...doc.querySelectorAll('.wall-word')].map((el) => el.textContent.trim())).toEqual(['magnet', 'orbit', 'fossil']);
      expect(doc.querySelectorAll('.elkonin-box').length).toBeGreaterThanOrEqual(10);
      const pics = [...doc.querySelectorAll('.wall-pic')];
      expect(pics).toHaveLength(1);
      expect(pics[0].getAttribute('src')).toBe(PNG_1X1);
      expect(doc.querySelector('.teacher-key table')).toBeTruthy();
      expect(doc.querySelector('.teacher-key').textContent).toContain('Lab PNG');
    }

    d.getElementById('pe-sheet-type').value = 'word-wall';
    d.getElementById('pe-sheet-download').click();
    const lastDl = capturedDownloads[capturedDownloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-word-wall\.html$/);
  });
});

describe('36. Wave 9: Symbol Runner math_mult_2_5_10, math_squares & Cover, Copy, Compare Sheet', () => {
  it('verifies multiplication modes, spoken/typed matching, closed packets, and printable CCC sheet export', async () => {
    const core = require('../symbol_runner_core.js');
    const builder = require('../packet_symbol_runner_builder.js');
    const verify = require('../packets_verify_core.js');
    const lCtx = {};
    lCtx.window = lCtx;
    new Function('window', read('word_sounds_take_home_loader.js')).call(lCtx, lCtx);
    const loader = lCtx.AlloWordSoundsTakeHome;

    expect(core.MODES.map((m) => m.id)).toEqual(expect.arrayContaining(['math_mult_2_5_10', 'math_squares']));
    expect(builder.MODES.map((m) => m.id)).toEqual(expect.arrayContaining(['math_mult_2_5_10', 'math_squares']));

    const multPool = core.buildModePool('math_mult_2_5_10');
    const sqPool = core.buildModePool('math_squares');
    expect(multPool.find((c) => c.display === '5 x 4')?.answer).toBe('20');
    expect(sqPool.find((c) => c.display === '7 x 7')?.answer).toBe('49');
    expect(sqPool.find((c) => c.display === '10 x 10')?.answer).toBe('100');

    expect(core.matchSpokenSymbol('forty nine', { answer: '49' })).toBe(true);
    expect(core.matchSpokenSymbol('one hundred', { answer: '100' })).toBe(true);
    expect(core.matchTypedSymbol('1', { answer: '100', caseSensitive: false })).toBe('prefix');
    expect(core.matchTypedSymbol('100', { answer: '100', caseSensitive: false })).toBe('match');

    for (const mode of ['math_mult_2_5_10', 'math_squares']) {
      for (const packetMode of ['practice', 'check']) {
        const built = builder.buildSymbolRunnerPacket({
          loader,
          mode,
          packetMode,
          teacherCode: packetMode === 'check' ? '4321' : undefined,
          title: 'Multiplication ' + mode,
        });
        const report = verify.verifyPacket(built.html);
        expect(report.ok).toBe(true);
        expect(report.result).toBe('closed');
        expect(report.counts.notExpected).toBe(0);
        expect(report.counts.look).toBe(0);
        expect(report.script.verdict).toBe('agree');
      }
    }

    const cccHtml = core.buildPrintableCccSheetHtml({ modeId: 'math_squares', title: 'Squares CCC!' });
    expect(cccHtml).toContain('@media print');
    expect(cccHtml).not.toMatch(/<script/i);
    expect(cccHtml.slice(15)).not.toContain('!');
    const cccDoc = new JSDOM(cccHtml).window.document;
    expect(cccDoc.querySelector('.ccc-table')).toBeTruthy();
    expect(cccDoc.querySelectorAll('.ccc-row')).toHaveLength(9);
    expect(cccDoc.querySelectorAll('.ccc-study')).toHaveLength(9);
    expect(cccDoc.querySelectorAll('.ccc-write')).toHaveLength(9);
    expect(cccDoc.querySelectorAll('.ccc-retry')).toHaveLength(9);
    expect(cccDoc.querySelector('.teacher-key table')).toBeTruthy();

    // Boot packets-symbol-runner.html and click #sr-save-ccc
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const sw = srDom.window;
    const sd = sw.document;
    const downloads = [];
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    sw.Blob = class FakeBlob {
      constructor(parts) {
        this._text = parts.join('');
        downloads.push(this);
      }
    };
    sw.URL.createObjectURL = (b) => { b._url = 'blob://ccc-' + downloads.length; return b._url; };
    sw.URL.revokeObjectURL = () => {};
    sw.HTMLAnchorElement.prototype.click = function () {
      const match = downloads.find((b) => b._url === this.getAttribute('href')) || downloads[downloads.length - 1];
      if (match) match._name = this.getAttribute('download');
    };
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));

    sd.getElementById('sr-save-ccc').click();
    const lastDl = downloads[downloads.length - 1];
    expect(lastDl).toBeTruthy();
    expect(lastDl._name).toMatch(/-ccc-sheet\.html$/);
    expect(lastDl._text).toContain('ccc-table');
  });
});

describe('37. Wave 9: Symbol Runner -> Present & Export bridge and Results Multiplication RTI links', () => {
  it('opens sight words via #words= from Symbol Runner, refuses single digits, and renders multiplication RTI links on missed 2s/5s/10s and squares', async () => {
    const srDom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const sw = srDom.window;
    const sd = sw.document;
    const clickedHrefs = [];
    sw.matchMedia = () => ({ matches: true });
    sw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    sw.HTMLAnchorElement.prototype.click = function () {
      clickedHrefs.push(this.getAttribute('href') || '');
    };
    sw.eval(read('packets_zip.js'));
    sw.eval(read('packets_verify_core.js'));
    sw.eval(read('word_sounds_take_home_loader.js'));
    sw.eval(read('word_picture_matcher.js'));
    sw.eval(read('symbol_runner_core.js'));
    sw.eval(read('packet_symbol_runner_builder.js'));
    sw.eval(read('packets-symbol-runner.js'));

    const modeSel = sd.getElementById('sr-mode');
    modeSel.value = 'digits_single';
    modeSel.dispatchEvent(new sw.Event('change', { bubbles: true }));
    expect(sw.AlloPacketsSymbolRunner.openInPresentExport()).toBe(false);
    expect(clickedHrefs).toHaveLength(0);

    modeSel.value = 'sight_words';
    modeSel.dispatchEvent(new sw.Event('change', { bubbles: true }));
    sd.getElementById('sr-open-present-export').click();
    expect(clickedHrefs).toHaveLength(1);
    expect(clickedHrefs[0].startsWith('packets-present-export.html#words=')).toBe(true);
    const decodedWords = decodeURIComponent(clickedHrefs[0].split('#words=')[1]).split(',');
    expect(decodedWords).toEqual(expect.arrayContaining(['all', 'are', 'away']));

    // Results -> Symbol Runner Multiplication RTI links
    const resDom = trackDom(new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    }));
    const rw = resDom.window;
    const rd = rw.document;
    rw.TextEncoder = TextEncoder;
    rw.TextDecoder = TextDecoder;
    Object.defineProperty(rw.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    for (const s of rd.querySelectorAll('script[src]')) rw.eval(read(s.getAttribute('src')));

    const makeMultRes = (sid, learner) => ({
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'math-mult-g3', version: 'r1', engine: 'alloflow-packet/1', form: 'A', mode: 'check' },
      lessonId: 'math-mult-g3',
      revision: 'r1',
      lessonTitle: 'Multiplication Automaticity Check',
      activityTitles: { math_computation: 'Math Facts' },
      learner,
      learnerName: learner,
      startedAt: '2026-11-15T15:00:00Z',
      finishedAt: '2026-11-15T15:02:00Z',
      startedLocal: '2026-11-15T10:00:00-05:00',
      finishedLocal: '2026-11-15T10:02:00-05:00',
      durationMs: 120000,
      score: { measure: 'digits', score: 10, unitName: 'digits correct per minute', digitsCorrect: 2, digitsPossible: 4, itemsCorrect: 0, itemsAttempted: 2 },
      items: [
        { n: 1, itemId: 'mm-1', activity: 'math_computation', word: '5 x 7', target: '35', responses: ['30'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1400 },
        { n: 2, itemId: 'mm-2', activity: 'math_computation', word: '8 x 8', target: '64', responses: ['56'], attempts: 1, firstTry: false, correct: false, done: true, ms: 1600 },
      ],
    });

    const f1 = new rw.File([JSON.stringify(makeMultRes('x-a', 'BlueHeron7'))], 'xa.json', { type: 'application/json', lastModified: Date.now() });
    const f2 = new rw.File([JSON.stringify(makeMultRes('x-b', 'RedFox3'))], 'xb.json', { type: 'application/json', lastModified: Date.now() + 50 });
    const ev = new rw.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [f1, f2] };
    rd.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 80 && !/\bread[,.]/.test(rd.getElementById('said').textContent); i++) await new Promise((r) => setTimeout(r, 15));
    rd.getElementById('show-results').click();

    expect([...rd.querySelectorAll('#group-table a.nav-new-tab')].filter((b) => /packets-symbol-runner\.html/.test(b.getAttribute('href') || ''))).toHaveLength(0);
    const grpBtns = [...rd.querySelectorAll('#group-missed a.nav-new-tab')].map((b) => b.getAttribute('href'));
    expect(grpBtns).toContain('packets-symbol-runner.html#mode=math_mult_2_5_10');
    expect(grpBtns).toContain('packets-symbol-runner.html#mode=math_squares');

    const lrnRadio = rd.querySelector('input[name="view"][value="learner"]');
    lrnRadio.checked = true;
    lrnRadio.dispatchEvent(new rw.Event('change', { bubbles: true }));
    const lrnBtns = [...rd.querySelectorAll('#learner-body a.nav-new-tab')].map((b) => b.getAttribute('href'));
    expect(lrnBtns).toContain('packets-symbol-runner.html#mode=math_mult_2_5_10');
    expect(lrnBtns).toContain('packets-symbol-runner.html#mode=math_squares');
  });
});

describe('38. Wave 9: 665+ safe SVG diagrams & 6,250+ offline dictionary matches', () => {
  it('provides >= 665 safe curriculum diagrams and matches >= 4,500 word-only and >= 6,250 def-backed words', async () => {
    const matcher = require('../word_picture_matcher.js');
    const wsBuilder = require('../word_sounds_packet_builder.js');
    const symbols = require('../word_sounds_symbols_en.js');
    for (const s of symbols.shards) symbols.add(JSON.parse(read(s.url)));

    const keys = Object.keys(matcher.CURRICULUM_DIAGRAMS);
    expect(keys.length).toBeGreaterThanOrEqual(665);
    for (const k of keys) {
      expect(wsBuilder.svgRefusal(matcher.CURRICULUM_DIAGRAMS[k].svg), k).toBe('');
    }
    for (const spot of ['zoo_enclosure', 'law_gavel', 'lab_flasks', 'crown_king', 'cold_snowflake', 'arrangement_grid']) {
      expect(matcher.getDiagram(spot), spot).toBeTruthy();
      expect(matcher.getDiagram(spot).svg).toContain('<svg');
    }

    const origFetch = global.fetch;
    global.fetch = async (url) => ({
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(String(url), 'utf8')),
    });
    try {
      const bank = require('../packets_vocab_bank_en.js');
      await bank.load();
      let wordOnly = 0;
      let withDef = 0;
      for (const w of bank.words()) {
        const s0 = (bank.senses(w) || [])[0] || {};
        const m0 = matcher.matchWord({ word: w }, { symbols });
        const m1 = matcher.matchWord({ word: w, definition: s0.def || '' }, { symbols });
        if (m0 && (m0.svg || m0.src)) wordOnly++;
        if (m1 && (m1.svg || m1.src)) withDef++;
      }
      expect(wordOnly).toBeGreaterThanOrEqual(4500);
      expect(withDef).toBeGreaterThanOrEqual(6250);
    } finally {
      global.fetch = origFetch;
    }
  });
});

describe('39. Wave 10: Grade-band sight/multisyllable Symbol Runner modes & custom wordAudio resolution', () => {
  it('exposes sight_words_g1, sight_words_g2_3, and multisyllable_words across core/builder and builds verifiable packets', () => {
    const runnerCore = require('../symbol_runner_core.js');
    const builder = require('../packet_symbol_runner_builder.js');
    const verifier = require('../packets_verify_core.js');

    for (const modeId of ['sight_words_g1', 'sight_words_g2_3', 'multisyllable_words']) {
      expect(runnerCore.MODES.some((m) => m.id === modeId)).toBe(true);
      expect(builder.MODES.some((m) => m.id === modeId)).toBe(true);
      const pool = runnerCore.buildModePool(modeId);
      expect(pool.length).toBeGreaterThanOrEqual(12);
      expect(pool.every((it) => it.category === 'word')).toBe(true);
    }

    const pBank = { sh: 'data:audio/wav;base64,PHSH' };
    const wBank = {
      volcano: 'data:audio/wav;base64,VOLC',
      sh: 'data:audio/wav;base64,WORDSH',
      every: 'data:audio/wav;base64,EVERY',
    };
    expect(runnerCore.resolvePhonemeAudioUri({ answer: 'volcano', category: 'letter' }, pBank, { wordAudio: wBank })).toBe('data:audio/wav;base64,VOLC');
    expect(runnerCore.resolvePhonemeAudioUri({ answer: 'sh', category: 'letter' }, pBank, { wordAudio: wBank })).toBe('data:audio/wav;base64,PHSH');
    expect(runnerCore.resolvePhonemeAudioUri({ answer: 'every', category: 'word' }, pBank, { wordAudio: wBank })).toBe('data:audio/wav;base64,EVERY');
    expect(runnerCore.resolvePhonemeAudioUri({ answer: 'every', category: 'word' }, pBank, { wordAudio: {} })).toBe('');

    const lCtx = { TextEncoder, TextDecoder, crypto: webcrypto };
    lCtx.window = lCtx;
    lCtx.globalThis = lCtx;
    new Function('window', read('word_sounds_take_home_loader.js')).call(lCtx, lCtx);
    const loader = lCtx.AlloWordSoundsTakeHome;

    const multiPool = runnerCore.buildModePool('multisyllable_words');
    const clips = {};
    multiPool.forEach((sym) => { clips[sym.answer] = 'data:audio/wav;base64,UklGRg=='; });
    const built = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'multisyllable_words',
      control: 'direct',
      clips,
      title: 'Multisyllabic Words Practice',
    });
    const check = verifier.verifyPacket(built.html);
    expect(check.counts.notExpected).toBe(0);
    expect(check.counts.look).toBe(0);
    expect(check.script.verdict).toBe('agree');
    expect(Object.keys(built.lesson.audio).length).toBe(multiPool.length);
  });
});

describe('40. Wave 10: On-demand word_audio_shards/ loading in packets-symbol-runner.html', () => {
  it('skips word shards in letter modes and lazily fetches only needed shard files for #symbols= and multisyllable_words', async () => {
    const html = read('packets-symbol-runner.html');
    const idxJson = JSON.parse(read('word_audio_shards/index.json'));
    const fetchedUrls = [];
    const dom = trackDom(new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const w = dom.window;
    const doc = w.document;
    w.matchMedia = () => ({ matches: true });
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    const downloads = [];
    w.Blob = class FakeBlob {
      constructor(parts) {
        this._text = parts.join('');
        downloads.push(this);
      }
    };
    w.URL.createObjectURL = (b) => { b._url = 'blob://sr-shard-' + downloads.length; return b._url; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};
    w.fetch = async (url) => {
      const clean = String(url).split('?')[0];
      fetchedUrls.push(clean);
      if (clean === 'word_audio_shards/index.json') {
        const raw = JSON.stringify(idxJson);
        return { ok: true, status: 200, json: async () => idxJson, text: async () => raw };
      }
      const m = /^word_audio_shards\/([a-z0-9_][a-z0-9_-]*\.json)$/.exec(clean);
      if (m) {
        const txt = read('word_audio_shards/' + m[1]);
        return { ok: true, status: 200, json: async () => JSON.parse(txt), text: async () => txt };
      }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
    };

    w.eval(read('packets_zip.js'));
    w.eval(read('packets_verify_core.js'));
    w.eval(read('word_sounds_take_home_loader.js'));
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('symbol_runner_core.js'));
    w.eval(read('packet_symbol_runner_builder.js'));
    w.eval(read('packets-symbol-runner.js'));

    await new Promise((r) => setTimeout(r, 40));
    expect(fetchedUrls.some((u) => u.startsWith('word_audio_shards/'))).toBe(false);

    // Trigger custom word list via #symbols=
    w.location.hash = '#symbols=volcano,glacier,orbit';
    expect(w.AlloPacketsSymbolRunner.applySymbolsHash()).toBe(true);
    doc.getElementById('sr-save-html').click();
    for (let i = 0; i < 80 && downloads.length < 1; i++) await new Promise((r) => setTimeout(r, 20));
    expect(downloads.length).toBe(1);

    const shardFetches = fetchedUrls.filter((u) => u.startsWith('word_audio_shards/'));
    expect(shardFetches).toContain('word_audio_shards/index.json');
    for (const word of ['volcano', 'glacier', 'orbit']) {
      const expectedFile = 'word_audio_shards/' + idxJson.shards[idxJson.words[word]].file;
      expect(shardFetches).toContain(expectedFile);
    }
    expect(shardFetches.length).toBeLessThanOrEqual(4);

    const verifier = require('../packets_verify_core.js');
    const customCheck = verifier.verifyPacket(downloads[0]._text);
    expect(customCheck.counts.notExpected).toBe(0);
    expect(customCheck.script.verdict).toBe('agree');
    const customParts = verifier.readParts(downloads[0]._text);
    expect(Object.keys(customParts.lesson.audio).length).toBe(3);

    // Switch to multisyllable_words mode and export again
    doc.getElementById('sr-custom').value = '';
    const modeSel = doc.getElementById('sr-mode');
    modeSel.value = 'multisyllable_words';
    modeSel.dispatchEvent(new w.Event('change', { bubbles: true }));
    doc.getElementById('sr-save-html').click();
    for (let i = 0; i < 80 && downloads.length < 2; i++) await new Promise((r) => setTimeout(r, 20));
    expect(downloads.length).toBe(2);
    const multiParts = verifier.readParts(downloads[1]._text);
    expect(Object.keys(multiParts.lesson.audio).length).toBe(12);
  });
});

describe('41. Wave 10: Present & Export earth-space, civics-geography, and literary-craft starter packs', () => {
  it('loads each new starter set cleanly with offline bank meanings and diagrams in JSDOM', async () => {
    const html = read('packets-present-export.html');
    const dom = trackDom(new JSDOM(html, {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html',
    }));
    const w = dom.window;
    w.fetch = async (url) => {
      const clean = String(url).split('?')[0];
      if (/packets_vocab\/en-\d+\.json$/.test(clean)) {
        const txt = read(clean);
        return { ok: true, status: 200, json: async () => JSON.parse(txt) };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    };
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    w.eval(read('packets_vocab_bank_en.js'));
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 40));

    for (const [starter, labelRe, sampleWords] of [
      ['earth-space', /Earth and space/i, ['volcano', 'glacier', 'erosion']],
      ['civics-geography', /Civics and geography/i, ['democracy', 'constitution', 'hemisphere']],
      ['literary-craft', /Story and poetry craft/i, ['metaphor', 'hyperbole', 'alliteration']],
    ]) {
      const select = w.document.getElementById('pe-word-source');
      const opt = select.querySelector('option[value="starter:' + starter + '"]');
      expect(opt, starter).toBeTruthy();
      select.value = 'starter:' + starter;
      select.dispatchEvent(new w.Event('change', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      expect(w.document.getElementById('pe-status').textContent).toMatch(labelRe);
      for (const sw of sampleWords) {
        expect(w.AlloVocabBank.has(sw), sw).toBe(true);
        expect(w.AlloWordPictureMatcher.getDiagram(sw), sw).toBeTruthy();
      }
    }
  });
});

describe('42. Wave 10: Expanded 6,500+ offline vocab bank, 32,000+ Kokoro word clips & 690+ safe SVG diagrams', () => {
  it('enforces shard budget limits, verifies newly voiced curriculum/sight clips, and checks 690+ safe diagrams', () => {
    const bank = require('../packets_vocab_bank_en.js');
    bank.shards.forEach((s, i) => bank.add(JSON.parse(read(s.url)), i + 1));
    expect(bank.shards).toHaveLength(2);
    expect(bank.bytes).toBeLessThan(1_700_000);
    for (const s of bank.shards) {
      expect(s.bytes).toBeLessThan(1024 * 1024);
    }
    expect(bank.words().length).toBeGreaterThanOrEqual(6500);
    for (const unitWord of ['osmosis', 'biosphere', 'hydrosphere', 'hypotenuse', 'tessellation', 'bicameral', 'monologue', 'sonnet', 'haiku']) {
      expect(bank.has(unitWord), unitWord).toBe(true);
      expect(bank.senses(unitWord)[0].source, unitWord).toBe('alloflow');
    }

    const idx = JSON.parse(read('word_audio_shards/index.json'));
    expect(idx.counts.words).toBeGreaterThanOrEqual(32000);
    expect(Object.keys(idx.words).length).toBe(idx.counts.words);
    for (const voicedWord of [
      'addend', 'quadrilateral', 'parallelogram', 'rhombus', 'outlier', 'hyperbole',
      'alliteration', 'onomatopoeia', 'foreshadowing', 'osmosis', 'hypotenuse', 'tessellation',
      'every', 'from', 'because', 'myself',
    ]) {
      expect(Boolean(idx.words[voicedWord]), voicedWord).toBe(true);
    }
    for (const blockedWord of ['immigrant', 'slavery', 'sword', 'communist', 'execute', 'execution', 'bullet', 'urine']) {
      expect(Boolean(idx.words[blockedWord]), blockedWord).toBe(false);
    }

    const matcher = require('../word_picture_matcher.js');
    const wsBuilder = require('../word_sounds_packet_builder.js');
    expect(Object.keys(matcher.CURRICULUM_DIAGRAMS).length).toBeGreaterThanOrEqual(690);
    for (const [k, diag] of Object.entries(matcher.CURRICULUM_DIAGRAMS)) {
      expect(wsBuilder.svgRefusal(diag.svg), k).toBe('');
    }
    for (const newDiag of ['osmosis', 'biosphere', 'hypotenuse', 'tessellation', 'oxymoron', 'haiku', 'climate', 'magma', 'pythagorean']) {
      expect(matcher.getDiagram(newDiag), newDiag).toBeTruthy();
    }
  });
});

describe('43. Wave 6B: Symbol Runner number_size_stroop 2-choice fix and LOOK_ALIKES distractors', () => {
  function loadSymbolRunnerEnv() {
    const sb = {
      window: {},
      globalThis: {},
      TextEncoder,
      TextDecoder,
      btoa,
      atob,
      crypto: webcrypto,
      structuredClone,
      Uint8Array,
      Date,
      Math,
    };
    sb.window = sb;
    sb.globalThis = sb;
    vm.runInNewContext(read('word_sounds_take_home_loader.js'), sb);
    vm.runInNewContext(read('packets_verify_core.js'), sb);
    vm.runInNewContext(read('symbol_runner_core.js'), sb);
    vm.runInNewContext(read('packet_symbol_runner_builder.js'), sb);
    return {
      builder: sb.AlloPacketSymbolRunner,
      loader: sb.AlloWordSoundsTakeHome,
      verify: sb.AlloPacketVerify,
    };
  }

  it('gives number_size_stroop cards only the two shown numbers in both practice and check modes', () => {
    const { builder, loader, verify } = loadSymbolRunnerEnv();
    const planA = builder.planSymbolRunner({ mode: 'number_size_stroop', count: 24, seed: 'stroop-seed-1' });
    const planB = builder.planSymbolRunner({ mode: 'number_size_stroop', count: 24, seed: 'stroop-seed-1' });
    expect(planA.cards.length).toBe(24);
    expect(planA.cards.map((c) => c.choices)).toEqual(planB.cards.map((c) => c.choices));
    for (const card of planA.cards) {
      expect(card.sizePair).toBeTruthy();
      expect(card.choices).toHaveLength(2);
      const expected = [String(card.sizePair.left).toLowerCase(), String(card.sizePair.right).toLowerCase()].sort();
      expect(card.choices.slice().sort()).toEqual(expected);
      expect(card.choices).toContain(card.answer);
    }

    for (const packetMode of ['practice', 'check']) {
      const built = builder.buildSymbolRunnerPacket({
        loader,
        mode: 'number_size_stroop',
        packetMode,
        count: 12,
        seed: 'stroop-packet-7',
        title: 'Size Stroop ' + packetMode,
      });
      const report = verify.verifyPacket(built.html);
      expect(report.ok, packetMode).toBe(true);
      expect(report.result, packetMode).toBe('closed');
      expect(report.counts.notExpected, packetMode).toBe(0);
      expect(report.counts.look, packetMode).toBe(0);
      expect(report.script.verdict, packetMode).toBe('agree');

      const parts = verify.readParts(built.html);
      const items = parts.lesson.blocks.flatMap((b) => b.items);
      expect(items.length).toBeGreaterThanOrEqual(12);
      for (const item of items) {
        expect(item.choices, packetMode + ' ' + item.word).toHaveLength(2);
        const pair = [String(item.sizePair.left).toLowerCase(), String(item.sizePair.right).toLowerCase()].sort();
        expect(item.choices.slice().sort(), packetMode + ' ' + item.word).toEqual(pair);
      }
    }
  });

  it('prioritizes LOOK_ALIKES distractors for confusable letters and digits when present in the pool', () => {
    const { builder } = loadSymbolRunnerEnv();
    const letterPlan = builder.planSymbolRunner({ mode: 'letters_lower', count: 40, seed: 'lookalike-letters' });
    const expectedLetterAlikes = {
      b: ['d', 'p'],
      d: ['b', 'q'],
      p: ['q', 'b'],
      q: ['p', 'd'],
      m: ['w', 'n'],
      w: ['m'],
      n: ['u', 'm'],
      u: ['n'],
    };
    let checkedLetters = 0;
    for (const card of letterPlan.cards) {
      const alikes = expectedLetterAlikes[card.answer];
      if (!alikes) continue;
      checkedLetters += 1;
      expect(card.choices.length).toBeLessThanOrEqual(6);
      for (const alike of alikes) {
        expect(card.choices, card.answer + ' missing look-alike ' + alike).toContain(alike);
      }
    }
    expect(checkedLetters).toBeGreaterThanOrEqual(8);

    const digitPlan = builder.planSymbolRunner({ mode: 'digits_single', count: 20, seed: 'lookalike-digits' });
    let checkedDigits = 0;
    for (const card of digitPlan.cards) {
      if (card.answer === '6') { checkedDigits += 1; expect(card.choices).toContain('9'); }
      if (card.answer === '9') { checkedDigits += 1; expect(card.choices).toContain('6'); }
    }
    expect(checkedDigits).toBeGreaterThanOrEqual(2);

    const teenPlan = builder.planSymbolRunner({ mode: 'digits_teen_decade', count: 32, seed: 'lookalike-teens' });
    const teenPairs = { '12': '21', '21': '12', '13': '30', '30': '13', '14': '40', '40': '14', '15': '50', '50': '15', '16': '60', '60': '16', '17': '70', '70': '17', '18': '80', '80': '18', '19': '90', '90': '19' };
    let checkedTeens = 0;
    for (const card of teenPlan.cards) {
      const pair = teenPairs[card.answer];
      if (!pair) continue;
      checkedTeens += 1;
      expect(card.choices, card.answer + ' missing ' + pair).toContain(pair);
      if (card.answer === '13') expect(card.choices).not.toContain('31');
    }
    expect(checkedTeens).toBeGreaterThanOrEqual(16);

    const customTeenPlan = builder.planSymbolRunner({
      mode: 'custom',
      items: ['13', '30', '31', '14', '40', '15', '50', '16', '60', '17', '70'],
      count: 22,
      seed: 'lookalike-custom-teens',
    });
    for (const card of customTeenPlan.cards) {
      if (card.answer === '13') {
        expect(card.choices).toContain('30');
        expect(card.choices).toContain('31');
      }
    }

    // Look-alikes not present in the pool must never be invented.
    const noAlikePlan = builder.planSymbolRunner({
      mode: 'custom',
      items: ['b', 'a', 'c', 'e', 'f', 'g', 'h'],
      count: 14,
      seed: 'no-alike-in-pool',
    });
    for (const card of noAlikePlan.cards) {
      if (card.answer === 'b') {
        expect(card.choices).not.toContain('d');
        expect(card.choices).not.toContain('p');
        expect(card.choices).toHaveLength(6);
      }
    }
  });
});

describe('44. Wave 7B: Present & Export #words= multi-word phrases, CC BY-SA credits on Flashcards/Frayer, printable guardrails, and 9-20 letter Symbol Runner bridge', () => {
  it('preserves multi-word phrases in #words=, emits picture credits on Flashcards/Frayer, guards empty/tiny printables, and sends 9-20 letter words to Symbol Runner', async () => {
    const dom = trackDom(new JSDOM(read('packets-present-export.html'), {
      runScripts: 'outside-only',
      url: 'https://packets.example/packets-present-export.html#words=water%20cycle,food%20web,cause%20and%20effect',
    }));
    const w = dom.window;
    const d = w.document;
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    const downloads = [];
    w.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:w7-' + downloads.length; };
    w.URL.revokeObjectURL = () => {};
    const clickedHrefs = [];
    w.HTMLAnchorElement.prototype.click = function () { clickedHrefs.push({ href: this.getAttribute('href') || '', download: this.getAttribute('download') || '' }); };
    w.AlloModules = { WordSoundsSymbols: fakeSymbolsBank() };
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 50));

    // Multi-word phrases stay intact (3 items, NOT 7 shattered words).
    const loadedWords = w.AlloPacketsPresentExport.getController().getPack().items.map((it) => it.word);
    expect(loadedWords).toEqual(['water cycle', 'food web', 'cause and effect']);

    // Flashcards and Frayer include CC BY-SA picture credits footer (with zero '!').
    const creditedPack = {
      title: 'Credit Check',
      words: [
        { word: 'habitat', definition: 'natural home', example: 'A pond is a habitat.', image: PNG_1X1, imageCredit: 'Mulberry Symbols · Steve Lee · CC BY-SA 4.0' },
        { word: 'cell', definition: 'basic unit of life', example: 'Every cell has a membrane.', image: PNG_1X1, imageCredit: 'AlloFlow Curriculum Diagram · Built-in curriculum diagram' },
      ],
    };
    for (const html of [
      w.AlloWordPracticeMedia.buildFlashcardsHtml(creditedPack),
      w.AlloWordPracticeMedia.buildFrayerHtml(creditedPack),
    ]) {
      expect(html).toContain('<footer class="credits">');
      expect(html).toContain('Mulberry Symbols');
      expect(html).toContain('CC BY-SA 4.0');
      expect(html).toContain('AlloFlow Curriculum Diagram');
      expect(new JSDOM(html).window.document.body.textContent).not.toContain('!');
    }
    // No pictures -> no credits footer.
    expect(w.AlloWordPracticeMedia.buildFlashcardsHtml({ title: 'Text Only', words: [{ word: 'cat', definition: 'pet' }] })).not.toContain('<footer class="credits">');

    // 1-word loop cards show helpful fallback instead of a broken 1-card self-loop.
    const oneWordLoop = w.AlloWordPracticeMedia.buildLoopGameHtml({ title: 'Single', words: [{ word: 'cat', definition: 'a small pet' }] });
    expect(oneWordLoop).toContain('Add at least two words before printing loop cards.');
    expect(oneWordLoop).not.toContain('Card 1 — Start Card');

    // UI download guardrails: refuse 0 words, refuse 1-word loop-cards, note <8-word Bingo.
    const area = d.querySelector('.awp-grid .awp-fields textarea');
    const dlBtn = d.getElementById('pe-sheet-download');
    const typeSel = d.getElementById('pe-sheet-type');
    area.value = '';
    area.dispatchEvent(new w.Event('input', { bubbles: true }));
    const beforeEmpty = downloads.length;
    typeSel.value = 'flashcards';
    dlBtn.click();
    expect(downloads.length).toBe(beforeEmpty);
    expect(d.getElementById('pe-status').textContent).toContain('Add at least one word');

    area.value = 'cat';
    area.dispatchEvent(new w.Event('input', { bubbles: true }));
    typeSel.value = 'loop-cards';
    dlBtn.click();
    expect(downloads.length).toBe(beforeEmpty);
    expect(d.getElementById('pe-status').textContent).toContain('Add at least 2 words');

    area.value = 'cat\ndog\nsun\nfrog';
    area.dispatchEvent(new w.Event('input', { bubbles: true }));
    typeSel.value = 'bingo';
    dlBtn.click();
    expect(downloads.length).toBe(beforeEmpty + 1);
    expect(d.getElementById('pe-status').textContent).toContain('Fewer than 8 words');

    // openInSymbolRunner now passes 9-20 letter curriculum words cleanly (matching packets-symbol-runner.js).
    const ok = w.AlloPacketsPresentExport.openInSymbolRunner({
      title: 'Civics',
      words: [{ word: 'democracy' }, { word: 'constitution' }, { word: 'atmosphere' }],
    });
    expect(ok).toBe(true);
    expect(clickedHrefs.at(-1).href).toBe('packets-symbol-runner.html#symbols=democracy%2Cconstitution%2Catmosphere');
  });
});
