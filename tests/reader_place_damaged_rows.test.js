import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// One damaged saved row (2026-09-28) used to mark the whole device store
// corrupt, so no learner on a shared Chromebook could save, and the in-app
// repair only reaches a learner's own row. Now it blocks only its own reader.
const createStore = new Function(readFileSync(process.env.PLACE_STORE_SOURCE || 'reader_place_store.js', 'utf8') + '; return createReadingPlaceStore;')();
const scope = (extra = {}) => ({ learner: 'learner|profile:blue|Ana', itemId: 'reading', fingerprint: 'exact-v1', text: 'Original passage.', ...extra });
const key = s => [s.learner, s.itemId, s.fingerprint].join('|');
const answer = (text, field = 'mainIdea', section = '0') => ({ responses: { [section]: { [field]: text } } });
function fixture(extra = {}) {
  let raw = null, queue = Promise.resolve();
  const storage = { getItem() { return raw; }, setItem(_key, value) { raw = value; } };
  const locks = { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
  const options = { getStorage: () => storage, getLocks: () => locks, ...extra };
  return { store: createStore(options), another: () => createStore(options), seed: value => { raw = value; }, raw: () => raw };
}
const sam = scope({ learner: 'learner|profile:red|Sam' });

describe('a damaged saved row', () => {
  it.each([5, null, [], { responses: { 0: { mainIdea: 7 } } }])('from another learner (%j) does not stop this learner saving, and stays exactly as it was', async damaged => {
    const f = fixture();
    f.seed(JSON.stringify({ [key(sam)]: damaged }));
    const ana = scope();
    expect(f.store.load(ana).status).toBe('ready');
    expect(await f.store.save(ana, answer('Herons wade.'))).toMatchObject({ status: 'saved' });
    const stored = JSON.parse(f.raw());
    expect(stored[key(sam)]).toEqual(damaged);
    expect(f.another().load(ana)).toMatchObject({ status: 'saved', place: answer('Herons wade.') });
  });

  it('still blocks its own reader, who can review and repair it', async () => {
    const f = fixture();
    f.seed(JSON.stringify({ [key(sam)]: { responses: { 0: { mainIdea: 'Keep me', support: {} } } } }));
    expect(f.store.load(sam)).toMatchObject({ status: 'failed', reason: 'corrupt-store', place: answer('Keep me') });
    expect(await f.store.save(sam, answer('New'))).toMatchObject({ status: 'failed', reason: 'corrupt-store' });
    const review = f.store.inspectSaved(sam);
    expect(review.corrupt).toBe(true);
    // The draft typed while blocked is kept and waits for a retry after the repair.
    expect(await f.store.manageSaved(sam, review, 'repair')).toMatchObject({ status: 'failed', reason: 'retry-needed', place: answer('New') });
    expect((await f.store.save(sam, {})).status).toBe('saved');
    expect(f.another().load(sam).place.responses[0].mainIdea).toBe('New');
  });

  it('is never removed to make room for someone else', async () => {
    const f = fixture({ maxRecords: 2 });
    const place = scope({ itemId: 'place-only' });
    f.seed(JSON.stringify({ [key(sam)]: 42, [key(place)]: { paragraph: 1, snippet: 'Here', at: 1 } }));
    expect(await f.store.save(scope(), answer('Mine'))).toMatchObject({ status: 'saved' });
    const stored = JSON.parse(f.raw());
    expect(stored[key(sam)]).toBe(42);
    expect(stored[key(place)]).toBeUndefined();
    // With only damaged rows left to remove, the store reports it is full rather than delete them.
    const full = fixture({ maxRecords: 1 });
    full.seed(JSON.stringify({ [key(sam)]: 42 }));
    expect(await full.store.save(scope(), answer('Mine'))).toMatchObject({ status: 'failed', reason: 'capacity' });
    expect(full.raw()).toBe(JSON.stringify({ [key(sam)]: 42 }));
  });

  it('a damaged store root still stops everyone, and is left untouched', async () => {
    const f = fixture();
    f.seed('[]');
    expect(await f.store.save(scope(), answer('Mine'))).toMatchObject({ status: 'failed', reason: 'corrupt-store' });
    expect(f.raw()).toBe('[]');
  });
});
