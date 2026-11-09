// Round 26, lane skate. Skate Lab's "Speak each phase aloud" (d.narrate, OFF by default) and the
// STEAM Lab host's narration contract (round 25):
// - while Narrate is on it reports ctx.setToolVoice(true), so the header button shows narration on
//   while the header switch was never pressed, and ONE press turns it off;
// - the header switch 'off' silences the Narrate lines (the "Read the result aloud" button still speaks);
// - switching Narrate off calls ctx.stopTTS and stops its own browser voice; a late answer after a stop,
//   a close or a mute is not read by the browser fallback;
// - global mute = window.__alloIsGlobalMuted() (plus the legacy _alloGlobalMute flag).
// Both host methods are feature-detected (older hosts / Canvas pastes lack them).
// The last block mounts the REAL hub (STEM_HUB) with the REAL tool (SKATELAB_SOURCE).
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.SKATELAB_SOURCE || 'stem_lab/stem_tool_skatelab.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const KEY = 'alloflow_canvas_narrate';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); }); };
let physics, originals, synth, mounted = [];

function seed(overrides = {}) {
  return {
    skatelab: {
      mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, surfaceId: 'standard', windId: 'calm',
      riderMassKg: 62, rampDepthM: 2.4, dropHeightM: 2.4, pumpTimingId: 'bottom', landingCompressionM: 0.45,
      bodyPositionId: 'neutral', airDrag: true, pumps: 3, rotationTarget: 180, spinRate: 210, speedMph: 17,
      angleDeg: 35, gapFt: 15, pushForceN: 200, cameraAzimuth: 38, showVectors: true, showTrail: true, showEnergy: true,
      estimateChallenge: false, _predictDefaultV: 2,
      estimateValue: '', experiments: [], stats: { runs: 0, successful: 0, withinTen: 0 },
      ...overrides,
    },
  };
}
// A full model object is accepted as a legacy lastResult, so the result counts as revealed.
const withResult = (overrides = {}) => seed({ lastResult: physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 }), ...overrides });

function makeCanvasContext() {
  const gradient = { addColorStop: () => {} };
  const base = {
    setTransform() {}, createLinearGradient: () => gradient, createRadialGradient: () => gradient, fillRect() {}, clearRect() {},
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {},
    translate() {}, rotate() {}, scale() {}, setLineDash() {}, fillText() {}, strokeText() {}, rect() {}, ellipse() {},
    quadraticCurveTo() {}, bezierCurveTo() {}, measureText: () => ({ width: 40 }),
  };
  return new Proxy(base, {
    get(target, property) { return property in target ? target[property] : undefined; },
    set(target, property, value) { target[property] = value; return true; },
  });
}

async function mount(initial, ctxOverrides = {}) {
  resetStemLab();
  const config = loadTool(TOOL, 'skatelab');
  physics = physics || window.__alloSkatePhysicsPure;
  const state = { latest: null };
  function Host() {
    const [toolData, setToolData] = React.useState(typeof initial === 'function' ? initial() : initial);
    state.latest = toolData;
    return config.render(makeCtx({ toolData, setToolData, ...ctxOverrides }));
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state };
  mounted.push(m);
  return m;
}
const unmount = async (m) => { await React.act(async () => { m.root.unmount(); }); m.host.remove(); mounted = mounted.filter((x) => x !== m); };
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const click = async (el) => { await React.act(async () => { el.click(); }); await flush(); };
const announcer = (host) => host.querySelector('[data-skatelab-announcer]').textContent;
function deferredTTS() {
  const pending = [];
  const fn = vi.fn((text, voice, speed, opts) => new Promise((resolve) => { pending.push({ text, opts, resolve }); }));
  fn.pending = pending;
  return fn;
}

