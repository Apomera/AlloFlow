// Geometry World NPC speech through the shared AlloFlow speech player.
//
// The tool owns no speech engine. Lines go to window.AlloSpeechPlayer (backed by
// callTTS), which is where Gemini-vs-Kokoro selection, the global mute, the
// browser fallback and abort-on-newer-request already live. These tests stand
// up a fake player and pin the contract the tool relies on: it follows the
// user's current provider by default, honours a per-character voice only when
// that provider can use it, keys spoken lines by provider so a switch can never
// replay the other engine's audio, ignores stale replies, keeps captions when
// audio fails, and imports old lessons unchanged.

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const src = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let speech;
function setConfig(cfg, selectedVoice) {
  localStorage.setItem('alloflow_ai_config', JSON.stringify(cfg || {}));
  if (selectedVoice !== undefined) window.__alloSelectedVoice = selectedVoice; else delete window.__alloSelectedVoice;
}
function fakePlayer() {
  const calls = [];
  const player = {
    calls,
    speak: vi.fn((text, opts) => { calls.push({ text, opts }); return Promise.resolve(calls.length); }),
    stop: vi.fn(),
    getState: () => ({ isPlaying: false, status: 'idle' }),
  };
  window.AlloSpeechPlayer = player;
  return player;
}

function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach(function (m) { v[m] = function () { return v; }; });
    v.clone = function () { return vec(); }; v.distanceTo = function () { return 99; }; v.length = function () { return 1; }; v.lengthSq = function () { return 1; }; v.dot = function () { return 0; }; v.toArray = function () { return [0, 0, 0]; };
    return v;
  }
  return new Proxy({}, { get: function (_t, prop) { if (prop === 'SRGBColorSpace') return 'srgb'; if (typeof prop === 'symbol') return undefined; return function () { return vec(); }; } });
}
function fakeEngine(npcs) {
  const canvas = document.createElement('canvas');
  const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
  return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
    camera: { position: v(), quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt() {}, up: v() },
    blocks: {}, npcs: npcs || [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
    isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson() {}, placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
    clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent() {}, geometryHomeLessons: [] };
}
function mountTool(cfg, bucket, ctxExtra) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
  let bump = null;
  const ctx = makeCtx(Object.assign({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } }, ctxExtra || {}));
  const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
  const root = ReactDOMClient.createRoot(container);
  React.act(() => { root.render(React.createElement(Comp)); });
  return { container, bucket: () => toolData.geometryWorld, rerender: () => React.act(() => bump()), set: (patch) => React.act(() => ctx.updateMulti('geometryWorld', patch)), unmount: () => { React.act(() => root.unmount()); container.remove(); } };
}

