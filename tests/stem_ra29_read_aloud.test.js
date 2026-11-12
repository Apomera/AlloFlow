import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 29, lane read. The STEAM Lab host's ctx.callTTS(text, voice, speed, opts) speaks only with
// opts.force (a student pressed a speak button) or with the header narration switch set to 'on' (it
// starts unset = off), returns null while the app is muted even with force, and plays the clip itself.
// Speak buttons that sent no force were silent by default; two tools also played the host's clip a
// second time; Universe cancelled ALL speech (Listen mode, AlloBot) on play / pause / scrub.
// Every case mounts the REAL hub (STEM_HUB) with the REAL tool (STEM_TOOL_DIR) and presses the button.
// The raw app callTTS is a stub that answers with a clip URL (or null: no voice came back).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
let React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Icon = () => null;
let root = null, host = null, tts, audios, speech, toasts;

function stubCanvas() {
  const noop = () => {};
  const ctx2d = new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'canvas') return document.createElement('canvas');
      if (k === 'measureText') return () => ({ width: 10 });
      if (/^(create|get)/.test(String(k))) return () => new Proxy({}, { get: () => noop });
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((type) => (/2d/.test(type) ? ctx2d : null));
}

let lastHarness = null;
// Unmounts and renders the same harness again WITHOUT re-running the scripts (module caches kept).
async function remount() {
  await React.act(async () => root.unmount());
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(lastHarness)));
  await flush();
}
async function mountHub(file, id, seed) {
  function Harness() {
    const [stemLabTool, setStemLabTool] = React.useState(id);
    const [labToolData, setLabToolData] = React.useState(seed);
    const base = {
      labToolData, setLabToolData, toolSnapshots: [], addToast: (m, k) => toasts.push([m, k]), t: () => undefined,
      stemLabTool, setStemLabTool, stemLabTab: 'explore', setStemLabTab: () => {}, setShowStemLab: () => {}, showStemLab: true,
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
  global.React = window.React = React;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  delete window.StemLab; delete window.__stemPluginComponents;
  new Function(readFileSync(HUB, 'utf8'))();
  new Function(readFileSync(path.join(DIR, 'stem_tool_' + file + '.js'), 'utf8'))();
  lastHarness = Harness;
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(Harness)));
  await flush();
}
const flush = async () => { for (let i = 0; i < 5; i++) await React.act(async () => { await sleep(0); }); };
const visible = (el) => { const c = el.cloneNode(true); c.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove()); return c.textContent.trim(); };
function findButton(match) {
  const all = [...host.querySelectorAll('button')];
  return all.find((b) => (typeof match === 'function' ? match(b) : (b.textContent.trim() === match || visible(b) === match || b.getAttribute('aria-label') === match)));
}
async function press(match) {
  const b = typeof match === 'string' && match.startsWith('[') ? host.querySelector(match) : findButton(match);
  expect(b, 'button ' + match).toBeTruthy();
  await React.act(async () => { b.click(); });
  await flush();
}
const played = () => audios.filter((a) => a.play.mock.calls.length > 0);
const ttsTexts = () => tts.mock.calls.map((c) => String(c[0]));

