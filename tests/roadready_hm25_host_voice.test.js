import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 25, lane host. Road Ready's instructor and the STEAM Lab host:
// - it reports its default-on voice with ctx.setToolVoice, so the header narration button
//   shows narration on while the switch was never pressed, and one press silences it;
// - "Instructor voice" off and global mute call ctx.stopTTS, which stops a line already
//   playing (the host owns that Audio). Both are feature-detected: an older host (a Canvas
//   paste) has neither, and the tool must still work there.
// The last block mounts the REAL hub (STEM_HUB) with the REAL tool (ROADREADY_SOURCE).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];

async function mount(roadReady, extraCtx) {
  window.__testHooks = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const calls = [];
  const callTTS = vi.fn((text, voice, speed, opts) => { calls.push({ text, opts }); return new Promise(() => {}); });
  const state = { toolData: { roadReady } };
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    const ctx = makeCtx(Object.assign({
      toolData,
      callTTS,
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    }, extraCtx || {}));
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, calls, callTTS, state };
  mounted.push(m);
  return m;
}
const unmount = async (m) => { await React.act(async () => { m.root.unmount(); }); m.host.remove(); mounted = mounted.filter((x) => x !== m); };
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

beforeEach(() => {
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
  delete window.__alloIsGlobalMuted;
  delete window.__alloStudentAiDisabled;
});
afterEach(async () => {
  for (const m of mounted) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); }
  mounted = [];
  delete window.__testHooks;
  delete window.__alloIsGlobalMuted;
  delete window.__alloStudentAiDisabled;
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
});

describe('Road Ready reports its own voice to the host (hm25)', () => {
  it('on by default: setToolVoice(true); its own switch off: false; unmount: false', async () => {
    const setToolVoice = vi.fn();
    const m = await mount({ view: 'menu', tourCompleted: true }, { setToolVoice });
    expect(setToolVoice).toHaveBeenLastCalledWith(true);
    await React.act(async () => { m.host.querySelector('input[data-rr-instructor-voice]').click(); });
    expect(m.state.toolData.roadReady.instructorVoice).toBe(false);
    expect(setToolVoice).toHaveBeenLastCalledWith(false);
    await React.act(async () => { m.host.querySelector('input[data-rr-instructor-voice]').click(); });
    expect(setToolVoice).toHaveBeenLastCalledWith(true);
    await unmount(m);
    expect(setToolVoice).toHaveBeenLastCalledWith(false);
  });
  it('saved with the voice off: reports false from the start', async () => {
    const setToolVoice = vi.fn();
    await mount({ view: 'menu', tourCompleted: true, instructorVoice: false }, { setToolVoice });
    expect(setToolVoice).toHaveBeenCalled();
    expect(setToolVoice.mock.calls.every((c) => c[0] === false)).toBe(true);
  });
});