describe('provider-neutral speech resolution (pure)', () => {
  beforeAll(() => {
    resetStemLab(); window.THREE = makeThreeStub(); loadTool(FILE, 'geometryWorld');
    speech = window.StemLab.geometryWorldSpeech;
    if (!speech) throw new Error('geometryWorldSpeech not exposed');
  });
  afterEach(() => { localStorage.clear(); delete window.__alloSelectedVoice; delete window.AlloSpeechPlayer; });

  it('follows the current provider by default: Gemini when configured, Kokoro when configured', () => {
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    expect(speech.resolveNpcVoice(null, speech.config())).toEqual({ provider: 'gemini', voice: undefined, fellBack: false, source: 'current' });
    setConfig({ ttsProvider: 'kokoro' }, 'af_heart');
    expect(speech.resolveNpcVoice('follow-current', speech.config())).toEqual({ provider: 'kokoro', voice: undefined, fellBack: false, source: 'current' });
  });

  it("'auto' follows the selected voice: a Kokoro voice name routes to Kokoro, otherwise Gemini", () => {
    setConfig({ ttsProvider: 'auto', backend: 'gemini' }, 'af_bella');
    expect(speech.effectiveProvider(speech.config())).toBe('kokoro');
    setConfig({ ttsProvider: 'auto', backend: 'gemini' }, 'Puck');
    expect(speech.effectiveProvider(speech.config())).toBe('gemini');
  });

  it('honours a per-character voice only when the current provider can use it', () => {
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    expect(speech.resolveNpcVoice('Puck', speech.config())).toMatchObject({ provider: 'gemini', voice: 'Puck', fellBack: false, source: 'npc' });
    // a Kokoro voice under Gemini falls back to Gemini's default and says so
    expect(speech.resolveNpcVoice('af_bella', speech.config())).toMatchObject({ provider: 'gemini', voice: undefined, fellBack: true });
    setConfig({ ttsProvider: 'kokoro' }, 'af_heart');
    expect(speech.resolveNpcVoice('am_adam', speech.config())).toMatchObject({ provider: 'kokoro', voice: 'am_adam', fellBack: false });
    // and a Gemini name under Kokoro falls back to Kokoro's default
    expect(speech.resolveNpcVoice('Puck', speech.config())).toMatchObject({ provider: 'kokoro', voice: undefined, fellBack: true });
  });

  it('keys spoken lines by provider, model, voice, language, style and text, never text alone', () => {
    const a = speech.speechKey({ provider: 'gemini', model: 'gemini-2.5-flash-preview-tts', voice: 'Kore', language: 'English', style: '', text: 'Welcome!' });
    const b = speech.speechKey({ provider: 'kokoro', model: '', voice: 'af_heart', language: 'English', style: '', text: 'Welcome!' });
    expect(a).not.toBe(b);
    expect(a).toContain('gemini'); expect(b).toContain('kokoro');
    expect(speech.speechKey({ provider: 'gemini', model: 'm', voice: 'Kore', language: 'English', text: 'Welcome!' }))
      .not.toBe(speech.speechKey({ provider: 'gemini', model: 'm', voice: 'Kore', language: 'Spanish', text: 'Welcome!' }));
    expect(speech.speechKey({ provider: 'gemini', model: 'm', voice: 'Kore', language: 'English', text: 'Welcome!' }))
      .toBe(speech.speechKey({ provider: 'gemini', model: 'm', voice: 'Kore', language: 'english', text: 'Welcome!' }));
  });

  it('speaks through the shared player with the resolved voice and language, and reports Gemini and Kokoro alike', () => {
    setConfig({ ttsProvider: 'gemini', models: { tts: 'g-tts' } }, 'Kore');
    const player = fakePlayer();
    const rec = speech.speakLine('Hello builder.', { name: 'Mira', voicePreference: 'Puck', language: 'en' });
    expect(rec.spoken).toBe(true); expect(rec.provider).toBe('gemini');
    expect(player.speak).toHaveBeenCalledWith('Hello builder.', expect.objectContaining({ voice: 'Puck', language: 'en', reason: 'geometry-world-npc', priority: 'interactive' }));
    setConfig({ ttsProvider: 'kokoro' }, 'af_heart');
    const rec2 = speech.speakLine('Hello builder.', { name: 'Mira', voicePreference: 'af_sky' });
    expect(rec2.spoken).toBe(true); expect(rec2.provider).toBe('kokoro');
    expect(player.speak).toHaveBeenLastCalledWith('Hello builder.', expect.objectContaining({ voice: 'af_sky' }));
    // same text, different provider: different keys, so no reuse across the switch
    expect(rec.key).not.toBe(rec2.key);
  });

  it('never passes a provider override down: the player owns provider selection', () => {
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    const player = fakePlayer();
    speech.speakLine('Hi', { name: 'x' });
    const opts = player.speak.mock.calls[0][1];
    expect(opts.provider).toBeUndefined();
    expect(opts.engine).toBeUndefined();
  });

  it('respects the global mute and a provider set to off, and degrades to captions with no player', () => {
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    localStorage.setItem('alloflow-global-muted', 'true');
    const player = fakePlayer();
    expect(speech.speakLine('Hi', {}).reason).toBe('muted');
    expect(player.speak).not.toHaveBeenCalled();
    localStorage.setItem('alloflow-global-muted', 'false');
    setConfig({ ttsProvider: 'off' }, 'Kore');
    expect(speech.speakLine('Hi', {}).reason).toBe('provider-off');
    delete window.AlloSpeechPlayer;
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    const rec = speech.speakLine('Hi', {});
    expect(rec.spoken).toBe(false); expect(rec.reason).toBe('unavailable'); expect(rec.text).toBe('Hi');
  });

  it('turns a player failure into a record the UI can show rather than a throw', async () => {
    setConfig({ ttsProvider: 'gemini' }, 'Kore');
    window.AlloSpeechPlayer = { speak: () => Promise.reject(new Error('quota')), stop() {} };
    const rec = speech.speakLine('Hi', {});
    expect(rec.spoken).toBe(true);
    await rec.promise;
    expect(rec.reason).toBe('error'); expect(rec.error).toBe('quota');
  });
});