beforeEach(() => {
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
  delete window.__alloIsGlobalMuted; delete window._alloGlobalMute; delete window.__alloStudentAiDisabled;
  delete window._kokoroTTS;
  audios = []; toasts = [];
  speech = { spoken: [], cancel: vi.fn(), speak: vi.fn((u) => { speech.spoken.push(u.text); }), getVoices: () => [], speaking: false, pending: false };
  vi.stubGlobal('speechSynthesis', speech);
  vi.stubGlobal('SpeechSynthesisUtterance', function (text) { this.text = text; });
  vi.stubGlobal('Audio', function (src) { this.src = src; this.play = vi.fn(() => Promise.resolve()); this.pause = vi.fn(); audios.push(this); });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  tts = vi.fn(() => Promise.resolve('blob:clip'));
  stubCanvas();
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.__alloIsGlobalMuted; delete window._alloGlobalMute; delete window.__alloStudentAiDisabled;
  try { localStorage.removeItem('alloflow_canvas_narrate'); } catch (e) {}
  if (window._universeTimeLapse) { clearInterval(window._universeTimeLapse); window._universeTimeLapse = null; }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// [label, file, tool id, seed, button, expected spoken text (substring)]
const algebraSeed = () => ({ algebraCAS: { tab: 'solve', expression: '3(x - 2) = 15' } });
// Universe: the scene card (an inspected object in the present-day sky) has its own Read aloud button.
const universeSeed = () => ({ universe: { sceneInspect: { kind: 'grid' } } });
const sceneRead = (b) => b.textContent.trim() === '🔊 Read aloud' && !b.hasAttribute('aria-pressed');
const CASES = [
  ['Universe: scene card Read aloud', 'universe', 'universe', universeSeed(), sceneRead, 'Expanding grid'],
  ['Oratory: Show Model', 'oratory', 'oratory', { oratory: {} }, '🎯 Show Model', 'Hello, my name is Alex'],
  ['Semiconductor: Read (band gap)', 'semiconductor', 'semiconductor', { semiconductor: {} }, '🔊 Read', 'band gap'],
  ['Trajectory Computing: Read desk summary aloud', 'trajectorycomputing', 'trajectoryComputing', { trajectoryComputing: {} }, 'Read desk summary aloud', ''],
  ['Decomposer: Read aloud', 'decomposer', 'decomposer', { decomposer: {} }, 'Read aloud', ''],
];

describe('speak buttons reach the host voice with the narration switch never pressed (ra29)', () => {
  it.each(CASES)('%s: one request, the host plays ONE clip', async (_l, file, id, seed, button, text) => {
    await mountHub(file, id, seed);
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBeNull();
    await press(button);
    expect(tts).toHaveBeenCalledTimes(1);
    if (text) expect(ttsTexts()[0]).toContain(text);
    // force is for the hub's gate only: it is not forwarded to the app's TTS (it means "skip the cache" there).
    const opts = tts.mock.calls[0][3];
    expect(opts && opts.force).toBeFalsy();
    expect(played()).toHaveLength(1);
    expect(played()[0].src).toBe('blob:clip');
    expect(speech.spoken).toEqual([]);
  });

  it.each(CASES)('%s: app muted -> no request, no clip, no device voice', async (_l, file, id, seed, button) => {
    await mountHub(file, id, seed);
    window.__alloIsGlobalMuted = () => true;
    await press(button);
    await flush();
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
    expect(speech.spoken).toEqual([]);
  });
});

describe('AlgebraCAS (ra29)', () => {
  it('Read the steps aloud: forced request, ONE clip (the tool no longer replays the host URL)', async () => {
    await mountHub('algebracas', 'algebraCAS', algebraSeed());
    await press('▶ Solve');
    tts.mockClear();
    await press('🔊 Read the steps aloud');
    expect(tts).toHaveBeenCalledTimes(1);
    expect(ttsTexts()[0]).toContain('3x minus 6 equals 15');
    expect(played()).toHaveLength(1);
  });
  it('narration switch on: still ONE clip (before: the host clip plus the tool\'s own new Audio(url))', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    await mountHub('algebracas', 'algebraCAS', algebraSeed());
    await press('▶ Solve');
    await press('🔊 Read the steps aloud');
    expect(tts).toHaveBeenCalledTimes(1);
    expect(audios).toHaveLength(1);
  });
  it('no voice came back (null): the device voice reads it once; muted: nothing at all', async () => {
    tts = vi.fn(() => Promise.resolve(null));
    await mountHub('algebracas', 'algebraCAS', algebraSeed());
    await press('▶ Solve');
    await press('🔊 Read the steps aloud');
    expect(speech.spoken).toHaveLength(1);
    expect(speech.spoken[0]).toContain('3x minus 6 equals 15');
    speech.spoken.length = 0;
    window.__alloIsGlobalMuted = () => true;
    await press('🔊 Read the steps aloud');
    expect(speech.spoken).toEqual([]);
    expect(audios).toHaveLength(0);
  });
  it('the rule pill keeps one border radius (8px; the duplicate 99px key is gone)', () => {
    const src = readFileSync(path.join(DIR, 'stem_tool_algebracas.js'), 'utf8');
    const line = src.split('\n').find((l) => l.includes("ruleM ? h('span', { style: { padding: '2px 6px'"));
    expect(line).toBeTruthy();
    expect(line.match(/borderRadius:/g)).toHaveLength(1);
    expect(line).toContain("borderRadius: '8px'");
  });
});

describe('Oratory (ra29)', () => {
  it('narration switch on: ONE clip (before: the host clip plus new Audio(audioUrl))', async () => {
    localStorage.setItem('alloflow_canvas_narrate', 'on');
    await mountHub('oratory', 'oratory', { oratory: {} });
    await press('🎯 Show Model');
    expect(tts).toHaveBeenCalledTimes(1);
    expect(audios).toHaveLength(1);
  });
  it('muted: says the sound is muted, not "Could not generate speech model"', async () => {
    await mountHub('oratory', 'oratory', { oratory: {} });
    window.__alloIsGlobalMuted = () => true;
    await press('🎯 Show Model');
    const msgs = toasts.map((x) => x[0]).join(' | ');
    expect(msgs).not.toContain('Could not generate speech model');
    expect(msgs).toMatch(/muted/i);
  });
});

describe('Universe (ra29)', () => {
  it('play / pause / continue / scrub do not cancel speech the tool did not start (Listen, AlloBot)', async () => {
    await mountHub('universe', 'universe', { universe: {} });
    const play = () => findButton((b) => /^(Play|Pause) cosmic timeline playback$/.test(b.getAttribute('aria-label') || ''));
    expect(play(), 'play button').toBeTruthy();
    await React.act(async () => { play().click(); });
    await flush();
    await React.act(async () => { play().click(); });
    await flush();
    const range = host.querySelector('input[type="range"]');
    if (range) {
      await React.act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(range, String(Number(range.max || 100) / 2));
        range.dispatchEvent(new Event('input', { bubbles: true }));
        range.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await flush();
    }
    expect(speech.cancel).not.toHaveBeenCalled();
  });
  it('a pause stops the tool\'s own device-voice line (and only then cancels)', async () => {
    tts = vi.fn(() => Promise.resolve(null));
    await mountHub('universe', 'universe', universeSeed());
    await press(sceneRead);
    expect(speech.spoken).toHaveLength(1);
    speech.cancel.mockClear();
    const play = () => findButton((b) => /^(Play|Pause) cosmic timeline playback$/.test(b.getAttribute('aria-label') || ''));
    await React.act(async () => { play().click(); });
    await flush();
    await React.act(async () => { play().click(); });
    await flush();
    expect(speech.cancel).toHaveBeenCalledTimes(1);
  });
  it('the source has no automatic global cancel left in stopSpeech', () => {
    const src = readFileSync(path.join(DIR, 'stem_tool_universe.js'), 'utf8');
    expect(src).not.toContain('function stopSpeech() { try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {} }');
  });
});

describe('Space Colony Audio Narration (ra29)', () => {
  it('switch ON + launch: the mission log goes through the host (not straight to Kokoro / new Audio)', async () => {
    window._kokoroTTS = { speak: vi.fn(() => Promise.resolve('blob:kokoro')) };
    await mountHub('spacecolony', 'spaceColony', { spaceColony: {} });
    await press('🔇 OFF');
    await press('[data-spacecolony-launch]');
    expect(window._kokoroTTS.speak).not.toHaveBeenCalled();
    expect(ttsTexts().some((t) => t.includes('Mission log'))).toBe(true);
    expect(played()).toHaveLength(1);
    expect(played()[0].src).toBe('blob:clip');
  });
  it('muted: nothing (before: Kokoro + new Audio ignored the app mute)', async () => {
    window._kokoroTTS = { speak: vi.fn(() => Promise.resolve('blob:kokoro')) };
    await mountHub('spacecolony', 'spaceColony', { spaceColony: {} });
    await press('🔇 OFF');
    window.__alloIsGlobalMuted = () => true;
    await press('[data-spacecolony-launch]');
    expect(window._kokoroTTS.speak).not.toHaveBeenCalled();
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
    expect(speech.spoken).toEqual([]);
  });
  it('switch left OFF: nothing is spoken', async () => {
    await mountHub('spacecolony', 'spaceColony', { spaceColony: {} });
    await press('[data-spacecolony-launch]');
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
  });
});

describe('Law Navigator Read aloud (ra29)', () => {
  const DOC = { slug: 'ra29-doc', title: 'RA29 test document', short: 'RA29', jurisdiction: 'federal', jurisdictionName: 'Federal', status: 'ingested', retrieved: '2026-11-01', sourceUrl: 'https://example.test/' };
  const SEC = { number: '1', heading: 'Purpose', paragraphs: ['The purpose of this part is to test reading aloud.'] };
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      const u = String(url);
      const body = /manifest\.json/.test(u) ? { documents: [DOC], built: '2026-11-01' } : /ra29-doc\.json/.test(u) ? Object.assign({}, DOC, { sections: [SEC] }) : null;
      if (!body) return Promise.reject(new Error('offline'));
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    }));
  });
  const seed = { lawNavigator: { view: 'section', slug: 'ra29-doc', section: '1' } };
  const readBtn = 'Read this section aloud';
  // The tool returns early (fewer hooks) until its manifest has loaded, and React then throws
  // "Rendered more hooks" (a separate pre-existing bug, reported). Its module caches the manifest,
  // so a remount renders the section normally.
  async function mountLaw() {
    await mountHub('lawnavigator', 'lawNavigator', seed);
    if (!findButton(readBtn)) await remount();
  }
  it('the section is read through the host with the switch never pressed', async () => {
    await mountLaw();
    await press(readBtn);
    expect(tts).toHaveBeenCalledTimes(1);
    expect(ttsTexts()[0]).toContain('The purpose of this part is to test reading aloud.');
    expect(played()).toHaveLength(1);
  });
  it('muted: no request and no clip', async () => {
    await mountLaw();
    window.__alloIsGlobalMuted = () => true;
    await press(readBtn);
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
  });
});

describe('Money Math cashier bot voice (ra29)', () => {
  const seed = () => {
    const d = { tab: 'store', currency: 'USD', grade: 'elementary', crActive: false, crBotTtsOn: true, crBotCoachOn: true };
    return { moneyMath: d, _moneyMath: d };
  };
  it('the student\'s own Voice on switch: the greeting is read with the header switch never pressed', async () => {
    await mountHub('money', 'moneyMath', seed());
    await press('Start scored shift');
    expect(ttsTexts().some((t) => t.includes('Cash register is dead'))).toBe(true);
    expect(played()).toHaveLength(1);
  });
  it('muted: nothing', async () => {
    await mountHub('money', 'moneyMath', seed());
    window.__alloIsGlobalMuted = () => true;
    await press('Start scored shift');
    expect(tts).not.toHaveBeenCalled();
    expect(audios).toHaveLength(0);
  });
});
