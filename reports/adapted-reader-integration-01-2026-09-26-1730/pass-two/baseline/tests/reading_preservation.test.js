import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let Context;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  Context = window.AlloModules.InstructionalContext;
});

const passages = [
  '42', 'null', '{"scene":"Macbeth","lines":[1,2]}', '["Fair","foul"]',
  '"Quoted prose"', '  First Witch\r\nWhen shall we three meet again?\r\n\r\n[Thunder.]  ',
  '# Sources\n[1] Fair is foul.\n\nReferences\nKeep this reference.',
  'عادل قبيح\r\n😀 言葉', 'data: is a word in this source', 'blob: also a literal passage'
];

describe('original reading contract', () => {
  it.each(passages)('retains exact canonical text on creation and cloud/session round-trip: %s', (text) => {
    const original = Context.createSupportedReading(text, {
      id: 'source-reader', sourceArtifactId: 'source-1', capturedAt: '2026-09-19T12:00:00.000Z',
      provenance: { selection: 'educator-selected-source' },
      config: { instructionalText: { form: 'adapted', replacementAuthorization: { authorized: true, source: 'educator' } } }
    });
    expect(original.data).toBe(text);
    expect(original.sourceSnapshot.text).toBe(text);
    expect(Context.isSupportedOriginal(original)).toBe(true);
    expect(original.instructionalText).toMatchObject({
      role: 'primary', form: 'same-text-supported', replacementAuthorization: { authorized: false, source: 'none' }
    });
    const [cloud] = window.hydrateHistory(window.sanitizeHistoryForCloud([original]));
    expect(cloud.data).toBe(text);
    expect(Context.isSupportedOriginal(cloud)).toBe(true);
    const [shared] = window.prepareSessionResourcesForWrite([original]).resources;
    expect(shared.data).toBe(text);
    expect(shared.sourceSnapshot.text).toBe(text);
    expect(Context.isSupportedOriginal(shared)).toBe(true);
    expect(original.data).toBe(text);
  });

  it('distinguishes CRLF and Unicode normalization without changing complexity fingerprints', () => {
    expect(Context.fingerprintText('a\r\nb')).toBe(Context.fingerprintText('a\nb'));
    expect(Context.fingerprintSourceText('a\r\nb')).not.toBe(Context.fingerprintSourceText('a\nb'));
    expect(Context.fingerprintSourceText('é')).not.toBe(Context.fingerprintSourceText('e\u0301'));
  });

  it('rejects body mutation, corrupt snapshots and unsupported schemas', () => {
    const original = Context.createSupportedReading('Exact source');
    expect(Context.isSupportedOriginal({ ...original, data: 'Exact source\n' })).toBe(false);
    expect(Context.getSourceSnapshot({ ...original, sourceSnapshot: { ...original.sourceSnapshot, text: 'Changed' } })).toBeNull();
    expect(Context.getSourceSnapshot({ ...original, sourceSnapshot: { ...original.sourceSnapshot, schemaVersion: 2 } })).toBeNull();
    expect(Context.createSupportedReading({ text: 'Unverified' })).toBeNull();
    expect(Context.getSourceSnapshot({ type: 'simplified', sourceArtifactId: 'missing' })).toBeNull();
  });

  it('owns snapshot metadata so editing the selected history item cannot affect captured reading', () => {
    const snapshot = Context.createSourceSnapshot('First source', { sourceArtifactId: 'deleted-analysis', provenance: { note: 'Chosen saved source', secret: 'omit' } });
    const reader = Context.createSupportedReading(snapshot);
    snapshot.text = 'Later revision';
    snapshot.provenance.note = 'Later note';
    expect(reader.data).toBe('First source');
    expect(reader.sourceSnapshot.provenance.note).toBe('Chosen saved source');
    expect(reader.sourceSnapshot.provenance.secret).toBeUndefined();
  });

  it('pairs adaptations with captured originals and deduplicates by exact text', () => {
    const snapshot = Context.createSourceSnapshot('Full source\r\nSecond line', { sourceArtifactId: 'deleted-source' });
    const companion = { id: 'adapted', type: 'simplified', title: 'Lesson', data: 'Easier text', sourceSnapshot: snapshot, instructionalText: { form: 'adapted', role: 'supplemental' } };
    const paired = Context.ensureReadingSourcePairs([companion, { ...companion, id: 'other-level' }]);
    expect(paired).toHaveLength(3);
    expect(paired.filter(Context.isSupportedOriginal)).toHaveLength(1);
    expect(paired[0].data).toBe(snapshot.text);
    expect(paired[1]).toBe(companion);
    expect(Context.ensureReadingSourcePairs(paired)).toHaveLength(3);
    expect(Context.ensureReadingSourcePairs([{ ...companion, sourceSnapshot: null }])).toHaveLength(1);
  });

  it('preserves different exact source representations and avoids imported ID collisions', () => {
    const first = Context.createSourceSnapshot('a\r\nb');
    const second = Context.createSourceSnapshot('a\nb');
    const make = (snapshot, id) => ({ id, type: 'simplified', data: 'adapted', sourceSnapshot: snapshot, instructionalText: { form: 'adapted' } });
    const collision = { id: 'original-' + first.fingerprint, type: 'quiz', data: {} };
    const paired = Context.ensureReadingSourcePairs([collision, make(first, 'one'), make(second, 'two')]);
    expect(paired.filter(Context.isSupportedOriginal)).toHaveLength(2);
    expect(new Set(paired.map(item => item.id)).size).toBe(paired.length);
  });
});