beforeAll(() => {
  // physics helpers are exposed by the tool file on load
  resetStemLab();
  loadTool(TOOL, 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});
beforeEach(() => {
  originals = {
    getContext: HTMLCanvasElement.prototype.getContext,
    rect: HTMLCanvasElement.prototype.getBoundingClientRect,
    matchMedia: window.matchMedia,
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => makeCanvasContext());
  HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 450, top: 0, left: 0, right: 800, bottom: 450 }));
  // Reduced motion: runs finish at once and step-through (Next phase) is shown.
  window.matchMedia = vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  synth = { speak: vi.fn(), cancel: vi.fn() };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  try { localStorage.removeItem(KEY); } catch (e) {}
  delete window.__alloIsGlobalMuted;
  delete window._alloGlobalMute;
});
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  HTMLCanvasElement.prototype.getContext = originals.getContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originals.rect;
  window.matchMedia = originals.matchMedia;
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  delete window.__alloIsGlobalMuted;
  delete window._alloGlobalMute;
  try { localStorage.removeItem(KEY); } catch (e) {}
  vi.restoreAllMocks();
});

describe('Skate Lab reports its Narrate voice to the host (sv26)', () => {
  it('Narrate is off by default and reports false; ticking reports true, unticking false, unmount false', async () => {
    const setToolVoice = vi.fn();
    const m = await mount(withResult(), { setToolVoice });
    expect(m.host.querySelector('#sk-narrate').checked).toBe(false);
    expect(setToolVoice).toHaveBeenCalled();
    expect(setToolVoice.mock.calls.every((c) => c[0] === false)).toBe(true);
    await click(m.host.querySelector('#sk-narrate'));
    expect(m.state.latest.skatelab.narrate).toBe(true);
    expect(setToolVoice).toHaveBeenLastCalledWith(true);
    await click(m.host.querySelector('#sk-narrate'));
    expect(setToolVoice).toHaveBeenLastCalledWith(false);
    await click(m.host.querySelector('#sk-narrate'));
    expect(setToolVoice).toHaveBeenLastCalledWith(true);
    await unmount(m);
    expect(setToolVoice).toHaveBeenLastCalledWith(false);
  });
});

