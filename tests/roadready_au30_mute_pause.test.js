import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane audio (au30). Road Ready and the app mute (the host's round 29 audio gate keeps a
// tool's AudioContext suspended while the app is muted):
//  1) a drive that starts while the app is muted does not show the "Click anywhere to enable engine
//     and coaching sounds" toast, binds no unlock listeners, and keeps the one-time toast for later;
//  2) pausing while muted tells the context to suspend, so the gate does not start the engine sound
//     when the app is unmuted during the pause (it used to play until the next frame).
// Both mount the REAL tool; part 2 mounts it inside the REAL hub (pattern: tests/stem_am29_audio_gate.test.js).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';

let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- fake Web Audio: state changes at once; blocked = the browser's autoplay block (resume does nothing) ----
function makeAudio(opts) {
  opts = opts || {};
  const log = { created: [], calls: [], started: [] };
  const param = () => ({ value: 0, setValueAtTime() { return this; }, linearRampToValueAtTime() { return this; }, exponentialRampToValueAtTime() { return this; }, setTargetAtTime() { return this; }, cancelScheduledValues() { return this; } });
  function node(ctx, kind) {
    const base = {
      kind, ctx, connect(x) { return x; }, disconnect() {},
      start() { log.started.push({ ctx, kind }); }, stop() {},
      buffer: null, loop: false, type: 'sine', getChannelData: () => new Float32Array(16),
    };
    const px = new Proxy(base, { get(t, k) { if (k in t) return t[k]; if (typeof k !== 'string' || k === 'then') return undefined; t[k] = param(); return t[k]; } });
    return px;
  }
  class FakeAudioContext {
    constructor() { this._state = opts.blocked ? 'suspended' : 'running'; this.currentTime = 0; this.sampleRate = 48000; this.destination = node(this, 'destination'); log.created.push(this); }
    get state() { return this._state; }
    resume() { log.calls.push(['resume', this]); if (this._state !== 'closed' && !opts.blocked) this._state = 'running'; return Promise.resolve(); }
    suspend() { log.calls.push(['suspend', this]); if (this._state !== 'closed') this._state = 'suspended'; return Promise.resolve(); }
    close() { log.calls.push(['close', this]); this._state = 'closed'; return Promise.resolve(); }
  }
  for (const k of ['Oscillator', 'Gain', 'BiquadFilter', 'Buffer', 'BufferSource', 'DynamicsCompressor', 'StereoPanner', 'Panner', 'Convolver', 'WaveShaper', 'Delay', 'Analyser', 'ConstantSource']) {
    FakeAudioContext.prototype['create' + k] = function () { return node(this, k); };
  }
  const count = (name, ctx) => log.calls.filter((c) => c[0] === name && (!ctx || c[1] === ctx)).length;
  return { log, FakeAudioContext, count };
}

let appMuted = false;
const muteEvent = (m) => window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: m } }));
function mute() { appMuted = true; window.__alloIsGlobalMuted = () => appMuted; muteEvent(true); }
function unmute() { appMuted = false; window.__alloIsGlobalMuted = () => appMuted; muteEvent(false); }
function resetWindow() {
  appMuted = false;
  delete window.__alloIsGlobalMuted; delete window._alloGlobalMute;
  delete window.AudioContext; delete window.webkitAudioContext;
  delete window._alloflowRRAudioToastShown;
  delete window.__alloStemAudioGate;
  delete window.__testHooks;
}
const TOAST = 'Click anywhere to enable engine and coaching sounds';

