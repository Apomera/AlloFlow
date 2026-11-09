// Round 25 lane `host`: speech the STEAM Lab hub plays for tools.
// 1. Every hub mute check honours the app's real mute, window.__alloIsGlobalMuted() (the old
//    _alloGlobalMute flag is no longer set by the app): ctx.callTTS, the student-AI-off device
//    voice, canvasNarrate.
// 2. The header narration button tells the truth: a tool whose own voice speaks while the
//    switch has never been pressed (Road Ready) reports it with ctx.setToolVoice, the button then
//    shows narration on, and one press turns it off.
// 3. ctx.stopTTS() stops what the hub started for the tool (its Audio, relayed requests, its own
//    device-voice utterances only); tool switch / close and global mute do the same.
// The REAL hub is mounted as tests/stem_listen_host.test.js does. STEM_HUB points at a hub copy.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 30000 });
const REPO = process.cwd();
const require = createRequire(resolve(REPO, 'tests/x.js'));
const React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';

const Icon = () => null;
let root, host, api, ctxs, tts, audios, synth, spoken, toolVoice;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness({ tool }) {
  const [stemLabTool, setStemLabTool] = React.useState(tool || 'base10');
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  api = { setStemLabTool };
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
async function mount(tool) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { tool })));
  await flush();
}
const ctx = (id) => ctxs[id || 'base10'];
const narrBtn = () => host.querySelector('[aria-label="Toggle canvas narration TTS"]');
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); }); await flush(); };
function deferred() { let res; const p = new Promise((r) => { res = r; }); return { p, res }; }
const setMuted = (m) => { window.__alloIsGlobalMuted = () => m; };
const fireMute = async (m) => { setMuted(m); await act(async () => { window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: m } })); }); };

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  new Function(readFileSync(HUB, 'utf8'))();
  const reg = (id) => window.StemLab.registerTool(id, {
    label: id + ' demo', icon: 'x', desc: 'Demo tool', category: 'math',
    render: (c) => {
      ctxs[id] = c;
      // Like Road Ready: report the tool's own voice from an effect, clear it on unmount.
      React.useEffect(() => {
        if (!toolVoice[id] || typeof c.setToolVoice !== 'function') return undefined;
        c.setToolVoice(true);
        return () => c.setToolVoice(false);
      }, []);
      return React.createElement('p', null, id + ' body');
    },
  });
  reg('base10'); reg('fractions');
});
beforeEach(() => {
  localStorage.clear();
  delete window._alloGlobalMute; delete window.__alloIsGlobalMuted; delete window.__alloStudentAiDisabled;
  ctxs = {}; audios = []; spoken = []; toolVoice = {};
  tts = vi.fn(() => Promise.resolve('blob:hm25'));
  vi.stubGlobal('Audio', function (src) { this.src = src; this.play = vi.fn(() => Promise.resolve()); this.pause = vi.fn(); audios.push(this); });
  synth = { speaking: false, pending: false, speak: vi.fn((u) => spoken.push(u)), cancel: vi.fn(), getVoices: () => [], addEventListener() {}, removeEventListener() {} };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.unstubAllGlobals();
  delete window.__alloIsGlobalMuted; delete window.__alloStudentAiDisabled;
  localStorage.clear();
});