describe('reading annotation anchors', () => {
  it('keeps repeated words tied to the selected occurrence and validates exact UTF-16 offsets', () => {
    const snapshot = Context.createSourceSnapshot('😀 foul, foul.');
    const result = Context.validateReadingSupports(snapshot, { sourceFingerprint: snapshot.fingerprint, annotations: [
      { id: 'second', start: 9, end: 13, quote: 'foul', text: 'Unpleasant in this phrase.' },
      { id: 'first', start: 3, end: 7, quote: 'foul', kind: 'definition', text: 'Bad or unpleasant.' }
    ] });
    expect(result.status).toBe('complete');
    expect(result.annotations.map(annotation => annotation.id)).toEqual(['first', 'second']);
    expect(snapshot.text).toBe('😀 foul, foul.');
  });

  it('rejects invalid ranges, overlaps, duplicate IDs and stale quote anchors individually', () => {
    const snapshot = Context.createSourceSnapshot('fair is foul');
    const result = Context.validateReadingSupports(snapshot, [
      { id: 'ok', start: 0, end: 4, quote: 'fair', text: 'Beautiful.' },
      { id: 'overlap', start: 0, end: 7, quote: 'fair is', text: 'Overlap.' },
      { id: 'ok', start: 8, end: 12, quote: 'foul', text: 'Duplicate ID.' },
      { start: -1, end: 4, quote: 'fair', text: 'Out of bounds.' },
      { start: 8, end: 12, quote: 'fair', text: 'Wrong occurrence.' },
      { start: 8, end: 12, quote: 'foul', text: '', kind: 'gloss' }
    ]);
    expect(result.annotations).toHaveLength(1);
    expect(result.rejectedCount).toBe(5);
    expect(result.status).toBe('partial');
    expect(Context.validateReadingSupports(snapshot, result).rejectedCount).toBe(5);
  });

  it('rejects a stale source envelope without replacing the original', () => {
    const snapshot = Context.createSourceSnapshot('fair');
    const result = Context.validateReadingSupports(snapshot, {
      sourceFingerprint: 'stale',
      annotations: [{ start: 0, end: 4, quote: 'fair', text: 'Beautiful.' }]
    });
    expect(result).toMatchObject({ status: 'unavailable', annotations: [], rejectedCount: 1 });
    expect(snapshot.text).toBe('fair');
  });
});

