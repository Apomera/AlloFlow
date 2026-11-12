import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Round 29, lane host: one app-mute gate for every STEAM Lab sound (STEM_AUDIO_GATE in the hub), and
// stemBeep accepting beep() / beep('correct'). Most tools never check the app mute
// (window.__alloIsGlobalMuted, event alloflow-mute-changed); the gate suspends their AudioContexts and
// force-mutes their media instead. Part 1 runs the gate block alone on fake classes; part 2 runs the
// hub's stemBeep alone; part 3 mounts the REAL hub with real tools.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const TOOL_DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const hubSource = () => readFileSync(HUB, 'utf8');
function gateSource() {
  const s = hubSource();
  const a = s.indexOf('// STEM_AUDIO_GATE_BEGIN'), b = s.indexOf('// STEM_AUDIO_GATE_END');
  return a < 0 || b < 0 ? '' : s.slice(a, b);
}

// ---- fake Web Audio: state changes at once; "audible" = state running ----
function makeAudio() {
  const log = { created: [], calls: [], started: [], stops: [] };
  const param = () => ({ value: 0, setValueAtTime() { return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; }, setTargetAtTime() { return this; }, cancelScheduledValues() { return this; }, cancelAndHoldAtTime() { return this; }, setValueCurveAtTime() { return this; } });
  function node(ctx, kind) {
    const base = {
      kind, ctx, connect(x) { return x; }, disconnect() {},
      start(...a) { log.started.push({ ctx, kind, node: px, freq: px.frequency && px.frequency.value, at: a[0] }); },
      stop(...a) { log.stops.push({ ctx, kind, node: px, args: a }); },
      buffer: null, loop: false, type: 'sine', curve: null, stream: { getTracks: () => [] },
      getChannelData: () => new Float32Array(16), getFloatFrequencyData() {}, getByteFrequencyData() {}, getByteTimeDomainData() {}, getFloatTimeDomainData() {},
    };
    const px = new Proxy(base, { get(t, k) { if (k in t) return t[k]; if (typeof k !== 'string' || k === 'then') return undefined; t[k] = param(); return t[k]; } });
    return px;
  }
  class FakeAudioContext {
    constructor(opts) { this.opts = opts; this._state = 'running'; this.currentTime = 0; this.sampleRate = 48000; this.destination = node(this, 'destination'); this.listener = node(this, 'listener'); log.created.push(this); }
    get state() { return this._state; }
    resume() { log.calls.push(['resume', this]); if (this._state !== 'closed') this._state = 'running'; return Promise.resolve(); }
    suspend() { log.calls.push(['suspend', this]); if (this._state !== 'closed') this._state = 'suspended'; return Promise.resolve(); }
    close() { log.calls.push(['close', this]); this._state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve(node(this, 'buffer')); }
  }
  for (const k of ['Oscillator', 'Gain', 'BiquadFilter', 'Buffer', 'BufferSource', 'DynamicsCompressor', 'StereoPanner', 'Panner', 'Convolver', 'WaveShaper', 'Delay', 'Analyser', 'ConstantSource', 'ChannelMerger', 'ChannelSplitter', 'PeriodicWave', 'MediaStreamSource', 'MediaStreamDestination', 'MediaElementSource', 'ScriptProcessor', 'IIRFilter']) {
    FakeAudioContext.prototype['create' + k] = function () { return node(this, k); };
  }
  class FakeOfflineAudioContext {
    constructor() { this._state = 'suspended'; log.created.push(this); }
    get state() { return this._state; }
    resume() { log.calls.push(['offline-resume', this]); this._state = 'running'; return Promise.resolve(); }
    suspend() { log.calls.push(['offline-suspend', this]); return Promise.resolve(); }
    startRendering() { return Promise.resolve({}); }
  }
  const count = (name, ctx) => log.calls.filter((c) => c[0] === name && (!ctx || c[1] === ctx)).length;
  return { log, FakeAudioContext, FakeOfflineAudioContext, count };
}