describe('Road Ready: no "click to enable sound" toast while the app is muted (au30)', () => {
  let audio, mounted = [];
  async function startDrive() {
    window.__testHooks = {};
    resetStemLab();
    const config = loadTool(TOOL, 'roadReady');
    const toasts = [];
    const state = { toolData: { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, tourCompleted: true } } };
    function Host() {
      const [toolData, setToolData] = React.useState(state.toolData);
      state.toolData = toolData;
      const ctx = makeCtx({
        toolData, callTTS: () => new Promise(() => {}),
        addToast: (msg) => { toasts.push(String(msg)); },
        update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
        updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
      });
      return config.render(ctx);
    }
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); });
    mounted.push({ host, root });
    const hooks = window.__testHooks.roadReady;
    // every message the drive shows goes to the HUD alert card (eventToastRef) or the host toast
    const seen = () => toasts.concat(hooks.eventToastRef.current ? [String(hooks.eventToastRef.current.msg || '')] : []);
    const shown = [];
    await React.act(async () => { hooks.startDriving('residential', 'sedan'); });
    for (let i = 0; i < 20; i++) { await React.act(async () => { await sleep(100); }); shown.push(...seen()); }
    return { host, hooks, shown, ctx: audio.log.created[0] };
  }
  beforeEach(() => { resetWindow(); audio = makeAudio({ blocked: true }); window.AudioContext = audio.FakeAudioContext; });
  afterEach(async () => {
    for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
    mounted = [];
    resetWindow();
  });

  it('not muted, context blocked by the browser: the toast shows once and a click asks to resume (unchanged)', async () => {
    const d = await startDrive();
    expect(d.ctx, 'no AudioContext').toBeTruthy();
    expect(d.shown.some((t) => t.includes(TOAST))).toBe(true);
    expect(window._alloflowRRAudioToastShown).toBe(true);
    const before = audio.count('resume', d.ctx);
    await React.act(async () => { document.body.click(); });
    expect(audio.count('resume', d.ctx)).toBe(before + 1);
    await React.act(async () => { document.body.click(); });
    expect(audio.count('resume', d.ctx)).toBe(before + 1); // one-shot listener
  });

  it('app muted when the drive starts: no toast, no unlock listeners, and the one-time flag is not used up', async () => {
    window.__alloIsGlobalMuted = () => true;
    const d = await startDrive();
    expect(d.ctx, 'no AudioContext').toBeTruthy();
    expect(d.ctx.state).toBe('suspended');
    expect(d.shown.filter((t) => t.includes(TOAST))).toEqual([]);
    expect(window._alloflowRRAudioToastShown).toBeUndefined();
    const before = audio.count('resume', d.ctx);
    await React.act(async () => { document.body.click(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' })); });
    expect(audio.count('resume', d.ctx)).toBe(before);
  });

  it('a throwing mute function counts as not muted (the toast still shows)', async () => {
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    const d = await startDrive();
    expect(d.shown.some((t) => t.includes(TOAST))).toBe(true);
  });
});

describe('Road Ready in the real hub: pause while muted, then unmute: no engine sound (au30)', () => {
  const hubSource = () => readFileSync(HUB, 'utf8');
  const Icon = () => null;
  const flush = async (n = 4) => { for (let i = 0; i < n; i++) await React.act(async () => { await sleep(0); }); };
  let root, host, audio, getContext;
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
  async function mountHub() {
    global.React = window.React = React;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    window.__testHooks = {};
    if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
    delete window.StemLab; delete window.__stemPluginComponents;
    new Function(hubSource())();
    new Function(readFileSync(TOOL, 'utf8'))();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => root.render(React.createElement(Harness, { tool: 'roadReady', seed: { roadReady: { view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, tourCompleted: true } } })));
    await flush();
    await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
    await React.act(async () => { await sleep(400); });
    return audio.log.created.find((c) => c instanceof audio.FakeAudioContext);
  }
  beforeEach(() => {
    resetWindow();
    audio = makeAudio();
    window.AudioContext = audio.FakeAudioContext;
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [], addEventListener() {}, removeEventListener() {} });
    const fake2d = new Proxy(function () {}, {
      get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' || typeof k === 'symbol' ? undefined : k === 'length' ? 0 : fake2d),
      set: () => true, apply: () => fake2d,
    });
    getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind) { return kind === '2d' ? fake2d : null; };
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    if (host) host.remove();
    root = host = null;
    vi.unstubAllGlobals();
    if (getContext) HTMLCanvasElement.prototype.getContext = getContext;
    muteEvent(false);
    resetWindow();
  });
  const audible = (c) => c && c.state === 'running';
  const btn = (label) => [...host.querySelectorAll('button')].find((b) => (b.getAttribute('aria-label') || '') === label);

  it('the hub under test has the round 29 audio gate', () => {
    expect(hubSource()).toContain('// STEM_AUDIO_GATE_BEGIN');
  });

  it('mute, pause (focus loss), unmute: the context stays suspended and is never asked to resume; Resume drive brings it back', async () => {
    const ctx = await mountHub();
    expect(ctx, 'Road Ready made no AudioContext').toBeTruthy();
    expect(audible(ctx)).toBe(true);
    mute();
    expect(audible(ctx)).toBe(false); // the gate holds it
    await React.act(async () => { window.dispatchEvent(new Event('blur')); }); // pauseForInterruption -> togglePause(true)
    expect(btn('Resume drive'), 'the drive did not pause').toBeTruthy();
    const resumesBefore = audio.count('resume', ctx);
    unmute();
    await React.act(async () => { await sleep(200); });
    expect(audible(ctx)).toBe(false);
    expect(audio.count('resume', ctx)).toBe(resumesBefore);
    await React.act(async () => { btn('Resume drive').click(); });
    expect(audible(ctx)).toBe(true);
  });

  it('pause with the Space key while muted behaves the same', async () => {
    const ctx = await mountHub();
    mute();
    await React.act(async () => { host.querySelector('.rr-drive-shell').dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); });
    expect(btn('Resume drive'), 'the drive did not pause').toBeTruthy();
    unmute();
    await React.act(async () => { await sleep(100); });
    expect(audible(ctx)).toBe(false);
  });

  it('unpause while muted: still silent; unmute then brings the sound back', async () => {
    const ctx = await mountHub();
    await React.act(async () => { window.dispatchEvent(new Event('blur')); });
    expect(audible(ctx)).toBe(false);
    mute();
    await React.act(async () => { btn('Resume drive').click(); });
    expect(audible(ctx)).toBe(false);
    unmute();
    await React.act(async () => { await sleep(100); });
    expect(audible(ctx)).toBe(true);
  });
});
