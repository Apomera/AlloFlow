// Round 27 (lane sound): the app's mute is window.__alloIsGlobalMuted() (AlloFlowANTI.txt); nothing in the
// app sets the legacy window._alloGlobalMute flag any more. These sounds ignored the app mute:
// - the STEAM Lab hub's stemBeep (ctx.beep, the XP chime) and stemCelebrate (ctx.celebrate, 3 notes);
// - Graphing Calculator's sound effects (playTone / SOUNDS.*) and its "Read aloud" helper speakText
//   (host callTTS, then the Kokoro Audio fallback, then the device voice);
// - Coordinate Grid's sound effects (playTone: only the tool's own speaker toggle silenced them).
// Each case runs the real code: functions cut out of the source (hub, graphcalc) or the mounted tool.
// STEM_TOOL_DIR picks the folder holding the tool copies (default stem_lab), STEM_HUB the hub.
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const file = (n) => path.join(DIR, 'stem_tool_' + n + '.js');
const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8');

// The two ways the app can be muted, plus "not muted" as the control.
const appMute = () => { window.__alloIsGlobalMuted = () => true; };
const legacyMute = () => { window.__alloIsGlobalMuted = () => false; window._alloGlobalMute = true; };
const MUTES = [['the app mute (__alloIsGlobalMuted)', appMute], ['the legacy _alloGlobalMute flag', legacyMute]];
function clearMute() { delete window.__alloIsGlobalMuted; delete window._alloGlobalMute; }

const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
// A fake Web Audio context that records every oscillator it makes (and whether it was started).
function fakeContext() {
  const ac = { currentTime: 0, state: 'running', destination: {}, oscillators: [] };
  ac.createOscillator = () => { const o = { type: '', frequency: param(), started: false, connect() {}, disconnect() {}, start() { o.started = true; }, stop() {} }; ac.oscillators.push(o); return o; };
  ac.createGain = () => ({ gain: param(), connect() {}, disconnect() {} });
  ac.resume = () => {}; ac.close = () => { ac.state = 'closed'; };
  ac.started = () => ac.oscillators.filter((o) => o.started).length;
  return ac;
}
function audioCtor() {
  const made = [];
  function Ctor() { const ac = fakeContext(); made.push(ac); return ac; }
  return { Ctor, made };
}
function setGlobal(name, value) { window[name] = value; globalThis[name] = value; }
function delGlobal(name) { delete window[name]; delete globalThis[name]; }
function fakeSpeech() {
  const spoken = [];
  setGlobal('speechSynthesis', { cancel() {}, speak(u) { spoken.push(u.text); } });
  setGlobal('SpeechSynthesisUtterance', function (text) { this.text = text; });
  return spoken;
}
// A fake HTMLAudio constructor recording each element made, play() and pause().
function fakeAudio() {
  const made = [];
  setGlobal('Audio', function (url) { this.url = url; this.played = 0; this.paused = 0; this.play = () => { this.played++; return Promise.resolve(); }; this.pause = () => { this.paused++; }; made.push(this); });
  return made;
}
const flush = async () => { for (let i = 0; i < 4; i++) await Promise.resolve(); };