// ---- app mute, as AlloFlowANTI.txt does it: the function first, then the event ----
let appMuted = false;
const muteEvent = (m) => window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: m } }));
function mute() { appMuted = true; window.__alloIsGlobalMuted = () => appMuted; muteEvent(true); }
function unmute() { appMuted = false; window.__alloIsGlobalMuted = () => appMuted; muteEvent(false); }

const MP = window.HTMLMediaElement.prototype;
const ORIG_PLAY = MP.play;
const ORIG_MUTED = Object.getOwnPropertyDescriptor(MP, 'muted');
const realMuted = (el) => ORIG_MUTED.get.call(el);
function restoreMedia() { MP.play = ORIG_PLAY; Object.defineProperty(MP, 'muted', ORIG_MUTED); }

let audio, gate, closeLab;
function freshGate({ open = true, offline = true } = {}) {
  delete window.__alloStemAudioGate;
  restoreMedia();
  // jsdom has no play(); a stand-in that "starts" the element.
  MP.play = function () { Object.defineProperty(this, 'paused', { configurable: true, value: false }); return Promise.resolve(); };
  audio = makeAudio();
  window.AudioContext = audio.FakeAudioContext;
  delete window.webkitAudioContext;
  if (offline) window.OfflineAudioContext = audio.FakeOfflineAudioContext; else delete window.OfflineAudioContext;
  new Function(gateSource())();
  gate = window.__alloStemAudioGate;
  closeLab = open && gate && gate.open ? gate.open() : null;
  return gate;
}
function cleanup() {
  try { if (closeLab) closeLab(); } catch (e) {}
  closeLab = null;
  appMuted = false; muteEvent(false);
  delete window.__alloIsGlobalMuted; delete window._alloGlobalMute;
  delete window.AudioContext; delete window.webkitAudioContext; delete window.OfflineAudioContext;
  restoreMedia();
}