describe('Skate Lab Narrate and the header switch (sv26)', () => {
  it('header switch unset or on: Narrate lines are still sent with { force: true } (nobody loses narration)', async () => {
    for (const value of [null, 'on']) {
      if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY);
      const callTTS = vi.fn(() => Promise.resolve('blob:voice'));
      const m = await mount(withResult({ narrate: true }), { callTTS });
      await click(buttonByText(m.host, 'Next phase →'));
      expect(callTTS).toHaveBeenCalledTimes(1);
      expect(callTTS.mock.calls[0][0]).toMatch(/^Step 2 of/);
      expect(callTTS.mock.calls[0][3]).toEqual({ force: true });
      expect(m.host.querySelector('#sk-narrate-header-off')).toBeNull();
      await unmount(m);
    }
  });
  it("header switch 'off': Narrate lines are silent (no host call, no browser voice); Read the result aloud still speaks", async () => {
    localStorage.setItem(KEY, 'off');
    const callTTS = vi.fn(() => Promise.resolve(null));
    const m = await mount(withResult({ narrate: true }), { callTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(callTTS).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(announcer(m.host)).toContain('Step 2 of');
    await click(buttonByText(m.host, 'Read the result aloud'));
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(callTTS.mock.calls[0][3]).toEqual({ force: true });
    // the host answered null: the browser voice reads the button's line
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
  it("header switch 'off': the Narrate box says why it is silent (visible note + described-by + announced on tick)", async () => {
    localStorage.setItem(KEY, 'off');
    const m = await mount(withResult());
    expect(m.host.querySelector('#sk-narrate-header-off')).toBeNull();
    await click(m.host.querySelector('#sk-narrate'));
    const note = m.host.querySelector('#sk-narrate-header-off');
    expect(note).not.toBeNull();
    expect(note.textContent).toContain('Narration is turned off in the STEAM Lab header');
    expect(m.host.querySelector('#sk-narrate').getAttribute('aria-describedby')).toBe('sk-narrate-header-off');
    expect(announcer(m.host)).toContain('Narration is turned off in the STEAM Lab header');
  });
  it("browser voice only (no ctx.callTTS): header 'off' also silences Narrate", async () => {
    localStorage.setItem(KEY, 'off');
    const m = await mount(withResult({ narrate: true }), { callTTS: null });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(synth.speak).not.toHaveBeenCalled();
    localStorage.removeItem(KEY);
    await click(buttonByText(m.host, 'Next phase →'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
  it("header pressed to 'off' while the tool's own browser voice reads a Narrate line: it is cancelled on the next render", async () => {
    const m = await mount(withResult({ narrate: true }), { callTTS: null });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    localStorage.setItem(KEY, 'off');
    await click(buttonByText(m.host, 'Next phase →'));
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });
});

describe('Skate Lab stops its voice (sv26)', () => {
  it('Narrate unticked: ctx.stopTTS, its own browser voice cancelled, and a late answer is not read by the fallback', async () => {
    const stopTTS = vi.fn();
    const callTTS = deferredTTS();
    const m = await mount(withResult({ narrate: true }), { callTTS, stopTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(callTTS.pending).toHaveLength(1);
    await click(m.host.querySelector('#sk-narrate'));
    expect(m.state.latest.skatelab.narrate).toBe(false);
    expect(stopTTS).toHaveBeenCalledTimes(1);
    await React.act(async () => { callTTS.pending[0].resolve(null); });
    await flush();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('Narrate unticked while the browser voice reads a line: cancelled', async () => {
    const m = await mount(withResult({ narrate: true }), { callTTS: null });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    await click(m.host.querySelector('#sk-narrate'));
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('closed while a line is being made: the answer (null after the host stop) is not read by the browser', async () => {
    const callTTS = deferredTTS();
    const m = await mount(withResult({ narrate: true }), { callTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    const line = callTTS.pending[0];
    await unmount(m);
    await React.act(async () => { line.resolve(null); });
    await flush();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('older host without stopTTS / setToolVoice: Narrate on/off works without errors', async () => {
    const m = await mount(withResult(), { stopTTS: undefined, setToolVoice: undefined, callTTS: vi.fn(() => Promise.resolve('blob:v')) });
    await click(m.host.querySelector('#sk-narrate'));
    expect(m.state.latest.skatelab.narrate).toBe(true);
    await click(m.host.querySelector('#sk-narrate'));
    expect(m.state.latest.skatelab.narrate).toBe(false);
  });
});

describe('Skate Lab obeys the app mute window.__alloIsGlobalMuted() (sv26)', () => {
  it('muted: no Narrate line, no Read-aloud line, no browser voice; the button says speech is muted', async () => {
    window.__alloIsGlobalMuted = () => true;
    const callTTS = vi.fn(() => Promise.resolve(null));
    const m = await mount(withResult({ narrate: true }), { callTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    await click(buttonByText(m.host, 'Read the result aloud'));
    expect(callTTS).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
    expect(announcer(m.host)).toContain('Speech is muted in the app.');
  });
  it('muted: the run cannot be played as sound', async () => {
    window.__alloIsGlobalMuted = () => true;
    const m = await mount(withResult());
    await click(buttonByText(m.host, 'Hear this run as sound'));
    expect(announcer(m.host)).toContain('Sound is muted');
  });
  it('mute pressed while a line is being made: the null answer is not read by the browser fallback', async () => {
    const callTTS = deferredTTS();
    const m = await mount(withResult({ narrate: true }), { callTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    window.__alloIsGlobalMuted = () => true;
    await React.act(async () => { callTTS.pending[0].resolve(null); });
    await flush();
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('legacy window._alloGlobalMute still mutes', async () => {
    window._alloGlobalMute = true;
    const callTTS = vi.fn(() => Promise.resolve('blob:v'));
    const m = await mount(withResult({ narrate: true }), { callTTS });
    await click(buttonByText(m.host, 'Next phase →'));
    expect(callTTS).not.toHaveBeenCalled();
  });
});

describe('real hub + real Skate Lab: the header narration button (sv26)', () => {
  const Icon = () => null;
  let root, host, tts, audios, api;
  function Harness({ seed: initial }) {
    const [stemLabTool, setStemLabTool] = React.useState('skatelab');
    const [stemLabTab, setStemLabTab] = React.useState('explore');
    const [labToolData, setLabToolData] = React.useState(initial);
    api = { setStemLabTool, labToolData };
    const base = {
      labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
      stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
      activeStation: null, callGemini: null, callTTS: tts, isTeacherMode: false,
    };
    const props = new Proxy(base, {
      get(target, key) {
        if (key in target) return target[key];
        if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
        if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
        return undefined;
      },
    });
    return window.AlloModules.StemLab(props);
  }
  const narrBtn = () => host.querySelector('[aria-label="Toggle canvas narration TTS"]');
  async function mountHub(initial) {
    global.React = window.React = React;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    delete window.StemLab; delete window.__stemPluginComponents;
    new Function(readFileSync(HUB, 'utf8'))();
    new Function(readFileSync(TOOL, 'utf8'))();
    host = document.createElement('div');
    document.body.append(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Harness, { seed: initial })));
    await flush();
  }
  beforeEach(() => {
    audios = [];
    tts = vi.fn(() => Promise.resolve('blob:sk'));
    vi.stubGlobal('Audio', function (src) { this.src = src; this.play = vi.fn(() => Promise.resolve()); this.pause = vi.fn(); audios.push(this); });
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    host?.remove(); root = host = null;
    vi.unstubAllGlobals();
  });
  const spokenSteps = () => tts.mock.calls.map((c) => c[0]).filter((t) => /^Step \d+ of/.test(t));

  it('never pressed, Narrate off (the default): header says Mute, not pressed', async () => {
    await mountHub(withResult());
    expect(host.querySelector('#sk-narrate')).not.toBeNull();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
  });
  it('never pressed, Narrate on: header pressed/"TTS", and the phase is spoken and played', async () => {
    await mountHub(withResult({ narrate: true }));
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    expect(narrBtn().textContent).toContain('TTS');
    await click(buttonByText(host, 'Next phase →'));
    expect(spokenSteps()).toHaveLength(1);
    expect(audios).toHaveLength(1);
  });
  it('ONE header press from the default stops the line playing and silences Narrate (label then Mute)', async () => {
    await mountHub(withResult({ narrate: true }));
    await click(buttonByText(host, 'Next phase →'));
    expect(audios).toHaveLength(1);
    await click(narrBtn());
    expect(localStorage.getItem(KEY)).toBe('off');
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
    expect(audios[0].pause).toHaveBeenCalled();
    await click(buttonByText(host, 'Next phase →'));
    expect(spokenSteps()).toHaveLength(1);
    expect(audios).toHaveLength(1);
    expect(synth.speak).not.toHaveBeenCalled();
    expect(host.querySelector('#sk-narrate-header-off')).not.toBeNull();
  });
  it('Narrate unticked in Skate Lab: header back to Mute and the playing line is paused', async () => {
    await mountHub(withResult({ narrate: true }));
    await click(buttonByText(host, 'Next phase →'));
    expect(audios).toHaveLength(1);
    await click(host.querySelector('#sk-narrate'));
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(audios[0].pause).toHaveBeenCalled();
  });
  it('tool closed while a line plays: the host stops it', async () => {
    await mountHub(withResult({ narrate: true }));
    await click(buttonByText(host, 'Next phase →'));
    expect(audios).toHaveLength(1);
    await React.act(async () => { api.setStemLabTool(null); });
    await flush();
    expect(host.querySelector('#sk-narrate')).toBeNull();
    expect(audios[0].pause).toHaveBeenCalled();
  });
});