beforeEach(() => { clearMute(); });
afterEach(() => {
  clearMute();
  delGlobal('AudioContext'); delGlobal('webkitAudioContext');
  delGlobal('speechSynthesis'); delGlobal('SpeechSynthesisUtterance'); delGlobal('Audio');
  delete window._kokoroTTS;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── the hub: stemBeep (ctx.beep) and stemCelebrate (ctx.celebrate) ──
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

describe('hub: stemBeep (ctx.beep, XP chime) and stemCelebrate (ctx.celebrate)', () => {
  let ac;
  beforeEach(() => {
    ac = fakeContext();
    window.StemLab = { audioContext: vi.fn(() => ac) };
  });

  it('plays when not muted (control): one beep, three celebration notes', () => {
    vi.useFakeTimers();
    const S = loadHubSound();
    S.beep(523, 0.08, 0.1);
    expect(ac.started()).toBe(1);
    S.celebrate();
    vi.advanceTimersByTime(300);
    expect(ac.started()).toBe(4);
  });

  it.each(MUTES)('is silent under %s: no audio context asked for, no note', (_label, mute) => {
    vi.useFakeTimers();
    const audio = audioCtor(); setGlobal('AudioContext', audio.Ctor);
    const S = loadHubSound();
    mute();
    S.beep(523, 0.08, 0.1);
    S.celebrate();
    vi.advanceTimersByTime(300);
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(audio.made.length).toBe(0);
    expect(ac.oscillators.length).toBe(0);
  });

  it('muting during the fanfare silences the notes still to come', () => {
    vi.useFakeTimers();
    const S = loadHubSound();
    S.celebrate();
    expect(ac.started()).toBe(1);
    appMute();
    vi.advanceTimersByTime(300);
    expect(ac.started()).toBe(1);
  });

  it('a throwing __alloIsGlobalMuted does not throw and does not block the beep', () => {
    const S = loadHubSound();
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    expect(() => S.beep(440, 0.1, 0.1)).not.toThrow();
    expect(ac.started()).toBe(1);
  });
});

// ── Graphing Calculator: playTone + SOUNDS, speakText (cut out of the real source) ──
function loadGraphcalcSound() {
  const src = read(file('graphcalc'));
  const a = src.indexOf('  var _audioCtx = null;\n  function getAudioCtx()');
  const s = src.indexOf('\n  var SOUNDS = {', a);
  const b = src.indexOf('\n  };\n', s);
  const t0 = src.indexOf('  function speakText(text, callTTS) {');
  const t1 = src.indexOf('\n  }\n', t0);
  expect(a, 'sound engine start').toBeGreaterThan(-1);
  expect(s, 'SOUNDS').toBeGreaterThan(a);
  expect(b, 'SOUNDS end').toBeGreaterThan(s);
  expect(t0, 'speakText').toBeGreaterThan(-1);
  expect(t1, 'speakText end').toBeGreaterThan(t0);
  const code = src.slice(a, b + 5) + '\n' + src.slice(t0, t1 + 4) + '\nreturn { playTone: playTone, SOUNDS: SOUNDS, speakText: speakText };';
  return new Function(code)(); // eslint-disable-line no-new-func
}

describe('graphcalc: the sound effects (SOUNDS.* -> playTone)', () => {
  let ac;
  beforeEach(() => { ac = fakeContext(); window.StemLab = { audioContext: vi.fn(() => ac) }; });

  it('plays when not muted (control)', () => {
    const G = loadGraphcalcSound();
    G.SOUNDS.clearAll();
    G.SOUNDS.zoomPreset();
    expect(ac.started()).toBe(2);
  });

  it.each(MUTES)('is silent under %s: no audio context, no oscillator', (_label, mute) => {
    vi.useFakeTimers();
    const audio = audioCtor(); setGlobal('AudioContext', audio.Ctor);
    const G = loadGraphcalcSound();
    mute();
    G.SOUNDS.clearAll(); G.SOUNDS.badge(); G.SOUNDS.graphDraw();
    vi.advanceTimersByTime(500);
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(audio.made.length).toBe(0);
    expect(ac.oscillators.length).toBe(0);
  });

  it('a throwing __alloIsGlobalMuted does not throw and does not block the sound', () => {
    const G = loadGraphcalcSound();
    window.__alloIsGlobalMuted = () => { throw new Error('boom'); };
    expect(() => G.SOUNDS.clearAll()).not.toThrow();
    expect(ac.started()).toBe(1);
  });
});

describe('graphcalc: speakText ("Read aloud" / "Speak Text")', () => {
  let ac;
  beforeEach(() => { ac = fakeContext(); window.StemLab = { audioContext: vi.fn(() => ac) }; });

  it('not muted (control): host callTTS gets the text; without it Kokoro plays; without that the device voice speaks', async () => {
    const G = loadGraphcalcSound();
    const tts = vi.fn(() => Promise.resolve('blob:x'));
    G.speakText('y equals x squared', tts);
    expect(tts).toHaveBeenCalledWith('y equals x squared');
    expect(ac.started()).toBe(1); // the little "tts" tone
    const audios = fakeAudio();
    window._kokoroTTS = { speak: vi.fn(() => Promise.resolve('blob:k')) };
    G.speakText('kokoro line', null);
    await flush();
    expect(window._kokoroTTS.speak).toHaveBeenCalledTimes(1);
    expect(audios.length).toBe(1);
    expect(audios[0].played).toBe(1);
    delete window._kokoroTTS;
    const spoken = fakeSpeech();
    G.speakText('device line', null);
    expect(spoken).toEqual(['device line']);
  });

  it.each(MUTES)('under %s: no callTTS, no Kokoro, no Audio, no device voice, no tone', async (_label, mute) => {
    const G = loadGraphcalcSound();
    const audios = fakeAudio();
    const spoken = fakeSpeech();
    mute();
    const tts = vi.fn(() => Promise.resolve('blob:x'));
    G.speakText('one', tts);
    window._kokoroTTS = { speak: vi.fn(() => Promise.resolve('blob:k')) };
    G.speakText('two', null);
    delete window._kokoroTTS;
    G.speakText('three', null);
    await flush();
    expect(tts).not.toHaveBeenCalled();
    expect(audios.length).toBe(0);
    expect(spoken).toEqual([]);
    expect(ac.oscillators.length).toBe(0);
  });

  it('a Kokoro clip that arrives after mute came on is not played', async () => {
    const G = loadGraphcalcSound();
    const audios = fakeAudio();
    let resolve;
    window._kokoroTTS = { speak: vi.fn(() => new Promise((r) => { resolve = r; })) };
    G.speakText('slow line', null);
    expect(window._kokoroTTS.speak).toHaveBeenCalledTimes(1);
    appMute();
    resolve('blob:k');
    await flush();
    expect(audios.filter((a) => a.played > 0).length).toBe(0);
  });

  it('a Kokoro clip already playing stops when the app mutes (alloflow-mute-changed), not on unmute', async () => {
    const G = loadGraphcalcSound();
    const audios = fakeAudio();
    window._kokoroTTS = { speak: vi.fn(() => Promise.resolve('blob:k')) };
    G.speakText('long line', null);
    await flush();
    expect(audios.length).toBe(1);
    expect(audios[0].played).toBe(1);
    window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: false } }));
    expect(audios[0].paused).toBe(0);
    window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
    expect(audios[0].paused).toBe(1);
    // The listener is removed after it fired once.
    window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
    expect(audios[0].paused).toBe(1);
  });
});

