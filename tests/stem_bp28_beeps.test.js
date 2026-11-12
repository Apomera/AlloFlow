// Round 28 (lane beep): two STEM sounds that never played.
// - Calculus called the host's ctx.beep (stemBeep(freq, dur, vol)) with a NAME: stemBeep('click' | 'success' |
//   'error'). In Chromium, AudioParam.value = 'click' throws "non-finite"; stemBeep's catch swallowed it, so
//   every Calculus click / correct / wrong sound was silent. Calculus now plays its own tones (calcTone).
// - Coordinate Grid's speaker toggle: the "sound on" tone ran in the closure of the render where muted was
//   still true, so it never played.
// The fake AudioContext below rejects a non-finite frequency the way Chromium does, and the Calculus host
// beep is the REAL hub stemBeep cut from the hub source. STEM_TOOL_DIR picks the tool copies (default
// stem_lab), STEM_HUB the hub.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const file = (n) => path.join(DIR, 'stem_tool_' + n + '.js');
const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

const appMute = () => { window.__alloIsGlobalMuted = () => true; };
const legacyMute = () => { window.__alloIsGlobalMuted = () => false; window._alloGlobalMute = true; };
const MUTES = [['the app mute (__alloIsGlobalMuted)', appMute], ['the legacy _alloGlobalMute flag', legacyMute]];
function clearMute() { delete window.__alloIsGlobalMuted; delete window._alloGlobalMute; }

// An AudioParam whose value setter behaves like Chromium's: WebIDL float conversion, non-finite -> TypeError.
function param(ac) {
  let v = 0;
  return {
    get value() { return v; },
    set value(x) {
      const n = Number(x);
      if (!Number.isFinite(n)) { ac.rejected.push(x); throw new TypeError("Failed to set the 'value' property on 'AudioParam': The provided float value is non-finite."); }
      v = n;
    },
    setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {},
  };
}
function fakeContext() {
  const ac = { currentTime: 0, state: 'running', destination: {}, oscillators: [], rejected: [] };
  ac.createOscillator = () => { const o = { type: 'sine', frequency: param(ac), started: false, connect() {}, disconnect() {}, start() { o.started = true; }, stop() {} }; ac.oscillators.push(o); return o; };
  ac.createGain = () => ({ gain: param(ac), connect() {}, disconnect() {} });
  ac.resume = () => {}; ac.close = () => { ac.state = 'closed'; };
  ac.started = () => ac.oscillators.filter((o) => o.started);
  ac.freqs = () => ac.started().map((o) => o.frequency.value);
  return ac;
}

// The hub's real stemBeep + stemCelebrate (ctx.beep / ctx.celebrate), cut out with a balanced-brace scan.
function extractBalanced(src, openAt) {
  let depth = 0, quote = null, line = false, block = false;
  for (let i = openAt; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = null; continue; }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('unbalanced');
}
function extractFunction(src, name) {
  const m = new RegExp('function ' + name + '\\s*\\(').exec(src);
  expect(m, 'hub declares ' + name).not.toBeNull();
  const open = src.indexOf('{', m.index);
  return src.slice(m.index, open) + extractBalanced(src, open);
}
function loadHubSound() {
  const src = read(HUB);
  // eslint-disable-next-line no-new-func
  return new Function(extractFunction(src, 'stemBeep') + '\n' + extractFunction(src, 'stemCelebrate') + '\nreturn { beep: stemBeep, celebrate: stemCelebrate };')();
}

