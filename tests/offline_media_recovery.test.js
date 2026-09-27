import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

let KS, createService, createBridge, createArtifact;
const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, provider: 'gemini', voiceResolverVersion: 2 };
const audio = n => ({ b64: validAudioBase64(192, n || 65), mime: 'audio/wav' });
beforeAll(() => {
  ['karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'read_aloud_artifact_audio_module.js'].forEach(loadAlloModule);
  KS = window.AlloModules.KaraokeAudioStore;
  createService = window.AlloModules.createReadAloudAudioService;
  createBridge = window.AlloModules.createReadAloudLegacyBridge;
  createArtifact = window.AlloModules.createReadAloudArtifactAudio;
});
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
function harness(persist = async () => undefined) {
  const resource = { id: 'r', type: 'simplified', parts: [{ id: 'a', text: 'One.' }, { id: 'b', text: 'Two.' }] };
  const store = KS.createStore();
  const synthesize = vi.fn(async () => audio());
  const service = createService({ getStoreModule: () => store, getResource: () => resource,
    getSynthesisProfile: () => profile, synthesize, persist }).forResource({ resourceId: 'r', resourceType: 'simplified',
    persistencePolicy: 'durable', adapter: { enumerate: r => r.parts, spokenText: p => p.text,
      fields: p => ({ segmentId: p.id, storageKey: p.text }) } });
  return { resource, store, synthesize, service };
}

describe('offline media preparation and recovery', () => {
  it('does not prune other cards when preparing a subset or retrying a missing item', async () => {
    const resource = { id: 'r', type: 'simplified' }, store = KS.createStore();
    const segments = [{ segmentId: 'card/a', text: 'One.' }, { segmentId: 'card/b', text: 'Two.' }];
    const synthesize = vi.fn(async () => audio());
    const bridge = createBridge({ getResource: () => resource, getStore: () => store, getProfile: () => profile,
      synthesize, enumerateResourceSegments: () => segments });
    await bridge.prepare(segments);
    const original = JSON.stringify(store.serialize());
    synthesize.mockClear();
    await bridge.prepare([segments[1]]);
    expect(JSON.stringify(store.serialize())).toBe(original);
    expect(synthesize).not.toHaveBeenCalled();
    await bridge.remove(segments[1]);
    await bridge.prepare([segments[1]]);
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(bridge.inspect(segments[0]).status).toBe('ready');
    expect(store.size()).toBe(2);
    const durableStore = KS.createStore(); durableStore.hydrate(JSON.parse(JSON.stringify(store.serialize())));
    expect(bridge.readiness(segments, 'reference', { durableStore, receipt: { verified: true } })).toMatchObject({ state: 'ready', durableReady: 2 });
    durableStore.clear();
    expect(bridge.readiness(segments, 'reference', { durableStore, receipt: { verified: true } })).toMatchObject({ state: 'session-only', durableReady: 0 });
    const changedProfile = await bridge.prepare([segments[1]], null, { profile: { voice: 'Aoede' } });
    expect(changedProfile).toMatchObject({ ok: true, remaining: 0, total: 1, generated: 1 });
  });

  it('distinguishes attachment, verified durability, stale audio, and failed storage', async () => {
    const h = harness(), events = [];
    h.service.subscribe(event => events.push(event.type));
    expect(h.service.readiness().state).toBe('partial');
    await h.service.prepareAll();
    expect(events).toContain('attached');
    expect(events).not.toContain('persisted');
    expect(h.service.readiness()).toMatchObject({ state: 'session-only', ready: 2, durableReady: 0 });
    const durableStore = KS.createStore(); durableStore.hydrate(JSON.parse(JSON.stringify(h.store.serialize())));
    const receipt = { verified: true, verifiedAt: '2026-09-26T12:00:00Z' };
    expect(h.service.readiness({ durableStore, receipt })).toMatchObject({ state: 'ready', durableReady: 2 });
    await h.service.saveRecording('a', audio(70));
    expect(h.service.readiness({ durableStore, receipt })).toMatchObject({ state: 'session-only', durableReady: 1 });
    durableStore.clear();
    expect(h.service.readiness({ durableStore, receipt }).durableReady).toBe(0);
    expect(harness().service.readiness({ failure: new Error('denied') }).state).toBe('failed');
  });

  it('keeps clips after a failed persistence callback and can retry saving without synthesis', async () => {
    const persist = vi.fn(async () => false), h = harness(persist);
    const result = await h.service.prepareAll();
    expect(result.failed).toBe(2);
    expect(h.service.summary().ready).toBe(2);
    persist.mockResolvedValue({ status: 'saved', verified: true });
    h.synthesize.mockClear();
    await expect(h.service.retryPersistence()).resolves.toBe(true);
    expect(h.synthesize).not.toHaveBeenCalled();
  });

  it('checks an explicitly requested synthesis profile before deciding to reuse clips', async () => {
    const h = harness(); await h.service.prepareAll(); h.synthesize.mockClear();
    const result = await h.service.prepareAll({ profile: { voice: 'Aoede' } });
    expect(h.synthesize).toHaveBeenCalledTimes(2);
    expect(h.service.inspect('a', { profile: { voice: 'Aoede' } }).status).toBe('ready');
    expect(result.summary.ready).toBe(2);
    expect(h.service.readiness({ profile: { voice: 'Aoede' } }).ready).toBe(2);
  });

  it('joins a preparation requested reentrantly by the start progress callback', async () => {
    const h = harness(); let joined;
    const pending = h.service.prepareAll({ onProgress: event => {
      if (event.phase === 'start') joined = h.service.prepareAll();
    } });
    await pending;
    expect(joined).toBe(pending);
    expect(h.synthesize).toHaveBeenCalledTimes(2);
  });

  it('coalesces identical jobs, rejects competing profiles, and stops before storing a cancelled response', async () => {
    const h = harness(); let release;
    h.synthesize.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const controller = new AbortController();
    const first = h.service.prepareAll({ signal: controller.signal });
    expect(h.service.prepareAll({ signal: controller.signal })).toBe(first);
    await expect(h.service.prepareAll({ profile: { voice: 'Aoede' } })).rejects.toMatchObject({ code: 'preparation-in-progress' });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(h.service.readiness().state).toBe('preparing');
    controller.abort(); release(audio());
    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(h.store.size()).toBe(0);
  });

  it('does not synthesize replacements for quarantined human recordings', async () => {
    const h = harness();
    await h.service.saveRecording('a', audio());
    await h.service.quarantine('a', { code: 'decode-failed' });
    h.synthesize.mockClear();
    const result = await h.service.prepareAll();
    expect(result.errors[0].error.code).toBe('human-recording-protected');
    expect(h.synthesize.mock.calls.map(([request]) => request.text)).toEqual(['Two.']);
    expect(h.store.sourceOf('One.')).toBe('human-teacher');
    expect(h.service.readiness().nextActions).toContain('review-recordings');
  });
});

describe('resumable portable narration', () => {
  const options = { ownerApproved: true, resourceId: 'story', segments: [{ segmentId: 'a', text: 'One.' }, { segmentId: 'b', text: 'Two.' }] };
  it('reuses only current checkpoint clips after a network failure and profile change', async () => {
    const callTTS = vi.fn(async text => { if (text === 'Two.') throw new Error('offline'); return audio(); });
    const helper = createArtifact({ callTTS });
    const first = await helper.prepare(options);
    expect(first).toMatchObject({ available: 1, remaining: 1 });
    callTTS.mockImplementation(async () => audio()); callTTS.mockClear();
    const second = await helper.prepare({ ...options, checkpoint: JSON.parse(JSON.stringify(first.checkpoint)) });
    expect(second).toMatchObject({ available: 2, remaining: 0, skipped: 1 });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Two.']);
    callTTS.mockClear();
    await helper.prepare({ ...options, defaultVoice: 'Aoede', checkpoint: second.checkpoint });
    expect(callTTS).toHaveBeenCalledTimes(2);
  });
  it('returns partial bytes on AbortError, frees URLs, and resumes after serialization', async () => {
    const controller = new AbortController(), callTTS = vi.fn(async () => audio());
    const helper = createArtifact({ callTTS });
    let cancellation;
    try { await helper.prepare({ ...options, signal: controller.signal, onProgress: p => { if (p.prepared === 1) controller.abort(); } }); }
    catch (error) { cancellation = error; }
    expect(cancellation).toMatchObject({ name: 'AbortError', partialResult: { cancelled: true, available: 1, remaining: 1, prepared: 1 } });
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    callTTS.mockClear();
    await helper.prepare({ ...options, checkpoint: JSON.parse(JSON.stringify(cancellation.checkpoint)) });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['Two.']);
  });
  it('rejects a different artifact checkpoint and does not transfer learner recordings', async () => {
    const callTTS = vi.fn(async () => audio()), helper = createArtifact({ callTTS });
    const first = await helper.prepare(options);
    await expect(helper.prepare({ ...options, resourceId: 'different', checkpoint: first.checkpoint })).rejects.toMatchObject({ code: 'checkpoint-mismatch' });
    Object.values(first.checkpoint.payload.entries).forEach(entry => { entry.source = 'human-student'; entry.audio = audio(77).b64; });
    const result = await helper.prepare({ ...options, checkpoint: first.checkpoint });
    expect(Object.values(result.audioBySegmentId).every(entry => entry.base64 !== audio(77).b64)).toBe(true);
    expect(JSON.stringify(result.checkpoint)).not.toContain('human-student');
  });
  it('discards foreign checkpoint scopes and retries only edited current identities', async () => {
    const callTTS = vi.fn(async () => audio()), helper = createArtifact({ callTTS });
    const first = await helper.prepare(options);
    const entries = first.checkpoint.payload.entries;
    const foreign = JSON.parse(JSON.stringify(Object.values(entries)[0]));
    foreign.identity.scopeId = 'foreign'; foreign.source = 'human-teacher'; foreign.audio = audio(88).b64;
    entries[KS.portableKeyForIdentity(foreign.identity)] = foreign;
    callTTS.mockClear();
    const result = await helper.prepare({ ...options, checkpoint: first.checkpoint,
      segments: [{ segmentId: 'a', text: 'One edited.' }, options.segments[1]] });
    expect(callTTS.mock.calls.map(([text]) => text)).toEqual(['One edited.']);
    expect(result).toMatchObject({ available: 2, remaining: 0, skipped: 1 });
    expect(JSON.stringify(result.checkpoint)).not.toContain('foreign');
    expect(Object.values(result.audioBySegmentId).some(entry => entry.base64 === audio(88).b64)).toBe(false);
  });
});

