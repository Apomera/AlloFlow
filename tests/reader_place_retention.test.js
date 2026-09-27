import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function fixture(options = {}) {
  let entries, raw = null;
  class ObservedMap extends Map { constructor(...args) { super(...args); entries = this; } }
  const create = new Function('Map', readFileSync('reader_place_store.js', 'utf8') + ';return createReadingPlaceStore;')(ObservedMap);
  const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
  const store = create({ getStorage: () => storage, getLocks: () => ({ request: (_key, run) => Promise.resolve().then(run) }), maxEmptyEntries: 3, ...options });
  return { store, entries: () => entries, raw: () => raw };
}
const scope = n => ({ learner: 'learner', itemId: 'reading-' + n, fingerprint: 'v1', text: 'Reading ' + n + '. '.repeat(1000) });
const answer = text => ({ responses: { 0: { mainIdea: text } } });
const visit = f => { for (let i = 10; i < 70; i++) f.store.load(scope(i)); };

describe('page-memory reading-place retention', () => {
  it('bounds empty exact-text entries and reloads an evicted reading without storage writes', () => {
    const f = fixture(); visit(f);
    expect(f.entries().size).toBe(3); expect(f.raw()).toBe(null);
    expect(f.store.load(scope(10)).place.responses).toEqual({});
    expect(f.entries().size).toBe(3); expect(f.raw()).toBe(null);
  });
  it('retains recently revisited empty readings', () => {
    const f = fixture(); [1, 2, 3, 1, 4].forEach(n => f.store.load(scope(n)));
    expect([...f.entries().values()].map(e => e.scope.itemId)).toEqual(['reading-3', 'reading-1', 'reading-4']);
  });
  it('keeps saved answers and bookmarks beyond the empty-entry limit', async () => {
    const f = fixture(), s = scope(1);
    await f.store.save(s, { ...answer('Keep this answer'), bookmark: { paragraph: 2, snippet: 'Here' } });
    const durable = f.raw(); visit(f);
    expect(f.store.load(s).place).toMatchObject({ ...answer('Keep this answer'), bookmark: { paragraph: 2 } });
    expect(f.raw()).toBe(durable); expect(f.store.exportSession('learner').readings).toHaveLength(1);
  });
  it('keeps anonymous answers and positions for the page lifetime', async () => {
    const f = fixture(), s = { ...scope(1), learner: '' }, p = { ...scope(2), learner: '' };
    await f.store.save(s, answer('Anonymous work')); await f.store.save(p, { paragraph: 4, snippet: 'Continue' }); visit(f);
    expect(f.store.load(s).place.responses[0].mainIdea).toBe('Anonymous work');
    expect(f.store.load(p).place.paragraph).toBe(4); expect(f.store.hasUnsavedWork()).toBe(true);
  });
  it('does not evict a queued save or failed work', async () => {
    let queued;
    const f = fixture({ getLocks: () => ({ request: (_key, run) => new Promise(resolve => { queued = () => resolve(run()); }) }) });
    const s = scope(1), saving = f.store.save(s, answer('Queued answer')); visit(f);
    expect(f.store.peek(s).status).toBe('saving'); queued(); await saving;
    expect(f.store.load(s).place.responses[0].mainIdea).toBe('Queued answer');
    const failed = fixture({ getStorage: () => ({ getItem: () => null, setItem: () => { throw Error('blocked'); } }) });
    await failed.store.save(s, answer('Failed answer')); visit(failed);
    expect(failed.store.load(s).place.responses[0].mainIdea).toBe('Failed answer');
    expect(failed.store.hasUnsavedWork()).toBe(true);
  });
  it('retains displaced recovery copies and their unload protection', async () => {
    const f = fixture(), s = scope(1);
    await f.store.save(s, answer('Saved answer'));
    // A failed competing write creates a reviewable conflict against another tab.
    let raw = f.raw(); const storage = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
    const g = fixture({ getStorage: () => storage }); g.store.load(s);
    await g.store.save(s, answer('Other tab'));
    const h = fixture({ getStorage: () => storage }); h.store.load(s);
    await g.store.save(s, answer('Newest remote'));
    await h.store.save(s, answer('Local answer'));
    await h.store.resolve(s, h.store.review(s), 'saved'); visit(h);
    expect(h.store.exportSession('learner').readings[0].recoveryCopies.length).toBeGreaterThan(0);
    expect(h.store.hasUnsavedWork()).toBe(true);
  });
});
