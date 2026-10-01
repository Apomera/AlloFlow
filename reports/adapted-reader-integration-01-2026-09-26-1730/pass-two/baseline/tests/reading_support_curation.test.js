import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';
let api;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  api = window.AlloModules.InstructionalContext;
});
const macbeth = 'SECOND WITCH\r\nWhen the hurlyburly\'s done,\r\nWhen the battle\'s lost and won.\r\n\r\nTHIRD WITCH\r\nUpon the heath.\r\n\r\nFIRST WITCH\r\nI come, Grimalkin!\r\n\r\nTHIRD WITCH\r\nAnon!\r\n';
function owner(text = macbeth, unitId = 'literature', sourceFamilyId = 'macbeth') {
  return api.createSupportedReading(api.createSourceSnapshot(text, { sourceArtifactId: sourceFamilyId }), { id: 'reader-' + sourceFamilyId, unitId, sourceFamilyId });
}
function annotation(item, quote, text = 'Contextual support', extra = {}) {
  const start = item.data.indexOf(quote);
  return { id: 'word-' + start, start, end: start + quote.length, quote, text, ...extra };
}
function supports(item, entries) { return api.validateReadingSupports(item, entries); }

describe('exact anchored teacher curation', () => {
  it('keeps legacy supports and supplies backward-compatible metadata defaults', () => {
    const item = owner();
    const old = supports(item, [annotation(item, 'heath')]);
    expect(old.annotations[0]).toMatchObject({ origin: 'generated', priority: 'helpful', pinned: false });
    expect(old.suppressedAnnotations).toEqual([]);
    expect(old).toMatchObject({ sourceFamilyId: 'macbeth', unitId: 'literature' });
  });
  it('supports all four Macbeth acceptance anchors without changing a source character', () => {
    const item = owner(), original = JSON.stringify(item);
    let curated;
    for (const [quote, text] of [['heath', 'Open land with low shrubs.'], ['hurlyburly', 'The uproar and confusion of the battle.'], ['Anon', 'Right away; I am coming.'], ['Grimalkin', 'The cat this witch is speaking to.']]) {
      curated = api.upsertReadingSupport(item, curated, annotation(item, quote, text, { priority: 'essential' }));
    }
    expect(curated.annotations.map(entry => entry.quote)).toEqual(['hurlyburly', 'heath', 'Grimalkin', 'Anon']);
    expect(curated.annotations.every(entry => entry.origin === 'educator' && entry.priority === 'essential')).toBe(true);
    expect(JSON.stringify(item)).toBe(original);
    expect(api.isSupportedOriginal(item)).toBe(true);
  });
  it('edits the selected occurrence and preserves other repeated words', () => {
    const item = owner('Fair is foul, and foul is fair.');
    const first = annotation(item, 'foul', 'First meaning');
    const second = { ...first, id: 'second', start: item.data.lastIndexOf('foul'), end: item.data.lastIndexOf('foul') + 4, text: 'Second meaning' };
    const current = supports(item, [first, second]);
    const edited = api.upsertReadingSupport(item, current, { id: second.id, text: 'Teacher contextual meaning', pinned: true });
    expect(edited.annotations[0]).toEqual(current.annotations[0]);
    expect(edited.annotations[1]).toMatchObject({ text: 'Teacher contextual meaning', origin: 'educator', pinned: true, start: second.start });
    expect(current.annotations[1].text).toBe('Second meaning');
  });
  it('fails explicitly for invalid or overlapping teacher additions without losing saved glosses', () => {
    const item = owner('Upon the heath.');
    const current = supports(item, [annotation(item, 'heath')]);
    expect(() => api.upsertReadingSupport(item, current, annotation(item, 'the heath'))).toThrow(/overlaps/);
    expect(() => api.upsertReadingSupport(item, current, { ...annotation(item, 'Upon'), quote: 'Wrong' })).toThrow(/exact source occurrence/);
    expect(() => api.upsertReadingSupport(item, current, annotation(item, 'Upon', ' '))).toThrow(/nonempty/);
    expect(current.annotations).toHaveLength(1);
  });
  it('records an exact removal and clears it when a teacher deliberately restores the occurrence', () => {
    const item = owner(), gloss = annotation(item, 'heath');
    const removed = api.removeReadingSupport(item, supports(item, [gloss]), gloss.id);
    expect(removed.annotations).toEqual([]);
    expect(removed.suppressedAnnotations).toEqual([{ start: gloss.start, end: gloss.end, quote: gloss.quote }]);
    const restored = api.upsertReadingSupport(item, removed, { ...gloss, text: 'Restored by teacher' });
    expect(restored.suppressedAnnotations).toEqual([]);
    expect(restored.annotations[0]).toMatchObject({ text: 'Restored by teacher', origin: 'educator' });
    expect(() => api.removeReadingSupport(item, removed, gloss.id)).toThrow(/no longer available/);
  });
  it('rejects stale source and cross-lesson/family curation even when the prose is identical', () => {
    const item = owner(), current = supports(item, [annotation(item, 'heath')]);
    const otherLesson = { ...owner(item.data, 'different-lesson'), id: 'copied-reader' };
    const otherFamily = owner(item.data, item.unitId, 'other-source');
    for (const other of [otherLesson, otherFamily, owner('Changed source')]) {
      expect(() => api.setReadingSupportPinned(other, current, current.annotations[0].id, true)).toThrow(/different source or lesson/);
      expect(api.validateReadingSupports(other, current).annotations).toEqual([]);
    }
  });
  it('rejects malformed suppression anchors instead of hiding unrelated source words', () => {
    const item = owner();
    const current = supports(item, [annotation(item, 'heath')]);
    const checked = api.validateReadingSupports(item, { ...current, suppressedAnnotations: [{ start: 0, end: 99999, quote: 'wrong' }] });
    expect(checked.annotations).toHaveLength(1);
    expect(checked.suppressedAnnotations).toEqual([]);
    expect(checked.rejectedCount).toBe(1);
    expect(checked.status).toBe('partial');
  });
});