const utils = readFileSync('utils_pure_source.jsx', 'utf8');
const writeStart = utils.indexOf('const writeVerifiedStorageSnapshot =');
const writeEnd = utils.indexOf('\n};', writeStart) + 3;
const writeVerified = new Function(utils.slice(writeStart, writeEnd) + '; return writeVerifiedStorageSnapshot;')();
function writerHarness(set) {
  const start = utils.indexOf('  set: async (key, value, options)'), end = utils.indexOf('  del: async', start);
  return new Function('window', 'warnLog', '_dsMirrorSet', 'return ({' + utils.slice(start, end) + '}).set;')({ idbKeyval: { set } }, vi.fn(), vi.fn());
}
describe('verified device save receipts', () => {
  it('preserves legacy false results and exposes real quota errors to strict writers', async () => {
    const quota = new DOMException('full', 'QuotaExceededError');
    const set = writerHarness(async () => { throw quota; });
    await expect(set('history', {})).resolves.toBe(false);
    await expect(set('history', {}, { throwOnError: true })).rejects.toBe(quota);
  });
  it('rejects false acknowledgement, missing data, readback mismatch, and stale ownership', async () => {
    const snapshot = { items: [{ id: 'r' }] };
    await expect(writeVerified({ set: async () => false }, 'history', snapshot)).rejects.toMatchObject({ code: 'storage-write-unacknowledged' });
    for (const saved of [null, { items: [] }]) {
      await expect(writeVerified({ set: async () => true, get: async () => saved }, 'history', snapshot)).rejects.toMatchObject({ code: 'storage-readback-mismatch' });
    }
    const get = vi.fn(async () => snapshot); let current = true;
    expect(await writeVerified({ set: async () => { current = false; return true; }, get }, 'history', snapshot, () => current)).toEqual({ status: 'superseded', verified: false });
    expect(get).not.toHaveBeenCalled();
    expect(await writeVerified({ set: async () => true, get }, 'history', snapshot)).toMatchObject({ status: 'saved', verified: true, snapshot });
    expect(get).toHaveBeenCalledWith('history', { throwOnError: true, localOnly: true });
  });
});

