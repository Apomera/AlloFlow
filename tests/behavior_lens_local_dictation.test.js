import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const SW = require('../sensitive_workspace_module.js'), Crypto = require('../allo_crypto_module.js'), Vault = require('../allo_device_vault_module.js');
let root, host, api, service;
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const event = text => ({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
beforeAll(() => {
  setupBehaviorLens(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.AlloModules.BehaviorLens;
  new Function(readFileSync('behavior_lens_module.js', 'utf8').replace(/\}\)\(\);\s*$/, 'window.__localDictationTest={SessionNotes,VoiceToABC,Context:BehaviorLensToolStateContext,bind(session){blProtectedSession=session;blProtectedEpoch=session.captureEpoch();},flush(){blObservationFlushers.forEach(fn=>fn());}};})();'))();
  api = window.__localDictationTest;
});
afterEach(async () => { if (root) await React.act(async () => root.unmount()); root = null; host?.remove(); service?.dispose(); service = null; delete window.SpeechRecognition; delete window.AlloFlowVoice; vi.restoreAllMocks(); });
async function fixture(name = 'SessionNotes', options = {}) {
  let store = null, revision = 0; const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  service = SW.createService({ repository: { async read() { return { store: copy(store), revision }; }, async compareAndSwap(expected, value) { if (expected !== revision) return false; store = copy(value); revision++; return true; } },
    vaultModule: Vault, crypto: Crypto, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS }, lifecycle: false, getContext: () => ({ isCanvas: true, learner: false }), getPolicy: () => ({ version: 1, allowCanvasRecords: true, allowExternalAi: [] }) });
  await service.setup('synthetic local speech password'); const recoveryInput = service.getStatus().setupRecoveryCode; await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const session = service.getSession('behavior-lens'); api.bind(session); session.registerFlush(api.flush);
  const instances = [], active = new Set(), available = vi.fn(options.available || (async () => 'available'));
  class Engine {
    static available = available;
    constructor() { if (!options.missingLocal) this.processLocally = false; instances.push(this); if (options.ignoreLocal) Object.defineProperty(this, 'processLocally', { get: () => false, set() {} }); }
    start = vi.fn(() => { expect(this.processLocally).toBe(true); active.add(this); });
    abort = vi.fn(() => active.delete(this));
    stop = vi.fn(() => active.delete(this));
  }
  if (options.missingAvailable) delete Engine.available;
  window.SpeechRecognition = Engine; const shared = vi.fn(); window.AlloFlowVoice = { initWebSpeechCapture: shared };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const stores = new Map();
  function Case({ student }) {
    const [state, setState] = React.useState(() => stores.get(student) || {});
    const update = value => setState(previous => { const next = typeof value === 'function' ? value(previous) : value; stores.set(student, next); return next; });
    return React.createElement(api.Context.Provider, { value: { state, setState: update } }, React.createElement(api[name], { studentName: student, notes: [], onUpdateNotes() {}, abcEntries: [], setAbcEntries() {}, addToast() {}, t: () => undefined, callGemini: async () => '[]' }));
  }
  const render = student => React.act(async () => root.render(React.createElement(Case, { key: student, student })));
  await render('Synthetic Otter');
  const start = () => React.act(async () => (name === 'SessionNotes' ? host.querySelector('[aria-label="Start dictation"]') : [...host.querySelectorAll('button')].find(node => node.textContent.includes('Start Recording'))).click());
  const stop = () => React.act(async () => (name === 'SessionNotes' ? host.querySelector('[aria-label="Stop dictation"]') : [...host.querySelectorAll('button')].find(node => node.textContent.includes('Stop Recording'))).click());
  return { instances, active, available, shared, render, start, stop, stores, session, text: () => host.querySelector('textarea').value };
}
describe('BehaviorLens local-only dictation', () => {
  it.each([{ missingAvailable: true }, { missingLocal: true }, { ignoreLocal: true }])('requires real local capability %j without shared/remote fallback', async options => {
    const h = await fixture('SessionNotes', options); await h.start(); expect(h.active.size).toBe(0); expect(h.instances.every(rec => rec.start.mock.calls.length === 0)).toBe(true); expect(h.shared).not.toHaveBeenCalled(); expect(host.textContent).toContain('Type or paste');
  });
  it.each(['unavailable', 'downloadable', 'downloading'])('does not install or start when local availability is %s', async status => {
    const h = await fixture('VoiceToABC', { available: async () => status }); await h.start(); expect(h.active.size).toBe(0); expect(h.instances[0].start).not.toHaveBeenCalled(); expect(h.available).toHaveBeenCalledWith({ langs: ['en-US'], processLocally: true }); expect(host.querySelector('[aria-label="Observation transcript"]')).toBeTruthy();
  });
  it('handles availability failure without starting a different engine', async () => {
    const h = await fixture('SessionNotes', { available: async () => { throw new Error('Synthetic capability refusal'); } }); await h.start(); expect(h.active.size).toBe(0); expect(h.shared).not.toHaveBeenCalled(); expect(host.textContent).toContain('On-device dictation is unavailable');
  });
  it('rechecks local-only readback after asynchronous capability detection', async () => {
    const pending = deferred(), h = await fixture('SessionNotes', { available: () => pending.promise }); await h.start(); h.instances[0].processLocally = false; await React.act(async () => pending.resolve('available')); expect(h.instances[0].start).not.toHaveBeenCalled();
  });
  it.each(['SessionNotes', 'VoiceToABC'])('keeps %s on device and appends each final result once', async name => {
    const h = await fixture(name); await h.start(); const rec = h.instances[0]; expect(h.active.size).toBe(1); expect(rec.processLocally).toBe(true);
    await React.act(async () => rec.onresult(event('Synthetic first'))); await React.act(async () => rec.onresult(event('Synthetic second')));
    expect(h.text().match(/Synthetic first/g)).toHaveLength(1); expect(h.text()).toContain('Synthetic second'); expect(h.shared).not.toHaveBeenCalled();
  });
  it.each(['stop', 'case', 'lock', 'unmount'])('never starts after pending availability is cancelled by %s', async change => {
    const pending = deferred(), h = await fixture('SessionNotes', { available: () => pending.promise }); await h.start(); const rec = h.instances[0];
    if (change === 'stop') await h.stop();
    if (change === 'case') await h.render('Synthetic Beaver');
    if (change === 'lock') await React.act(async () => service.lock('synthetic-test'));
    if (change === 'unmount') { await React.act(async () => root.unmount()); root = null; }
    await React.act(async () => pending.resolve('available')); expect(rec.start).not.toHaveBeenCalled(); expect(h.active.size).toBe(0);
  });
  it.each(['stop', 'case', 'lock', 'unmount'])('aborts active capture and drops queued callbacks after %s', async change => {
    const h = await fixture('VoiceToABC'); await h.start(); const rec = h.instances[0], stale = rec.onresult;
    if (change === 'stop') await h.stop();
    if (change === 'case') await h.render('Synthetic Beaver');
    if (change === 'lock') await React.act(async () => service.lock('synthetic-test'));
    if (change === 'unmount') { await React.act(async () => root.unmount()); root = null; }
    await React.act(async () => stale(event('STALE PRIVATE TRANSCRIPT'))); expect(h.active.size).toBe(0); expect(rec.abort).toHaveBeenCalled(); expect(rec.onresult).toBeNull(); expect(rec.onerror).toBeNull(); expect(rec.onend).toBeNull(); expect(host.textContent).not.toContain('STALE PRIVATE TRANSCRIPT'); expect([...host.querySelectorAll('textarea')].every(node => !node.value.includes('STALE PRIVATE TRANSCRIPT'))).toBe(true);
  });
  it('preserves typed drafts per student and supports typing without speech capability', async () => {
    const h = await fixture('VoiceToABC', { missingAvailable: true });
    await React.act(async () => { const input = host.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'SYNTHETIC OTTER DRAFT'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(h.stores.get('Synthetic Otter').voiceToAbcTranscript).toBe('SYNTHETIC OTTER DRAFT'); await h.render('Synthetic Beaver'); expect(h.text()).toBe(''); await h.render('Synthetic Otter'); expect(h.text()).toBe('SYNTHETIC OTTER DRAFT');
  });
  it('does not let an old end callback stop a replacement capture', async () => {
    const h = await fixture(); await h.start(); const oldEnd = h.instances[0].onend; await h.stop(); await h.start(); await React.act(async () => oldEnd()); expect(h.active.size).toBe(1); expect(h.instances[1].abort).not.toHaveBeenCalled();
  });
});