// ── mounted tools: the real render wiring ──
function mountTool(cfg, seed, host) {
  let root;
  function Panel() {
    const [toolData, setToolData] = React.useState(seed || {});
    return cfg.render(makeCtx({ toolData, setToolData }));
  }
  React.act(() => { root = ReactDOMClient.createRoot(host); root.render(React.createElement(Panel)); });
  return root;
}
const clickEl = (node) => React.act(() => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));

describe.each([
  ['graphcalc', 'graphCalc', 'Clear', null],
  ['coordgrid', 'coordinate', 'Save snapshot', '_coordGrid'],
])('%s mounted: a button sound', (name, id, label, key) => {
  let cfg, host, root, previousAct, ac;
  beforeEach(() => {
    previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
    cfg = loadTool(file(name), id);
    ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
    host = document.createElement('div');
    document.body.appendChild(host);
  });
  afterEach(() => {
    if (root) React.act(() => root.unmount());
    root = null;
    host.remove();
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
  });
  const button = () => host.querySelector('button[aria-label="' + label + '"]');

  it('plays when not muted (control)', () => {
    root = mountTool(cfg, {}, host);
    expect(button(), label + ' button').not.toBeNull();
    clickEl(button());
    expect(ac.started()).toBeGreaterThan(0);
  });

  it.each(MUTES)('is silent under %s', (_label, mute) => {
    mute();
    root = mountTool(cfg, {}, host);
    clickEl(button());
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(ac.oscillators.length).toBe(0);
  });

  if (key) {
    it("the tool's own speaker toggle still silences it (app not muted)", () => {
      root = mountTool(cfg, { [key]: { muted: true } }, host);
      clickEl(button());
      expect(ac.oscillators.length).toBe(0);
    });
  }
});