describe('regeneration with teacher choices', () => {
  it('retains edits, pins, and removed occurrences while refreshing other generated supports', () => {
    const item = owner();
    const entries = ['hurlyburly', 'heath', 'Grimalkin', 'Anon'].map(quote => annotation(item, quote, 'Old ' + quote));
    let current = supports(item, entries);
    current = api.upsertReadingSupport(item, current, { id: entries[0].id, text: 'Teacher battle explanation' });
    current = api.setReadingSupportPinned(item, current, entries[1].id, true);
    current = api.removeReadingSupport(item, current, entries[2].id);
    const incoming = supports(item, entries.map(entry => ({ ...entry, text: 'New ' + entry.quote, priority: 'essential', origin: 'educator', pinned: true })));
    const merged = api.mergeReadingSupports(item, current, incoming);
    expect(merged.annotations.map(entry => entry.text)).toEqual(['Teacher battle explanation', 'Old heath', 'New Anon']);
    expect(merged.annotations[1]).toMatchObject({ pinned: true, origin: 'generated' });
    expect(merged.annotations[2]).toMatchObject({ pinned: false, origin: 'generated', priority: 'essential' });
    expect(merged.suppressedAnnotations).toEqual(current.suppressedAnnotations);
  });
  it('blocks a regenerated phrase from reintroducing a removed occurrence', () => {
    const item = owner('Upon the heath.');
    const old = annotation(item, 'heath');
    const current = api.removeReadingSupport(item, supports(item, [old]), old.id);
    const merged = api.mergeReadingSupports(item, current, supports(item, [annotation(item, 'the heath')]));
    expect(merged.annotations).toEqual([]);
    expect(merged.status).toBe('complete');
  });
  it('allows an unpinned generated gloss to refresh', () => {
    const item = owner(), entry = annotation(item, 'heath', 'Earlier meaning', { pinned: true });
    const current = api.setReadingSupportPinned(item, supports(item, [entry]), entry.id, false);
    const merged = api.mergeReadingSupports(item, current, supports(item, [{ ...entry, text: 'Improved meaning', pinned: false }]));
    expect(merged.annotations[0].text).toBe('Improved meaning');
  });
  it('keeps existing readable supports after failure and retains unprocessed sections after partial generation', () => {
    const item = owner(), entries = ['heath', 'Anon'].map(quote => annotation(item, quote, 'Saved ' + quote));
    const current = supports(item, entries);
    const failed = api.mergeReadingSupports(item, current, { sourceFingerprint: item.sourceSnapshot.fingerprint, status: 'unavailable', annotations: [] });
    expect(failed.annotations).toEqual(current.annotations);
    expect(failed.status).toBe('partial');
    const partial = api.mergeReadingSupports(item, current, { sourceFingerprint: item.sourceSnapshot.fingerprint, status: 'partial', annotations: [{ ...entries[0], text: 'Updated heath' }], skippedRanges: [{ start: entries[1].start, end: item.data.length, reason: 'not-processed' }] });
    expect(partial.annotations.map(entry => entry.text)).toEqual(['Updated heath', 'Saved Anon']);
  });
  it('does not accept a response for another source or lesson', () => {
    const item = owner(), other = { ...owner(macbeth, 'other-lesson'), id: 'copied-reader' };
    const current = supports(item, [annotation(item, 'heath')]);
    expect(() => api.mergeReadingSupports(item, current, supports(other, [annotation(other, 'heath')]))).toThrow(/different source or lesson/);
    expect(() => api.mergeReadingSupports(item, current, { sourceFingerprint: 'stale', annotations: [] })).toThrow(/different source or lesson/);
  });
});

