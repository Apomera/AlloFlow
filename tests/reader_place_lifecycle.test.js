import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const createStore = new Function(readFileSync('reader_place_store.js', 'utf8') + '; return createReadingPlaceStore;')();
const scope = (extra = {}) => ({ learner: 'Blue', itemId: 'bird', fingerprint: 'exact', text: 'A heron waits.', ...extra });
const key = s => [s.learner, s.itemId, s.fingerprint].join('|');
const answer = text => ({ responses: { 0: { mainIdea: text } } });
function fixture(extra = {}) {
  let raw = null, blocked = false, queue = Promise.resolve();
  const storage = { getItem: () => raw, setItem(_key, value) { if (blocked) throw new DOMException('Full', 'QuotaExceededError'); raw = value; } };
  const locks = { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } };
  const options = { getStorage: () => storage, getLocks: () => locks, ...extra };
  const store = createStore(options), target = new EventTarget(); store.watchPage(target);
  return { store, other: () => createStore(options), target, raw: () => raw, seed: value => { raw = value; }, block: value => { blocked = value; },
    leaving() { const event = new Event('beforeunload', { cancelable: true }); target.dispatchEvent(event); return event.defaultPrevented; } };
}

describe('reading work page lifetime and recovery', () => {
  it('guards pending authored writes synchronously and releases the guard after commit', async () => {
    const f = fixture(), s = scope(); expect(f.leaving()).toBe(false);
    const pending = f.store.save(s, answer('Wait')); expect(f.leaving()).toBe(true);
    await pending; expect(f.leaving()).toBe(false);
    await f.store.save(s, { paragraph: 2, snippet: 'Wait' }); expect(f.leaving()).toBe(false);
  });

  it('guards failed answers in previously opened readings and removes the warning after retry', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Saved')); f.block(true);
    await f.store.save(s, answer('Newer')); f.store.load(scope({ itemId: 'another' }));
    expect(f.leaving()).toBe(true); f.block(false); await f.store.save(s, {}); expect(f.leaving()).toBe(false);
  });

  it('guards pending answer deletion but not anonymous scroll or empty prompts', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Remove this'));
    const pending = f.store.save(s, answer('')); expect(f.leaving()).toBe(true); await pending; expect(f.leaving()).toBe(false);
    const anon = scope({ learner: '' }); await f.store.save(anon, { paragraph: 3, snippet: 'Here' });
    await f.store.save(anon, answer('')); expect(f.leaving()).toBe(false);
    await f.store.save(anon, answer('Temporary')); expect(f.leaving()).toBe(true);
  });

  it('keeps guards for conflict recovery copies and allows preview lifecycle cleanup', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('First')); const other = f.other(); other.load(s);
    await f.store.save(s, answer('Local')); await other.save(s, answer('Remote'));
    const reviewed = other.review(s); await other.resolve(s, reviewed, 'saved');
    expect(other.hasUnsavedWork()).toBe(true);
    const stop = other.watchPage(f.target); stop();
    expect(f.leaving()).toBe(false); expect(other.exportSession('Blue').readings[0].recoveryCopies).toHaveLength(1);
  });

  it('does not recreate an intentionally accepted remote removal on a later scroll', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('Saved')); f.seed('{}');
    await f.store.resolve(s, f.store.review(s), 'saved');
    await f.store.save(s, { paragraph: 3, snippet: 'Later scroll' }); await f.store.save(s, {});
    expect(f.raw()).toBe('{}'); expect(f.store.hasUnsavedWork()).toBe(true);
  });

  it('exports only the requested learner and keeps exact passage versions together with their work', async () => {
    const f = fixture(); await f.store.save(scope(), answer('First'));
    await f.store.save(scope({ fingerprint: 'revised', text: 'Revised passage' }), answer('Second'));
    await f.store.save(scope({ learner: 'Red' }), answer('Private'));
    await f.store.save(scope({ learner: '' }), answer('Anonymous'));
    const exported = f.store.exportSession('Blue'); expect(exported.readings).toHaveLength(2);
    expect(exported.readings.map(x => x.scope.text)).toEqual(['A heron waits.', 'Revised passage']);
    expect(JSON.stringify(exported)).not.toContain('Private'); expect(JSON.stringify(exported)).not.toContain('Anonymous');
    exported.readings[0].place.responses[0].mainIdea = 'mutated'; expect(f.store.peek(scope()).place.responses[0].mainIdea).toBe('First');
    expect(f.other().exportSession('Blue').readings).toEqual([]);
  });

  it('distinguishes oversized answers, total budget, and browser quota', async () => {
    const small = fixture({ maxAnswerChars: 4 });
    expect(await small.store.save(scope(), answer('12345'))).toMatchObject({ reason: 'too-large', problem: { kind: 'answer-size', section: '0', field: 'mainIdea', length: 5, limit: 4 } });
    expect(await small.store.save(scope(), answer('1234'))).toMatchObject({ status: 'saved', problem: null });
    const total = fixture({ maxChars: 100 });
    expect(await total.store.save(scope(), answer('abc'))).toMatchObject({ reason: 'too-large', problem: { kind: 'store-size', limit: 100 } });
    const quota = fixture(); quota.block(true);
    expect(await quota.store.save(scope(), answer('abc'))).toMatchObject({ reason: 'quota', problem: null });
  });
});