describe('gate: AudioContexts follow the app mute (am29)', () => {
  beforeEach(() => { cleanup(); freshGate(); });
  afterEach(cleanup);

  it('the hub has the gate block', () => {
    expect(gateSource()).toContain('__alloStemAudioGate');
    expect(typeof (gate && gate.sync)).toBe('function');
  });

  it('mute suspends every running context; unmute resumes them', async () => {
    const a = new window.AudioContext(), b = new window.AudioContext();
    expect([a.state, b.state]).toEqual(['running', 'running']);
    mute();
    expect([a.state, b.state]).toEqual(['suspended', 'suspended']);
    unmute();
    expect([a.state, b.state]).toEqual(['running', 'running']);
  });

  it("a tool's resume() while muted resolves without resuming; remembered for unmute", async () => {
    const asked = new window.AudioContext(), never = new window.AudioContext();
    asked._state = 'suspended'; never._state = 'suspended'; // autoplay policy: suspended until a gesture
    mute();
    const p = asked.resume();
    expect(p && typeof p.then).toBe('function');
    await expect(p).resolves.toBeUndefined();
    expect(asked.state).toBe('suspended');
    for (let i = 0; i < 5; i++) await asked.resume(); // a frame loop asking every frame
    expect(asked.state).toBe('suspended');
    unmute();
    expect(asked.state).toBe('running');
    expect(never.state).toBe('suspended'); // nobody asked: not started by the unmute
  });

  it('a context the tool suspended itself stays suspended across mute and unmute', () => {
    const paused = new window.AudioContext(), playing = new window.AudioContext();
    paused.suspend();
    mute(); unmute();
    expect(paused.state).toBe('suspended');
    expect(playing.state).toBe('running');
    // ...and one the tool suspends while muted is not resumed either
    mute(); playing.suspend(); unmute();
    expect(playing.state).toBe('suspended');
    // the tool's own resume works again once unmuted
    playing.resume();
    expect(playing.state).toBe('running');
  });

  it('a context created while muted starts suspended and resumes on unmute', () => {
    mute();
    const c = new window.AudioContext();
    expect(c.state).toBe('suspended');
    unmute();
    expect(c.state).toBe('running');
  });

  it('a sound told to stop while muted is stopped at once (no burst of queued beeps on unmute)', () => {
    const c = new window.AudioContext();
    const before = c.createOscillator(); before.start(); before.stop(c.currentTime + 0.2);
    expect(audio.log.stops.at(-1).args).toEqual([0.2]);
    mute();
    const beep = c.createOscillator(); beep.start(); beep.stop(c.currentTime + 0.15);
    expect(audio.log.stops.at(-1).node).toBe(beep);
    expect(audio.log.stops.at(-1).args).toEqual([0]);
    const clip = c.createBufferSource(); clip.start(); clip.stop(1.5);
    expect(audio.log.stops.at(-1).args).toEqual([0]);
    const drone = c.createOscillator(); drone.start(); // continuous: not stopped, plays after unmute
    expect(audio.log.stops.some((s) => s.node === drone)).toBe(false);
    unmute();
    const after = c.createOscillator(); after.start(); after.stop(c.currentTime + 0.1);
    expect(audio.log.stops.at(-1).args).toEqual([0.1]);
  });

  it('contexts with a stream node (mic, recording, export) keep running', () => {
    const mic = new window.AudioContext();
    mic.createMediaStreamSource({});
    mute();
    expect(mic.state).toBe('running');
    expect(audio.count('suspend', mic)).toBe(0);
    const exp = new window.AudioContext(); // e.g. the app's audio export, made while muted
    expect(exp.state).toBe('suspended');
    exp.createMediaStreamDestination();
    expect(exp.state).toBe('running');
    exp.resume();
    expect(exp.state).toBe('running');
    unmute();
    expect(mic.state).toBe('running');
  });

  it('keeps instanceof, constructor options, subclasses and the webkit alias', () => {
    cleanup();
    const pre = makeAudio();
    const before = new pre.FakeAudioContext(); // made before the hub loaded
    window.AudioContext = pre.FakeAudioContext; window.webkitAudioContext = pre.FakeAudioContext;
    delete window.__alloStemAudioGate; restoreMedia();
    new Function(gateSource())();
    closeLab = window.__alloStemAudioGate.open();
    expect(window.AudioContext).not.toBe(pre.FakeAudioContext); // wrapped
    expect(window.webkitAudioContext).toBe(window.AudioContext);
    const c = new window.AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
    expect(c.opts).toEqual({ latencyHint: 'interactive', sampleRate: 44100 });
    expect(c instanceof window.AudioContext).toBe(true);
    expect(c instanceof pre.FakeAudioContext).toBe(true);
    expect(before instanceof window.AudioContext).toBe(true);
    expect(Object.getPrototypeOf(c)).toBe(pre.FakeAudioContext.prototype);
    expect(window.AudioContext.prototype).toBe(pre.FakeAudioContext.prototype);
    class ToolCtx extends window.AudioContext { hello() { return 'hi'; } }
    const t = new ToolCtx();
    expect(t.hello()).toBe('hi');
    expect(t instanceof window.AudioContext).toBe(true);
    expect(() => window.AudioContext()).toThrow(); // still needs new
    mute();
    expect([c.state, t.state, before.state]).toEqual(['suspended', 'suspended', 'running']); // `before`: untracked
    unmute();
    expect([c.state, t.state]).toEqual(['running', 'running']);
  });

  it('leaves OfflineAudioContext alone', async () => {
    const O = window.OfflineAudioContext;
    const off = new O();
    mute();
    await off.resume();
    expect(off.state).toBe('running');
    expect(window.OfflineAudioContext).toBe(O);
    expect(audio.count('offline-suspend')).toBe(0);
  });

  it('only contexts created while the lab is open are gated', () => {
    closeLab(); closeLab = null;
    const outside = new window.AudioContext();
    mute();
    expect(outside.state).toBe('running');
    outside.suspend(); outside.resume();
    expect(outside.state).toBe('running'); // its resume is not held either
    unmute();
  });

  it('a second load of the hub does not wrap twice', () => {
    const ctor = window.AudioContext, play = MP.play, mutedDesc = Object.getOwnPropertyDescriptor(MP, 'muted');
    new Function(gateSource())();
    new Function(gateSource())();
    expect(window.AudioContext).toBe(ctor);
    expect(MP.play).toBe(play);
    expect(Object.getOwnPropertyDescriptor(MP, 'muted').get).toBe(mutedDesc.get);
    const c = new window.AudioContext();
    mute();
    expect(audio.count('suspend', c)).toBe(1);
    unmute();
    expect(audio.count('resume', c)).toBe(1);
  });

  it('reads the live mute: legacy flag or a muted app without an event', () => {
    const c = new window.AudioContext();
    c._state = 'suspended';
    window._alloGlobalMute = true;   // no event at all
    c.resume();
    expect(c.state).toBe('suspended');
    delete window._alloGlobalMute;
    c.resume();
    expect(c.state).toBe('running');
    window.__alloIsGlobalMuted = () => { throw new Error('x'); }; // throwing = not muted, nothing escapes
    expect(() => c.resume()).not.toThrow();
    expect(c.state).toBe('running');
  });

  it('a closed context is dropped and never resumed', () => {
    const c = new window.AudioContext();
    mute();
    c.close();
    unmute();
    expect(c.state).toBe('closed');
    expect(audio.count('resume', c)).toBe(0);
  });
});