describe('export checkpoint persistence integration', () => {
  const options = { ownerApproved: true, resourceId: 'story-r', resourceType: 'adventure-storybook-read-aloud', adapterId: 'adventure-storybook-artifact', scopeId: 'story',
    segments: [{ segmentId: 'a', text: 'One.' }, { segmentId: 'b', text: 'Two.' }] };
  function setup() {
    const saved = new Map();
    const storage = { set: vi.fn(async (key, value) => { saved.set(key, JSON.parse(JSON.stringify(value))); return true; }),
      get: vi.fn(async key => saved.get(key)) };
    const callTTS = vi.fn(async () => audio());
    const helper = createArtifact({ callTTS });
    return { saved, storage, callTTS, dependencies: { storage, writeVerifiedStorageSnapshot: writeVerified, prepare: value => helper.prepare(value) } };
  }
  it('resumes accepted clips from device storage in a fresh recovery instance', async () => {
    const h = setup(); h.callTTS.mockImplementation(async text => { if (text === 'Two.') throw new Error('network lost'); return audio(); });
    const first = await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepare(options, h.dependencies);
    expect(first).toMatchObject({ available: 1, recovery: { state: 'saved', resumed: false } });
    h.callTTS.mockImplementation(async () => audio()); h.callTTS.mockClear();
    const second = await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepare(options, h.dependencies);
    expect(second).toMatchObject({ available: 2, skipped: 1, recovery: { state: 'saved', resumed: true } });
    expect(h.callTTS.mock.calls.map(([text]) => text)).toEqual(['Two.']);
  });
  it('keeps a quota-failed checkpoint in the session and retries storage without synthesis', async () => {
    const h = setup(), recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery();
    h.storage.set.mockRejectedValue(new DOMException('Full', 'QuotaExceededError'));
    expect(await recovery.prepare(options, h.dependencies)).toMatchObject({ available: 2, failed: 0, recovery: { state: 'session-only', code: 'QuotaExceededError' } });
    h.storage.set.mockImplementation(async (key, value) => { h.saved.set(key, JSON.parse(JSON.stringify(value))); return true; });
    h.callTTS.mockClear();
    expect(await recovery.prepare(options, h.dependencies)).toMatchObject({ skipped: 2, recovery: { state: 'saved' } });
    expect(h.callTTS).not.toHaveBeenCalled();
  });
  it('retains a cancelled partial checkpoint for reload and blocks a duplicate active job', async () => {
    const h = setup(), recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery();
    let release; h.callTTS.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const controller = new AbortController();
    const first = recovery.prepare({ ...options, signal: controller.signal, onProgress: p => { if (p.prepared === 1) controller.abort(); } }, h.dependencies);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    await expect(recovery.prepare(options, h.dependencies)).rejects.toMatchObject({ code: 'preparation-in-progress' });
    release(audio());
    await expect(first).rejects.toMatchObject({ name: 'AbortError', partialResult: { available: 1 }, recovery: { state: 'saved' } });
    h.callTTS.mockClear();
    expect(await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepare(options, h.dependencies)).toMatchObject({ available: 2, skipped: 1 });
    expect(h.callTTS.mock.calls.map(([text]) => text)).toEqual(['Two.']);
  });
  it('recovers a malformed checkpoint and requires approval before reading storage', async () => {
    const h = setup(); h.storage.get.mockResolvedValueOnce({ version: 999, payload: {} });
    const recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery();
    await expect(recovery.prepare({ ...options, ownerApproved: false }, h.dependencies)).rejects.toMatchObject({ code: 'owner-approval-required' });
    expect(h.storage.get).not.toHaveBeenCalled();
    expect(await recovery.prepare(options, h.dependencies)).toMatchObject({ available: 2, recovery: { resumed: false, state: 'saved' } });
  });
});

