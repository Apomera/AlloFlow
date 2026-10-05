import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const report = resolve('reports/classroom-reliability-followup-2026-10-03');
const captured = JSON.parse(readFileSync(resolve(report, 'source-before/host_lifecycle_fragments.json'), 'utf8'));
function extract(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to < 0 || source.split(start).length !== 2) throw new Error('Production extraction anchor drift');
  return source.slice(from, to);
}
const current = process.env.RECEIVER_LIFECYCLE_SOURCE && readFileSync(process.env.RECEIVER_LIFECYCLE_SOURCE, 'utf8');
const helperSource = current ? extract(current, 'function _alloPruneResChunks(', '// Non-trickle ICE:') : captured.helpers.code;
const receiverSource = current ? extract(current, 'const applyMbDownPayload = useCallback(', 'const createHomeworkAssignmentLink = useCallback(') : captured.receiver.code;
const chunks = new Function(helperSource + '\nreturn {collect:_alloCollectResChunk, finish:_alloFinishResChunk, prune:_alloPruneResChunks, markRemoved:typeof _alloMarkRemovedResChunks === "function" ? _alloMarkRemovedResChunks : undefined};')();
const transportWindow = {};
new Function('window', readFileSync(process.env.RECEIVER_TRANSPORT_SOURCE || resolve(report, 'source-before/session_transport_module.js'), 'utf8'))(transportWindow);
const transport = transportWindow.AlloModules.SessionTransport;
const item = (id, title) => ({ id, title, type: 'image', data: { imageUrl: 'https://school.example/' + id + '.png' } });
const packet = (rid, data) => ({ kind: 'res', rid, part: 1, of: 1, data, open: true, quiet: false });
function deferred() {
  let resolvePromise, rejectPromise;
  const promise = new Promise((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });
  return { promise, resolve: resource => resolvePromise(JSON.stringify(resource)), reject: rejectPromise };
}
function receiver(decode, initial = []) {
  const refs = { store: { current: { parts: {}, applied: new Set() } }, cursor: { current: 20 }, history: { current: initial.slice() }, received: { current: initial.slice() } };
  const deps = {
    useCallback: fn => fn,
    mbChunkStoreRef: refs.store, mbStudentCursorRef: refs.cursor,
    _alloCollectResChunk: chunks.collect, _alloFinishResChunk: chunks.finish,
    _alloMarkRemovedResChunks: chunks.markRemoved,
    _alloDecodeAlloPack: decode,
    _alloStudentSafeResources: resources => transport.studentSafeResources(resources, []),
    setHistory: vi.fn(update => { refs.history.current = update(refs.history.current); }),
    hydratedHistoryRef: refs.history,
    setReceivedDeliveryResources: vi.fn(update => { refs.received.current = update(refs.received.current); }),
    setPendingQrAssignmentResource: vi.fn(), setMbResourceReceiveError: vi.fn(), addToast: vi.fn(), warnLog: vi.fn()
  };
  const apply = new Function(...Object.keys(deps), receiverSource + '\nreturn applyMbDownPayload;')(...Object.values(deps));
  return { refs, deps, apply };
}