describe('gate: media elements are force-muted while the app is muted (am29)', () => {
  beforeEach(() => { cleanup(); freshGate(); });
  afterEach(() => { document.body.innerHTML = ''; cleanup(); });

  it('play() while muted plays silently; the tool reads back its own muted; unmute restores', async () => {
    mute();
    const a = new Audio('x.mp3');
    await a.play();
    expect(a.paused).toBe(false);       // still plays (ended still fires, video still moves)
    expect(realMuted(a)).toBe(true);    // but silently
    expect(a.muted).toBe(false);        // the tool sees its own setting
    unmute();
    expect(realMuted(a)).toBe(false);
  });

  it('an element playing at mute time is muted; a muted=true set during the mute is kept', async () => {
    const a = new Audio('loop.mp3'), b = new Audio('b.mp3');
    await a.play(); await b.play();
    expect(realMuted(a)).toBe(false);
    mute();
    expect(realMuted(a)).toBe(true);
    b.muted = true;                     // the tool's own toggle while the app is muted
    a.muted = false;
    expect(realMuted(a)).toBe(true);    // cannot unmute itself
    unmute();
    expect(realMuted(a)).toBe(false);
    expect(realMuted(b)).toBe(true);
  });

  it('DOM <audio>/<video> in the page are muted while the lab is open', () => {
    document.body.innerHTML = '<audio id="amb" autoplay></audio><video id="v" muted></video>';
    const amb = document.getElementById('amb'), v = document.getElementById('v');
    v.muted = true;
    mute();
    expect(realMuted(amb)).toBe(true);
    unmute();
    expect(realMuted(amb)).toBe(false);
    expect(realMuted(v)).toBe(true);
  });

  it('media the lab never played, while the lab is closed, is left alone', async () => {
    closeLab(); closeLab = null;
    const a = new Audio('app.mp3');
    await a.play();
    mute();
    expect(realMuted(a)).toBe(false);
    unmute();
  });
});

