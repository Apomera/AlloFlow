import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const createStore = new Function(readFileSync('reader_place_store.js', 'utf8') + '; return createReadingPlaceStore;')();
const KEY = 'alloflow_reading_places_v1';
const scope = (extra = {}) => ({ learner: 'learner|profile:blue|Fox', itemId: 'reading', fingerprint: 'exact-v1', text: 'Original passage.', ...extra });
const key = s => [s.learner, s.itemId, s.fingerprint].join('|');
const answer = (text, field = 'mainIdea', section = '0') => ({ responses: { [section]: { [field]: text } } });
function fixture(extra = {}) {
  let raw = null, readError = false, writeError = false, queue = Promise.resolve();
  const storage = { getItem() { if (readError) throw new DOMException('Blocked', 'SecurityError'); return raw; },
    setItem(_key, value) { if (writeError) throw new DOMException('Full', 'QuotaExceededError'); raw = value; } };
  const locks = { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
  const options = { getStorage: () => storage, getLocks: () => locks, ...extra };
  return { store: createStore(options), another: () => createStore(options), seed: value => { raw = value; }, raw: () => raw,
    blockReads: value => { readError = value; }, blockWrites: value => { writeError = value; } };
}

describe('reader place persistence contract', () => {
  it('commits a validated draft and restores it in a fresh page store', async () => {
    const f = fixture(), s = scope();
    expect(await f.store.save(s, answer('Herons catch fish.'))).toMatchObject({ status: 'saved', medium: 'localstorage', persistedRevision: 1 });
    expect(f.another().load(s)).toMatchObject({ status: 'saved', place: answer('Herons catch fish.') });
  });

  it('keeps failed answers through position/bookmark saves, remount-style loads, and retry', async () => {
    const f = fixture(), s = scope();
    await f.store.save(s, answer('Old answer'));
    const durable = f.raw(); f.blockWrites(true);
    expect(await f.store.save(s, answer('Latest typed answer'))).toMatchObject({ status: 'failed', reason: 'quota' });
    await f.store.save(s, { paragraph: 3, snippet: 'Fish', resume: false });
    await f.store.save(s, { bookmark: { paragraph: 3, snippet: 'Fish' } });
    f.store.load(scope({ itemId: 'other' }));
    expect(f.store.load(s).place.responses[0].mainIdea).toBe('Latest typed answer');
    expect(f.raw()).toBe(durable);
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('Old answer');
    f.blockWrites(false);
    expect((await f.store.save(s, {})).status).toBe('saved');
    expect(f.another().load(s).place).toMatchObject({ ...answer('Latest typed answer'), bookmark: { paragraph: 3, snippet: 'Fish' } });
  });

  it('does not overwrite unseen storage after denied reads', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Existing'));
    const durable = f.raw(), tab = f.another(); f.blockReads(true);
    expect(tab.load(s).status).toBe('failed');
    expect(await tab.save(s, answer('New draft'))).toMatchObject({ status: 'failed', reason: 'denied', place: answer('New draft') });
    expect(f.raw()).toBe(durable);
  });

  it.each(['{bad', '[]', 'null', '"text"', '42'])('preserves malformed root %s and retains new drafts', async raw => {
    const f = fixture(), s = scope(); f.seed(raw);
    expect(f.store.load(s)).toMatchObject({ status: 'failed', reason: 'corrupt-store' });
    expect(await f.store.save(s, answer('Recoverable'))).toMatchObject({ status: 'failed', place: answer('Recoverable') });
    expect(f.raw()).toBe(raw);
  });

  it('sanitizes malformed rows and field values without rewriting valid siblings', async () => {
    const f = fixture(), s = scope(), other = scope({ itemId: 'other' });
    f.seed(JSON.stringify({ [key(s)]: { paragraph: -1, at: 'yesterday', bookmark: [], responses: { 0: { mainIdea: 'Keep me', support: {}, confusing: [] }, invalid: null } },
      [key(scope({ fingerprint: 'old' }))]: null, [key(other)]: { responses: { 0: { mainIdea: 'Sibling' } } } }));
    const raw = f.raw();
    expect(f.store.load(s)).toMatchObject({ status: 'failed', place: { responses: { 0: { mainIdea: 'Keep me' } } } });
    expect(f.store.load(other).place.responses[0].mainIdea).toBe('Sibling');
    expect(await f.store.save(s, { paragraph: 0, snippet: 'Start' })).toMatchObject({ status: 'failed', reason: 'corrupt-store' });
    expect(f.raw()).toBe(raw);
    expect(() => f.store.load(scope({ fingerprint: 'new' }))).not.toThrow();
  });

  it('protects bookmarks and answers when evicting the 81st record', async () => {
    const f = fixture();
    const rows = {};
    for (let i = 0; i < 80; i++) rows[key(scope({ itemId: String(i) }))] = i === 0 ? { bookmark: { paragraph: 2, snippet: 'Keep' }, at: 0 } : { paragraph: i, at: i };
    rows[key(scope({ itemId: '2' }))].responses = { 0: { mainIdea: 'Also keep' } };
    f.seed(JSON.stringify(rows));
    expect((await f.store.save(scope(), answer('New'))).status).toBe('saved');
    const saved = JSON.parse(f.raw());
    expect(Object.keys(saved)).toHaveLength(80);
    expect(saved[key(scope({ itemId: '0' }))]).toBeTruthy();
    expect(saved[key(scope({ itemId: '2' }))]).toBeTruthy();
    expect(saved[key(scope({ itemId: '1' }))]).toBeUndefined();
  });

  it('reports capacity when all 80 records contain authored work, including another learner', async () => {
    const f = fixture(), rows = {};
    for (let i = 0; i < 80; i++) rows[key(scope({ learner: 'another learner', itemId: String(i) }))] = answer('Keep');
    f.seed(JSON.stringify(rows)); const raw = f.raw();
    expect(await f.store.save(scope(), answer('Draft'))).toMatchObject({ status: 'failed', reason: 'capacity', place: answer('Draft') });
    expect(f.raw()).toBe(raw);
  });

  it('can add authored work after an old position-only record was evicted', async () => {
    const f = fixture({ maxRecords: 1 }), s = scope();
    await f.store.save(s, { paragraph: 2, snippet: 'Place' });
    await f.store.save(scope({ itemId: 'another' }), { paragraph: 1, snippet: 'Other place' });
    expect(JSON.parse(f.raw())[key(s)]).toBeUndefined();
    expect((await f.store.save(s, answer('New answer'))).status).toBe('saved');
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('New answer');
  });

  it('merges different fields from stale tabs and serializes simultaneous reading saves', async () => {
    const f = fixture(), second = f.another(), s = scope();
    f.store.load(s); second.load(s);
    await f.store.save(s, answer('Main idea'));
    expect((await second.save(s, answer('Evidence', 'support'))).status).toBe('saved');
    expect(f.another().load(s).place.responses[0]).toEqual({ mainIdea: 'Main idea', support: 'Evidence' });
    await Promise.all([f.store.save(scope({ itemId: 'one' }), answer('One')), second.save(scope({ itemId: 'two' }), answer('Two'))]);
    expect(Object.keys(JSON.parse(f.raw()))).toHaveLength(3);
  });

  it('keeps both same-field edits without overwriting the other tab', async () => {
    const f = fixture(), second = f.another(), s = scope(); f.store.load(s); second.load(s);
    await f.store.save(s, answer('First tab'));
    expect(await second.save(s, answer('Second tab'))).toMatchObject({ status: 'failed', reason: 'conflict', place: answer('Second tab') });
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('First tab');
    expect(second.load(s).place.responses[0].mainIdea).toBe('Second tab');
  });

  it('rebases untouched fields while preserving a failed draft', async () => {
    const f = fixture(), s = scope(), second = f.another();
    f.store.load(s); second.load(s);
    f.blockWrites(true); await second.save(s, answer('My draft'));
    f.blockWrites(false); await f.store.save(s, answer('New evidence', 'support'));
    expect(second.load(s).place.responses[0]).toEqual({ mainIdea: 'My draft', support: 'New evidence' });
    expect((await second.save(s, answer('Edited evidence', 'support'))).status).toBe('saved');
    expect(f.another().load(s).place.responses[0]).toEqual({ mainIdea: 'My draft', support: 'Edited evidence' });
  });

  it('refreshes clean tabs and does not resurrect work removed in another tab', async () => {
    const f = fixture(), second = f.another(), s = scope(); second.load(s);
    await f.store.save(s, answer('Other tab'));
    expect(second.load(s).place.responses[0].mainIdea).toBe('Other tab');
    f.seed(null);
    expect(second.load(s)).toMatchObject({ status: 'failed', reason: 'conflict', place: answer('Other tab') });
    expect((await second.save(s, { paragraph: 1, snippet: 'Here' })).status).toBe('failed');
    expect(f.raw()).toBeNull();
  });

  it('retains oversized Unicode answers without truncating or replacing the last save', async () => {
    const f = fixture({ maxAnswerChars: 8 }), s = scope(); await f.store.save(s, answer('12345678'));
    const raw = f.raw(), draft = '🦊'.repeat(5);
    expect(await f.store.save(s, answer(draft))).toMatchObject({ status: 'failed', reason: 'too-large', place: answer(draft) });
    expect(f.raw()).toBe(raw);
    expect((await f.store.save(s, answer('Short'))).status).toBe('saved');
  });

  it('enforces the serialized budget as well as individual answer limits', async () => {
    const f = fixture({ maxChars: 200 }), s = scope();
    expect(await f.store.save(s, answer('x'.repeat(200)))).toMatchObject({ status: 'failed', reason: 'too-large', place: answer('x'.repeat(200)) });
    expect(f.raw()).toBeNull();
  });

  it('keeps anonymous work only in this store and never promotes it', async () => {
    const f = fixture(), s = scope({ learner: '' });
    expect(await f.store.save(s, answer('Temporary'))).toMatchObject({ status: 'session-only', medium: 'memory' });
    expect(f.store.load(s).place.responses[0].mainIdea).toBe('Temporary');
    expect(f.another().load(s).place.responses).toEqual({});
    expect(f.store.load(scope()).place.responses).toEqual({});
    expect(f.raw()).toBeNull();
  });

  it('isolates learners and revisions, including answer-only revisions and checksum collisions', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Original answer'));
    expect(f.store.load(scope({ learner: 'learner|profile:red|Fox' })).place.responses).toEqual({});
    const revised = scope({ fingerprint: 'exact-v2', text: 'Revised passage.' });
    expect(f.store.load(revised)).toMatchObject({ revised: true, place: { responses: {} } });
    const collision = scope({ text: 'Changed passage!' });
    expect(f.store.load(collision)).toMatchObject({ status: 'failed', reason: 'version-conflict', revised: true, place: { responses: {} } });
    expect((await f.store.save(collision, answer('New'))).status).toBe('failed');
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('Original answer');
  });

  it('retains the draft when safe cross-tab writing is unavailable', async () => {
    const f = fixture({ getLocks: () => null });
    expect(await f.store.save(scope(), answer('Keep'))).toMatchObject({ status: 'failed', reason: 'coordination-unavailable', place: answer('Keep') });
    expect(f.raw()).toBeNull();
  });
});