describe('lesson import keeps old worlds working and carries the new fields', () => {
  // Extract the whole function by brace matching from its head.
  function extractFunction(source, head) {
    const start = source.indexOf(head); if (start < 0) throw new Error('missing ' + head);
    let i = source.indexOf('{', start), depth = 0, inStr = null, inLineComment = false;
    for (; i < source.length; i++) {
      const c = source[i], prev = source[i - 1], next = source[i + 1];
      if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
      if (inStr) { if (c === inStr && prev !== '\\') inStr = null; continue; }
      if (c === '/' && next === '/') { inLineComment = true; continue; }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return source.slice(start, i + 1); }
    }
    throw new Error('unbalanced ' + head);
  }
  const validateLesson = new Function('__alloT', 'MAX_BLOCKS', 'SAMPLE_LESSONS', 'addToast', extractFunction(src, 'function validateLesson(lesson) {') + '\nreturn validateLesson;')((k, fb) => fb, 1500, {}, () => {});

  it('a lesson without speech fields imports unchanged, with voicePreference and language null', () => {
    const lesson = validateLesson({ title: 'T', npcs: [{ name: 'Mira', position: [1, 1, 1], dialogue: 'Hi' }] });
    expect(lesson.npcs[0].dialogue).toBe('Hi');
    expect(lesson.npcs[0].voicePreference).toBeNull();
    expect(lesson.npcs[0].language).toBeNull();
  });

  it("'follow-current' is stored as null, an explicit voice and language survive, junk is dropped", () => {
    const lesson = validateLesson({ title: 'T', npcs: [
      { name: 'A', position: [1, 1, 1], dialogue: 'x', voicePreference: 'follow-current', language: 'es' },
      { name: 'B', position: [1, 1, 1], dialogue: 'x', voicePreference: '  af_bella ', language: 42 },
      { name: 'C', position: [1, 1, 1], dialogue: 'x', voicePreference: { evil: true } },
    ] });
    expect(lesson.npcs[0].voicePreference).toBeNull(); expect(lesson.npcs[0].language).toBe('es');
    expect(lesson.npcs[1].voicePreference).toBe('af_bella'); expect(lesson.npcs[1].language).toBeNull();
    expect(lesson.npcs[2].voicePreference).toBeNull();
  });
});

