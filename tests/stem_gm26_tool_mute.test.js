// Round 26 (lane mute): the app's mute is window.__alloIsGlobalMuted() (AlloFlowANTI.txt); nothing in the
// app sets the legacy window._alloGlobalMute flag any more. These 8 STEM tools read only the legacy flag,
// so the app's mute did not silence their sounds or read-aloud. Each check now honours both.
// Every case runs the tool's real code: the shared alloGraphAccess block (Calculus, Coordinate Grid,
// Data Plot, Function Grapher, Graphing Calculator), Data Plot's own sound effects, the Area & Perimeter
// tone player, and the mounted Cellular Automaton and Heat Lab panels.
// STEM_TOOL_DIR picks the folder holding the tool copies (default stem_lab).
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const file = (n) => path.join(DIR, 'stem_tool_' + n + '.js');
const read = (n) => fs.readFileSync(path.resolve(process.cwd(), file(n)), 'utf8');

// The two ways a tool can be muted, plus "not muted" as the control.
const appMute = () => { window.__alloIsGlobalMuted = () => true; };
const legacyMute = () => { window.__alloIsGlobalMuted = () => false; window._alloGlobalMute = true; };
const MUTES = [['the app mute (__alloIsGlobalMuted)', appMute], ['the legacy _alloGlobalMute flag', legacyMute]];

function clearMute() { delete window.__alloIsGlobalMuted; delete window._alloGlobalMute; }

const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
// A fake Web Audio context that records every oscillator it makes.
function fakeContext() {
  const ac = { currentTime: 0, state: 'running', destination: {}, oscillators: [] };
  ac.createOscillator = () => { const o = { type: '', frequency: param(), connect() {}, disconnect() {}, start() {}, stop() {} }; ac.oscillators.push(o); return o; };
  ac.createGain = () => ({ gain: param(), connect() {}, disconnect() {} });
  ac.createStereoPanner = () => ({ pan: param(), connect() {} });
  ac.resume = () => {}; ac.close = () => { ac.state = 'closed'; };
  return ac;
}
// window.AudioContext that counts constructions and keeps every context made.
function audioCtor() {
  const made = [];
  function Ctor() { const ac = fakeContext(); made.push(ac); return ac; }
  return { Ctor, made, oscillators: () => made.reduce((n, ac) => n + ac.oscillators.length, 0) };
}
function fakeSpeech() {
  const spoken = [];
  window.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); } };
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  return spoken;
}