describe('export epilogue recovery', () => {
  const options = { ownerApproved: true, resourceId: 'story-r', resourceType: 'adventure-storybook-read-aloud', adapterId: 'adventure-storybook-artifact', scopeId: 'story',
    input: JSON.stringify([1, 'Journey', [['scene', 'One.']], 'English']) };
  function setup() {
    const saved = new Map();
    const storage = { get: vi.fn(async key => saved.get(key)), set: vi.fn(async (key, value) => { saved.set(key, structuredClone(value)); return true; }) };
    const generate = vi.fn(async () => 'You completed the journey.');
    return { saved, storage, generate, dependencies: { storage, generate, writeVerifiedStorageSnapshot: writeVerified } };
  }
  it('reuses verified text after reload without a provider request or another write', async () => {
    const h = setup();
    expect(await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepareText(options, h.dependencies))
      .toMatchObject({ text: 'You completed the journey.', recovery: { state: 'saved', resumed: false } });
    h.generate.mockRejectedValue(new Error('offline')); h.generate.mockClear(); h.storage.set.mockClear();
    expect(await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepareText(options, h.dependencies))
      .toMatchObject({ text: 'You completed the journey.', recovery: { state: 'saved', resumed: true } });
    expect(h.generate).not.toHaveBeenCalled(); expect(h.storage.set).not.toHaveBeenCalled();
    expect(h.storage.get).toHaveBeenLastCalledWith(expect.stringContaining('allo_read_aloud_checkpoint_text:'), { throwOnError: true, localOnly: true });
  });
  it.each(['journey', 'language', 'resource', 'version', 'empty-text', 'foreign-identity'])('does not reuse a %s mismatch', async change => {
    const h = setup(); await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepareText(options, h.dependencies);
    const next = { ...options }, stored = [...h.saved.values()][0];
    if (change === 'journey') next.input = JSON.stringify([1, 'Journey', [['scene', 'Changed.']], 'English']);
    if (change === 'language') next.input = JSON.stringify([1, 'Journey', [['scene', 'One.']], 'Spanish']);
    if (change === 'resource') next.resourceId = 'other-story';
    if (change === 'version') stored.version = 999;
    if (change === 'empty-text') stored.text = ' ';
    if (change === 'foreign-identity') stored.identity = 'other';
    h.generate.mockResolvedValue('A new epilogue.'); h.generate.mockClear();
    expect(await window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepareText(next, h.dependencies))
      .toMatchObject({ text: 'A new epilogue.', recovery: { resumed: false } });
    expect(h.generate).toHaveBeenCalledOnce();
  });
  it('keeps quota-failed text in the session and retries saving without regeneration', async () => {
    const h = setup(), recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery();
    h.storage.set.mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'));
    expect(await recovery.prepareText(options, h.dependencies)).toMatchObject({ recovery: { state: 'session-only', code: 'QuotaExceededError' } });
    h.generate.mockClear();
    expect(await recovery.prepareText(options, h.dependencies)).toMatchObject({ recovery: { state: 'saved', resumed: true } });
    expect(h.generate).not.toHaveBeenCalled();
    h.saved.clear(); h.storage.set.mockRejectedValue(new Error('storage unavailable'));
    expect(await recovery.prepareText(options, h.dependencies)).toMatchObject({ recovery: { state: 'session-only', resumed: true } });
    h.generate.mockRejectedValue(new Error('offline'));
    await expect(window.AlloModules.ReadAloudArtifactAudio.createRecovery().prepareText(options, h.dependencies)).rejects.toThrow('offline');
  });
  it('rejects duplicates, drops a cancelled provider result, and allows a later attempt', async () => {
    const h = setup(), recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery(), controller = new AbortController();
    let finish; h.generate.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = recovery.prepareText({ ...options, signal: controller.signal }, h.dependencies);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'));
    await expect(recovery.prepareText(options, h.dependencies)).rejects.toMatchObject({ code: 'preparation-in-progress' });
    controller.abort(); finish('Cancelled summary'); await rejected;
    expect(h.saved.size).toBe(0);
    expect(await recovery.prepareText(options, h.dependencies)).toMatchObject({ text: 'You completed the journey.', recovery: { resumed: false } });
  });
  it('requires consent and current input before reading storage, and rejects empty provider output', async () => {
    const h = setup(), recovery = window.AlloModules.ReadAloudArtifactAudio.createRecovery();
    await expect(recovery.prepareText({ ...options, ownerApproved: false }, h.dependencies)).rejects.toMatchObject({ code: 'owner-approval-required' });
    await expect(recovery.prepareText({ ...options, input: '' }, h.dependencies)).rejects.toMatchObject({ code: 'checkpoint-input-required' });
    expect(h.storage.get).not.toHaveBeenCalled();
    h.generate.mockResolvedValue(' ');
    await expect(recovery.prepareText(options, h.dependencies)).rejects.toMatchObject({ code: 'export-text-empty' });
    expect(h.storage.set).not.toHaveBeenCalled();
  });
});