describe('explicit exact-reading storage management', () => {
  it('removes only the reviewed row, retains a recovery copy, and scroll/retry cannot resurrect it', async () => {
    const f = fixture(), s = scope(), other = scope({ learner: 'Red' });
    await f.store.save(s, answer('Keep in export')); await f.store.save(other, answer('Other learner'));
    const sibling = JSON.parse(f.raw())[key(other)]; const review = f.store.inspectSaved(s);
    expect(await f.store.manageSaved(s, review, 'remove')).toMatchObject({ status: 'ready' });
    expect(JSON.parse(f.raw())).toEqual({ [key(other)]: sibling }); expect(f.leaving()).toBe(true);
    await f.store.save(s, { paragraph: 2 }); await f.store.save(s, {}); expect(JSON.parse(f.raw())[key(s)]).toBeUndefined();
    expect(JSON.stringify(f.store.exportSession('Blue'))).toContain('Keep in export');
    await f.store.save(s, answer('New intentional answer')); expect(JSON.parse(f.raw())[key(s)].responses[0].mainIdea).toBe('New intentional answer');
  });

  it('rejects newer local text, newer saved records, and reviews for another learner/version', async () => {
    const f = fixture(), s = scope(); await f.store.save(s, answer('First')); const review = f.store.inspectSaved(s);
    await f.other().save(s, answer('New remote')); const raw = f.raw();
    expect(await f.store.manageSaved(s, review, 'remove')).toMatchObject({ reason: 'review-changed' }); expect(f.raw()).toBe(raw);
    const next = f.store.inspectSaved(s); f.block(true); await f.store.save(s, answer('New local')); f.block(false);
    expect(await f.store.manageSaved(s, next, 'remove')).toMatchObject({ reason: 'review-changed' }); expect(f.raw()).toBe(raw);
    expect(await f.store.manageSaved(scope({ learner: 'Red' }), next, 'remove')).toMatchObject({ reason: 'review-changed' });
    expect(await f.store.manageSaved(scope({ text: 'Revised' }), next, 'remove')).toMatchObject({ reason: 'review-changed' }); expect(f.raw()).toBe(raw);
  });

  it('repairs only the selected malformed row and retains its original raw fields', async () => {
    const f = fixture(), s = scope(), other = scope({ learner: 'Red' });
    const malformed = { responses: { 0: { mainIdea: 'Readable', support: { recover: 'Original object' } } }, bookmark: [] };
    f.seed(JSON.stringify({ [key(s)]: malformed, [key(other)]: { responses: { 0: { mainIdea: 'Sibling' } } } }));
    const review = f.store.inspectSaved(s); expect(review.corrupt).toBe(true);
    expect(await f.store.manageSaved(s, review, 'repair')).toMatchObject({ status: 'saved' });
    expect(f.other().load(s)).toMatchObject({ status: 'saved', place: answer('Readable') });
    expect(JSON.parse(f.raw())[key(other)]).toEqual({ responses: { 0: { mainIdea: 'Sibling' } } });
    expect(JSON.stringify(f.store.exportSession('Blue'))).toContain('Original object'); expect(f.leaving()).toBe(true);
  });

  it('does not discard a typed draft while repairing its malformed saved record', async () => {
    const f = fixture(), s = scope(); f.seed(JSON.stringify({ [key(s)]: { responses: { 0: { mainIdea: 'Saved', support: null } } } }));
    await f.store.save(s, answer('Typed here')); const review = f.store.inspectSaved(s);
    expect(await f.store.manageSaved(s, review, 'repair')).toMatchObject({ status: 'failed', reason: 'retry-needed', place: answer('Typed here') });
    expect((await f.store.save(s, {})).status).toBe('saved'); expect(f.other().load(s).place.responses[0].mainIdea).toBe('Typed here');
  });

  it('leaves malformed roots, mismatched source text, and denied writes unchanged', async () => {
    const f = fixture(), s = scope(); f.seed('{broken'); expect(f.store.inspectSaved(s)).toBeNull(); expect(f.raw()).toBe('{broken');
    f.seed(JSON.stringify({ [key(s)]: { sourceText: 'Different passage', ...answer('Other') } }));
    expect(f.store.inspectSaved(s)).toBeNull(); expect(f.store.peek(s).reason).toBe('version-conflict');
    f.seed(null); await f.store.save(s, answer('Preserve')); const review = f.store.inspectSaved(s), raw = f.raw(); f.block(true);
    expect((await f.store.manageSaved(s, review, 'remove')).status).toBe('failed'); expect(f.raw()).toBe(raw);
    expect(f.store.peek(s).place.responses[0].mainIdea).toBe('Preserve');
  });

  it('permits removal from an oversized store and frees a protected capacity slot', async () => {
    const f = fixture({ maxRecords: 1 }), s = scope(); await f.store.save(s, answer('Old'));
    const next = scope({ itemId: 'new' }); expect((await f.store.save(next, answer('New'))).reason).toBe('capacity');
    await f.store.manageSaved(s, f.store.inspectSaved(s), 'remove'); expect((await f.store.save(next, {})).status).toBe('saved');
    const small = fixture({ maxChars: 60 }); small.seed(f.raw()); const review = small.store.inspectSaved(next);
    expect((await small.store.manageSaved(next, review, 'remove')).status).toBe('ready'); expect(small.raw()).toBe('{}');
  });
});