// ---- stemBeep alone (it is cut out and run on its own by stem_hub_beep_shared_context too) ----
function extractBalanced(src, openAt) {
  let depth = 0, q = null, lc = false, bc = false;
  for (let i = openAt; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (lc) { if (c === '\n') lc = false; continue; }
    if (bc) { if (c === '*' && n === '/') { bc = false; i++; } continue; }
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && n === '/') { lc = true; i++; continue; }
    if (c === '/' && n === '*') { bc = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('unbalanced');
}
function loadBeep(win) {
  const src = hubSource();
  const m = /function stemBeep\s*\(/.exec(src);
  const open = src.indexOf('{', m.index);
  const sandbox = { window: win, Promise };
  runInNewContext(src.slice(m.index, open) + extractBalanced(src, open) + '\nthis.beep = stemBeep;', sandbox);
  return sandbox.beep;
}
function beepRig() {
  const notes = [];
  const ctx = {
    currentTime: 10, destination: {}, state: 'running',
    createOscillator() { const o = { frequency: {}, type: '', connect() {}, start() { o.started = true; notes.push(o); }, stop(t) { o.stopAt = t; } }; return o; },
    createGain() { const g = { gain: { value: 0, exponentialRampToValueAtTime(v, t) { g.rampTo = t; } }, connect() {} }; ctxGain.push(g); return g; },
  };
  const ctxGain = [];
  const win = { StemLab: { audioContext: () => ctx } };
  const beep = loadBeep(win);
  const last = () => { const o = notes.at(-1); const g = ctxGain.at(-1); return o && { freq: o.frequency.value, dur: +(o.stopAt - 10).toFixed(4), vol: g.gain.value }; };
  return { win, beep, notes, last };
}

describe('stemBeep: names and a missing frequency play; numbers are unchanged (am29)', () => {
  it('numeric calls give exactly the old note', () => {
    const r = beepRig();
    r.beep(523, 0.08, 0.1); expect(r.last()).toEqual({ freq: 523, dur: 0.08, vol: 0.1 });
    r.beep(784, 0.15); expect(r.last()).toEqual({ freq: 784, dur: 0.15, vol: 0.12 });
    r.beep(440); expect(r.last()).toEqual({ freq: 440, dur: 0.15, vol: 0.12 });
    r.beep('660', 0.1, 0.1); expect(r.last()).toEqual({ freq: '660', dur: 0.1, vol: 0.1 }); // numeric string: as before
    expect(r.notes).toHaveLength(4);
  });
  it('beep() (Nuclear Lab x39, Heat Lab x13, ...) plays a soft click', () => {
    const r = beepRig();
    r.beep();
    expect(r.last()).toEqual({ freq: 880, dur: 0.05, vol: 0.06 });
  });
  it('named beeps map to modest notes', () => {
    const r = beepRig();
    const got = {};
    for (const n of ['click', 'tick', 'correct', 'success', 'complete', 'wrong', 'error', 'incorrect', 'WRONG', 'whatever', 'constructor']) { r.beep(n); got[n] = r.last(); }
    expect(got.click).toEqual({ freq: 880, dur: 0.05, vol: 0.06 });
    expect(got.tick).toEqual({ freq: 1200, dur: 0.03, vol: 0.05 });
    expect(got.correct).toEqual({ freq: 784, dur: 0.15, vol: 0.1 });
    expect(got.success).toEqual(got.correct);
    expect(got.complete).toEqual({ freq: 1047, dur: 0.3, vol: 0.1 });
    expect(got.wrong).toEqual({ freq: 220, dur: 0.18, vol: 0.08 });
    expect(got.error).toEqual(got.wrong);
    expect(got.incorrect).toEqual(got.wrong);
    expect(got.WRONG).toEqual(got.wrong);
    expect(got.whatever).toEqual(got.click);
    expect(got.constructor).toEqual(got.click);
    for (const v of Object.values(got)) expect(v.vol).toBeLessThanOrEqual(0.1);
  });
  it('a name keeps a duration / volume the caller gives', () => {
    const r = beepRig();
    r.beep('correct', 0.3, 0.05);
    expect(r.last()).toEqual({ freq: 784, dur: 0.3, vol: 0.05 });
  });
  it('muted: names and missing frequency stay silent too', () => {
    const r = beepRig();
    r.win.__alloIsGlobalMuted = () => true;
    r.beep(); r.beep('correct'); r.beep(523, 0.1, 0.1);
    expect(r.notes).toHaveLength(0);
  });
});

// ---- the real hub with real tools (pattern: tests/roadready_hm25_host_voice.test.js) ----
describe('real hub + real tools: their sound stops on mute and comes back on unmute (am29)', () => {
  let loadTool, resetStemLab, React, ReactDOMClient;
  beforeAll(async () => {
    const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
    ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  });
  const Icon = () => null;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const flush = async (n = 4) => { for (let i = 0; i < n; i++) await React.act(async () => { await sleep(0); }); };
  let root, host;
  function Harness({ tool, seed }) {
    const [stemLabTool, setStemLabTool] = React.useState(tool);
    const [stemLabTab, setStemLabTab] = React.useState('explore');
    const [labToolData, setLabToolData] = React.useState(seed);
    const base = {
      labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
      stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
      activeStation: null, callGemini: null, callTTS: () => new Promise(() => {}), isTeacherMode: false,
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
  async function mountHub(toolFile, tool, seed) {
    global.React = window.React = React;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    window.__testHooks = {};
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    delete window.StemLab; delete window.__stemPluginComponents;
    new Function(hubSource())();
    new Function(readFileSync(path.join(TOOL_DIR, toolFile), 'utf8'))();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Harness, { tool, seed })));
    await flush();
  }
  beforeEach(() => {
    cleanup();
    delete window.__alloStemAudioGate; // a fresh gate wraps this test's fake (a real page loads the hub once)
    audio = makeAudio();
    window.AudioContext = audio.FakeAudioContext;
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], addEventListener() {}, removeEventListener() {} });
    // jsdom has no 2D canvas; Moon Mission draws on mount. Any call / property returns the stub.
    const fake2d = new Proxy(function () {}, {
      get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' || typeof k === 'symbol' ? undefined : k === 'length' ? 0 : fake2d),
      set: () => true, apply: () => fake2d,
    });
    getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind) { return kind === '2d' ? fake2d : null; };
  });
  let getContext;
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    host?.remove(); root = host = null;
    vi.unstubAllGlobals();
    if (getContext) HTMLCanvasElement.prototype.getContext = getContext;
    delete window.__testHooks;
    cleanup();
  });
  const audible = (c) => c && c.state === 'running';
  const btn = (label) => [...host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === label);

  it('Road Ready: engine on; mute silences it through its frame loop; unmute brings it back', async () => {
    await mountHub('stem_tool_roadready.js', 'roadReady', { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, tourCompleted: true } });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(400); });
    const ctx = audio.log.created.find((c) => c instanceof audio.FakeAudioContext);
    expect(ctx, 'Road Ready made no AudioContext').toBeTruthy();
    expect(audible(ctx)).toBe(true);
    expect(audio.log.started.some((s) => s.ctx === ctx), 'no engine source started').toBe(true);
    mute();
    expect(audible(ctx)).toBe(false);
    // Its frame loop (11369) and updateAudio (16870) call resume() whenever the context is suspended
    // (the loop does not run in jsdom, so do it here) and a click fires its autoplay-unlock resume.
    for (let i = 0; i < 5; i++) await ctx.resume();
    await React.act(async () => { document.body.click(); await sleep(100); });
    expect(audible(ctx)).toBe(false);
    unmute();
    expect(audible(ctx)).toBe(true);
    await React.act(async () => { await sleep(100); });
    expect(audible(ctx)).toBe(true);
  });

  it('Road Ready: paused (its own ctx.suspend on focus loss), then mute and unmute: its audio stays off', async () => {
    await mountHub('stem_tool_roadready.js', 'roadReady', { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, tourCompleted: true } });
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(400); });
    const ctx = audio.log.created.find((c) => c instanceof audio.FakeAudioContext);
    expect(audible(ctx)).toBe(true);
    await React.act(async () => { window.dispatchEvent(new Event('blur')); }); // pauseForInterruption: togglePause + ctx.suspend()
    expect(btn('Resume drive'), 'the drive did not pause').toBeTruthy();
    expect(audio.count('suspend', ctx)).toBe(1);
    expect(audible(ctx)).toBe(false);
    mute();
    unmute();
    await React.act(async () => { await sleep(200); });
    expect(audible(ctx)).toBe(false);
    expect(audio.count('resume', ctx)).toBe(0);
    ctx.resume(); // what its frame loop does once the drive is resumed (the loop does not run in jsdom)
    expect(audible(ctx)).toBe(true);
  });

  it('Moon Mission: the launch rumble (shared host context) stops on mute and comes back', async () => {
    await mountHub('stem_tool_moonmission.js', 'moonMission', { moonMission: { missionPhase: 1, soundOff: true } });
    const toggle = host.querySelector('[data-moonmission-sound-toggle]');
    expect(toggle, 'no sound toggle').toBeTruthy();
    await React.act(async () => { toggle.click(); });
    await flush();
    const shared = window.StemLab._sharedAudioContext;
    expect(shared, 'no shared context').toBeTruthy();
    expect(audio.log.started.some((s) => s.ctx === shared && s.kind === 'BufferSource'), 'no ambient started').toBe(true);
    expect(audible(shared)).toBe(true);
    mute();
    expect(audible(shared)).toBe(false);
    unmute();
    expect(audible(shared)).toBe(true);
  });

  it('Baking Science: its own new AudioContext per click is born suspended while muted, and the click is dropped', async () => {
    const bench = () => host.querySelector('[data-baking-kitchen-bench] button');
    await mountHub('stem_tool_bakingscience.js', 'bakingScience', { bakingScience: {} });
    expect(bench(), 'no kitchen bench button').toBeTruthy();
    await React.act(async () => { bench().click(); });
    const first = audio.log.created.at(-1);
    expect(audible(first)).toBe(true);
    expect(audio.log.stops.at(-1).args[0]).toBeGreaterThan(0); // scheduled normally
    await React.act(async () => root.unmount()); host.remove();
    mute();
    expect(audible(first)).toBe(false);
    await mountHub('stem_tool_bakingscience.js', 'bakingScience', { bakingScience: {} });
    const n = audio.log.created.length;
    await React.act(async () => { bench().click(); });
    expect(audio.log.created.length).toBe(n + 1);
    const second = audio.log.created.at(-1);
    expect(audible(second)).toBe(false);              // born suspended
    expect(audio.log.stops.at(-1).ctx).toBe(second);
    expect(audio.log.stops.at(-1).args).toEqual([0]); // the click is dropped, not saved for the unmute
    unmute();
    expect(audible(first)).toBe(true);
  });

  it('Nuclear Lab: beep() with no frequency now clicks through the host, and is silent when muted', async () => {
    await mountHub('stem_tool_nuclearlab.js', 'nuclearLab', {});
    const ref = [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'All topics & routes');
    expect(ref, 'no All topics & routes button').toBeTruthy();
    await React.act(async () => { ref.click(); });
    await flush();
    const routes = () => [...host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Routes & display.'));
    expect(routes(), 'no Routes & display button').toBeTruthy();
    const n0 = audio.log.started.length;
    await React.act(async () => { routes().click(); });
    const notes = audio.log.started.slice(n0).filter((s) => s.kind === 'Oscillator');
    expect(notes.map((s) => s.freq)).toContain(880);
    mute();
    const n1 = audio.log.started.length;
    await React.act(async () => { routes().click(); });
    expect(audio.log.started.length).toBe(n1);
  });
});