beforeEach(() => { clearMute(); });
afterEach(() => {
  clearMute();
  delete window.AudioContext; delete window.webkitAudioContext;
  delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── the shared alloGraphAccess core v2 block ──
const START = '  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==';
const END = '  // == end alloGraphAccess core v2 ==';
function installBlock(n) {
  const src = read(n);
  const a = src.indexOf(START), b = src.indexOf(END, a);
  expect(a, n + ' block start').toBeGreaterThan(-1);
  expect(b, n + ' block end').toBeGreaterThan(a);
  window.StemLab = { tools: {} };
  new Function(src.slice(a, b + END.length))(); // eslint-disable-line no-new-func
  return window.StemLab._graphAccess;
}

describe.each(['calculus', 'coordgrid', 'dataplot', 'funcgrapher', 'graphcalc'])('%s: the graph sound and read-aloud (alloGraphAccess)', (n) => {
  let GA;
  const plan = () => GA.sonifyPlan(GA.sample((x) => x * x - 4, -10, 10, 201), { ymin: -10, ymax: 10 });
  beforeEach(() => { GA = installBlock(n); });

  it('plays and speaks when not muted (control)', () => {
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    const spoken = fakeSpeech();
    expect(GA.isMuted()).toBe(false);
    expect(GA.playPlan(plan(), {})).not.toBeNull();
    expect(audio.oscillators()).toBeGreaterThan(0);
    GA.stop();
    const tts = vi.fn(() => Promise.resolve('blob:x'));
    expect(GA.speak('y equals x squared', tts)).toBe(true);
    expect(tts).toHaveBeenCalledTimes(1);
    expect(GA.speak('device voice')).toBe(true);
    expect(spoken).toEqual(['device voice']);
  });

  it.each(MUTES)('is silent under %s: no audio context, no oscillator, no TTS, no device voice', (_label, mute) => {
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    window.StemLab.audioContext = vi.fn(() => fakeContext());
    const spoken = fakeSpeech();
    mute();
    expect(GA.isMuted()).toBe(true);
    expect(GA.playPlan(plan(), {})).toBeNull();
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(audio.made.length).toBe(0);
    const tts = vi.fn(() => Promise.resolve('blob:x'));
    expect(GA.speak('y equals x squared', tts)).toBe(false);
    expect(GA.speak('device voice')).toBe(false);
    expect(tts).not.toHaveBeenCalled();
    expect(spoken).toEqual([]);
  });

  it('a throwing __alloIsGlobalMuted does not throw out of the check, and the legacy flag still counts', () => {
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    expect(() => GA.isMuted()).not.toThrow();
    expect(GA.isMuted()).toBe(false);
    window._alloGlobalMute = true;
    expect(GA.isMuted()).toBe(true);
    window.__alloIsGlobalMuted = 'not a function';
    expect(GA.isMuted()).toBe(true);
    delete window._alloGlobalMute;
    expect(GA.isMuted()).toBe(false);
  });
});

// ── Data Plot's own sound effects (playTone at file scope, outside the shared block) ──
describe('dataplot: the sound effects (plot, correct, wrong, badge ...)', () => {
  function loadPlayTone() {
    const src = read('dataplot');
    const a = src.indexOf('  var _audioCtx = null;\n  function getAC()');
    const b = src.indexOf('  function sfxPlot()', a);
    expect(a, 'playTone start').toBeGreaterThan(-1);
    expect(b, 'playTone end').toBeGreaterThan(a);
    return new Function(src.slice(a, b) + '\nreturn playTone;')(); // eslint-disable-line no-new-func
  }
  it('plays when not muted (control)', () => {
    const ac = fakeContext();
    window.StemLab = { audioContext: vi.fn(() => ac) };
    loadPlayTone()(523, 0.08, 'sine', 0.08);
    expect(ac.oscillators.length).toBe(1);
  });
  it.each(MUTES)('is silent under %s', (_label, mute) => {
    const ac = fakeContext();
    window.StemLab = { audioContext: vi.fn(() => ac) };
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    mute();
    loadPlayTone()(523, 0.08, 'sine', 0.08);
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(audio.made.length).toBe(0);
    expect(ac.oscillators.length).toBe(0);
  });
  it('a throwing __alloIsGlobalMuted does not throw and does not block the sound', () => {
    const ac = fakeContext();
    window.StemLab = { audioContext: vi.fn(() => ac) };
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    expect(() => loadPlayTone()(523, 0.08)).not.toThrow();
    expect(ac.oscillators.length).toBe(1);
  });
});

// ── Area & Perimeter: the perimeter tone plan player ──
describe('areaperimeter: playTonePlan', () => {
  beforeEach(() => { resetStemLab(); loadTool(file('areaperimeter'), 'areaPerimeter'); });
  const P = () => window.AreaPerimeterPure;
  it('plays when not muted (control)', () => {
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    const handle = P().playTonePlan(P().perimeterTonePlan([3, 5, 3, 5]));
    expect(handle).toBeTruthy();
    expect(audio.oscillators()).toBe(4);
    P().stopTones();
  });
  it.each(MUTES)('returns null and makes no sound under %s', (_label, mute) => {
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    window.StemLab.audioContext = vi.fn(() => fakeContext());
    mute();
    expect(P().playTonePlan(P().perimeterTonePlan([3, 5, 3, 5]))).toBeNull();
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(audio.made.length).toBe(0);
  });
  it('a throwing __alloIsGlobalMuted does not throw and does not block the sound', () => {
    const audio = audioCtor(); window.AudioContext = audio.Ctor;
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    let handle;
    expect(() => { handle = P().playTonePlan(P().perimeterTonePlan([3, 5])); }).not.toThrow();
    expect(handle).toBeTruthy();
    P().stopTones();
  });
});

// ── Cellular Automaton Lab: the board sound on the More-worlds tab (mounted) ──
describe('cellular: "Play each step as a note"', () => {
  let root = null;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    resetStemLab();
    loadTool(file('cellular'), 'cellularLab');
    if (window.StemLab) delete window.StemLab.audioContext;
    document.body.innerHTML = '<div id="root"></div>';
  });
  afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });
  async function mount() {
    const said = [];
    function App() {
      const [state, setState] = React.useState({ gradeBand: 'g68' });
      return window.StemLab._registry.cellularLab.render(makeCtx({ toolData: state, setToolData: setState, announceToSR: (m) => said.push(m) }));
    }
    root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(() => root.render(React.createElement(App)));
    return said;
  }
  const buttons = () => Array.from(document.querySelectorAll('button'));
  const byText = (txt) => buttons().find((b) => b.textContent.trim() === txt) || buttons().find((b) => b.textContent.includes(txt));
  const soundBtn = () => buttons().find((b) => b.textContent === 'Play each step as a note');
  async function click(el) { if (!el) throw new Error('missing element'); await React.act(() => el.click()); }
  // A recording AudioContext that notes every tone frequency.
  function rec() {
    const r = { tones: [], ctxs: 0 };
    window.AudioContext = class {
      constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; r.ctxs++; }
      createOscillator() { return { frequency: { setValueAtTime: (f) => r.tones.push(f) }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      close() { this.state = 'closed'; }
      resume() {}
    };
    return r;
  }

  it('plays a note per step when not muted (control)', async () => {
    const r = rec();
    await mount();
    await click(document.getElementById('cell-tab-worlds'));
    await click(soundBtn());
    expect(soundBtn().getAttribute('aria-pressed')).toBe('true');
    const n0 = r.tones.length;
    await click(byText('Step'));
    expect(r.tones.length).toBe(n0 + 1);
  });
  it.each(MUTES)('under %s the sound cannot be turned on and no audio context is made', async (_label, mute) => {
    const r = rec();
    mute();
    await mount();
    await click(document.getElementById('cell-tab-worlds'));
    await click(soundBtn());
    expect(soundBtn().getAttribute('aria-pressed')).toBe('false');
    await click(byText('Step'));
    expect(r.ctxs).toBe(0);
    expect(r.tones.length).toBe(0);
  });
  it.each(MUTES)('muting with %s while the sound is on silences the next steps', async (_label, mute) => {
    const r = rec();
    await mount();
    await click(document.getElementById('cell-tab-worlds'));
    await click(soundBtn());
    await click(byText('Step'));
    const n1 = r.tones.length;
    expect(n1).toBeGreaterThan(0);
    mute();
    await click(byText('Step'));
    await click(byText('Step'));
    expect(r.tones.length).toBe(n1);
  });
});

