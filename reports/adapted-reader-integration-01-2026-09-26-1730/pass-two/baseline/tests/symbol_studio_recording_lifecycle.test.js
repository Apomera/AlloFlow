import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
const image = 'data:image/png;base64,AA==';
const recordedAudio = 'data:audio/webm;codecs=opus;base64,AQ==';
const retainedAudio = 'data:audio/webm;base64,Ag==';
let SymbolStudio, root, host, props, originalVoice, originalMedia;
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; }, 60000);
beforeEach(() => {
  originalVoice = window.AlloFlowVoice; originalMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  window.AlloFlowVoice = null;
});
afterEach(async () => {
  if (root) await settle(() => root.unmount()); root = null; host?.remove(); host = null;
  window.AlloFlowVoice = originalVoice;
  if (originalMedia) Object.defineProperty(navigator, 'mediaDevices', originalMedia); else delete navigator.mediaDevices;
  localStorage.clear(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
async function settle(action = () => {}) { await act(async () => { action(); for (let i = 0; i < 35; i++) await Promise.resolve(); }); }
function control(label) { const element = host.querySelector('[aria-label="' + label + '"]'); expect(element, label).toBeTruthy(); return element; }
async function click(label) { await settle(() => control(label).click()); }
function board(profileId, audio) { return { id: 'same-board', profileId, title: 'Same board title', cols: 2, words: [{ id: 'same-cell', label: 'Help', image, ...(audio ? { audioData: audio } : {}) }, { id: 'wait-cell', label: 'Wait', image }] }; }
async function mount() {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'record-a', name: 'Learner A', codename: 'Calm Fox' }, { id: 'record-b', name: 'Learner B', codename: 'Bright Otter' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('record-a'));
  localStorage.setItem('alloSymbolBoards__record-a', JSON.stringify([board('record-a')]));
  localStorage.setItem('alloSymbolBoards__record-b', JSON.stringify([board('record-b', retainedAudio)]));
  props = baseProps({ initialTab: 'board', draftStorage: { read: async () => null, write: async (id, payload) => ({ version: 1, profileId: id, updatedAt: Date.now(), payload }), remove: async () => {} } });
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  await settle(() => root.render(React.createElement(SymbolStudio, props))); await loadBoard();
}
async function loadBoard() { if (!host.querySelector('[aria-label="Load"]')) await click('Toggle saved boards gallery'); await click('Load'); }
async function clearDraft() {
  await click('Clear current draft');
  const dialog = document.querySelector('[data-symbol-studio-dialog]'); expect(dialog).toBeTruthy();
  const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Clear draft'); expect(confirm).toBeTruthy();
  await settle(() => confirm.click());
}
function sharedRecorder() {
  const sessions = [];
  window.AlloFlowVoice = { recordAudioBlob: vi.fn((options) => {
    const pending = deferred(); const track = { stop: vi.fn() }; const stream = { getTracks: () => [track] };
    const controller = { supported: true, stop: vi.fn(), cancel: vi.fn(), result: pending.promise };
    sessions.push({ ...pending, controller, track, stream }); options.onStream?.(stream); return controller;
  }) };
  return sessions;
}
function inlineRecorder(permission) {
  const tracks = [{ stop: vi.fn() }]; const stream = { getTracks: () => tracks }; const recorders = []; const readers = [];
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(() => permission || Promise.resolve(stream)) } });
  vi.stubGlobal('MediaRecorder', class {
    constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; this.stop = vi.fn(() => { this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) }); this.state = 'inactive'; this.onstop?.(); }); recorders.push(this); }
    start() { this.state = 'recording'; }
  });
  vi.stubGlobal('FileReader', class {
    constructor() { this.abort = vi.fn(); readers.push(this); }
    readAsDataURL() { this.savedLoad = () => { this.result = recordedAudio; this.onloadend?.(); }; }
  });
  return { tracks, stream, recorders, readers };
}
async function saveAndRead(profile = 'record-a') { await click('Save'); return JSON.parse(localStorage.getItem('alloSymbolBoards__' + profile))[0]; }