describe('host autosave media receipts', () => {
  it.each(['quota', 'false', 'readback', 'ok'])('reports the actual %s save result without changing in-memory media', async mode => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const start = host.indexOf('        const retention = ALLO_WORKSPACE_RECOVERY.resolvePolicy(', host.indexOf('const saveHistory ='));
    const end = host.indexOf('\n    }).finally', start);
    const original = { id: 'r', type: 'simplified', data: 'One.', timestamp: '2026-09-26', karaokeAudio: { version: 4, entries: {} },
      readingSupports: { annotations: [{ id: 'picture-1', image: { src: 'data:image/png;base64,abcd' }, text: 'Help' }] } };
    let saved, writes = 0;
    const storage = { set: vi.fn(async (_key, value) => {
      writes++; if (mode === 'false') return false;
      if (mode === 'quota' && writes === 1) throw new DOMException('full', 'QuotaExceededError');
      saved = JSON.parse(JSON.stringify(value)); return true;
    }), get: async () => mode === 'readback' ? null : saved };
    window.AlloModules.UtilsPure = { writeVerifiedStorageSnapshot: writeVerified };
    window.stripReadingSupportPictures = item => ({ ...item, readingSupports: { annotations: item.readingSupports.annotations.map(({ image, ...entry }) => entry) } });
    const lastSaved = vi.fn();
    const run = new Function('storageDB', 'history', 'setLastSaved', 'addToast', 'warnLog', 't',
      'const owner={sequence:1}, sequence=1, canvasRecoveryStoreRef={current:{}}; const ALLO_WORKSPACE_RECOVERY={resolvePolicy:()=>({maxOfflineItems:50})}; return (async()=>{' + host.slice(start, end) + '})();');
    await run(storage, [original], lastSaved, vi.fn(), vi.fn(), x => x);
    expect(original.karaokeAudio).toBeTruthy();
    expect(original.readingSupports.annotations[0].image).toBeTruthy();
    expect(lastSaved).toHaveBeenCalledTimes(['quota', 'ok'].includes(mode) ? 1 : 0);
    expect(window.__alloOfflineMediaPersistence.status).toBe(mode === 'quota' ? 'text-only' : mode === 'ok' ? 'saved' : 'failed');
    expect(window.__alloOfflineMediaPersistence.snapshot).toBeUndefined();
    if (mode === 'quota') {
      expect(saved.items[0].karaokeAudio).toBeUndefined();
      expect(saved.items[0].offlineMediaOmissions).toEqual([{ field: 'readingSupports', id: 'picture-1', kind: 'picture', reason: 'storage-quota' }]);
      expect(saved.items[0].readingSupports.annotations[0].text).toBe('Help');
    }
  });

  it('reads local device state, reports active preparation, and drops obsolete readiness requests', async () => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const start = host.indexOf('  window.__alloGetReadAloudReadiness =');
    const end = host.indexOf('  window.__alloRetryReadAloudPersistence =', start);
    const bind = new Function('storageDB', '_getReadAloudBridge', 'generatedContent', host.slice(start, end));
    const bridge = { readiness: vi.fn((_sentences, _lane, options) => ({ state: options.preparing ? 'preparing' : 'session-only' })) };
    const get = vi.fn(async () => ({ items: [{ id: 'r', offlineMediaOmissions: [{ id: 'p' }] }] }));
    window.__alloPrepareReadAloudController = new AbortController();
    bind({ get }, () => bridge, { id: 'r' });
    expect(await window.__alloGetReadAloudReadiness()).toMatchObject({ state: 'preparing', pictureOmissions: [{ id: 'p' }] });
    expect(get).toHaveBeenCalledWith('allo_offline_history', { throwOnError: true, localOnly: true });
    let release;
    get.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const pending = window.__alloGetReadAloudReadiness();
    window.__alloGetReadAloudReadiness = () => null;
    release({ items: [] });
    expect(await pending).toBeNull();
    expect(bridge.readiness).toHaveBeenCalledTimes(1);
    window.__alloPrepareReadAloudController = null;
  });
});
