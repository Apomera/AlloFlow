import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

let storeApi, createService;
beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js');
  new Function(readFileSync(resolve('read_aloud_audio_service_source.jsx'), 'utf8'))();
  storeApi = window.AlloModules.KaraokeAudioStore;
  createService = window.AlloModules.createReadAloudAudioService;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function harness(extra = {}) {
  let urlCounter = 0;
  vi.stubGlobal('URL', class MockUrl extends URL {
    static createObjectURL() { return 'blob:test-clip-' + (++urlCounter); }
    static revokeObjectURL() {}
  });
  const resource = { id: 'recovery-reading', parts: [{ id: 'a', text: 'First sentence.' }, { id: 'b', text: 'Second sentence.' }] };
  const store = storeApi.createStore();
  const profile = { voice: 'af_heart', language: 'English', synthesisRate: 1, provider: 'local', voiceResolverVersion: 2 };
  const synthesize = extra.synthesize || vi.fn(async ({ segment }) => ({ url: 'blob:synth-' + segment.segmentId, b64: validAudioBase64(), mime: 'audio/wav' }));
  const persist = extra.persist || vi.fn(async () => ({ status: 'saved', verified: true }));
  const service = createService({ getStoreModule: () => store, getResource: () => resource,
    getSynthesisProfile: () => profile, synthesize, persist });
  const bound = service.forResource({ resourceId: resource.id, resourceType: 'simplified', lane: 'reference', persistencePolicy: 'durable',
    adapter: { enumerate: value => value.parts, spokenText: part => part.text, fields: part => ({ segmentId: part.id, storageKey: part.text }) } });
  return { bound, store, synthesize, persist, profile };
}
const snapshot = store => { const saved = storeApi.createStore(); saved.hydrate(store.serialize()); return saved; };

describe('audio preparation retains partial work and verifies device saves', () => {
  it('keeps playable clips after a save failure and retries saving without resynthesizing', async () => {
    const persist = vi.fn().mockResolvedValueOnce({ status: 'failed', verified: false })
      .mockResolvedValue({ status: 'saved', verified: true });
    const h = harness({ persist });
    const result = await h.bound.prepareAll();
    expect(result).toMatchObject({ prepared: 1, failed: 1, total: 2 });
    expect(result.errors[0].error.code).toBe('persistence-failed');
    expect(h.bound.summary()).toMatchObject({ ready: 2, missing: 0 });
    expect(h.bound.readiness()).toMatchObject({ state: 'session-only', ready: 2, durableReady: 0, sessionOnly: 2, remaining: 0 });
    expect(await h.bound.retryPersistence()).toBe(true);
    expect(h.synthesize).toHaveBeenCalledTimes(2);
    expect(h.bound.readiness({ durableStore: snapshot(h.store), receipt: { status: 'saved', verified: true } }))
      .toMatchObject({ state: 'ready', durableReady: 2, sessionOnly: 0 });
  });
  it('does not count an attached or unverified snapshot as saved device audio', async () => {
    const h = harness({ persist: vi.fn(async () => ({ status: 'attached', verified: false })) });
    await h.bound.prepareAll();
    const readiness = h.bound.readiness({ durableStore: snapshot(h.store), receipt: { status: 'attached', verified: false } });
    expect(readiness).toMatchObject({ state: 'session-only', durableReady: 0, sessionOnly: 2, verifiedAt: null });
    expect(readiness.nextActions).toContain('retry-save');
  });
  it('counts the currently selected bytes and preserves a prior saved take until replacement is verified', async () => {
    const h = harness(); await h.bound.prepareAll();
    const durableStore = snapshot(h.store);
    h.synthesize.mockResolvedValueOnce({ url: 'blob:replacement', b64: validAudioBase64(192, 66), mime: 'audio/wav' });
    await h.bound.regenerate('a');
    expect(h.bound.readiness({ durableStore, receipt: { status: 'saved', verified: true } }))
      .toMatchObject({ ready: 2, durableReady: 1, sessionOnly: 1, remaining: 0 });
    expect(durableStore.inspect('First sentence.', h.profile).status).toBe('ready');
  });
  it('joins repeated identical preparation and preserves completed clips when the next synthesis is cancelled', async () => {
    const controller = new AbortController();
    let secondStarted;
    const started = new Promise(resolveStart => { secondStarted = resolveStart; });
    const synthesize = vi.fn(async ({ segment, signal }) => {
      if (segment.segmentId === 'a') return { url: 'blob:first', b64: validAudioBase64(), mime: 'audio/wav' };
      secondStarted();
      return new Promise((resolveAudio, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('Stopped.'), { name: 'AbortError' })), { once: true }));
    });
    const h = harness({ synthesize });
    const first = h.bound.prepareAll({ signal: controller.signal });
    const repeated = h.bound.prepareAll({ signal: controller.signal });
    expect(repeated).toBe(first);
    const rejection = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    await started; controller.abort(); await rejection;
    expect(h.bound.summary()).toMatchObject({ ready: 1, missing: 1 });
    expect(h.synthesize).toHaveBeenCalledTimes(2);
    expect(h.persist).toHaveBeenCalledTimes(1);
    await h.bound.retryPersistence();
    expect(h.bound.summary()).toMatchObject({ ready: 1, missing: 1 });
  });
});
