import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

let KS;
const profile = { voice: 'Kore', language: 'English', synthesisRate: 1, voiceResolverVersion: 2 };
const identity = (segmentId, spokenText = 'Read this sentence.') => ({ adapterId: 'simplified', scopeId: 'main', segmentId, spokenText });
const put = (store, target, source = 'ai') => store.put(target, validAudioBase64(), 'audio/wav', source, profile);
beforeAll(() => { loadAlloModule('karaoke_audio_store_module.js'); KS = window.AlloModules.KaraokeAudioStore; });
beforeEach(() => {
  let serial = 0;
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:clip-' + ++serial) });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
});

describe('audio store mutation subscriptions', () => {
  it('publishes committed state and a monotonic revision for save, replace, quarantine, remove and clear', () => {
    const store = KS.createStore(); const target = identity('one'); const states = [];
    expect(store.getRevision()).toBe(0);
    store.subscribe(event => states.push({ ...event, status: store.inspect(target, profile).status, size: store.size() }));
    put(store, target); put(store, target);
    store.quarantine(target, { code: 'media-playback-failed' }); store.remove(target);
    put(store, target); store.clear();
    expect(states.map(e => e.type)).toEqual(['put', 'put', 'quarantine', 'remove', 'put', 'clear']);
    expect(states.map(e => e.revision)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(states.map(e => e.status)).toEqual(['ready', 'ready', 'corrupt', 'missing', 'ready', 'missing']);
    expect(states.at(-1).size).toBe(0);
    expect(store.getRevision()).toBe(6);
  });
  it('publishes hydration once for a complete batch, including mixed V4 and legacy entries', () => {
    const writer = KS.createStore(); put(writer, identity('one')); put(writer, 'Another sentence.');
    const reader = KS.createStore(); const sizes = [];
    reader.subscribe(event => sizes.push([event.type, reader.size()]));
    expect(reader.hydrate(writer.serialize())).toBe(2);
    expect(sizes).toEqual([['hydrate', 2]]);
    const legacyReader = KS.createStore(); const changed = vi.fn(); legacyReader.subscribe(changed);
    const legacyWriter = KS.createStore(); put(legacyWriter, 'Legacy sentence.');
    expect(legacyReader.hydrate(legacyWriter.serialize())).toBe(1);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith({ type: 'hydrate', revision: 1 });
  });
  it('does not publish rejected writes, absent removals, empty clears or unchanged reconciliation', () => {
    const store = KS.createStore(); const target = identity('one'); put(store, target, 'human');
    const changed = vi.fn(); store.subscribe(changed); const revision = store.getRevision();
    expect(put(store, target)).toBeNull();
    expect(store.put(identity('two'), 'invalid', 'audio/wav', 'ai', profile)).toBeNull();
    store.remove(identity('absent')); store.quarantine(identity('absent')); store.reconcile([target]);
    store.hydrate({ version: 4, entries: {} }); store.hydrate(null);
    expect(changed).not.toHaveBeenCalled(); expect(store.getRevision()).toBe(revision);
    store.clear(); changed.mockClear(); store.clear(); expect(changed).not.toHaveBeenCalled();
  });
  it('publishes reconciliation once and preserves human takes', () => {
    const store = KS.createStore(); put(store, identity('human'), 'human'); put(store, identity('ai')); put(store, 'Legacy AI.');
    const changed = vi.fn(); store.subscribe(changed);
    expect(store.reconcile([])).toMatchObject({ removedAi: 2, preservedHuman: 1, changed: true });
    expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0][0].type).toBe('reconcile');
    expect(store.sourceOf(identity('human'))).toBe('human');
  });
  it('reports legacy promotion once without turning later reads into mutations', () => {
    const store = KS.createStore(); const target = identity('one');
    put(store, target.spokenText); const changed = vi.fn(); store.subscribe(changed);
    expect(store.inspect(target, profile).status).toBe('ready');
    store.inspect(target, profile); store.getCompatible(target, profile); store.serialize();
    expect(changed).toHaveBeenCalledTimes(1); expect(changed.mock.calls[0][0].type).toBe('promote');
  });
  it('isolates stores, unsubscribes and contains listener errors without breaking saves', () => {
    const a = KS.createStore(), b = KS.createStore(); const changed = vi.fn();
    a.subscribe(() => { throw new Error('broken observer'); });
    const unsubscribe = a.subscribe(changed); const other = vi.fn(); b.subscribe(other);
    expect(put(a, identity('one'))).toBeTruthy(); expect(changed).toHaveBeenCalledTimes(1); expect(other).not.toHaveBeenCalled();
    unsubscribe(); unsubscribe(); a.clear(); expect(changed).toHaveBeenCalledTimes(1);
    expect(Object.keys(changed.mock.calls[0][0]).sort()).toEqual(['revision', 'type']);
  });
  it('delivers revisions in order when a listener triggers another mutation', () => {
    const store = KS.createStore(), received = [];
    store.subscribe(event => { if (event.type === 'put') store.clear(); });
    store.subscribe(event => received.push(event.revision));
    put(store, identity('one'));
    expect(received).toEqual([1, 2]); expect(store.size()).toBe(0);
  });
});