describe('reader conflict review and recovery copies', () => {
  async function conflict() {
    const f = fixture(), s = scope(), remote = f.another();
    f.store.load(s); remote.load(s);
    await remote.save(s, answer('Saved in another tab'));
    await f.store.save(s, answer('This page draft'));
    return { f, s, remote };
  }

  it('uses reviewed saved work while keeping the displaced draft for this page only', async () => {
    const { f, s } = await conflict();
    const reviewed = f.store.review(s), raw = f.raw();
    expect(reviewed.local.responses[0].mainIdea).toBe('This page draft');
    expect(reviewed.saved.responses[0].mainIdea).toBe('Saved in another tab');
    expect(await f.store.resolve(s, reviewed, 'saved')).toMatchObject({ status: 'saved', place: answer('Saved in another tab'),
      recoveryCopies: [{ source: 'local', place: answer('This page draft') }] });
    expect(f.raw()).toBe(raw);
    expect(f.store.load(s).recoveryCopies[0].place.responses[0].mainIdea).toBe('This page draft');
    expect(f.another().load(s).recoveryCopies).toEqual([]);
    expect(f.store.load(scope({ learner: 'Other learner' })).recoveryCopies).toEqual([]);
    expect(f.store.load(scope({ fingerprint: 'new', text: 'Different text' })).recoveryCopies).toEqual([]);
  });

  it('saves the reviewed local draft and retains the replaced saved answers', async () => {
    const { f, s, remote } = await conflict();
    await remote.save(s, answer('New independent evidence', 'support'));
    const reviewed = f.store.review(s);
    expect(reviewed.local.responses[0].support).toBe('New independent evidence');
    const resolved = await f.store.resolve(s, reviewed, 'local');
    expect(resolved).toMatchObject({ status: 'saved', recoveryCopies: [{ source: 'saved', place: answer('Saved in another tab') }] });
    expect(f.another().load(s).place.responses[0]).toEqual({ mainIdea: 'This page draft', support: 'New independent evidence' });
    expect(JSON.parse(f.raw())[key(s)]).not.toHaveProperty('recoveryCopies');
  });

  it.each(['local', 'saved'])('rejects an outdated %s choice when saved work changed after review', async choice => {
    const { f, s, remote } = await conflict(), reviewed = f.store.review(s);
    await remote.save(s, answer('Newer saved work'));
    const raw = f.raw();
    expect(await f.store.resolve(s, reviewed, choice)).toMatchObject({ status: 'failed', reason: 'review-changed', place: answer('This page draft') });
    expect(f.raw()).toBe(raw);
    expect(f.store.peek(s).recoveryCopies).toEqual([]);
  });

  it('does not discard text typed while a resolution waits for the write lock', async () => {
    const { f, s } = await conflict(), reviewed = f.store.review(s);
    const resolution = f.store.resolve(s, reviewed, 'saved');
    const edit = f.store.save(s, answer('Typed after clicking'));
    expect(await resolution).toMatchObject({ status: 'failed', reason: 'review-changed', place: answer('Typed after clicking') });
    await edit;
    expect(f.store.peek(s).place.responses[0].mainIdea).toBe('Typed after clicking');
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('Saved in another tab');
  });

  it('does not invalidate a reviewed answer choice for position-only scrolling', async () => {
    const { f, s, remote } = await conflict(), reviewed = f.store.review(s);
    await f.store.save(s, { paragraph: 2, snippet: 'Here' });
    await remote.save(s, { paragraph: 3, snippet: 'There' });
    expect((await f.store.resolve(s, reviewed, 'local')).status).toBe('saved');
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('This page draft');
  });

  it('preserves both versions after a chosen local replacement hits quota, then retries', async () => {
    const { f, s } = await conflict(), reviewed = f.store.review(s), raw = f.raw();
    f.blockWrites(true);
    expect(await f.store.resolve(s, reviewed, 'local')).toMatchObject({ status: 'failed', reason: 'quota', place: answer('This page draft'),
      recoveryCopies: [{ source: 'saved', place: answer('Saved in another tab') }] });
    expect(f.raw()).toBe(raw);
    f.blockWrites(false);
    expect((await f.store.save(s, {})).status).toBe('saved');
    expect(f.another().load(s).place.responses[0].mainIdea).toBe('This page draft');
  });

  it.each(['local', 'saved'])('allows an explicit %s choice after authored work was removed elsewhere', async choice => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Recover me')); f.seed(null);
    expect(f.store.load(s).reason).toBe('conflict');
    const reviewed = f.store.review(s); expect(reviewed.saved).toBeNull();
    const result = await f.store.resolve(s, reviewed, choice);
    if (choice === 'local') {
      expect(result.status).toBe('saved');
      expect(f.another().load(s).place.responses[0].mainIdea).toBe('Recover me');
    } else {
      expect(result.status).toBe('ready'); expect(result.place.responses).toEqual({}); expect(f.raw()).toBeNull();
      expect(result.recoveryCopies[0].place.responses[0].mainIdea).toBe('Recover me');
    }
  });

  it('rejects a review from a different learner without exposing its recovery copies', async () => {
    const { f, s } = await conflict(), reviewed = f.store.review(s);
    const other = scope({ learner: 'Other learner' }), raw = f.raw();
    expect(await f.store.resolve(other, reviewed, 'local')).toMatchObject({ status: 'failed', reason: 'review-changed', place: { responses: {} }, recoveryCopies: [] });
    expect(f.raw()).toBe(raw);
  });

  it('does not let a queued scroll save recreate a removed record after using saved work', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Earlier work')); f.seed(null);
    const reviewed = f.store.review(s);
    const resolution = f.store.resolve(s, reviewed, 'saved');
    const scroll = f.store.save(s, { paragraph: 2, snippet: 'Pending position' });
    expect((await resolution).status).toBe('ready'); await scroll;
    expect(f.raw()).toBeNull(); expect(f.store.peek(s).place.responses).toEqual({});
    expect(f.store.peek(s).recoveryCopies[0].place.responses[0].mainIdea).toBe('Earlier work');
  });
});