describe('text-safe storage and bounded delivery', () => {
  it.each(passages)('decodes typed text exactly once: %s', (text) => {
    const source = Context.createSupportedReading(text);
    const stored = { ...source, data: JSON.stringify(text), dataEncoding: 'json-text/v1' };
    const [loaded] = window.hydrateHistory([stored]);
    expect(loaded.data).toBe(text);
    expect(loaded.dataEncoding).toBe('text/v1');
    expect(Context.isSupportedOriginal(loaded)).toBe(true);
    const [cloudLoaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([stored]));
    expect(cloudLoaded.data).toBe(text);
    expect(Context.isSupportedOriginal(cloudLoaded)).toBe(true);
  });

  it('preserves legacy JSON-looking readable strings and decodes old string envelopes', () => {
    ['42', 'null', '{"meaning":"text"}', '["a","b"]'].forEach(text => {
      expect(window.hydrateHistory([{ type: 'simplified', data: text }])[0].data).toBe(text);
    });
    expect(window.hydrateHistory([{ type: 'simplified', data: JSON.stringify('Legacy\r\ntext') }])[0].data).toBe('Legacy\r\ntext');
    expect(window.hydrateHistory([{ type: 'analysis', data: JSON.stringify({ originalText: 'Legacy source' }) }])[0].data).toEqual({ originalText: 'Legacy source' });
    expect(window.hydrateHistory([{ type: 'quiz', data: '[{"question":"Why?"}]' }])[0].data).toEqual([{ question: 'Why?' }]);
  });

  it('keeps raw quoted JSON text when a valid snapshot disambiguates an unmarked legacy record', () => {
    const reading = Context.createSupportedReading('"Quoted source"');
    delete reading.dataEncoding;
    expect(window.hydrateHistory([reading])[0].data).toBe('"Quoted source"');
  });

  it('marks oversized originals unavailable while retaining exact local history', () => {
    const reading = Context.createSupportedReading('X'.repeat(120001));
    const [shared] = window.prepareSessionResourcesForWrite([reading]).resources;
    expect(shared.syncTruncated).toBe(true);
    expect(shared.readingPreservation.status).toBe('unavailable');
    expect(shared.instructionalText.form).not.toBe('same-text-supported');
    expect(shared.sourceSnapshot).toBeUndefined();
    expect(Context.isSupportedOriginal(shared)).toBe(false);
    expect(reading.data.length).toBe(120001);
    expect(Context.isSupportedOriginal(reading)).toBe(true);
    expect(window.hydrateHistory(window.sanitizeHistoryForCloud([reading]))[0].data).toBe(reading.data);
  });

  it('does not grant preservation after a bounded resource is compacted', () => {
    const reading = Context.createSupportedReading('完整的原文'.repeat(12000));
    const result = window.prepareSessionResourcesForWrite([reading], { maxBytes: 8000 });
    expect(result.byteLength).toBeLessThanOrEqual(8000);
    expect(result.resources[0].syncTruncated).toBe(true);
    expect(result.resources[0].instructionalText.form).not.toBe('same-text-supported');
    expect(Context.isSupportedOriginal(result.resources[0])).toBe(false);
  });

  it('downgrades imported preservation metadata when the canonical body mismatches', () => {
    const reading = Context.createSupportedReading('Source');
    const [loaded] = window.hydrateHistory([{ ...reading, data: 'Mutated', config: { instructionalText: { form: 'same-text-supported', role: 'primary' } } }]);
    expect(loaded.readingPreservation).toMatchObject({ status: 'unavailable', reason: 'source-text-mismatch' });
    expect(loaded.instructionalText.form).toBe('adapted');
    expect(loaded.config.instructionalText.form).toBe('adapted');
    expect(Context.isSupportedOriginal(loaded)).toBe(false);
  });

  it('validates reading annotations again at cloud hydration', () => {
    const reading = Context.createSupportedReading('fair', {
      readingSupports: [{ start: 0, end: 4, quote: 'fair', text: 'Beautiful.' }]
    });
    reading.readingSupports.annotations.push({ start: 8, end: 12, quote: 'gone', text: 'Invalid.' });
    const [loaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([reading]));
    expect(loaded.readingSupports.annotations).toHaveLength(1);
    expect(loaded.readingSupports.status).toBe('partial');
    expect(loaded.readingSupports.rejectedCount).toBe(1);
    expect(loaded.data).toBe('fair');
  });
});

