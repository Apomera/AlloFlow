import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Reading places on a shared device (2026-09-28). Every row stored the whole
// passage, even a row holding only a scroll position, and only the row COUNT
// could evict: 70 long readings made any new answer fail "too-large", and a
// device full of answers refused every reader's work with no way out.
const createStore = new Function(readFileSync('reader_place_store.js', 'utf8') + '; return createReadingPlaceStore;')();
const KEY = 'alloflow_reading_places_v1';
const LONG = 'The heron waits in the shallow water. '.repeat(560); // ~21,000 characters
const scope = (extra = {}) => ({ learner: 'learner|Blue Fox', itemId: 'reading', fingerprint: 'exact-v1', text: LONG, ...extra });
const key = s => [s.learner, s.itemId, s.fingerprint].join('|');
const answer = text => ({ responses: { 0: { mainIdea: text } } });
const DAY = 24 * 60 * 60 * 1000;
function fixture(extra = {}) {
  let raw = null, queue = Promise.resolve(), clock = 1000 * DAY;
  const storage = { getItem: () => raw, setItem(_key, value) { raw = value; } };
  const locks = { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
  const options = { getStorage: () => storage, getLocks: () => locks, now: () => clock, ...extra };
  return { store: createStore(options), fresh: () => createStore(options), raw: () => raw, rows: () => JSON.parse(raw), seed: value => { raw = value; },
    advance: ms => { clock += ms; }, at: () => clock };
}

describe('compact rows', () => {
  it('stores a check of the text, never the text itself', async () => {
    const f = fixture(), s = scope();
    await f.store.save(s, answer('Herons wait.'));
    await f.store.save(scope({ itemId: 'place-only' }), { paragraph: 3, snippet: 'The heron waits' });
    expect(f.raw()).not.toContain('shallow water');
    const rows = f.rows();
    expect(rows[key(s)].sourceCheck).toMatch(/^c1-[0-9a-f]+-[0-9a-f]+$/);
    expect(rows[key(scope({ itemId: 'place-only' }))]).not.toHaveProperty('sourceCheck');
    expect(f.fresh().load(s).place.responses[0].mainIdea).toBe('Herons wait.');
  });

  it('still refuses saved work that belongs to different text', async () => {
    const f = fixture(), s = scope();
    await f.store.save(s, answer('Herons wait.'));
    const other = f.fresh();
    // Same key (a fingerprint collision), different text: never shown as this reading's work.
    expect(other.load(scope({ text: LONG + ' Changed.' }))).toMatchObject({ status: 'failed', reason: 'version-conflict' });
    expect(other.inspectSaved(scope({ text: LONG + ' Changed.' }))).toBeNull();
  });

  it('reads rows saved with the whole text and converts them on the next save', async () => {
    const f = fixture(), s = scope();
    f.seed(JSON.stringify({ [key(s)]: { sourceText: LONG, responses: { 0: { mainIdea: 'Old format' } }, at: 1, revision: 1 } }));
    expect(f.store.load(s).place.responses[0].mainIdea).toBe('Old format');
    expect(f.fresh().load(scope({ text: 'Other text' })).reason).toBe('version-conflict');
    await f.store.save(s, answer('New answer'));
    expect(f.rows()[key(s)]).not.toHaveProperty('sourceText');
    expect(f.rows()[key(s)].responses[0].mainIdea).toBe('New answer');
  });
});

describe('making room', () => {
  it('seventy long readings with only a place do not block an answer', async () => {
    const f = fixture();
    for (let i = 0; i < 70; i++) await f.store.save(scope({ itemId: 'r' + i }), { paragraph: 2, snippet: 'The heron' });
    expect(await f.store.save(scope({ itemId: 'new' }), answer('Mine'))).toMatchObject({ status: 'saved' });
  });

  it('evicts places, oldest first, when the size budget is reached', async () => {
    const f = fixture({ maxChars: 1200 });
    for (let i = 0; i < 6; i++) { await f.store.save(scope({ itemId: 'p' + i }), { paragraph: 1, snippet: 'x'.repeat(80) }); f.advance(1000); }
    const result = await f.store.save(scope({ itemId: 'work' }), answer('y'.repeat(500)));
    expect(result.status).toBe('saved');
    const rows = f.rows();
    expect(rows[key(scope({ itemId: 'work' }))]).toBeTruthy();
    expect(rows[key(scope({ itemId: 'p0' }))]).toBeUndefined(); // oldest went first
    expect(rows[key(scope({ itemId: 'p5' }))]).toBeTruthy();
    expect(f.raw().length).toBeLessThanOrEqual(1200);
  });

  it('lets answers nobody has touched for 180 days make room, never recent ones', async () => {
    const f = fixture({ maxRecords: 3 });
    await f.store.save(scope({ learner: 'learner|Old Owl', itemId: 'a' }), answer('Last year'));
    f.advance(200 * DAY);
    await f.store.save(scope({ learner: 'learner|Red Fox', itemId: 'b' }), answer('This week'));
    await f.store.save(scope({ learner: 'learner|Red Fox', itemId: 'c' }), answer('Today'));
    expect(await f.store.save(scope({ itemId: 'd' }), answer('Mine'))).toMatchObject({ status: 'saved' });
    const rows = f.rows();
    expect(rows[key(scope({ learner: 'learner|Old Owl', itemId: 'a' }))]).toBeUndefined();
    expect(rows[key(scope({ learner: 'learner|Red Fox', itemId: 'b' }))]).toBeTruthy();
    // Nothing old is left: recent work is protected and the save fails instead.
    expect(await f.store.save(scope({ itemId: 'e' }), answer('Also mine'))).toMatchObject({ status: 'failed', reason: 'capacity' });
    expect(Object.keys(f.rows())).toHaveLength(3);
  });

  it('never expires work whose age is unknown', async () => {
    const f = fixture({ maxRecords: 1 });
    f.seed(JSON.stringify({ [key(scope({ learner: 'learner|Old Owl' }))]: answer('No date') }));
    expect(await f.store.save(scope({ itemId: 'new' }), answer('Mine'))).toMatchObject({ status: 'failed', reason: 'capacity' });
  });

  it('says when other readers fill the device, so the reader is not told to remove their own readings', async () => {
    const f = fixture({ maxRecords: 2 });
    await f.store.save(scope({ learner: 'learner|Red Fox', itemId: 'a' }), answer('Theirs'));
    await f.store.save(scope({ learner: 'learner|Red Fox', itemId: 'b' }), answer('Theirs too'));
    expect(await f.store.save(scope(), answer('Mine'))).toMatchObject({ status: 'failed', reason: 'capacity', problem: { kind: 'store-crowded', own: 0, others: 2 } });
    const mixed = fixture({ maxRecords: 2 });
    await mixed.store.save(scope({ itemId: 'a' }), answer('My earlier work'));
    await mixed.store.save(scope({ learner: 'learner|Red Fox', itemId: 'b' }), answer('Theirs'));
    expect((await mixed.store.save(scope(), answer('Mine'))).problem).toMatchObject({ own: 1, others: 1 });
  });
});