describe('real classroom resource receiver during a pending decode', () => {
  it('keeps a removed resource out of both lists and the open action when its earlier RTC decode finishes', async () => {
    const old = deferred(), h = receiver(() => old.promise, [item('picture', 'Previously loaded picture')]);
    const pending = h.apply(packet('old-rid', 'old-pack'));
    expect(h.refs.store.current.pending['old-rid']).toBeTruthy();
    await h.apply({ kind: 'res-remove', ids: ['picture'] });
    expect(h.refs.history.current).toEqual([]); expect(h.refs.received.current).toEqual([]);
    old.resolve(item('picture', 'Removed pending picture')); await pending;
    expect(h.refs.history.current).toEqual([]); expect(h.refs.received.current).toEqual([]);
    expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled(); expect(h.deps.addToast).not.toHaveBeenCalled();
    expect(Object.keys(h.refs.store.current.pending || {})).toHaveLength(0);
    await h.apply(packet('old-rid', 'old-pack'));
    expect(h.refs.history.current).toEqual([]); expect(Object.keys(h.refs.store.current.pending || {})).toHaveLength(0);
  });

  it('allows a fresh same-ID re-add while keeping an older removed transfer from overwriting it', async () => {
    const old = deferred(), fresh = deferred();
    const h = receiver(data => data === 'old-pack' ? old.promise : fresh.promise);
    const oldPending = h.apply(packet('old-rid', 'old-pack'));
    await h.apply({ kind: 'res-remove', ids: ['picture'] });
    const freshPending = h.apply(packet('fresh-rid', 'fresh-pack'));
    const replacement = item('picture', 'Fresh picture deliberately shared again');
    fresh.resolve(replacement); await freshPending;
    expect(h.refs.history.current).toEqual([replacement]); expect(h.refs.received.current).toEqual([replacement]);
    old.resolve(item('picture', 'Earlier removed version')); await oldPending;
    expect(h.refs.history.current).toEqual([replacement]); expect(h.refs.received.current).toEqual([replacement]);
    expect(h.deps.setPendingQrAssignmentResource.mock.calls.map(([resource]) => resource.title)).toEqual([replacement.title]);
    expect(Object.keys(h.refs.store.current.pending || {})).toHaveLength(0);
  });

  it('retains an unrelated RID that was also decoding when removal arrived', async () => {
    const removed = deferred(), other = deferred(), kept = item('kept', 'Already complete unrelated resource');
    const h = receiver(data => data === 'removed-pack' ? removed.promise : other.promise, [kept]);
    const removedPending = h.apply(packet('removed-rid', 'removed-pack'));
    const otherPending = h.apply(packet('other-rid', 'other-pack'));
    await h.apply({ kind: 'res-remove', ids: ['picture'] });
    const newcomer = item('leaf', 'Still-shared unrelated picture');
    other.resolve(newcomer); await otherPending;
    removed.resolve(item('picture', 'Removed picture')); await removedPending;
    expect(h.refs.history.current).toEqual([kept, newcomer]); expect(h.refs.received.current).toEqual([kept, newcomer]);
    expect(h.deps.setPendingQrAssignmentResource.mock.calls.map(([resource]) => resource.id)).toEqual(['leaf']);
    expect(h.refs.store.current.applied.has('other-rid')).toBe(true);
    expect(Object.keys(h.refs.store.current.pending || {})).toHaveLength(0);
    expect(h.deps.warnLog).not.toHaveBeenCalled(); expect(h.deps.setMbResourceReceiveError.mock.calls.some(([value]) => value === true)).toBe(false);
  });

  it('does not let a pruned decoder apply or finish a newer pending identity with the same RID', async () => {
    const old = deferred(), replacement = deferred();
    const h = receiver(data => data === 'old-pack' ? old.promise : replacement.promise);
    const oldPending = h.apply(packet('same-rid', 'old-pack'));
    const store = h.refs.store.current, oldRecord = store.pending['same-rid'];
    chunks.prune(store, oldRecord.at + 5 * 60 * 1000 + 1);
    expect(store.pending['same-rid']).toBeUndefined();
    const replacementPending = h.apply(packet('same-rid', 'replacement-pack'));
    const replacementRecord = store.pending['same-rid'];
    expect(replacementRecord).not.toBe(oldRecord);
    old.resolve(item('old-picture', 'Expired decoder')); await oldPending;
    expect(h.refs.history.current).toEqual([]); expect(h.refs.received.current).toEqual([]);
    expect(store.pending['same-rid']).toBe(replacementRecord); expect(store.applied.has('same-rid')).toBe(false);
    expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled(); expect(h.deps.addToast).not.toHaveBeenCalled();
    const fresh = item('new-picture', 'Current same-RID decoder');
    replacement.resolve(fresh); await replacementPending;
    expect(h.refs.history.current).toEqual([fresh]); expect(h.refs.received.current).toEqual([fresh]);
    expect(store.pending['same-rid']).toBeUndefined(); expect(store.applied.has('same-rid')).toBe(true);
  });

  it('ignores a failed old decoder after its pending identity was replaced', async () => {
    const old = deferred(), replacement = deferred();
    const h = receiver(data => data === 'old-pack' ? old.promise : replacement.promise);
    const oldPending = h.apply(packet('same-rid', 'old-pack'));
    const store = h.refs.store.current, oldRecord = store.pending['same-rid'];
    chunks.prune(store, oldRecord.at + 5 * 60 * 1000 + 1);
    const replacementPending = h.apply(packet('same-rid', 'replacement-pack'));
    const replacementRecord = store.pending['same-rid'];
    old.reject(new Error('Expired decoder failed')); await oldPending;
    expect(store.pending['same-rid']).toBe(replacementRecord); expect(Object.keys(store.failures || {})).toHaveLength(0);
    expect(h.refs.cursor.current).toBe(20); expect(h.deps.warnLog).not.toHaveBeenCalled();
    expect(h.deps.setMbResourceReceiveError).not.toHaveBeenCalled();
    const fresh = item('new-picture', 'Replacement after stale failure');
    replacement.resolve(fresh); await replacementPending;
    expect(h.refs.history.current).toEqual([fresh]); expect(store.applied.has('same-rid')).toBe(true);
  });

  it('preserves removal through a failed decode and same-RID retry while accepting a fresh RID', async () => {
    const failed = deferred(), retry = deferred(), fresh = deferred();
    const h = receiver(data => data === 'bad-pack' ? failed.promise : data === 'retry-pack' ? retry.promise : fresh.promise);
    const failedPending = h.apply(packet('removed-rid', 'bad-pack'));
    await h.apply({ kind: 'res-remove', ids: ['picture'] });
    failed.reject(new Error('Compressed pack incomplete')); await failedPending;
    expect(h.refs.store.current.failures['removed-rid'].count).toBe(1);
    expect(h.refs.cursor.current).toBe(0); expect(h.deps.warnLog).toHaveBeenCalledTimes(1);
    const retriedPending = h.apply(packet('removed-rid', 'retry-pack'));
    retry.resolve(item('picture', 'Removed picture decoded on retry')); await retriedPending;
    expect(h.refs.history.current).toEqual([]); expect(h.refs.received.current).toEqual([]);
    expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled(); expect(h.deps.addToast).not.toHaveBeenCalled();
    expect(h.refs.store.current.failures['removed-rid']).toBeUndefined(); expect(h.refs.store.current.applied.has('removed-rid')).toBe(true);
    expect(h.deps.setMbResourceReceiveError).toHaveBeenLastCalledWith(false);
    const freshPending = h.apply(packet('fresh-rid', 'fresh-pack')), reshared = item('picture', 'Deliberately shared after failed old transfer');
    fresh.resolve(reshared); await freshPending;
    expect(h.refs.history.current).toEqual([reshared]); expect(h.refs.received.current).toEqual([reshared]);
    expect(h.deps.setPendingQrAssignmentResource).toHaveBeenCalledTimes(1);
  });

  it('carries a removal marker from an incomplete transfer into its later pending decode', async () => {
    const decode = deferred(), h = receiver(() => decode.promise);
    await h.apply({ ...packet('partial-rid', 'first'), part: 1, of: 2 });
    await h.apply({ kind: 'res-remove', ids: ['picture'] });
    const pending = h.apply({ ...packet('partial-rid', 'second'), part: 2, of: 2 });
    decode.resolve(item('picture', 'Removed before final chunk')); await pending;
    expect(h.refs.history.current).toEqual([]); expect(h.refs.received.current).toEqual([]);
    expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    expect(Object.keys(h.refs.store.current.parts)).toHaveLength(0);
    expect(Object.keys(h.refs.store.current.pending)).toHaveLength(0); expect(h.refs.store.current.applied.has('partial-rid')).toBe(true);
  });

  it('bounds markers on old records, retires overflow conservatively and leaves a new RID clean', async () => {
    const old = deferred(), fresh = deferred();
    const h = receiver(data => data === 'old-pack' ? old.promise : fresh.promise);
    const oldPending = h.apply(packet('old-rid', 'old-pack'));
    await h.apply({ kind: 'res-remove', ids: Array.from({ length: 257 }, (_, index) => 'removed-' + index) });
    const oldRecord = h.refs.store.current.pending['old-rid'];
    expect(oldRecord.removalOverflow).toBe(true); expect(oldRecord.removedIds.size).toBeLessThanOrEqual(256);
    old.resolve(item('unrelated', 'Conservatively retired old overflow transfer')); await oldPending;
    expect(h.refs.history.current).toEqual([]); expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    const freshPending = h.apply(packet('fresh-rid', 'fresh-pack')), reshared = item('removed-256', 'New transfer after marker overflow');
    fresh.resolve(reshared); await freshPending;
    expect(h.refs.history.current).toEqual([reshared]); expect(h.refs.received.current).toEqual([reshared]);
    chunks.prune(h.refs.store.current, Date.now() + 5 * 60 * 1000 + 1);
    expect(Object.keys(h.refs.store.current.pending)).toHaveLength(0); expect(Object.keys(h.refs.store.current.failures || {})).toHaveLength(0);
  });
});