describe('Fix 1: the hub honours the app mute, __alloIsGlobalMuted()', () => {
  it('student AI off + muted: a forced line is neither fetched nor read by the device voice', async () => {
    window.__alloStudentAiDisabled = true;
    tts = vi.fn(() => Promise.resolve(null)); // student AI off: no cloud URL
    setMuted(true);
    await mount();
    await expect(ctx().callTTS('Fasten your seatbelt.', null, 1, { force: true })).resolves.toBeNull();
    expect(synth.speak).not.toHaveBeenCalled();
    setMuted(false);
    await ctx().callTTS('Fasten your seatbelt.', null, 1, { force: true });
    expect(synth.speak).toHaveBeenCalledTimes(1); // unmuted: the device voice still reads it
    setMuted(true);
    synth.speak.mockClear();
    await ctx().callTTS('Again.', null, 1, { force: true });
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('narration on + muted: an automatic line goes nowhere', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    setMuted(true);
    await mount();
    await expect(ctx().callTTS('Auto line')).resolves.toBeNull();
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
  });
  it('canvasNarrate (narration on, and speak: true) is silent while muted, live region kept', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    setMuted(true);
    await mount();
    await act(async () => { ctx().canvasNarrate('demo', 'launch', 'Rocket launched'); ctx().canvasNarrate('demo', 'land', 'Landed', { speak: true }); });
    await flush();
    expect(tts).not.toHaveBeenCalled();
    setMuted(false);
    await act(async () => { ctx().canvasNarrate('demo', 'orbit', 'In orbit'); });
    await flush();
    expect(tts).toHaveBeenCalledWith('In orbit');
    expect(audios.map((a) => a.src)).toEqual(['blob:hm25']);
  });
  it('muted while a line was being made: the answer is not played', async () => {
    const d = deferred();
    tts = vi.fn(() => d.p);
    await mount();
    const p = ctx().callTTS('Slow line', null, 1, { force: true });
    setMuted(true);
    d.res('blob:late');
    await expect(p).resolves.toBeNull();
    expect(audios).toHaveLength(0);
  });
  it('the legacy _alloGlobalMute flag still counts', async () => {
    window._alloGlobalMute = true;
    await mount();
    await expect(ctx().callTTS('x', null, 1, { force: true })).resolves.toBeNull();
    expect(tts).not.toHaveBeenCalled();
  });
});

describe('Fix 2: the header narration button describes what will happen', () => {
  it('never pressed, ordinary tool: off ("Mute"), and one press turns narration on', async () => {
    await mount();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
    await click(narrBtn());
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('on');
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    expect(narrBtn().textContent).toContain('TTS');
  });
  it('never pressed, tool with its own voice: shows on, and ONE press writes off and stops its audio', async () => {
    toolVoice.base10 = true;
    await mount();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    expect(narrBtn().textContent).toContain('TTS');
    expect(narrBtn().getAttribute('title')).toBe('This tool reads aloud by default — click to turn narration off');
    await ctx().callTTS('Instructor line', null, 1, { force: true });
    expect(audios).toHaveLength(1);
    await click(narrBtn());
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('off');
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
    expect(audios[0].pause).toHaveBeenCalled();
    await click(narrBtn());
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('on');
  });
  it('the tool voice counts only while the switch is unset, and only for the open tool', async () => {
    toolVoice.base10 = true;
    await mount();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    await act(async () => api.setStemLabTool('fractions'));
    await flush();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false'); // base10 unmounted and cleared it
    await act(async () => api.setStemLabTool('base10'));
    await flush();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('true');
    await act(async () => ctx().setToolVoice(false)); // the tool's own switch turned off
    await flush();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
  });
  it('switch set to off by someone: a tool voice does not make it read on', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'off');
    toolVoice.base10 = true;
    await mount();
    expect(narrBtn().getAttribute('aria-pressed')).toBe('false');
    expect(narrBtn().textContent).toContain('Mute');
  });
  it('the new title is a literal _stemTxt key with an English fallback', () => {
    const src = readFileSync(HUB, 'utf8');
    expect(src).toContain("_stemTxt(t('stem.narration.tool_voice_title'), 'stem.narration.tool_voice_title', 'This tool reads aloud by default");
  });
});