describe('meaningful lighter presentation', () => {
  it('prioritizes essential meaning over annotation order and applies a paragraph budget', () => {
    const text = Array.from({ length: 70 }, (_, i) => 'term' + i).join(' ');
    const item = owner(text);
    const current = supports(item, [annotation(item, 'term0'), annotation(item, 'term15', 'Optional'), annotation(item, 'term30', 'Essential', { priority: 'essential' }), annotation(item, 'term50', 'Essential', { priority: 'essential' })]);
    expect(api.selectReadingSupports(item, current, { density: 'light' }).map(entry => entry.quote)).toEqual(['term30', 'term50']);
    expect(api.selectReadingSupports(item, current, { density: 'all' })).toHaveLength(4);
    expect(current.annotations).toHaveLength(4);
  });
  it('protects every teacher pin even when spacing or paragraph limits would otherwise hide it', () => {
    const item = owner('First second third fourth fifth.');
    const current = supports(item, ['First', 'second', 'third'].map(quote => annotation(item, quote, 'Pinned', { pinned: true })));
    expect(api.selectReadingSupports(item, current, { density: 'light' })).toHaveLength(3);
  });
  it('keeps nearby helpful glosses out while allowing support in a separate paragraph', () => {
    const paragraph = Array.from({ length: 80 }, (_, i) => 'word' + i).join(' ');
    const item = owner(paragraph + '\r\n\r\nA final unfamiliar term.');
    const current = supports(item, [annotation(item, 'word10', 'Essential', { priority: 'essential' }), annotation(item, 'word12', 'Nearby optional'), annotation(item, 'word40', 'Distant optional'), annotation(item, 'unfamiliar', 'Second paragraph')]);
    expect(api.selectReadingSupports(item, current, { density: 'light' }).map(entry => entry.quote)).toEqual(['word10', 'word40', 'unfamiliar']);
  });
});

describe('curated cloud and session round trips', () => {
  it.each(['cloud', 'session'])('retains teacher edits, pins, priority, suppression and scope through %s', channel => {
    const item = owner(), entries = ['hurlyburly', 'heath', 'Anon'].map(quote => annotation(item, quote));
    let current = supports(item, entries);
    current = api.upsertReadingSupport(item, current, { id: entries[0].id, text: 'Teacher meaning', priority: 'essential' });
    current = api.setReadingSupportPinned(item, current, entries[1].id, true);
    current = api.removeReadingSupport(item, current, entries[2].id);
    item.readingSupports = current;
    const transported = channel === 'cloud' ? window.sanitizeHistoryForCloud([item]) : window.prepareSessionResourcesForWrite([item]).resources;
    const [loaded] = window.hydrateHistory(transported);
    expect(loaded.data).toBe(macbeth);
    expect(loaded.sourceSnapshot.text).toBe(macbeth);
    expect(loaded.readingSupports).toEqual(current);
    expect(api.mergeReadingSupports(loaded, loaded.readingSupports, supports(loaded, entries)).annotations.map(entry => entry.quote)).toEqual(['hurlyburly', 'heath']);
  });
});

it('uses blank lines, not individual CRLF verse lines, as density paragraph boundaries', () => {
  const item = owner('First word\r\nSecond word\r\nThird word.');
  const current = supports(item, ['First', 'Second', 'Third'].map(quote => annotation(item, quote, 'Meaning')));
  expect(api.selectReadingSupports(item, current, { density: 'light' }).map(entry => entry.quote)).toEqual(['First']);
});

it('retains curation when the same preserved reading moves lessons, but not when another owner copies it', () => {
  const item = owner();
  item.readingSupports = api.upsertReadingSupport(item, undefined, annotation(item, 'heath', 'Teacher meaning', { pinned: true }));
  const moved = { ...item, unitId: 'new-lesson' };
  const [loaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([moved]));
  expect(loaded.readingSupports.annotations).toEqual(item.readingSupports.annotations);
  expect(loaded.readingSupports).toMatchObject({ ownerArtifactId: item.id, unitId: 'new-lesson', sourceFamilyId: item.sourceFamilyId });
  expect(api.selectReadingSupports(loaded, loaded.readingSupports, { density: 'light' })).toHaveLength(1);
  const copied = { ...moved, id: 'different-owner' };
  expect(api.validateReadingSupports(copied, item.readingSupports).annotations).toEqual([]);
  expect(() => api.mergeReadingSupports(copied, item.readingSupports, [])).toThrow(/different source or lesson/);
  const changedFamily = { ...moved, sourceFamilyId: 'different-source' };
  expect(api.validateReadingSupports(changedFamily, item.readingSupports).annotations).toEqual([]);
});