describe('Road Ready stops the line already playing with ctx.stopTTS (hm25)', () => {
  it('Instructor voice switched off mid-drive: ctx.stopTTS and the existing abort; no global device-voice cancel (the host stops its own speech)', async () => {
    window.__alloStudentAiDisabled = true;
    const cancel = vi.fn();
    const prevSynth = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, writable: true, value: { cancel, speak: vi.fn() } });
    try {
      const stopTTS = vi.fn();
      const m = await mount({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true }, { stopTTS });
      await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
      await React.act(async () => { await sleep(1300); });
      const belt = m.calls.find((c) => c.text === 'Fasten your seatbelt before driving.');
      expect(belt).toBeTruthy();
      await React.act(async () => { buttonByText(m.host, 'More').click(); });
      cancel.mockClear(); stopTTS.mockClear();
      await React.act(async () => { buttonByText(m.host, 'Instructor voice: On').click(); });
      expect(stopTTS).toHaveBeenCalled();
      expect(belt.opts.signal.aborted).toBe(true);
      // Round 30: speechSynthesis.cancel() is global (it would cut Listen mode or AlloBot); with ctx.stopTTS
      // the host cancels only its own utterances, so the tool leaves the device voice to it.
      expect(cancel).not.toHaveBeenCalled();
    } finally {
      if (prevSynth) Object.defineProperty(window, 'speechSynthesis', prevSynth); else delete window.speechSynthesis;
    }
  });
  it('Accessibility checkbox off: ctx.stopTTS', async () => {
    const stopTTS = vi.fn();
    const m = await mount({ view: 'menu', tourCompleted: true }, { stopTTS });
    await React.act(async () => { m.host.querySelector('input[data-rr-instructor-voice]').click(); });
    expect(stopTTS).toHaveBeenCalledTimes(1);
  });
  it('global mute (alloflow-mute-changed, muted): ctx.stopTTS; unmute does not call it', async () => {
    const stopTTS = vi.fn();
    await mount({ view: 'menu', tourCompleted: true }, { stopTTS });
    await React.act(async () => { window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: false } })); });
    expect(stopTTS).not.toHaveBeenCalled();
    await React.act(async () => { window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } })); });
    expect(stopTTS).toHaveBeenCalledTimes(1);
  });
  it('older host without stopTTS / setToolVoice: switch and mute still work without errors', async () => {
    const m = await mount({ view: 'menu', tourCompleted: true }, { stopTTS: undefined, setToolVoice: undefined });
    await React.act(async () => { window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } })); });
    await React.act(async () => { m.host.querySelector('input[data-rr-instructor-voice]').click(); });
    expect(m.state.toolData.roadReady.instructorVoice).toBe(false);
  });
});

describe('real hub + real Road Ready: the header narration button (hm25)', () => {
  const Icon = () => null;
  let root, host, tts, audios;
  function Harness({ seed }) {
    const [stemLabTool, setStemLabTool] = React.useState('roadReady');
    const [stemLabTab, setStemLabTab] = React.useState('explore');
    const [labToolData, setLabToolData] = React.useState(seed);
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
  const flush = async () => { for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); }); };
  const narrBtn = () => host.querySelector('[aria-label="Toggle canvas narration TTS"]');
  const click = async (el) => { await React.act(async () => { el.click(); }); await flush(); };
  async function mountHub(seed) {
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
    await React.act(async () => root.render(React.createElement(Harness, { seed })));
    await flush();
  }
  beforeEach(() => {
    audios = [];
    tts = vi.fn(() => Promise.resolve('blob:rr'));
    vi.stubGlobal('Audio', function (src) { this.src = src; this.play = vi.fn(() => Promise.resolve()); this.pause = vi.fn(); audios.push(this); });
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    host?.remove(); root = host = null;
    vi.unstubAllGlobals();
  });
  const pledgeSeed = { roadReady: { view: 'driverPledge', driverName: 'Sam' } };
  const PLEDGE_LINE = 'Pledge signed. Thank you for committing to safe driving.';

  it('never pressed: the button says narration is on, and the instructor speaks', async () => {
    await mountHub(pledgeSeed);
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    expect(narrBtn().textContent).toContain('TTS');
    await click(buttonByText(host, '✍️ Sign the Pledge'));
    expect(tts.mock.calls.map((c) => c[0])).toContain(PLEDGE_LINE);
  });
  it('ONE press from the default silences the instructor (and the label then says Mute)', async () => {
    await mountHub(pledgeSeed);
    await click(narrBtn());
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('off');
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
    await click(buttonByText(host, '✍️ Sign the Pledge'));
    expect(tts.mock.calls.map((c) => c[0])).not.toContain(PLEDGE_LINE);
    expect(audios).toHaveLength(0);
  });
  it('Instructor voice off in Road Ready: the header goes back to Mute (nothing speaks by itself)', async () => {
    await mountHub({ roadReady: { view: 'menu', tourCompleted: true } });
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    await click(host.querySelector('input[data-rr-instructor-voice]'));
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
  });
});