describe('the dialog speech bar, mounted', () => {
  let cfg;
  beforeAll(() => { resetStemLab(); window.THREE = makeThreeStub(); cfg = loadTool(FILE, 'geometryWorld'); });
  beforeEach(() => { window.THREE = makeThreeStub(); localStorage.clear(); setConfig({ ttsProvider: 'gemini', models: { tts: 'g-tts' } }, 'Kore'); });
  afterEach(() => { delete window[ENGINE_KEY]; delete window.AlloSpeechPlayer; delete window.__alloSelectedVoice; localStorage.clear(); document.body.innerHTML = ''; });
  const npc = { name: 'Mira', dialogue: 'Welcome to the geometry garden!', color: 0x7c3aed, position: [4, 1, 4], question: null };
  const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
  const liveNpc = () => ({ data: npc, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
  const bucket = { worldActive: true, activeLesson: 'volumeExplorer', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, showNpcDialog: true, dialogNpcIdx: 0, npcTypewriterNpc: 0, npcTypewriterPos: 999 };

  it('shows captions, Hear it, the mute toggle and a status; Hear it speaks the preset line lazily through the player', () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    const m = mountTool(cfg, bucket);
    m.rerender();
    // caption is on screen before any audio is requested
    expect(m.container.textContent).toContain('Welcome to the geometry garden!');
    expect(player.speak).not.toHaveBeenCalled(); // lazy: nothing synthesised on open
    const play = m.container.querySelector('button.gw-npc-speech-play');
    expect(play).toBeTruthy();
    React.act(() => { play.click(); });
    expect(player.speak).toHaveBeenCalledTimes(1);
    expect(player.speak.mock.calls[0][0]).toBe('Welcome to the geometry garden!');
    expect(m.container.querySelector('.gw-npc-speech-status').getAttribute('data-speech-status')).toBe('loading');
    m.unmount();
  });

  it('mirrors the player state event into loading, speaking and error, and offers Retry after a failure', () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    fakePlayer();
    const m = mountTool(cfg, bucket);
    m.rerender();
    React.act(() => { m.container.querySelector('button.gw-npc-speech-play').click(); });
    React.act(() => { window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: true, status: 'playing' } })); });
    expect(m.container.querySelector('.gw-npc-speech-status').getAttribute('data-speech-status')).toBe('speaking');
    expect(m.container.querySelector('button.gw-npc-speech-stop')).toBeTruthy();
    React.act(() => { window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: false, status: 'error', error: 'Gemini quota' } })); });
    expect(m.container.querySelector('.gw-npc-speech-status').getAttribute('data-speech-status')).toBe('error');
    expect(m.container.querySelector('.gw-npc-speech-status').textContent).toMatch(/Captions are shown/);
    expect(m.container.querySelector('button.gw-npc-speech-retry')).toBeTruthy();
    // the caption never went anywhere
    expect(m.container.textContent).toContain('Welcome to the geometry garden!');
    m.unmount();
  });

  it('the character-voices toggle persists, stops speech, and disables Hear it; the global mute is only read', () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    const m = mountTool(cfg, bucket);
    m.rerender();
    React.act(() => { m.container.querySelector('button.gw-npc-speech-mute').click(); });
    expect(m.bucket().npcSpeechMuted).toBe(true);
    expect(player.stop).toHaveBeenCalled();
    expect(m.container.querySelector('button.gw-npc-speech-play').disabled).toBe(true);
    React.act(() => { m.container.querySelector('button.gw-npc-speech-mute').click(); });
    expect(m.bucket().npcSpeechMuted).toBe(false);
    // app-level mute event
    React.act(() => { window.dispatchEvent(new CustomEvent('alloflow-mute-changed', { detail: { muted: true } })); });
    expect(m.container.querySelector('.gw-npc-speech-status').textContent).toMatch(/App sound is muted/);
    expect(m.container.querySelector('button.gw-npc-speech-play').disabled).toBe(true);
    expect(localStorage.getItem('alloflow-global-muted')).toBeNull(); // never written by the tool
    m.unmount();
  });

  it('closing the dialog stops the line', () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    const m = mountTool(cfg, bucket);
    m.rerender();
    React.act(() => { m.container.querySelector('button.gw-npc-speech-play').click(); });
    player.stop.mockClear();
    m.set({ showNpcDialog: false });
    expect(player.stop).toHaveBeenCalled();
    m.unmount();
  });

  it('an AI reply is captioned immediately and spoken by the current provider when Speak replies is on', async () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    let resolveReply;
    const callGemini = vi.fn(() => new Promise((r) => { resolveReply = r; }));
    const m = mountTool(cfg, Object.assign({}, bucket, { npcSpeechAuto: true, npcChatInput: 'What is volume?' }), { callGemini, aiHintsEnabled: true });
    m.rerender();
    const ask = Array.from(m.container.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '✨');
    expect(ask).toBeTruthy();
    React.act(() => { ask.click(); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(player.speak).not.toHaveBeenCalled(); // nothing to say until the text exists
    await React.act(async () => { resolveReply('Volume is length times width times height.'); await Promise.resolve(); await Promise.resolve(); });
    // caption first
    expect(m.container.textContent).toContain('Volume is length times width times height.');
    // then the reply, through the player, with no provider forced
    expect(player.speak).toHaveBeenCalledTimes(1);
    expect(player.speak.mock.calls[0][0]).toBe('Volume is length times width times height.');
    expect(player.speak.mock.calls[0][1].provider).toBeUndefined();
    m.unmount();
  });

  it('a reply that lands after the student has moved on is captioned but never spoken', async () => {
    // The send control disables while a reply is pending, so two replies cannot
    // race through the UI. What can happen is the student closing the dialog, or
    // asking to hear something else, before the model answers. Both bump the
    // request counter, and the late reply must stay silent.
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    let resolveReply;
    const callGemini = vi.fn(() => new Promise((r) => { resolveReply = r; }));
    const m = mountTool(cfg, Object.assign({}, bucket, { npcSpeechAuto: true, npcChatInput: 'What is volume?' }), { callGemini, aiHintsEnabled: true });
    m.rerender();
    React.act(() => { Array.from(m.container.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '✨').click(); });
    // the student closes the dialog while the model is still thinking
    m.set({ showNpcDialog: false });
    await React.act(async () => { resolveReply('Volume is length times width times height.'); await Promise.resolve(); await Promise.resolve(); });
    expect(player.speak).not.toHaveBeenCalled();
    // and the text is still there for them when they come back
    m.set({ showNpcDialog: true });
    expect(m.container.textContent).toContain('Volume is length times width times height.');
    m.unmount();
  });

  it('with Speak replies off, an AI reply is captioned and silent', async () => {
    window[ENGINE_KEY] = fakeEngine([liveNpc()]);
    const player = fakePlayer();
    const callGemini = vi.fn(() => Promise.resolve('Sure!'));
    const m = mountTool(cfg, Object.assign({}, bucket, { npcSpeechAuto: false, npcChatInput: 'Hi?' }), { callGemini, aiHintsEnabled: true });
    m.rerender();
    const ask = Array.from(m.container.querySelectorAll('button')).find((b) => (b.textContent || '').trim() === '✨' || (b.textContent || '').trim() === '⏳');
    await React.act(async () => { ask.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(m.container.textContent).toContain('Sure!');
    expect(player.speak).not.toHaveBeenCalled();
    m.unmount();
  });
});

describe('source contract', () => {
  it('no longer drives raw browser speechSynthesis for character lines', () => {
    const dialog = src.slice(src.indexOf('showNpcDialog && engine && engine.npcs[dialogNpcIdx] && (function() {'), src.indexOf('showNpcDialog && engine && engine.npcs[dialogNpcIdx] && (function() {') + 30000);
    expect(dialog).not.toContain('new SpeechSynthesisUtterance');
    expect(dialog).toContain("speakNpcLine(translation.dialogue, data, { language: LANG_NAMES[homeLang] || homeLang, force: true });");
  });
  it('never hard-codes a provider, a Kokoro server, or a model name', () => {
    const block = src.slice(src.indexOf('// ── NPC speech ──'), src.indexOf('window.StemLab.geometryWorldSpeech = {'));
    expect(block).not.toMatch(/localhost:\d+|127\.0\.0\.1|kokoro\.(js|wasm)|__loadKokoroTTS|api\.gemini|generativelanguage/);
    expect(block).not.toMatch(/apiKey|API_KEY/);
    expect(block).toContain('window.AlloSpeechPlayer');
  });
  it('offers a voice preview in the authoring panel', () => {
    expect(src).toContain("className: 'gw-focusable gw-npc-preview-voice'");
    expect(src).toContain("speakNpcLine(creatorNpcDialogue, { name: creatorNpcName }, { force: true });");
  });
});