let host, root, previousAct, ac;
function mount(cfg, seed, extra) {
  function Panel() {
    const [toolData, setToolData] = React.useState(seed || {});
    return cfg.render(makeCtx(Object.assign({ toolData, setToolData }, extra || {})));
  }
  React.act(() => { root = ReactDOMClient.createRoot(host); root.render(React.createElement(Panel)); });
}
const clickEl = (node) => React.act(() => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const advance = (ms) => React.act(() => { vi.advanceTimersByTime(ms); });
const buttonByText = (re) => Array.from(host.querySelectorAll('button')).find((b) => re.test(b.textContent));

beforeEach(() => {
  clearMute();
  previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  resetStemLab();
  const contexts = new WeakMap();
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
    if (kind !== '2d') return null;
    if (!contexts.has(this)) contexts.set(this, new Proxy({
      canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    }, { get: (target, k) => (k in target ? target[k] : () => {}) }));
    return contexts.get(this);
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => {
  if (root) React.act(() => root.unmount());
  root = null;
  host.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearMute();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
});

// ── Calculus ──
// An Over/Under item whose answer is "under" (the shape calculus_challenge_correctness seeds).
const OU_QUIZ = { mode: 'overunder', a: 1, b: 0, c: 0, xMin: 0, xMax: 2, n: 4, ruleMode: 'left', answer: 'under', answered: false, question: 'Is this estimate over, exact, or under?' };
const challengeSeed = (more) => ({ calculus: Object.assign({ tab: 'challenge', calcChallengeMode: 'overunder', a: 1, b: 0, c: 0, xMin: 0, xMax: 2, n: 4, mode: 'left', calcQuiz: Object.assign({}, OU_QUIZ) }, more || {}) });

describe('Calculus: its click / correct / wrong sounds play (they were silent: a name passed as a frequency)', () => {
  let cfg, hubBeep, hub;
  beforeEach(() => {
    cfg = loadTool(file('calculus'), 'calculus');
    ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
    hub = loadHubSound();
    hubBeep = vi.fn(hub.beep);
  });
  const ctxExtra = () => ({ beep: hubBeep, celebrate: hub.celebrate });

  it('the fake context rejects a named frequency like Chromium; the hub beep maps a name to a tone (round 29)', () => {
    const o = ac.createOscillator();
    expect(() => { o.frequency.value = 'click'; }).toThrow(TypeError);
    expect(ac.rejected).toEqual(['click']);
    ac.rejected.length = 0;
    hub.beep('click');
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([880]);
    hub.beep(600, 0.03, 0.04);
    expect(ac.freqs()).toEqual([880, 600]);
  });

  it('"New challenge" plays the click tone; no frequency is rejected; ctx.beep never gets a name', () => {
    mount(cfg, challengeSeed(), ctxExtra());
    const start = host.querySelector('button[data-calc-start="challenge"]');
    expect(start, 'New challenge button').not.toBeNull();
    clickEl(start);
    advance(50);
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([600]);
    expect(hubBeep.mock.calls.filter((args) => typeof args[0] !== 'number')).toEqual([]);
  });

  it('a correct answer plays the success chime once (3 notes, no extra click on top)', () => {
    mount(cfg, challengeSeed(), ctxExtra());
    const under = buttonByText(/UNDERestimate/);
    expect(under, 'UNDER option').toBeTruthy();
    clickEl(under);
    advance(300);
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([523, 659, 784]);
  });

  it('a wrong answer plays the low "not yet" tone once', () => {
    mount(cfg, challengeSeed(), ctxExtra());
    clickEl(buttonByText(/OVERestimate/));
    advance(300);
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([220]);
  });

  it('a streak of 3 plays the hub fanfare alone, not the success chime on top of it', () => {
    const celebrate = vi.fn(hub.celebrate);
    mount(cfg, challengeSeed({ calcStreak: 2 }), { beep: hubBeep, celebrate });
    clickEl(buttonByText(/UNDERestimate/));
    advance(400);
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([523, 659, 784]); // the fanfare's 3 notes; with the chime too it would be 6
  });

  it.each(MUTES)('is silent under %s: no audio context asked for, no oscillator', (_label, mute) => {
    mute();
    mount(cfg, challengeSeed(), ctxExtra());
    clickEl(buttonByText(/OVERestimate/)); // wrong
    advance(300);
    clickEl(buttonByText(/UNDERestimate/)); // right (second try)
    advance(300);
    clickEl(host.querySelector('button[data-calc-start="challenge"]')); // new challenge (click)
    advance(2500); // and the auto-advance
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(ac.oscillators.length).toBe(0);
  });

  it('muting during the success chime silences the notes still to come', () => {
    mount(cfg, challengeSeed(), ctxExtra());
    clickEl(buttonByText(/UNDERestimate/));
    expect(ac.started().length).toBe(1);
    appMute();
    advance(300);
    expect(ac.started().length).toBe(1);
  });

  it('a throwing __alloIsGlobalMuted does not throw and does not block the sound', () => {
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    mount(cfg, challengeSeed(), ctxExtra());
    expect(() => clickEl(host.querySelector('button[data-calc-start="challenge"]'))).not.toThrow();
    expect(ac.freqs()).toEqual([600]);
  });
});

// ── Coordinate Grid: the speaker toggle ──
describe('Coordinate Grid: the "sound on" tone of its own speaker toggle', () => {
  let cfg;
  beforeEach(() => {
    cfg = loadTool(file('coordgrid'), 'coordinate');
    ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
  });
  const toggle = (title) => host.querySelector('button[title="' + title + '"]');

  it('switching sound ON plays the confirmation tone (660 Hz)', () => {
    mount(cfg, { _coordGrid: { muted: true } });
    const btn = toggle('Sounds are off');
    expect(btn, 'toggle (off)').not.toBeNull();
    clickEl(btn);
    advance(20);
    expect(toggle('Sounds are on'), 'toggle now on').not.toBeNull();
    expect(ac.rejected).toEqual([]);
    expect(ac.freqs()).toEqual([660]);
  });

  it('switching sound OFF plays nothing', () => {
    mount(cfg, {});
    const btn = toggle('Sounds are on');
    expect(btn, 'toggle (on)').not.toBeNull();
    clickEl(btn);
    advance(20);
    expect(toggle('Sounds are off'), 'toggle now off').not.toBeNull();
    expect(ac.oscillators.length).toBe(0);
  });

  it('while the tool is muted its other sounds stay silent (Save snapshot)', () => {
    mount(cfg, { _coordGrid: { muted: true } });
    clickEl(host.querySelector('button[aria-label="Save snapshot"]'));
    advance(300);
    expect(ac.oscillators.length).toBe(0);
  });

  it.each(MUTES)('switching sound ON is silent under %s', (_label, mute) => {
    mute();
    mount(cfg, { _coordGrid: { muted: true } });
    clickEl(toggle('Sounds are off'));
    advance(20);
    expect(toggle('Sounds are on'), 'toggle now on').not.toBeNull();
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(ac.oscillators.length).toBe(0);
  });
});
