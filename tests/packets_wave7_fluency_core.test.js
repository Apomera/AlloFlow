// @vitest-environment jsdom
// Wave 7 Track A comprehensive regression suite covering F1-F8 across:
//   - symbol_runner_core.js (F1, F2, F3)
//   - math_fluency_module.js (F2, F4, F5)
//   - word_picture_matcher.js (F6)
//   - packets_verify_core.js (F7, F8)
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => fs.readFileSync(f, 'utf8');
const md = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(path.resolve(md, 'react'));
const ReactDOMClient = require(path.resolve(md, 'react-dom/client'));
const { act } = require(path.resolve(md, 'react-dom/test-utils'));

const runnerCore = require('../symbol_runner_core.js');
const matcher = require('../word_picture_matcher.js');
const verify = require('../packets_verify_core.js');
const symbolsTool = require('../dev-tools/build_word_sounds_symbols.cjs');
const wsTool = require('../dev-tools/make_word_sounds_packet.cjs');
const readAlong = require('../packet_read_along_builder.js');
const vocabBuilder = require('../packet_vocab_builder.js');

const symbols = symbolsTool.loadSymbols();
const wsParts = wsTool.loadParts();
const { dictionary, core: wsCore, loader: wsLoader, wordlist, builder: wsBuilder } = wsParts;

const openedWindows = [];
const mountedRoots = [];

afterEach(async () => {
  while (mountedRoots.length) {
    const entry = mountedRoots.pop();
    try { await act(async () => { entry.root.unmount(); }); } catch (_) {}
    try { entry.host.remove(); } catch (_) {}
  }
  while (openedWindows.length) {
    try { openedWindows.pop().close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

function createRunnerDom(extraSetup) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="stage"></div></body></html>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packet.test/runner.html',
  });
  const w = dom.window;
  openedWindows.push(w);
  w.matchMedia = () => ({ matches: true });
  const fillCalls = [];
  w.HTMLCanvasElement.prototype.getContext = function () {
    return {
      save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
      moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {}, arc() {}, roundRect() {},
      setLineDash() {}, createLinearGradient() { return { addColorStop() {} }; },
      fillText(...args) { fillCalls.push(args); },
      measureText(t) { return { width: String(t || '').length * 10 }; },
    };
  };
  if (extraSetup) extraSetup(w);
  w.eval(read('symbol_runner_core.js'));
  return { w, doc: w.document, stage: w.document.getElementById('stage'), core: w.AlloSymbolRunnerCore, fillCalls };
}

function loadMathFluencyWindow(setup) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://alloflow-cdn.pages.dev/app/',
  });
  const w = dom.window;
  openedWindows.push(w);
  w.matchMedia = () => ({ matches: true });
  w.AlloModules = {};
  w.React = React;
  w.HTMLCanvasElement.prototype.getContext = function () {
    return {
      save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {},
      moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fill() {}, arc() {}, roundRect() {},
      fillText() {}, setLineDash() {}, setTransform() {}, translate() {}, scale() {}, rotate() {},
      measureText(t) { return { width: String(t || '').length * 8 }; },
      createLinearGradient() { return { addColorStop() {} }; },
      createRadialGradient() { return { addColorStop() {} }; },
    };
  };
  if (setup) setup(w);
  w.eval(read('math_fluency_module.js'));
  return w;
}

const sha = (text, form = 'hex') => createHash('sha256').update(text, 'utf8').digest(form);
const scriptOf = (html) => /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const reseal = (html) => html
  .replace(/'sha256-[A-Za-z0-9+/=]+'/g, "'sha256-" + sha(scriptOf(html), 'base64') + "'")
  .replace(/"scriptSha256":"[0-9a-f]*"/, '"scriptSha256":"' + sha(scriptOf(html)) + '"');

const quietClip = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=';
const quietBank = new Proxy({}, {
  get: (_, k) => (typeof k === 'string' ? quietClip : undefined),
  has: () => true,
  getOwnPropertyDescriptor: (_, k) => (typeof k === 'string' ? { value: quietClip, enumerable: true, configurable: true } : undefined),
});
const QUIET_BANKS = { phonemes: quietBank, isolation: quietBank, instructions: quietBank, words: quietBank, kokoroWords: {}, gapFill: {} };

