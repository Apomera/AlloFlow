import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const createStore = new Function(readFileSync(process.env.ALLO_READING_PLACE_HELPER || 'reports/reader-place-copy-controls/reader_place_store.js', 'utf8') + ';return createReadingPlaceStore;')();
const scope = (extra = {}) => ({ learner: 'Blue', itemId: 'bird', fingerprint: 'exact', text: 'A heron waits.', ...extra });
const answer = text => ({ responses: { 0: { mainIdea: text } } });
const key = s => [s.learner, s.itemId, s.fingerprint].join('|');
function fixture() {
  let raw = null, blocked = false, queue = Promise.resolve();
  const storage = { getItem: () => raw, setItem(_key, value) { if (blocked) throw new DOMException('Full', 'QuotaExceededError'); raw = value; } };
  const options = { getStorage: () => storage, getLocks: () => ({ request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } }) };
  const store = createStore(options), target = new EventTarget(); store.watchPage(target);
  return { store, other: () => createStore(options), raw: () => raw, seed: value => { raw = value; }, block: value => { blocked = value; },
    leaving() { const event = new Event('beforeunload', { cancelable: true }); target.dispatchEvent(event); return event.defaultPrevented; } };
}
async function withCopy(f, s = scope()) {
  await f.store.save(s, { ...answer('Earlier answer'), bookmark: { paragraph: 0, snippet: 'A heron waits.' } });
  await f.store.manageSaved(s, f.store.inspectSaved(s), 'remove');
  await f.store.save(s, answer('Current answer'));
  return f.store.reviewRecovery(s, 0);
}

describe('reviewed recovery-copy restore and cleanup', () => {
  it('restores answers and bookmark as a draft, keeps displaced work, and requires an explicit save', async () => {
    const f = fixture(), s = scope(), review = await withCopy(f), raw = f.raw();
    expect(f.store.changeRecovery(s, review, 'restore')).toMatchObject({ status: 'failed', reason: 'recovered-draft', place: { ...answer('Earlier answer'), bookmark: { paragraph: 0, snippet: 'A heron waits.' } } });
    expect(f.raw()).toBe(raw);
    await f.store.save(s, { paragraph: 2 }); await f.store.save(s, {}); await f.store.save(s, { responses: { 0: { support: 'New evidence' } } });
    expect(f.raw()).toBe(raw); expect(f.store.load(s).reason).toBe('recovered-draft');
    const saved = await f.store.save(s, {}, { confirmRecovery: true });
    expect(saved.status).toBe('saved'); expect(f.other().load(s).place.responses[0]).toEqual({ mainIdea: 'Earlier answer', support: 'New evidence' });
    expect(saved.recoveryCopies.some(x => x.place.responses[0]?.mainIdea === 'Current answer')).toBe(true);
  });

  it('rejects stale typing and reviews for a different learner or exact text', async () => {
    const f = fixture(), s = scope(), review = await withCopy(f);
    await f.store.save(s, answer('New typing')); const raw = f.raw();
    expect(f.store.changeRecovery(s, review, 'restore')).toMatchObject({ reason: 'recovery-changed', place: answer('New typing') });
    expect(f.store.changeRecovery(scope({ learner: 'Red' }), review, 'restore').reason).toBe('recovery-changed');
    expect(f.store.changeRecovery(scope({ text: 'Different passage' }), review, 'restore').reason).toBe('recovery-changed'); expect(f.raw()).toBe(raw);
  });

  it('invalidates an older queued save before restoring so it cannot publish the recovered draft', async () => {
    const f = fixture(), s = scope(), review = await withCopy(f), raw = f.raw();
    const pending = f.store.save(s, { paragraph: 3, snippet: 'Scroll' });
    f.store.changeRecovery(s, review, 'restore'); await pending;
    expect(f.raw()).toBe(raw); expect(f.store.peek(s).reason).toBe('recovered-draft');
  });

  it('detects conflicting remote edits when the restored draft is explicitly saved', async () => {
    const f = fixture(), s = scope(), review = await withCopy(f); f.store.changeRecovery(s, review, 'restore');
    await f.other().save(s, answer('Another tab')); const raw = f.raw();
    expect(await f.store.save(s, {}, { confirmRecovery: true })).toMatchObject({ reason: 'conflict', place: answer('Earlier answer') });
    expect(f.raw()).toBe(raw);
  });

  it('preserves restored text and its source copy when an explicitly confirmed write fails', async () => {
    const f = fixture(), s = scope(), review = await withCopy(f), raw = f.raw(); f.store.changeRecovery(s, review, 'restore'); f.block(true);
    expect(await f.store.save(s, {}, { confirmRecovery: true })).toMatchObject({ reason: 'quota', place: answer('Earlier answer') });
    expect(f.raw()).toBe(raw); expect(f.leaving()).toBe(true);
    f.block(false); expect((await f.store.save(s, {})).status).toBe('saved');
  });

  it('removes only the reviewed copy and releases the close guard when no other work is at risk', async () => {
    const f = fixture(), s = scope(); await withCopy(f); expect(f.leaving()).toBe(true); const raw = f.raw();
    const first = f.store.reviewRecovery(s, 0), second = f.store.reviewRecovery(s, 1);
    f.store.changeRecovery(s, first, 'remove'); expect(f.store.peek(s).recoveryCopies).toHaveLength(1);
    expect(f.store.changeRecovery(s, second, 'remove').reason).toBe('recovery-changed');
    f.store.changeRecovery(s, f.store.reviewRecovery(s, 0), 'remove');
    expect(f.leaving()).toBe(false); expect(f.raw()).toBe(raw);
    expect(f.store.exportSession('Blue').readings[0].recoveryCopies).toEqual([]);
  });

  it('keeps the close guard after copy cleanup if another reading or restored draft is still unsaved', async () => {
    const f = fixture(), s = scope(); const reviewed = await withCopy(f); f.store.changeRecovery(s, reviewed, 'restore');
    while (f.store.peek(s).recoveryCopies.length) f.store.changeRecovery(s, f.store.reviewRecovery(s, 0), 'remove');
    expect(f.leaving()).toBe(true); await f.store.save(s, {}, { confirmRecovery: true }); expect(f.leaving()).toBe(false);
    await f.store.save(scope({ learner: 'Other' }), answer('Other saved')); f.block(true);
    await f.store.save(scope({ learner: 'Other' }), answer('Other unsaved')); expect(f.leaving()).toBe(true);
    expect(f.store.exportSession('Blue').readings.some(x => x.scope.learner === 'Other')).toBe(false);
  });

  it('never restores malformed raw-only copies as blank work or interprets raw JSON as reader state', async () => {
    const f = fixture(), s = scope(); f.seed(JSON.stringify({ [key(s)]: { responses: { 0: { mainIdea: { raw: 'Keep for inspection' } } } } }));
    await f.store.manageSaved(s, f.store.inspectSaved(s), 'repair'); await f.store.save(s, answer('Current'));
    const review = f.store.reviewRecovery(s, 0); expect(review.canRestore).toBe(false);
    expect(f.store.changeRecovery(s, review, 'restore')).toMatchObject({ reason: 'recovery-empty', place: answer('Current') });
    expect(f.store.exportSession('Blue').readings[0].recoveryCopies[0].rawRow).toContain('Keep for inspection');
  });
});