describe('Per-cell recording ownership and cleanup', () => {
  it('commits a manually stopped shared recording to the originating cell', async () => {
    const sessions = sharedRecorder(); await mount(); await click('Record audio for Help');
    await click('Stop recording audio for Help'); expect(sessions[0].controller.stop).toHaveBeenCalledTimes(1);
    await settle(() => sessions[0].resolve({ base64: recordedAudio }));
    expect(control('Play recorded audio for Help')).toBeTruthy();
    expect((await saveAndRead()).words[0].audioData).toBe(recordedAudio);
    expect(sessions[0].track.stop).toHaveBeenCalled();
  });

  it.each(['learner change', 'board reload', 'draft clear', 'close'])('discards shared recordings after %s even when a new cell has the same ID and label', async (change) => {
    const sessions = sharedRecorder(); await mount(); await click('Record audio for Help');
    if (change === 'learner change') { await click('Profile: Learner B'); await loadBoard(); }
    if (change === 'board reload') await loadBoard();
    if (change === 'draft clear') { await clearDraft(); await loadBoard(); }
    if (change === 'close') await settle(() => root.render(React.createElement(SymbolStudio, { ...props, isOpen: false })));
    expect(sessions[0].controller.cancel).toHaveBeenCalled(); expect(sessions[0].track.stop).toHaveBeenCalled();
    await settle(() => sessions[0].resolve({ base64: recordedAudio }));
    if (change === 'close') await settle(() => root.render(React.createElement(SymbolStudio, props)));
    const saved = await saveAndRead(change === 'learner change' ? 'record-b' : 'record-a');
    expect(saved.words[0].audioData).toBe(change === 'learner change' ? retainedAudio : undefined);
  });

  it('cancels the previous cell recording without letting its late completion stop or overwrite the next one', async () => {
    const sessions = sharedRecorder(); await mount(); await click('Record audio for Help'); await click('Record audio for Wait');
    expect(sessions[0].controller.cancel).toHaveBeenCalled();
    await settle(() => sessions[0].resolve({ base64: recordedAudio }));
    expect(control('Stop recording audio for Wait')).toBeTruthy();
    await settle(() => sessions[1].resolve({ base64: retainedAudio }));
    const saved = await saveAndRead(); expect(saved.words[0].audioData).toBeUndefined(); expect(saved.words[1].audioData).toBe(retainedAudio);
  });

  it('cancels a shared recorder and releases its microphone when the component unmounts', async () => {
    const sessions = sharedRecorder(); await mount(); await click('Record audio for Help');
    await settle(() => root.unmount()); root = null;
    expect(sessions[0].controller.cancel).toHaveBeenCalled(); expect(sessions[0].track.stop).toHaveBeenCalled();
    await settle(() => sessions[0].resolve({ base64: recordedAudio }));
    expect(JSON.parse(localStorage.getItem('alloSymbolBoards__record-a'))[0].words[0].audioData).toBeUndefined();
  });

  it('releases an inline microphone permission result that arrives after a learner change', async () => {
    const permission = deferred(); const inline = inlineRecorder(permission.promise); await mount(); await click('Record audio for Help');
    await click('Profile: Learner B'); await settle(() => permission.resolve(inline.stream));
    expect(inline.recorders).toHaveLength(0); expect(inline.tracks[0].stop).toHaveBeenCalled();
    await loadBoard(); expect((await saveAndRead('record-b')).words[0].audioData).toBe(retainedAudio);
  });

  it('stops an inline recorder on close and ignores its stale stop callback', async () => {
    const inline = inlineRecorder(); await mount(); await click('Record audio for Help');
    const stopped = inline.recorders[0].onstop;
    await settle(() => root.render(React.createElement(SymbolStudio, { ...props, isOpen: false })));
    expect(inline.recorders[0].stop).toHaveBeenCalled(); expect(inline.tracks[0].stop).toHaveBeenCalled();
    await settle(() => stopped()); expect(inline.readers).toHaveLength(0);
    await settle(() => root.render(React.createElement(SymbolStudio, props)));
    expect((await saveAndRead()).words[0].audioData).toBeUndefined();
  });

  it('ignores a FileReader result after the board is replaced while recording conversion is pending', async () => {
    const inline = inlineRecorder(); await mount(); await click('Record audio for Help'); await click('Stop recording audio for Help');
    expect(inline.readers).toHaveLength(1); const reader = inline.readers[0]; const loaded = reader.onloadend;
    await loadBoard(); expect(reader.abort).toHaveBeenCalled();
    await settle(() => { reader.result = recordedAudio; loaded(); });
    expect((await saveAndRead()).words[0].audioData).toBeUndefined();
  });

  it('keeps the normal inline recording conversion path working', async () => {
    const inline = inlineRecorder(); await mount(); await click('Record audio for Help'); await click('Stop recording audio for Help');
    await settle(() => inline.readers[0].savedLoad());
    expect((await saveAndRead()).words[0].audioData).toBe(recordedAudio); expect(inline.tracks[0].stop).toHaveBeenCalled();
  });
});