// ---------------------------------------------------------------------------
// F1: Symbol Runner keyboard ergonomics
// ---------------------------------------------------------------------------
describe('F1: Symbol Runner direct keyboard typing and Backspace/Escape buffer editing', () => {
  it('accepts direct keyboard typing immediately after Start when focus rests on .asr-key and still ignores toolbar buttons', () => {
    const { w, stage, core } = createRunnerDom();
    const h = core.mountRunner(stage, { modeId: 'confusable_letters', count: 6, seed: 5, startButton: true });
    const startBtn = stage.querySelector('[data-sr-start]');
    startBtn.click();

    const firstKey = stage.querySelector('.asr-key');
    expect(firstKey).toBeTruthy();
    firstKey.focus();
    expect(w.document.activeElement).toBe(firstKey);

    const card0 = h.getState().current;
    const ev = new w.KeyboardEvent('keydown', { key: card0.answer, bubbles: true, cancelable: true });
    firstKey.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(h.getState().stats.total).toBe(1);
    expect(h.getState().stats.firstTryCorrect).toBe(1);

    // Focus on a lane button also allows direct typing (in direct mode or when locked)
    const card1 = h.getState().current;
    const laneBtn = stage.querySelector('.asr-lane-btn');
    const laneEv = new w.KeyboardEvent('keydown', { key: card1.answer, bubbles: true, cancelable: true });
    laneBtn.dispatchEvent(laneEv);
    expect(laneEv.defaultPrevented).toBe(true);
    expect(h.getState().stats.total).toBe(2);

    // Focus on a toolbar .asr-btn MUST NOT be hijacked as a symbol answer
    const card2 = h.getState().current;
    const toolbarBtn = stage.querySelector('.asr-controls .asr-btn');
    expect(toolbarBtn).toBeTruthy();
    const tbEv = new w.KeyboardEvent('keydown', { key: card2.answer, bubbles: true, cancelable: true });
    toolbarBtn.dispatchEvent(tbEv);
    expect(tbEv.defaultPrevented).toBe(false);
    expect(h.getState().stats.total).toBe(2);

    h.destroy();
  });

  it('trims partial keyBuffer on Backspace and clears it on Escape outside typeInput', () => {
    const { w, stage, core } = createRunnerDom();
    const h = core.mountRunner(stage, {
      modeId: 'custom',
      customSymbols: 'cat, car',
      count: 4,
      seed: 1,
      startButton: false,
    });
    const firstKey = stage.querySelector('.asr-key');
    const typeInput = stage.querySelector('.asr-input');
    firstKey.focus();

    firstKey.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'c', bubbles: true, cancelable: true }));
    firstKey.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true }));
    expect(typeInput.value).toBe('ca');

    // Backspace trims one character
    const bs = new w.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true });
    firstKey.dispatchEvent(bs);
    expect(bs.defaultPrevented).toBe(true);
    expect(typeInput.value).toBe('c');

    // Escape clears entire buffer
    const esc = new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    firstKey.dispatchEvent(esc);
    expect(esc.defaultPrevented).toBe(true);
    expect(typeInput.value).toBe('');

    h.destroy();
  });
});