describe('reading support coverage and lazy loading', () => {
  it('retains bounded scanned and skipped source ranges across persistence', () => {
    const snapshot = Context.createSourceSnapshot('fair\r\nfoul');
    const supports = Context.validateReadingSupports(snapshot, {
      sourceFingerprint: snapshot.fingerprint, annotations: [],
      coveredRanges: [{ start: 0, end: 6 }],
      skippedRanges: [{ start: 6, end: 10, reason: 'not-processed' }]
    });
    expect(supports.status).toBe('partial');
    const original = Context.createSupportedReading(snapshot, { readingSupports: supports });
    const [loaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([original]));
    expect(loaded.readingSupports.coveredRanges).toEqual([{ start: 0, end: 6 }]);
    expect(loaded.readingSupports.skippedRanges).toEqual([{ start: 6, end: 10, reason: 'not-processed' }]);
    expect(loaded.readingSupports.status).toBe('partial');
  });

  it('rejects malformed and overlapping coverage ranges without claiming complete coverage', () => {
    const snapshot = Context.createSourceSnapshot('fair is foul');
    const result = Context.validateReadingSupports(snapshot, {
      coveredRanges: [{ start: 0, end: 4 }, { start: 2, end: 7 }, { start: 4, end: 99 }],
      skippedRanges: [{ start: -1, end: 12 }],
      annotations: []
    });
    expect(result.coveredRanges).toEqual([{ start: 0, end: 4 }]);
    expect(result.skippedRanges).toEqual([]);
    expect(result.status).toBe('partial');
  });

  it('does not accept anchors that split a surrogate pair', () => {
    const snapshot = Context.createSourceSnapshot('😀 fair');
    const result = Context.validateReadingSupports(snapshot, [
      { start: 0, end: 1, quote: '\uD83D', text: 'Half a character' },
      { start: 0, end: 2, quote: '😀', text: 'A smiling face.' }
    ]);
    expect(result.annotations).toHaveLength(1);
    expect(result.annotations[0].quote).toBe('😀');
    expect(result.rejectedCount).toBe(1);
  });

  it('validates preservation before the context module has loaded', () => {
    const reading = Context.createSupportedReading('Unchanged\r\n"source"');
    const savedApi = window.AlloModules.InstructionalContext;
    try {
      delete window.AlloModules.InstructionalContext;
      const [valid] = window.hydrateHistory([reading]);
      expect(valid.instructionalText.form).toBe('same-text-supported');
      const [invalid] = window.hydrateHistory([{ ...reading, data: 'Wrong' }]);
      expect(invalid.instructionalText.form).toBe('adapted');
      expect(invalid.readingPreservation.status).toBe('unavailable');
      const [shared] = window.prepareSessionResourcesForWrite([reading]).resources;
      expect(shared.data).toBe(reading.data);
      expect(shared.sourceSnapshot.fingerprint).toBe(reading.sourceSnapshot.fingerprint);
    } finally {
      window.AlloModules.InstructionalContext = savedApi;
    }
  });

  it('does not permit replacement authorization on a supported original', () => {
    const profile = Context.normalizeInstructionalText({
      form: 'same-text-supported', role: 'primary',
      replacementAuthorization: { authorized: true, source: 'educator' }
    });
    expect(profile.replacementAuthorization).toEqual({ authorized: false, source: 'none' });
  });
});

it('retains total support-generation failure during validation and hydration', () => {
  const reading = Context.createSupportedReading('fair', {
    readingSupports: { sourceFingerprint: Context.fingerprintSourceText('fair'), annotations: [], status: 'unavailable', coveredRanges: [], skippedRanges: [{ start: 0, end: 4, reason: 'generation-failed' }] }
  });
  expect(reading.readingSupports.status).toBe('unavailable');
  expect(window.hydrateHistory(window.sanitizeHistoryForCloud([reading]))[0].readingSupports.status).toBe('unavailable');
});