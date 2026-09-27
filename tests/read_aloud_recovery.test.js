import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';
let KS, createBridge;
const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 };
const identity = text => ({ adapterId: 'simplified', segmentId: 'one', spokenText: text });
beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js'); loadAlloModule('read_aloud_audio_service_source.jsx');
  KS = window.AlloModules.KaraokeAudioStore; createBridge = window.AlloModules.createReadAloudLegacyBridge;
});
beforeEach(() => {
  let serial = 0;
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:recovery-' + ++serial) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
function harness(entries = [{ text: 'First sentence.', segmentId: 'one' }, { text: 'Second sentence.', segmentId: 'two' }], synthesize) {
  const store = KS.createStore();
  synthesize ||= vi.fn(async () => ({ b64: validAudioBase64(), mime: 'audio/wav' }));
  const bridge = createBridge({ getResource: () => ({ id: 'recovery', type: 'simplified' }), getStore: () => store,
    getProfile: () => profile, enumerateResourceSegments: () => entries, synthesize });
  return { store, bridge, entries, synthesize };
}

describe('legacy synthesis settings evidence', () => {
  it.each(['synthesisRate', 'language'])('does not certify a legacy clip missing %s for a request that specifies it', field => {
    const store = KS.createStore(); const saved = { ...profile }; delete saved[field];
    const url = store.put('First sentence.', validAudioBase64(), 'audio/wav', 'ai', saved);
    const result = store.inspect('First sentence.', profile);
    expect(result).toMatchObject({ status: 'stale', reason: 'profile-unverified', unverifiedProfileFields: [field] });
    expect(store.get('First sentence.')).toBe(url); // Keep the saved take for review.
    const reloaded = KS.createStore(); reloaded.hydrate(JSON.parse(JSON.stringify(store.serialize())));
    expect(reloaded.inspect('First sentence.', profile).status).toBe('stale');
  });
  it('does not promote incomplete legacy metadata into a certified identity', () => {
    const store = KS.createStore(); store.put('First sentence.', validAudioBase64(), 'audio/wav', 'ai', { voice: 'Kore', voiceResolverVersion: 2 });
    expect(store.inspect(identity('First sentence.'), profile).status).toBe('stale');
    expect(store.serialize().version).toBe(3);
  });
  it('preserves human takes across voice settings but still rejects an edited sentence identity', () => {
    const store = KS.createStore(), target = identity('First sentence.');
    store.put(target, validAudioBase64(), 'audio/wav', 'human-teacher');
    expect(store.inspect(target, { ...profile, voice: 'Aoede', synthesisRate: 0.8 }).status).toBe('ready');
    expect(store.inspect({ ...target, spokenText: 'Edited sentence.' }, profile).status).toBe('stale');
  });
  it('counts unverified clips within stale and prepares only the incomplete clip', async () => {
    const h = harness(); await h.bridge.prepare(h.entries); h.synthesize.mockClear();
    const entry = Object.values(h.store.serialize().entries).find(e => e.identity.spokenText === 'First sentence.');
    h.store.put(entry.identity, validAudioBase64(), 'audio/wav', 'ai', { voice: 'Kore', voiceResolverVersion: 2 });
    expect(h.bridge.summary(h.entries)).toMatchObject({ ready: 1, stale: 1, unverified: 1 });
    expect(h.bridge.inspect('First sentence.')).toMatchObject({ reason: 'profile-unverified', unverifiedProfileFields: ['synthesisRate', 'language'] });
    expect(await h.bridge.prepare(h.entries)).toMatchObject({ ok: true, generated: 1, remaining: 0, failures: [] });
    expect(h.synthesize).toHaveBeenCalledTimes(1);
    expect(h.bridge.summary(h.entries)).toMatchObject({ ready: 2, stale: 0, unverified: 0 });
  });
});

describe('sentence-level preparation recovery', () => {
  it('retains all distinct failures and duplicate sentence positions while keeping the legacy last failure', async () => {
    const entries = [{ text: 'Repeated sentence.', segmentId: 'one' }, { text: 'Repeated sentence.', segmentId: 'two' }];
    const h = harness(entries, vi.fn(async ({ segment }) => { throw Object.assign(new Error(segment.segmentId), { code: segment.index ? 'resource-limit' : 'network-failed' }); }));
    const result = await h.bridge.prepare(entries);
    expect(result.failures).toMatchObject([
      { index: 0, segmentId: 'one', text: 'Repeated sentence.', code: 'network-failed', retryable: true, action: 'retry' },
      { index: 1, segmentId: 'two', text: 'Repeated sentence.', code: 'resource-limit', retryable: false, action: 'review-storage' },
    ]);
    expect(result).toMatchObject({ failed: 2, remaining: 2, failure: { code: 'resource-limit' } });
  });
  it('retains failures before cancellation, keeps successful clips and retries only the remaining ones', async () => {
    const abort = new AbortController();
    const entries = ['Saved sentence.', 'Failed sentence.', 'Stopped sentence.'].map((text, index) => ({ text, segmentId: String(index) }));
    const h = harness(entries, vi.fn(async ({ segment }) => {
      if (!segment.index) return { b64: validAudioBase64(), mime: 'audio/wav' };
      if (segment.index === 1) throw Object.assign(new Error('Provider unavailable'), { code: 'network-failed' });
      abort.abort(); throw Object.assign(new Error('Stopped'), { name: 'AbortError' });
    }));
    const result = await h.bridge.prepare(h.entries, null, { signal: abort.signal });
    expect(result).toMatchObject({ cancelled: true, failures: [{ index: 1, code: 'network-failed' }], generated: 1, failed: 1, remaining: 2 });
    expect(h.bridge.summary(h.entries)).toMatchObject({ ready: 1 });
    h.synthesize.mockReset().mockResolvedValue({ b64: validAudioBase64(), mime: 'audio/wav' });
    expect(await h.bridge.prepare(h.entries)).toMatchObject({ ok: true, generated: 2, remaining: 0, failures: [] });
    expect(h.synthesize).toHaveBeenCalledTimes(2);
  });
  it('points protected recordings to explicit review without asking the synthesizer to replace them', async () => {
    const h = harness(); await h.bridge.prepare(h.entries);
    const entry = Object.values(h.store.serialize().entries).find(e => e.identity.spokenText === 'First sentence.');
    h.store.put(entry.identity, validAudioBase64(), 'audio/wav', 'human-teacher');
    h.store.quarantine(entry.identity, { code: 'decode-failed' }); h.synthesize.mockClear();
    const result = await h.bridge.prepare(h.entries);
    expect(result.failures).toMatchObject([{ index: 0, code: 'human-recording-protected', retryable: false, action: 'review-recording' }]);
    expect(h.synthesize).not.toHaveBeenCalled();
    expect(h.store.sourceOf(entry.identity)).toBe('human-teacher');
  });
});