// ---------------------------------------------------------------------------
// F2: Symbol Runner scheduler & rehearsal correctness
// ---------------------------------------------------------------------------
describe('F2: Symbol Runner scheduler dedupe, multi-card rehearsal rotation & focusAnswers hygiene', () => {
  it('never drops the last pool card via wraparound swap in practice decks', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const s = runnerCore.createScheduler({
        modeId: 'custom',
        pool: [
          { display: 'A', answer: 'a', category: 'letter' },
          { display: 'B', answer: 'b', category: 'letter' },
          { display: 'C', answer: 'c', category: 'letter' },
        ],
        count: 9,
        seed,
      });
      const q = s.peekQueue().map((c) => c.answer);
      expect(q).toHaveLength(9);
      // Every pass of 3 must contain each of a, b, c exactly once (wraparound bug dropped one and duplicated another)
      for (let pass = 0; pass < 3; pass++) {
        expect(q.slice(pass * 3, pass * 3 + 3).sort()).toEqual(['a', 'b', 'c']);
      }
    }
  });

  it('rotates across multiple cards per answer in Rehearsal instead of rehearsing only the last card', () => {
    const s = runnerCore.createScheduler({
      modeId: 'color_word_stroop',
      count: 24,
      seed: 7,
      focusAnswers: ['red'],
    });
    const redCards = s.peekQueue().filter((c) => c.role === 'new' && c.answer === 'red');
    expect(redCards.length).toBeGreaterThanOrEqual(3);
    const uniqueDisplays = new Set(redCards.map((c) => c.stroopWord + '|' + c.stroopColor));
    expect(uniqueDisplays.size).toBeGreaterThan(1);
  });

  it('drops unmatched focusAnswers (no pool[0] fallback) and avoids consecutive duplicate known draws', () => {
    const s = runnerCore.createScheduler({
      modeId: 'confusable_letters',
      count: 20,
      seed: 3,
      focusAnswers: ['nonexistent-symbol', 'b', 'b'],
    });
    const q = s.peekQueue();
    const newCards = q.filter((c) => c.role === 'new');
    expect(newCards.length).toBeGreaterThan(0);
    expect(newCards.every((c) => c.answer === 'b')).toBe(true);

    // Consecutive known cards in spacing gaps should not repeat the same answer
    for (let i = 1; i < q.length; i++) {
      if (q[i].role === 'known' && q[i - 1].role === 'known') {
        expect(q[i].answer).not.toBe(q[i - 1].answer);
      }
    }
  });

  it('SymbolRunnerPanel deduplicates unique answers before slicing focusAnswers on 4-answer color_word_stroop', async () => {
    const w = loadMathFluencyWindow();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    const mountedCfgs = [];
    w.AlloSymbolRunnerCore.mountRunner = (_el, cfg) => { mountedCfgs.push(cfg); return { destroy() {} }; };
    w.fetch = () => Promise.resolve({ ok: false });

    const host = w.document.getElementById('root');
    const root = ReactDOMClient.createRoot(host);
    mountedRoots.push({ root, host });
    await act(async () => {
      root.render(React.createElement(w.AlloModules.SymbolRunner, {
        React,
        t: (k) => k,
        addToast: () => {},
        handleScoreUpdate: () => {},
        onBackToMaze: () => {},
        runnerSettings: { mode: 'color_word_stroop', rehearsal: true, count: 20 },
      }));
    });
    expect(mountedCfgs.length).toBeGreaterThan(0);
    const cfg = mountedCfgs[mountedCfgs.length - 1];
    const uniqueFocus = new Set((cfg.focusAnswers || []).map((a) => String(a).toLowerCase()));
    expect(uniqueFocus.size).toBe(cfg.focusAnswers.length);
    // color_word_stroop has 4 unique answers; at least 1 known answer must remain (so focusAnswers <= 3)
    expect(cfg.focusAnswers.length).toBeGreaterThanOrEqual(1);
    expect(cfg.focusAnswers.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// F3: Validity (no answer leak), audio cleanup, 390px grid, fillText maxWidth, touch Lock-on
// ---------------------------------------------------------------------------
describe('F3: Symbol Runner spoken-cue validity, audio cleanup, mobile grid & touch Lock-on', () => {
  it('never leaks answers via resolveSpokenCueText or Hear it on size_stroop, quantity_stroop, or math facts', () => {
    for (const modeId of ['number_size_stroop', 'quantity_stroop', 'math_make_10', 'math_doubles', 'math_mult_2_5_10', 'math_squares', 'color_word_stroop']) {
      const m = runnerCore.getMode(modeId);
      for (const item of m.items) {
        expect(runnerCore.resolveSpokenCueText(item), modeId + ':' + item.display).toBe('');
      }
    }
    // Plain number & word modes still resolve spoken cues
    expect(runnerCore.resolveSpokenCueText({ display: '7', answer: '7', category: 'number' })).toBe('seven');
    expect(runnerCore.resolveSpokenCueText({ display: 'the', answer: 'the', category: 'word' })).toBe('the');

    // Hear it button stays hidden on number_size_stroop and math_make_10 even with local TTS voice available
    const { stage, core } = createRunnerDom((w) => {
      w.speechSynthesis = { getVoices: () => [{ lang: 'en-US', localService: true }], cancel() {}, speak() {}, addEventListener() {}, removeEventListener() {} };
      w.SpeechSynthesisUtterance = function (txt) { this.text = txt; };
    });
    for (const modeId of ['number_size_stroop', 'math_make_10']) {
      const h = core.mountRunner(stage, { modeId, count: 4, seed: 2, startButton: false, localSpeechFallback: true });
      const hear = stage.querySelector('[data-sr-hear]');
      expect(hear.hidden, modeId).toBe(true);
      h.destroy();
    }
  });

  it('cancels active audio clip and speechSynthesis on mute, finishRun, and cross-source switch, and restarts clock on utt.onend', () => {
    const events = [];
    const utterances = [];
    const { stage, core } = createRunnerDom((w) => {
      w.Audio = class {
        constructor(src) { this.src = src; }
        addEventListener() {}
        play() { events.push('clip:play'); return Promise.resolve(); }
        pause() { events.push('clip:pause'); }
      };
      w.speechSynthesis = {
        getVoices: () => [{ lang: 'en-US', localService: true, name: 'Local' }],
        cancel() { events.push('tts:cancel'); },
        speak(utt) { events.push('tts:speak:' + utt.text); utterances.push(utt); },
        addEventListener() {},
        removeEventListener() {},
      };
      w.SpeechSynthesisUtterance = function (txt) { this.text = txt; };
    });

    const h = core.mountRunner(stage, {
      modeId: 'digits_single',
      count: 2,
      seed: 1,
      startButton: false,
      localSpeechFallback: true,
    });
    const cur = h.getState().current;
    // Play TTS with restartClock -> attaches utt.onend
    expect(h.playAnchorAudio(cur, { restartClock: true })).toBe(true);
    expect(utterances.length).toBeGreaterThan(0);
    expect(typeof utterances[utterances.length - 1].onend).toBe('function');
    // Invoking onend should not throw
    utterances[utterances.length - 1].onend();

    // Mute button cancels TTS and stops clips
    events.length = 0;
    const soundBtn = [...stage.querySelectorAll('.asr-controls button')].find((b) => /Sound/i.test(b.textContent));
    soundBtn.click();
    expect(events).toContain('tts:cancel');
    // Unmute
    soundBtn.click();

    // Cross-source switch: clip playback cancels TTS, TTS playback pauses clip
    events.length = 0;
    h.playAnchorAudio({ id: 'c1', display: 'a', answer: 'a', category: 'letter', audioUri: quietClip });
    expect(events).toEqual(['tts:cancel', 'clip:play']);
    events.length = 0;
    h.playAnchorAudio({ id: 'c2', display: '5', answer: '5', category: 'number' });
    expect(events).toEqual(['clip:pause', 'tts:cancel', 'tts:speak:five']);

    // Finishing the run cancels speech and stops clip
    events.length = 0;
    while (h.getState().current) h.submit(h.getState().current.answer);
    expect(events).toContain('tts:cancel');
    h.destroy();
  });

  it('includes 480px mobile 4-column grid rule, passes maxWidth to canvas fillText, and supports pointerdown Lock-on without rebuilding keypad DOM', () => {
    const { w, doc, stage, core, fillCalls } = createRunnerDom();
    const h = core.mountRunner(stage, {
      modeId: 'custom',
      customSymbols: 'extraordinary, wonderful',
      count: 3,
      seed: 1,
      controlMode: 'lockon',
      startButton: false,
    });

    // 1. Mobile media query in injected styles
    const styleEl = doc.getElementById('allo-symbol-runner-styles');
    expect(styleEl && styleEl.textContent).toContain('@media (max-width:480px){.asr-ran-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}');

    // 2. Canvas fillText passes maxWidth (4th argument)
    const curDisplay = h.getState().current.display;
    const symbolFill = fillCalls.find((args) => args[0] === curDisplay);
    expect(symbolFill).toBeTruthy();
    expect(typeof symbolFill[3]).toBe('number');
    expect(symbolFill[3]).toBeGreaterThanOrEqual(24);

    // 3. Canvas pointerdown aims lane without replacing .asr-key nodes
    const keypad = stage.querySelector('.asr-keypad');
    const originalBtn = keypad.children[0];
    expect(originalBtn).toBeTruthy();
    const canvas = stage.querySelector('canvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 150 });
    const startLane = h.getState().aimLane;
    const targetX = startLane === 0 ? 280 : 10;
    const pd = new w.Event('pointerdown', { bubbles: true });
    Object.defineProperty(pd, 'clientX', { value: targetX });
    Object.defineProperty(pd, 'clientY', { value: 75 });
    canvas.dispatchEvent(pd);
    expect(h.getState().aimLane).not.toBe(startLane);
    expect(keypad.children[0]).toBe(originalBtn);

    h.destroy();
  });
});

// ---------------------------------------------------------------------------
// F4 & F5: FluencyMazePanel + MathFluencySession + SymbolRunnerPanel credits
// ---------------------------------------------------------------------------
describe('F4 & F5: FluencyMaze Explorer win revisit, double-submit, blank input, Help modal, CapsLock/Arrows & credits', () => {
  async function startMaze(w, prefs) {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    w.IS_REACT_ACT_ENVIRONMENT = true;
    w.localStorage.setItem('fluency_maze_tutorial_seen', '1');
    w.localStorage.setItem('fluency_maze_prefs', JSON.stringify(Object.assign({ performance2D: true, mazeSize: 'small', chaseMode: false, operation: 'add', difficulty: 'single' }, prefs)));
    const scores = [];
    const host = w.document.getElementById('root');
    const root = ReactDOMClient.createRoot(host);
    mountedRoots.push({ root, host });
    await act(async () => {
      root.render(React.createElement(w.AlloModules.FluencyMaze, {
        React, gradeLevel: '3', t: (k) => k, addToast: () => {}, handleScoreUpdate: (...a) => scores.push(a),
      }));
    });
    const startBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Light the Torches'));
    await act(async () => { startBtn.click(); });
    return { host, root, scores };
  }

  function solveOpenGateProblemText(host) {
    const label = host.querySelector('input[aria-label*="Type your answer to"]')?.getAttribute('aria-label') || '';
    const expr = label.replace(/^Type your answer to\s*/i, '').trim();
    const m = /^(\d+)\s*([+\-\u2212\u00d7x*\/\u00f7])\s*(\d+)$/.exec(expr);
    if (!m) return null;
    const a = Number(m[1]), op = m[2], b = Number(m[3]);
    if (op === '+') return a + b;
    if (op === '-' || op === '\u2212') return a - b;
    if (op === '\u00d7' || op === 'x' || op === '*') return a * b;
    if (op === '\u00f7' || op === '/') return Math.round(a / b);
    return null;
  }

  it('F4: Explorer Mode wins when revisiting the Exit through an already-solved passage after collecting the key', async () => {
    // Deterministic LCG seed=3 on 5x5 maze:
    //   key at (2,2), not on path (0,0)->(4,4):
    //   toExit:    0,0 -> 1,0 -> 1,1 -> 1,2 -> 1,3 -> 2,3 -> 2,4 -> 3,4 -> 4,4
    //   exitToKey: 4,4 -> 4,3 -> 4,2 -> 3,2 -> 3,1 -> 3,0 -> 2,0 -> 2,1 -> 2,2
    let rSeed = 3;
    const w = loadMathFluencyWindow((win) => {
      win.Math.random = () => { rSeed = (rSeed * 1664525 + 1013904223) >>> 0; return rSeed / 4294967296; };
    });
    const { host, scores } = await startMaze(w, { controlMode: 'explorer', mazeSize: 'small', operation: 'add' });

    const moveBtn = (label) => host.querySelector('button[aria-label="' + label + '"]');
    const stepLabel = (r1, c1, r2, c2) => (r2 > r1 ? 'Move down' : r2 < r1 ? 'Move up' : c2 > c1 ? 'Move right' : 'Move left');

    const walkPath = async (coords, expectNoGates) => {
      for (let i = 1; i < coords.length; i++) {
        const [r1, c1] = coords[i - 1];
        const [r2, c2] = coords[i];
        const btn = moveBtn(stepLabel(r1, c1, r2, c2));
        expect(btn && !btn.disabled, 'step ' + r1 + ',' + c1 + '->' + r2 + ',' + c2).toBe(true);
        await act(async () => { btn.click(); });
        const inp = host.querySelector('input[aria-label*="Type your answer to"]');
        if (expectNoGates) {
          expect(inp).toBeNull();
        } else if (inp) {
          const ans = solveOpenGateProblemText(host);
          expect(ans).not.toBeNull();
          await act(async () => {
            const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
            setter.call(inp, String(ans));
            inp.dispatchEvent(new w.Event('input', { bubbles: true }));
          });
          const unlock = host.querySelector('button[aria-label="Submit answer to unlock the gate"]');
          await act(async () => { unlock.click(); });
          await act(async () => { await new Promise((r) => setTimeout(r, 240)); });
        }
      }
    };

    const toExit = [[0,0],[1,0],[1,1],[1,2],[1,3],[2,3],[2,4],[3,4],[4,4]];
    const exitToKey = [[4,4],[4,3],[4,2],[3,2],[3,1],[3,0],[2,0],[2,1],[2,2]];
    const keyBackToExit = exitToKey.slice().reverse();

    // 1. Reach Exit BEFORE grabbing the key -> portal stays locked (not won)
    await walkPath(toExit, false);
    expect(host.textContent).not.toContain('You Escaped the Maze!');
    expect(scores.length).toBe(0);

    // 2. Travel from Exit to the Golden Key -> solves the return passages & unlocks portal
    await walkPath(exitToKey, false);
    expect(host.textContent).not.toContain('You Escaped the Maze!');
    expect(scores.length).toBe(0);

    // 3. Revisit Exit purely through already-solved passages (zero gates) -> MUST WIN!
    await walkPath(keyBackToExit, true);
    expect(host.textContent).toContain('You Escaped the Maze!');
    expect(scores.length).toBe(1);
  }, 60000);

  it('F5: guards double-submit during 220ms gate dismissal, avoids penalizing blank input, respects Help modal + CapsLock WASD + Arrow preventDefault', async () => {
    const w = loadMathFluencyWindow();
    const { host } = await startMaze(w, { controlMode: 'classic', mazeSize: 'small', operation: 'add' });

    // 1. Help modal blocks movement & restart; Escape closes Help
    await act(async () => {
      w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: '?', bubbles: true, cancelable: true }));
    });
    expect(host.textContent).toContain('Keyboard Shortcuts');

    // Attempt movement while Help is open -> no gate should open
    await act(async () => {
      w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('input[aria-label*="Type your answer to"]')).toBeNull();

    // Escape closes Help
    const escEv = new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    await act(async () => { w.document.dispatchEvent(escEv); });
    expect(escEv.defaultPrevented).toBe(true);
    expect(host.textContent).not.toContain('Keyboard Shortcuts');

    // 2. Arrow key calls e.preventDefault() and opens a gate (find an available direction)
    const availBtn = [...host.querySelectorAll('.mf-maze-move-button')].find((b) => !b.disabled);
    expect(availBtn).toBeTruthy();
    const dirLabel = availBtn.getAttribute('aria-label');
    const arrowKey = dirLabel.includes('right') ? 'ArrowRight' : dirLabel.includes('down') ? 'ArrowDown' : dirLabel.includes('left') ? 'ArrowLeft' : 'ArrowUp';
    const arrEv = new w.KeyboardEvent('keydown', { key: arrowKey, bubbles: true, cancelable: true });
    await act(async () => { w.document.dispatchEvent(arrEv); });
    expect(arrEv.defaultPrevented).toBe(true);

    // 3. Submitting blank input does NOT penalize score or increment wrong tries
    const inp = host.querySelector('input[aria-label*="Type your answer to"]');
    expect(inp).toBeTruthy();
    const unlock = host.querySelector('button[aria-label="Submit answer to unlock the gate"]');
    await act(async () => { unlock.click(); });
    expect(host.textContent).not.toContain('Attempt 2');

    // 4. Double-submitting correct answer during 220ms gate dismissal counts ONLY 1 gate unlocked
    const ans = solveOpenGateProblemText(host);
    expect(ans).not.toBeNull();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
      setter.call(inp, String(ans));
      inp.dispatchEvent(new w.Event('input', { bubbles: true }));
    });
    await act(async () => {
      unlock.click();
      unlock.click();
      w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    await act(async () => { await new Promise((r) => setTimeout(r, 260)); });
    const lifetime = JSON.parse(w.localStorage.getItem('fluency_maze_lifetime') || '{}');
    expect(lifetime.gatesUnlocked).toBe(1);

    // 5. CapsLock-safe uppercase WASD moves and opens next gate
    const nextAvail = [...host.querySelectorAll('.mf-maze-move-button')].find((b) => !b.disabled);
    const nextLabel = nextAvail.getAttribute('aria-label');
    const upperWasd = nextLabel.includes('right') ? 'D' : nextLabel.includes('down') ? 'S' : nextLabel.includes('left') ? 'A' : 'W';
    await act(async () => {
      w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: upperWasd, bubbles: true, cancelable: true }));
    });
    expect(host.querySelector('input[aria-label*="Type your answer to"]')).toBeTruthy();
  });

  it('F5: MathFluencySession clears autoAdvanceTimerRef synchronously and SymbolRunnerPanel preserves raw.credit', () => {
    const src = read('math_fluency_module.js');
    // Verify synchronous clearTimeout inside MathFluencySession.submitAnswer
    const submitIdx = src.indexOf('var submitAnswer = useCallback(function (skip) {');
    expect(submitIdx).toBeGreaterThan(0);
    const submitSnippet = src.slice(submitIdx, submitIdx + 360);
    expect(submitSnippet).toContain('if (autoAdvanceTimerRef.current) { clearTimeout(autoAdvanceTimerRef.current); autoAdvanceTimerRef.current = null; }');

    // Verify SymbolRunnerPanel.autoFillCuePictures preserves raw.credit instead of hardcoding Mulberry Symbols
    expect(src).toContain("credit: (raw && raw.credit) || 'Mulberry Symbols'");
    expect(src).not.toContain("credit: 'Mulberry Symbols',\n              };");

    // Verify finalScore includes streakBonus in FluencyMazePanel
    expect(src).toContain('completeMazeRun(correct + 1, score + 10 + streakBonus)');
  });
});