// ── Heat Lab: hear the graph, read it aloud, the ticking thermometer (mounted) ──
describe('heatlab: hearing and reading the graphs', () => {
  let cfg, host, root, previousAct;
  beforeEach(() => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    window.StemLab.makeBayViewer = () => ({ attach() {}, sync() {}, nudge() {}, zoom() {}, reset() {}, status() { return 'idle'; } });
    const contexts = new WeakMap();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (kind) {
      if (kind !== '2d') return null;
      if (!contexts.has(this)) contexts.set(this, new Proxy({
        canvas: this, measureText: (text) => ({ width: String(text).length * 7 }),
        createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
      }, { get: (target, key) => (key in target ? target[key] : () => {}) }));
      return contexts.get(this);
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    window.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    cfg = loadTool(file('heatlab'), 'heatLab');
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    if (root) React.act(() => root.unmount());
    root = null;
    host?.remove();
    delete window.StemLab.audioContext;
    delete window.matchMedia;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  });
  function mount(overrides) {
    const box = { announced: [] };
    function Panel() {
      const [toolData, setToolData] = React.useState({});
      return cfg.render(makeCtx(Object.assign({ toolData, setToolData, announceToSR: (m) => box.announced.push(m) }, overrides || {})));
    }
    React.act(() => { root = ReactDOMClient.createRoot(host); root.render(React.createElement(Panel)); });
    return box;
  }
  const click = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));

  it('plays and reads aloud when not muted (control)', async () => {
    const ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
    const spoken = fakeSpeech();
    // The hub's callTTS resolves null when it will not speak; Heat Lab then uses the device voice.
    const tts = vi.fn(() => Promise.resolve(null));
    mount({ callTTS: tts });
    click(host.querySelector('[data-ht-hear="curve"]'));
    expect(ac.oscillators.length).toBeGreaterThan(1);
    click(host.querySelector('[data-ht-read="curve"]'));
    expect(tts).toHaveBeenCalledTimes(1);
    await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(spoken.length).toBe(1);
  });

  it.each(MUTES)('under %s: no sound, no TTS, no device voice, no ticking, and it says so', async (_label, mute) => {
    const ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
    const spoken = fakeSpeech();
    const tts = vi.fn(() => Promise.resolve(null));
    mute();
    const box = mount({ callTTS: tts });
    click(host.querySelector('[data-ht-hear="mug"]'));
    click(host.querySelector('[data-ht-read="mug"]'));
    click(host.querySelector('[data-ht-tick]'));
    await React.act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(ac.oscillators.length).toBe(0);
    expect(tts).not.toHaveBeenCalled();
    expect(spoken).toEqual([]);
    expect(host.querySelector('[data-ht-tick]').getAttribute('aria-pressed')).toBe('false');
    expect(box.announced.filter((m) => /Sound is muted/.test(m)).length).toBeGreaterThanOrEqual(3);
  });
});