describe('Fix 3: ctx.stopTTS and stopping on close / switch / mute', () => {
  it('stopTTS pauses the audio the hub started for the tool', async () => {
    await mount();
    expect(typeof ctx().stopTTS).toBe('function');
    await ctx().callTTS('Line one', null, 1, { force: true });
    expect(audios).toHaveLength(1);
    ctx().stopTTS();
    expect(audios[0].pause).toHaveBeenCalled();
    expect(synth.cancel).not.toHaveBeenCalled(); // no device voice of ours: AlloBot / Listen untouched
  });
  it('a tool signal is relayed: stopTTS aborts the request and drops its answer; the tool signal is untouched', async () => {
    const d = deferred();
    tts = vi.fn(() => d.p);
    await mount();
    const tool = new AbortController();
    const p = ctx().callTTS('Long line', null, 1, { force: true, signal: tool.signal });
    const sent = tts.mock.calls[0][3];
    expect(sent.signal).toBeInstanceOf(AbortSignal);
    expect(sent.signal).not.toBe(tool.signal);
    expect('force' in sent).toBe(false);
    ctx().stopTTS();
    expect(sent.signal.aborted).toBe(true);
    expect(tool.signal.aborted).toBe(false);
    d.res('blob:late');
    await expect(p).resolves.toBeNull();
    expect(audios).toHaveLength(0);
  });
  it('the tool aborting its own signal still aborts the request', async () => {
    tts = vi.fn(() => new Promise(() => {}));
    await mount();
    const tool = new AbortController();
    ctx().callTTS('Line', null, 1, { signal: tool.signal, force: true });
    tool.abort();
    expect(tts.mock.calls[0][3].signal.aborted).toBe(true);
  });
  it('no tool signal: none is added (requests can still join), and stopTTS drops the answer', async () => {
    const d = deferred();
    tts = vi.fn(() => d.p);
    await mount();
    const p = ctx().callTTS('Line', null, 1, { force: true, language: 'Spanish' });
    expect(tts.mock.calls[0][3]).toEqual({ language: 'Spanish' });
    ctx().stopTTS();
    d.res('blob:late');
    await expect(p).resolves.toBeNull();
    expect(audios).toHaveLength(0);
    await expect(ctx().callTTS('Next', null, 1, { force: true })).resolves.toBe('blob:late'); // later lines play
    expect(audios).toHaveLength(1);
  });
  it('device voice: stopTTS cancels it only while the hub\'s own utterance is queued', async () => {
    window.__alloStudentAiDisabled = true;
    tts = vi.fn(() => Promise.resolve(null));
    await mount();
    await ctx().callTTS('Device line', null, 1, { force: true });
    expect(spoken).toHaveLength(1);
    synth.cancel.mockClear();
    ctx().stopTTS();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    ctx().stopTTS(); // nothing of ours left
    expect(synth.cancel).not.toHaveBeenCalled();
    await ctx().callTTS('Short line', null, 1, { force: true });
    spoken[1].onend(); // finished on its own
    synth.cancel.mockClear();
    ctx().stopTTS();
    expect(synth.cancel).not.toHaveBeenCalled();
  });
  it('switching tools stops the old tool\'s audio and drops its pending answer, not the new tool\'s', async () => {
    const d = deferred();
    await mount();
    await ctx().callTTS('Playing', null, 1, { force: true });
    tts = vi.fn(() => d.p);
    await act(async () => { root.render(React.createElement(Harness, {})); });
    const pending = ctxs.base10.callTTS('Pending', null, 1, { force: true });
    await act(async () => api.setStemLabTool('fractions'));
    await flush();
    expect(audios[0].pause).toHaveBeenCalled();
    d.res('blob:old');
    await expect(pending).resolves.toBeNull();
    expect(audios).toHaveLength(1);
    tts = vi.fn(() => Promise.resolve('blob:new'));
    await act(async () => { root.render(React.createElement(Harness, {})); });
    await expect(ctx('fractions').callTTS('New tool', null, 1, { force: true })).resolves.toBe('blob:new');
    expect(audios).toHaveLength(2);
    expect(audios[1].pause).not.toHaveBeenCalled();
  });
  it('canvasNarrate: an answer that arrives after the tool closed is not played', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    const d = deferred();
    tts = vi.fn(() => d.p);
    await mount();
    await act(async () => { ctx().canvasNarrate('demo', 'closeTest', 'Close test line'); });
    await flush();
    expect(tts).toHaveBeenCalledWith('Close test line');
    await act(async () => api.setStemLabTool('fractions'));
    await flush();
    await act(async () => { d.res('blob:late'); await d.p; });
    await flush();
    expect(audios).toHaveLength(0);
  });
  it('closing the Lab stops its audio', async () => {
    await mount();
    await ctx().callTTS('Playing', null, 1, { force: true });
    await act(async () => root.unmount());
    root = null;
    expect(audios[0].pause).toHaveBeenCalled();
  });
  it('global mute (alloflow-mute-changed) pauses audio already playing', async () => {
    await mount();
    await ctx().callTTS('Playing', null, 1, { force: true });
    await fireMute(true);
    expect(audios[0].pause).toHaveBeenCalled();
  });
});