// ---------------------------------------------------------------------------
// F6: word_picture_matcher.js morphology, antonyms, aliases, preferDiagrams, diacritics, credits
// ---------------------------------------------------------------------------
describe('F6: word_picture_matcher morphology, prefix safety, aliases, preferDiagrams, diacritics & credits', () => {
  it('avoids non-sibilant -es and silent-e -ing/-ed false positives while keeping sibilants and doubled CVC', () => {
    // Non-sibilant -es must NOT match bare short-vowel roots
    for (const [word, bad] of [['capes', 'cap'], ['hopes', 'hop'], ['rates', 'rat'], ['stares', 'star'], ['scares', 'scar']]) {
      const hit = matcher.matchWord(word, { symbols });
      expect(!hit || hit.word !== bad, word + ' -> ' + (hit && hit.word)).toBe(true);
    }
    // Sibilant / -o plurals still work
    expect(matcher.matchWord('dishes', { symbols })?.word).toMatch(/^dish/);
    expect(matcher.matchWord('peaches', { symbols })?.word).toMatch(/^peach/);
    expect(matcher.matchWord('tomatoes', { symbols })?.word).toMatch(/^tomato/);

    // Silent-e -ing / -ed must NOT fall back to bare CVC words
    for (const [word, bad] of [
      ['hoping', 'hop'], ['hoped', 'hop'],
      ['staring', 'star'], ['stared', 'star'],
      ['rating', 'rat'], ['rated', 'rat'],
      ['scaring', 'scar'], ['scared', 'scar'],
      ['caped', 'cap'], ['shining', 'shin'],
    ]) {
      const hit = matcher.matchWord(word, { symbols });
      expect(!hit || hit.word !== bad, word + ' -> ' + (hit && hit.word)).toBe(true);
    }
    // Doubled CVC inflections still match their true roots (contrasting with silent-e caped/stared above!)
    expect(matcher.matchWord('capping', { symbols })?.word).toBe('cap');
    expect(matcher.matchWord('capped', { symbols })?.word).toBe('cap');
    expect(matcher.matchWord('starred', { symbols })?.word).toBe('star');
    expect(matcher.matchWord('jogging', { symbols })?.word).toBe('jog');
    expect(matcher.matchWord('chopping', { symbols })?.word).toBe('chop');
  });

  it('does not blindly strip negation/lexicalized prefixes and lets mistake reach mistake_fix diagram', () => {
    for (const [word, bad] of [
      ['missing', 'sing'],
      ['mistake', 'take'],
      ['understand', 'stand'],
      ['resort', 'sort'],
      ['depart', 'part'],
      ['unplug', 'plug'],
      ['unwrap', 'wrap'],
      ['disorder', 'order'],
    ]) {
      const hit = matcher.matchWord(word, { symbols, preferDiagrams: true });
      expect(!hit || hit.word !== bad, word + ' -> ' + (hit && hit.word)).toBe(true);
    }
    const mistake = matcher.matchWord('mistake', { symbols, preferDiagrams: true });
    expect(mistake && mistake.matchedKey).toBe('mistake_fix');
  });

  it('fixes inverted DIAGRAM_ALIASES and honors preferDiagrams for aliased curriculum concepts', () => {
    expect(matcher.getDiagram('warm')?.matchedKey).toBe('thermometer');
    expect(matcher.getDiagram('burn')?.matchedKey).toBe('thermometer');
    expect(matcher.getDiagram('sweat')?.matchedKey).toBe('thermometer');
    expect(matcher.getDiagram('shadow')?.matchedKey).toBe('shadow_dark');
    expect(matcher.getDiagram('shade')?.matchedKey).toBe('shadow_dark');
    expect(matcher.getDiagram('disaster')?.matchedKey).toBe('natural_disaster');
    expect(matcher.getDiagram('panic')?.matchedKey).toBe('emotion_fear');

    // preferDiagrams checks DIAGRAM_ALIASES before CONCEPT_CUES
    for (const [word, key] of [
      ['evaporation', 'evaporate'],
      ['condensation', 'condense'],
      ['multiplication', 'multiply'],
      ['division', 'divide'],
    ]) {
      const hit = matcher.matchWord(word, { symbols, preferDiagrams: true });
      expect(hit && hit.set, word).toBe('diagram');
      expect(hit && hit.matchedKey, word).toBe(key);
      expect(hit && hit.matchTier, word).toBe('diagram');
    }
  });

  it('folds NFD diacritics and emits consistent matchTier and AGPL-3.0 / CC BY-SA 4.0 credits', async () => {
    // NFD diacritics fold cleanly so accented words match diagrams/symbols
    const cafDiag = matcher.matchWord('café', { symbols });
    expect(cafDiag?.word).not.toBe('caf');
    const evoAcc = matcher.getDiagram('évaporation');
    expect(evoAcc && evoAcc.matchedKey).toBe('evaporate');
    expect(evoAcc.matchTier).toBe('diagram');
    expect(evoAcc.credit).toContain('AGPL-3.0');

    // searchSymbols diagram hits carry matchTier: 'diagram' and AGPL-3.0 credit
    const diagSearch = await matcher.searchSymbols('evaporate', { symbols: null, preferDiagrams: true });
    expect(diagSearch.length).toBeGreaterThan(0);
    expect(diagSearch[0].matchTier).toBe('diagram');
    expect(diagSearch[0].credit).toContain('AGPL-3.0');

    // Global Symbols online results include CC BY-SA 4.0
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ([{ text: 'telescope', pic: { image_url: 'https://globalsymbols.com/uploads/test.svg' } }]),
    });
    try {
      const online = await matcher.searchSymbols('zzunmatchedterm', { symbols: null, allowOnlineGlobalSymbols: true });
      const gs = online.find((h) => h.set === 'globalsymbols');
      expect(gs).toBeTruthy();
      expect(gs.credit).toContain('CC BY-SA 4.0');
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

// ---------------------------------------------------------------------------
// F7 & F8: packets_verify_core.js security, false-positive fix & Wave 1-6 parity
// ---------------------------------------------------------------------------
describe('F7 & F8: packets_verify_core SVG fail-closed, video: false positive, studentMic plain English, message listener & Wave 1-6 parity', () => {
  async function makeBasePractice(over = {}) {
    return wsBuilder.buildPacket({
      words: ['cat', 'sun', 'map', 'dog'],
      activities: ['isolation', 'blending'],
      title: 'Short vowels',
      seed: 7,
      core: wsCore,
      dictionary,
      banks: QUIET_BANKS,
      loader: wsLoader,
      wordlist,
      ...over,
    });
  }

  it('F7: flags unquoted CSS url(data:image/svg+xml,...) XSS and fails closed on incomplete SVG payloads', async () => {
    const base = (await makeBasePractice()).html;

    // Unquoted CSS SVG XSS payload (previously bypassed bare regex at whitespace!)
    const cssXss = base.replace('</style>', '\nbody{background:url(data:image/svg+xml,<svg onload=alert(1)></svg>)}\n</style>');
    const rXss = verify.verifyPacket(cssXss);
    expect(rXss.result).toBe('look');
    expect(rXss.findings.some((f) => f.id === 'svg-active' && f.cls === 'not expected')).toBe(true);

    // Unquoted CSS SVG payload with no closing </svg>
    const cssNoClose = base.replace('</style>', '\nbody{background:url(data:image/svg+xml,<svg onload=alert(1)>) }\n</style>');
    const rNoClose = verify.verifyPacket(cssNoClose);
    expect(rNoClose.result).toBe('look');
    expect(rNoClose.findings.some((f) => f.id === 'svg-active' && f.cls === 'not expected')).toBe(true);

    // Incomplete / truncated SVG fails closed as svg-unreadable (never reported closed)
    const truncated = base.replace('</style>', '\nbody{background:url(data:image/svg+xml,<svg)}\n</style>');
    const rTrunc = verify.verifyPacket(truncated);
    expect(rTrunc.result).toBe('look');
    expect(rTrunc.findings.some((f) => f.id === 'svg-unreadable' && f.cls === 'needs a person to look')).toBe(true);
  });

  it('F7 & F8: allows "video:" in Read-Along passage text with studentMic, discloses studentMic + deviceVoice in plain English, and flags video: in code', () => {
    const made = readAlong.lessonFromReadAlong({
      loader: wsLoader,
      title: 'Class Discussion',
      text: 'Watch the video: then talk with your partner about what you noticed.',
      studentMic: true,
      deviceVoice: true,
    });
    const built = readAlong.buildReadAlongPacket({ made, loader: wsLoader });
    const r = verify.verifyPacket(built.html);
    expect(r.ok).toBe(true);
    expect(r.result).toBe('closed');
    expect(r.counts.notExpected).toBe(0);
    expect(r.counts.look).toBe(0);

    // Plain-English disclosure for studentMic (in plain.reach and plain.keeps) and Read-Along deviceVoice
    expect(r.plain.reach.join(' ')).toContain('Record my voice');
    expect(r.plain.keeps.join(' ')).toContain('memory only');
    expect(r.plain.reach.join(' ')).toContain('read words or sentences aloud with the voice built into the device when the student asks');

    // No British spellings or promise words in plain output
    const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    const PROMISES = /\b(?:safe|safely|safety|safer|unsafe|secure|securely|security|insecure|guarantee[ds]?|certif\w*|compliant|compliance|tamper-?proof|trusted|bulletproof)\b/i;
    const allPlain = [].concat(r.plain.about, r.plain.reach, r.plain.keeps, r.plain.saves, r.plain.look).join('\n');
    expect(BRITISH.exec(allPlain)).toBeNull();
    expect(PROMISES.exec(allPlain)).toBeNull();

    // Injecting video: true into actual CODE (outside data block) MUST fail verification!
    const badCode = reseal(built.html.replace('\nvar renders=', '\nvar sneak = { video: true };\nvar renders='));
    const rBad = verify.verifyPacket(badCode);
    expect(rBad.result).toBe('look');
    expect(rBad.counts.notExpected).toBeGreaterThan(0);
  });

  it('F8: omits verified navToken-gated preview listener on clean packets and flags ungated or tampered message listeners', async () => {
    const cleanHtml = (await makeBasePractice()).html;
    const rClean = verify.verifyPacket(cleanHtml);
    expect(rClean.result).toBe('closed');
    expect([...new Set(rClean.findings.map((f) => f.id))].sort()).toEqual(['clipboard', 'file-save', 'local-storage', 'post-message']);

    // Ungated window.onmessage = ...
    const withOnMsg = reseal(cleanHtml.replace('\nvar renders=', '\nwindow.onmessage = function (e) { void e; };\nvar renders='));
    const rOnMsg = verify.verifyPacket(withOnMsg);
    expect(rOnMsg.result).toBe('look');
    expect(rOnMsg.findings.some((f) => f.id === 'message-listener' && f.cls === 'not expected')).toBe(true);

    // Ungated addEventListener('message', ...)
    const withAdd = reseal(cleanHtml.replace('\nvar renders=', "\nwindow.addEventListener('message', function (e) { void e; });\nvar renders="));
    const rAdd = verify.verifyPacket(withAdd);
    expect(rAdd.result).toBe('look');
    expect(rAdd.findings.some((f) => f.id === 'message-listener' && f.cls === 'not expected')).toBe(true);

    // Tampered navToken gate (removes token check)
    const tampered = reseal(cleanHtml.replace('&& d.token === navToken', ''));
    const rTampered = verify.verifyPacket(tampered);
    expect(rTampered.result).toBe('look');
    expect(rTampered.findings.some((f) => f.id === 'message-listener' && f.cls === 'not expected')).toBe(true);
  });

  it('F8: surfaces mixedOrder (lesson.sequence) and diagram (manifest.pictures.diagram) in report.data and plain.about before Inside the file', async () => {
    const built = await makeBasePractice({
      words: ['cat', 'sun', 'map', 'dog'],
      order: 'mixed',
      pictures: true,
      symbols,
    });
    // Inject a diagram metadata entry in manifest.pictures (matching word_sounds_packet_builder.js pictureFacts.diagram)
    const open = '<script type="application/json" id="packet-manifest">';
    const at = built.html.indexOf(open) + open.length;
    const end = built.html.indexOf('</script>', at);
    const man = JSON.parse(built.html.slice(at, end));
    man.pictures = Object.assign({}, man.pictures, {
      diagram: { set: 'AlloFlow Curriculum Diagrams', license: 'AGPL-3.0', words: 2 },
    });
    const htmlWithDiag = built.html.slice(0, at) + JSON.stringify(man) + built.html.slice(end);

    const r = verify.verifyPacket(htmlWithDiag);
    expect(r.result).toBe('closed');
    expect(r.data.mixedOrder).toBe(true);
    expect(r.data.diagram).toBe(2);
    expect(r.plain.about.some((line) => /Question order: mixed across activities/i.test(line))).toBe(true);
    expect(r.plain.about.some((line) => /Built-in curriculum diagrams: 2 words .*AGPL-3\.0/i.test(line))).toBe(true);
    // Must stay BEFORE the final 'Inside the file: ...' line
    expect(r.plain.about[r.plain.about.length - 1]).toMatch(/^Inside the file:/);
  });

  it('F8: preserves Vocabulary Read aloud plain.reach wording verbatim', () => {
    const bank = require('./fixtures/packets_vocab_bank_fixture.js');
    // Load bank synchronously if needed or build via minimal fixture
    const rows = [
      { key: 'cat', word: 'cat', def: 'A small furry pet.', pos: 'noun', example: 'The cat slept.', own: true, wrong: [
        { id: '1', word: 'dog', def: 'A barking pet.', from: 'own' },
        { id: '2', word: 'sun', def: 'The star in the sky.', from: 'own' },
        { id: '3', word: 'cup', def: 'A dish for drinking.', from: 'own' },
      ] },
    ];
    const lesson = vocabBuilder.lessonFromVocab({ loader: wsLoader, rows, types: ['meaning'], mode: 'practice', title: 'Pets', readAloud: true });
    const built = vocabBuilder.buildVocabPacket({ lesson, loader: wsLoader, rows, bank });
    const r = verify.verifyPacket(built.html);
    expect(r.result).toBe('closed');
    expect(r.plain.reach).toContain(
      'It can read the words aloud with the voice built into the device, when the student presses Read aloud. It uses only a voice that runs on the device, so this needs no connection. A scan cannot tell how that voice was made.'
    );
  });
});
