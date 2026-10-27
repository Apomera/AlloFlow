import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
let root, host, API, api, readers, pause, load, revoke, epoch;
const tick = () => Promise.resolve();
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
beforeAll(() => {
  setupBehaviorLens(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.AlloModules.BehaviorLens;
  let source = readFileSync('behavior_lens_module.js', 'utf8');
  // Exercise the unchanged decode/cleanup branch with tiny synthetic input.
  // This test does not validate the production 20 MB routing threshold.
  source = source.replace('var INLINE_LIMIT = 20 * 1024 * 1024;', 'var INLINE_LIMIT = 256;');
  source = source.replace('        var IOA_METHODS_LIST = IOA_METHODS;', '        if (props.__capture) props.__capture({ callGeminiWithMedia, captureMediaOperation, processIOAWithAI, runSecondAIPass, processInteractionAnalysis });\n        var IOA_METHODS_LIST = IOA_METHODS;');
  new Function(source.replace(/\}\)\(\);\s*$/, 'window.__ioaMediaTest = { Component: IOACalculator, Context: BehaviorLensToolStateContext, flush: () => blObservationFlushers.forEach(fn => fn()), bind: session => { blProtectedSession = session; blProtectedEpoch = session.captureEpoch(); } };})();'))();
  API = window.__ioaMediaTest;
});
beforeEach(() => {
  epoch = 1; readers = []; api = null;
  API.bind({ captureEpoch: () => epoch, isCurrent: captured => captured === epoch, assertCurrent: captured => { if (captured !== epoch) throw Object.assign(new Error('Synthetic locked epoch'), { name: 'AbortError' }); } });
  pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  if (!URL.createObjectURL) URL.createObjectURL = () => ''; if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
  let counter = 0; vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:synthetic-media-' + (++counter)); revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  class Reader extends window.EventTarget {
    constructor() { super(); this.readyState = 0; this.abort = vi.fn(() => { this.readyState = 2; this.dispatchEvent(new Event('loadend')); }); readers.push(this); }
    readAsDataURL() { this.readyState = 1; }
    finish(result) { this.result = result; this.readyState = 2; if (this.onload) this.onload({ target: this }); this.dispatchEvent(new Event('loadend')); }
  }
  vi.stubGlobal('FileReader', Reader);
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; host?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function mount(options = {}) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const text = options.text || vi.fn(async () => '{"intervals":[],"summary":"SYNTHETIC CURRENT RESULT"}');
  const vision = Object.prototype.hasOwnProperty.call(options, 'vision') ? options.vision : vi.fn(async () => '{"intervals":[],"summary":"SYNTHETIC CURRENT RESULT"}');
  function Harness({ student }) {
    const [records, setRecords] = React.useState({});
    const context = { state: records[student] || {}, setState: update => setRecords(previous => ({ ...previous, [student]: typeof update === 'function' ? update(previous[student] || {}) : update })) };
    return React.createElement(API.Context.Provider, { value: context }, React.createElement(API.Component, { studentName: student, abcEntries: [], t: key => key, addToast: options.toast || (() => {}), callGemini: text, callGeminiVision: vision, __capture: value => { api = value; } }));
  }
  const render = student => React.act(async () => root.render(React.createElement(Harness, { student })));
  await render('Synthetic Otter'); return { render, text, vision };
}
async function aiMode() { await React.act(async () => [...host.querySelectorAll('button')].find(node => node.textContent.includes('AI Coding Consistency')).click()); }
async function upload(name = 'synthetic-otter.wav') {
  const input = host.querySelector('input[type="file"]'), file = new File(['SYNTHETIC MEDIA'], name, { type: 'audio/wav' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await React.act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
  return file;
}
async function type(label, value) {
  const input = host.querySelector('[aria-label="' + label + '"]'), proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await React.act(async () => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function transition(kind, h) {
  if (kind === 'student') await h.render('Synthetic Beaver');
  else if (kind === 'remove') await React.act(async () => host.querySelector('[aria-label="Remove file"]').click());
  else if (kind === 'replace') await upload('synthetic-new.wav');
  else if (kind === 'lock') await React.act(async () => { epoch++; API.flush(); });
  else if (kind === 'unmount') { await React.act(async () => root.unmount()); root = null; }
}

describe('IOA media belongs to the selected student and current file', () => {
  it.each(['student', 'remove', 'replace', 'lock', 'unmount'])('stops playback and revokes the old URL on %s', async kind => {
    const h = await mount(); await aiMode(); await upload(); const player = host.querySelector('audio');
    await transition(kind, h);
    expect(revoke).toHaveBeenCalledWith('blob:synthetic-media-1'); expect(player.getAttribute('src')).not.toBe('blob:synthetic-media-1'); expect(pause).toHaveBeenCalled(); expect(load).toHaveBeenCalled();
    expect(host.textContent).not.toContain('synthetic-otter.wav');
  });

  it('keeps typed annotations with their student while requiring media reselection after switching', async () => {
    const h = await mount(); await aiMode(); await type('Your observation coding', '1, 0, 1'); await type('Subject description', 'SYNTHETIC OTTER NOTES'); await upload();
    await h.render('Synthetic Beaver'); await aiMode(); expect(host.querySelector('[aria-label="Your observation coding"]').value).toBe(''); expect(host.querySelector('audio')).toBeNull();
    await type('Your observation coding', '0, 0, 0');
    await h.render('Synthetic Otter'); await aiMode();
    expect(host.querySelector('[aria-label="Your observation coding"]').value).toBe('1, 0, 1'); expect(host.querySelector('[aria-label="Subject description"]').value).toBe('SYNTHETIC OTTER NOTES'); expect(host.querySelector('audio')).toBeNull();
  });

  it.each(['processIOAWithAI', 'runSecondAIPass', 'processInteractionAnalysis'])('drops the late %s reader callback after replacing the file', async operation => {
    const h = await mount(); await aiMode(); await upload(); await type('Target behaviors', 'SYNTHETIC TARGET');
    await React.act(async () => api[operation]()); const reader = readers.at(-1), callback = reader.onload;
    await upload('synthetic-new.wav');
    expect(reader.abort).toHaveBeenCalled(); reader.result = 'data:audio/wav;base64,AAAA';
    await React.act(async () => callback({ target: reader }));
    expect(h.vision).not.toHaveBeenCalled(); expect(h.text).not.toHaveBeenCalled();
  });

  it('ignores a completed old AI result after a different file is selected', async () => {
    const answer = deferred(), h = await mount({ vision: vi.fn(() => answer.promise) }); await aiMode(); await upload(); await type('Target behaviors', 'SYNTHETIC TARGET');
    await React.act(async () => api.processIOAWithAI()); await React.act(async () => readers.at(-1).finish('data:audio/wav;base64,AAAA'));
    expect(h.vision).toHaveBeenCalledOnce(); const guard = h.vision.mock.calls[0][3]; expect(typeof guard).toBe('function'); await upload('synthetic-new.wav'); expect(guard).toThrow();
    await React.act(async () => { answer.resolve('{"intervals":[],"summary":"SYNTHETIC STALE RESULT"}'); await answer.promise; });
    expect(host.textContent).not.toContain('SYNTHETIC STALE RESULT');
  });
});

describe('IOA audio decode releases its owned AudioContext', () => {
  const audio = { numberOfChannels: 1, sampleRate: 16000, length: 2, getChannelData: () => new Float32Array([0, 0]) };
  function decoder(decode) {
    const close = vi.fn(async () => {}); class Context { decodeAudioData(buffer) { expect(buffer.byteLength).toBe(384); return decode(); } close = close; }
    vi.stubGlobal('AudioContext', Context); return close;
  }
  it.each(['success', 'failure'])('closes after decode %s and preserves the allowed request path', async outcome => {
    const h = await mount(); await aiMode(); const file = await upload(), close = decoder(() => outcome === 'success' ? Promise.resolve(audio) : Promise.reject(new Error('Synthetic decode failure')));
    const result = await api.callGeminiWithMedia('SYNTHETIC PROMPT', file, 'data:audio/wav;base64,' + 'A'.repeat(512), api.captureMediaOperation());
    expect(close).toHaveBeenCalledOnce(); expect(result).toContain('SYNTHETIC CURRENT RESULT'); const provider = outcome === 'success' ? h.vision : h.text; expect(provider).toHaveBeenCalledOnce();
    const guard = provider.mock.calls[0][outcome === 'success' ? 3 : 2]; expect(typeof guard).toBe('function'); await transition('remove', h); expect(guard).toThrow();
  });
  it.each(['no-vision', 'large-wav'])('carries the same current-media guard into the %s text fallback', async kind => {
    const h = await mount(kind === 'no-vision' ? { vision: null } : {}); await aiMode(); const file = await upload();
    if (kind === 'large-wav') decoder(() => Promise.resolve({ ...audio, length: 200, getChannelData: () => new Float32Array(200) }));
    await api.callGeminiWithMedia('SYNTHETIC PROMPT', file, 'data:audio/wav;base64,' + (kind === 'no-vision' ? 'AAAA' : 'A'.repeat(512)), api.captureMediaOperation());
    expect(h.text).toHaveBeenCalledOnce(); const guard = h.text.mock.calls[0][2]; expect(typeof guard).toBe('function'); await transition('remove', h); expect(guard).toThrow();
  });
  it.each(['student', 'remove', 'replace', 'lock', 'unmount'])('closes pending decode and prevents provider fallback after %s', async kind => {
    const pending = deferred(), h = await mount(); await aiMode(); const file = await upload(), close = decoder(() => pending.promise);
    const result = api.callGeminiWithMedia('SYNTHETIC PROMPT', file, 'data:audio/wav;base64,' + 'A'.repeat(512), api.captureMediaOperation()).then(value => ({ value }), error => ({ error }));
    await transition(kind, h); expect(close).toHaveBeenCalledOnce(); pending.resolve(audio);
    expect((await result).error?.name).toBe('AbortError'); expect(close).toHaveBeenCalledOnce(); expect(h.vision).not.toHaveBeenCalled(); expect(h.text).not.toHaveBeenCalled();
  });
});
