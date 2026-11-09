// Round 23 lane `host`: ctx.callTTS's { force: true } means "speak although narration is off"
// in the STEAM Lab hub, but the TTS module reads opts.force as "skip the cache". Every speak
// button that passed it made a new cloud request on every press. The REAL hub is mounted (as
// tests/stem_listen_host.test.js does) with the REAL tts_module.js callTTS as its prop and a
// stubbed Gemini fetch. STEM_HUB points the suite at a hub copy.
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
let root, host, toolCtx, rawTTS, fetchMock, played, blobN;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness() {
  const [stemLabTool, setStemLabTool] = React.useState('base10');
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  const base = {
    labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: null, callGemini: null, callTTS: rawTTS, isTeacherMode: false,
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
async function mount() {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
  await flush();
  expect(toolCtx && typeof toolCtx.callTTS, 'tool did not get ctx.callTTS').toBe('function');
}

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  new Function(readFileSync(HUB, 'utf8'))();
  new Function(readFileSync(resolve(REPO, 'tts_module.js'), 'utf8'))();
  if (typeof window.AlloModules.createTTS !== 'function') throw new Error('createTTS did not register');
  window.StemLab.registerTool('base10', {
    label: 'Speak Demo', icon: 'x', desc: 'Demo tool', category: 'math',
    render: (ctx) => { toolCtx = ctx; return React.createElement('p', null, 'Coral polyps build reefs.'); },
  });
});
beforeEach(() => {
  localStorage.clear(); // narration off: the state in which tools pass { force: true }
  delete window._alloGlobalMute;
  window.__alloTtsTrace = [];
  played = []; blobN = 0;
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { data: 'AQI=' } }] } }] }) }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: vi.fn(() => 'blob:hd23-' + (++blobN)), revokeObjectURL: vi.fn() }));
  vi.stubGlobal('Audio', function (src) { played.push(src); this.play = () => Promise.resolve(); });
  const { callTTS } = window.AlloModules.createTTS({
    state: { queue: [], botQueue: [], urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'canvas-injected-key', GEMINI_MODELS: { tts: 'test-tts-model' }, AVAILABLE_VOICES: ['Kore', 'Puck'],
    _isCanvasEnv: true, languageToTTSCode: () => 'en', isGlobalMuted: () => false, warnLog: () => {}, debugLog: () => {},
    getLeveledTextLanguage: () => 'English', getCurrentUiLanguage: () => 'English', getAiUserConfig: () => ({}),
    getAi: () => null, getSelectedVoice: () => 'Kore', setShowKokoroOfferModal: () => {},
  });
  rawTTS = vi.fn((...args) => callTTS(...args));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.unstubAllGlobals();
  delete window._kokoroTTS; delete window._piperTTS;
});

describe('ctx.callTTS { force: true } (a student pressed a speak button)', () => {
  it('a repeat press plays the cached audio: one cloud request, not one per press', async () => {
    await mount();
    const a = await toolCtx.callTTS('Coral polyps build reefs.', null, null, { force: true });
    const b = await toolCtx.callTTS('Coral polyps build reefs.', null, null, { force: true });
    const c = await toolCtx.callTTS('Coral polyps build reefs.', null, null, { force: true });
    expect(a).toBe('blob:hd23-1');
    expect([b, c]).toEqual([a, a]);
    expect(fetchMock, 'each press re-synthesised').toHaveBeenCalledTimes(1);
    expect(played).toEqual([a, a, a]); // still spoken every time
  });
  it('still speaks with narration off, and without force narration-off still means silence', async () => {
    await mount();
    await expect(toolCtx.callTTS('Narrate me')).resolves.toBeNull();
    expect(rawTTS).not.toHaveBeenCalled();
    await expect(toolCtx.callTTS('Speak button', undefined, 1, { force: true })).resolves.toBe('blob:hd23-1');
    expect(rawTTS).toHaveBeenCalledTimes(1);
  });
  it('drops only force: other options reach callTTS, and the caller\'s object is not changed', async () => {
    await mount();
    const opts = { force: true, language: 'Spanish', priority: 'interactive' };
    await toolCtx.callTTS('Hola', null, 1, opts);
    expect(rawTTS.mock.calls[0][3]).toEqual({ language: 'Spanish', priority: 'interactive' });
    expect(opts).toEqual({ force: true, language: 'Spanish', priority: 'interactive' });
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    await toolCtx.callTTS('Hola', null, 1, 1); // narration on: a numeric retry count still passes through
    expect(rawTTS.mock.calls[1][3]).toBe(1);
  });
  it('a different text, voice or language is still synthesised fresh (they are in the cache key)', async () => {
    await mount();
    await toolCtx.callTTS('Same words.', null, null, { force: true });
    await toolCtx.callTTS('Same words.', 'Puck', null, { force: true });
    await toolCtx.callTTS('Same words.', null, null, { force: true, language: 'Spanish' });
    await toolCtx.callTTS('Other words.', null, null, { force: true });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await toolCtx.callTTS('Same words.', null, 1.5, { force: true }); // speed is a playback rate, not in the audio
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
