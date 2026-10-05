import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';
let KS, bridgeFactory;
const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 };
beforeAll(() => {
  loadAlloModule('karaoke_audio_store_module.js');
  loadAlloModule('read_aloud_audio_service_source.jsx');
  KS = window.AlloModules.KaraokeAudioStore;
  bridgeFactory = window.AlloModules.createReadAloudLegacyBridge;
});
beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:retained') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});
function harness(options = {}) {
  let resource = { id: 'retention', type: 'simplified', data: 'Main sentence.' };
  const store = KS.createStore(), notify = vi.fn();
  const synthesize = vi.fn(async () => ({ b64: validAudioBase64(), mime: 'audio/wav' }));
  const bridge = bridgeFactory({ getResource: () => resource, getStore: (lane, context) => {
    expect(context.resource).toBeDefined();
    if (context.resource.data !== resource.data) return null;
    return store;
  }, getProfile: () => profile, synthesize,
  encode: async () => ({ b64: validAudioBase64(), mime: 'audio/wav' }),
  enumerateResourceSegments: () => [{ text: 'Main sentence.', segmentId: 'body/0/0' }],
  notify, ...options });
  return { bridge, store, notify, synthesize, replace: value => { resource = value; } };
}
it('keeps an accepted inline clip when preparing the same support worklist again', async () => {
  const h = harness(); const support = ['Word support for "Main": the central idea.'];
  expect(await h.bridge.prepare(support)).toMatchObject({ generated: 1, remaining: 0 });
  h.synthesize.mockClear();
  expect(await h.bridge.prepare(support)).toMatchObject({ generated: 0, remaining: 0 });
  expect(h.synthesize).not.toHaveBeenCalled();
});
it('treats explicit empty host inventory as authoritative instead of resurrecting FAQ fields', () => {
  const h = harness({ getResource: () => ({ id: 'empty', type: 'faq', data: [{ question: 'Deleted?', answer: 'Deleted.' }] }), enumerateResourceSegments: () => [], enumerationAuthoritative: true });
  expect(h.bridge.summary()).toMatchObject({ total: 0, ready: 0 });
});
it.each([undefined, { status: 'attached', verified: false }, { status: 'saved', verified: false }])('reports accepted capture as attached without durable proof (%j)', async receipt => {
  const h = harness({ persist: async () => receipt });
  expect(await h.bridge.capturePlayed('Main sentence.', 'blob:played')).toBe(true);
  expect(h.notify.mock.calls.at(-1)).toMatchObject([ 'Main sentence.', 'attached', 'retention', { verified: false } ]);
});
it('reports saved only when the exact capture receives saved and verified', async () => {
  const h = harness({ persist: async () => ({ status: 'saved', verified: true }) });
  expect(await h.bridge.capturePlayed('Main sentence.', 'blob:played')).toBe(true);
  expect(h.notify.mock.calls.at(-1)[1]).toBe('saved');
});
it('does not count a playable provider URL as prepared when the store rejects bytes', async () => {
  const store = { inspect: () => ({ status: 'missing' }), put: () => null, serialize: () => ({}) };
  const h = harness({ getStore: () => store });
  expect(await h.bridge.prepare(['Main sentence.'])).toMatchObject({ generated: 0, failed: 1, remaining: 1 });
});

it('rejects a completed synthesis after the same resource text changes', async () => {
  let finish;
  const h = harness({ synthesize: () => new Promise(resolve => { finish = resolve; }) });
  const pending = h.bridge.prepare(['Main sentence.']);
  while (!finish) await Promise.resolve();
  h.replace({ id: 'retention', type: 'simplified', data: 'Edited sentence.' });
  finish({ b64: validAudioBase64(), mime: 'audio/wav' });
  expect(await pending).toMatchObject({ generated: 0, failed: 1 });
  expect(Object.keys(h.store.serialize().entries || {})).toHaveLength(0);
});
it('keeps accepted clips on cancellation and resumes without resynthesizing them', async () => {
  const abort = new AbortController(); let calls = 0;
  const h = harness({ enumerateResourceSegments: () => [{ text: 'Main sentence.', segmentId: 'body/0/0' }, { text: 'Next sentence.', segmentId: 'body/0/1' }],
    synthesize: async () => { if (++calls === 2) { abort.abort(); throw Object.assign(new Error('Stopped'), { name: 'AbortError' }); }
      return { b64: validAudioBase64(), mime: 'audio/wav' }; } });
  expect(await h.bridge.prepare(['Main sentence.', 'Next sentence.'], null, { signal: abort.signal })).toMatchObject({ generated: 1, cancelled: true });
  expect(await h.bridge.prepare(['Main sentence.', 'Next sentence.'])).toMatchObject({ generated: 1, remaining: 0 });
  expect(calls).toBe(3);
});
