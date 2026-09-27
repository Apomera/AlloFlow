import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let api, describeDelivery, serialize, resourceImages, checkImages;
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
const roundTrip = value => JSON.parse(JSON.stringify(value));
function pair() {
  const original = api.createSupportedReading('Fair is foul.\r\nAnd foul is fair.', {
    id: 'original-a', sourceFamilyId: 'family-a', unitId: 'unit-a'
  });
  original.readingSupports = api.validateReadingSupports(original, {
    annotations: [
      { id: 'kept', start: 0, end: 4, quote: 'Fair', text: 'PRIVATE_GLOSS', origin: 'educator', pinned: true, priority: 'essential', image: { src: png, alt: 'A checked picture' } },
      { id: 'removed', start: 8, end: 12, quote: 'foul', text: 'REMOVED_GLOSS', origin: 'generated' }
    ],
    suppressedAnnotations: [{ start: 8, end: 12, quote: 'foul' }]
  });
  const adapted = { id: 'adapted-a', type: 'simplified', title: 'Adapted', data: 'Good seems bad.',
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'family-a', unitId: 'unit-a',
    instructionalText: { form: 'adapted', role: 'supplemental' },
    karaokeAudio: { version: 4, entries: { a: { audio: 'TEACHER_AUDIO_CANARY', source: 'ai-generated', mime: 'audio/mpeg' } } },
    karaokeStudentAudio: { entries: { a: { audio: 'PRIVATE_STUDENT_CANARY' } } }
  };
  adapted.adaptedReadingSupports = api.validateAdaptedReadingSupports(adapted, {
    annotations: [{ id: 'good', start: 0, end: 4, quote: 'Good', text: 'Helpful', origin: 'educator', pinned: true }], shown: true
  });
  return [adapted, original];
}
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  api = window.AlloModules.InstructionalContext;
  const shared = readFileSync('shared_activity_source.jsx', 'utf8');
  describeDelivery = new Function('window', shared.slice(shared.indexOf('function _alloReadingDeliveryCapabilities('), shared.indexOf('// Assignment packet shaping')) + '\nreturn _alloDescribeAssignmentDelivery;')(window);
  const live = readFileSync('live_aac_source.jsx', 'utf8');
  const helpers = new Function('window', live.slice(live.indexOf('const _alloSerializeResourceForStudentPack ='), live.indexOf('const LiveAacBoardDialog =')) + '\nreturn { serialize: _alloSerializeResourceForStudentPack, images: _alloMailboxResourceImages, check: _alloCheckMailboxImages };')(window);
  serialize = item => helpers.serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
  resourceImages = helpers.images;
  checkImages = helpers.check;
});

describe('connected reading payload evidence', () => {
  it('reports the serialized and reopened reading pair without teacher-cache evidence or private content', () => {
    const [adapted, original] = pair();
    const received = window.hydrateHistory(roundTrip([serialize(adapted), serialize(original)]));
    window.AlloModules.KaraokeAudioStore = { current: { size: () => 100, get: () => 'blob:TEACHER_CACHE' } };
    const summary = describeDelivery(received, adapted.id, null, { received: true });
    const capabilities = summary.readings[0].capabilities;
    expect(summary.basis).toBe('received-resources');
    expect(capabilities.originalText).toMatchObject({ inclusion: 'included', availability: 'ready', resourceId: original.id });
    expect(capabilities.adaptedText).toMatchObject({ inclusion: 'included', availability: 'ready' });
    expect(capabilities.originalSupports).toMatchObject({ activeCount: 1, suppressedCount: 1, educatorCount: 1 });
    expect(capabilities.adaptedSupports).toMatchObject({ activeCount: 1, shown: true });
    expect(capabilities.pictures).toMatchObject({ includedCount: 1, availability: 'unverified', reason: 'decode-not-checked' });
    expect(capabilities.referenceAudio).toMatchObject({ inclusion: 'omitted', includedCount: 0, availability: 'unavailable', reason: 'route-unsupported' });
    expect(capabilities.instructionalRoles).toMatchObject({ reading: 'supplemental', original: 'primary', sourceFamilyId: 'family-a', unitId: 'unit-a' });
    for (const secret of ['TEACHER_AUDIO_CANARY', 'PRIVATE_STUDENT_CANARY', 'TEACHER_CACHE', 'PRIVATE_GLOSS', 'REMOVED_GLOSS', png]) {
      expect(JSON.stringify(summary)).not.toContain(secret);
    }
    expect(received[0].karaokeAudio).toBeNull();
    expect(received[0].karaokeStudentAudio).toBeUndefined();
    expect(serialize(received[0]).readingDelivery.referenceAudio.reason).toBe('route-unsupported');
  });

  it('does not treat unresolved manifests as missing originals or empty support collections', () => {
    const item = { id: 'adapted-a', type: 'simplified', __alloResourceRef: 'asset-a' };
    const pending = describeDelivery([item], item.id).readings[0];
    expect(pending).toMatchObject({ originalStatus: 'unverified', supportsCount: null });
    expect(pending.capabilities.referenceAudio).toMatchObject({ inclusion: 'unknown', availability: 'unverified', reason: 'asset-not-resolved' });
    const failed = describeDelivery([item], item.id, null, { received: true, assetStatus: 'failed' }).readings[0];
    expect(failed.capabilities.originalText).toMatchObject({ availability: 'unavailable', reason: 'missing-asset' });
  });

  it('never lets a cached or sender-authored ready flag establish audio readiness after refresh', () => {
    const [adapted] = pair();
    const withoutAudio = { ...adapted, karaokeAudio: null, readingDelivery: { version: 1, referenceAudio: { inclusion: 'included', availability: 'ready' } } };
    const received = roundTrip(withoutAudio);
    expect(describeDelivery([received], received.id).readings[0].capabilities.referenceAudio).toMatchObject({ inclusion: 'omitted', availability: 'unavailable' });
    expect(describeDelivery([adapted], adapted.id).readings[0].capabilities.referenceAudio).toMatchObject({ inclusion: 'included', availability: 'unverified', reason: 'playback-not-checked' });
  });

  it('keeps citations confined to the received resource text', () => {
    const [adapted] = pair();
    expect(describeDelivery([adapted], adapted.id).readings[0].capabilities.citations).toMatchObject({ inclusion: 'unknown', reason: 'no-owned-reference-list' });
    const cited = { ...adapted, data: adapted.data + '\n\n## Source Text References\n1. [Source](https://example.invalid/source)' };
    expect(describeDelivery([cited], cited.id).readings[0].capabilities.citations).toMatchObject({ inclusion: 'included', basis: 'resource-owned-text', verification: 'not-assessed' });
    expect(describeDelivery([cited], cited.id).readings[0].resourceRevision).not.toBe(describeDelivery([adapted], adapted.id).readings[0].resourceRevision);
  });

  it('rejects stale supports and does not borrow identical-text supports from another family', () => {
    const [adapted, original] = pair();
    const wrongFamily = { ...original, sourceFamilyId: 'family-b' };
    const summary = describeDelivery([adapted, wrongFamily], adapted.id);
    expect(summary.readings[0].capabilities.originalSupports.activeCount).toBe(0);
    const changed = { ...adapted, data: 'Changed passage.' };
    expect(describeDelivery([changed], changed.id).readings[0].capabilities.adaptedSupports).toMatchObject({ availability: 'unavailable', reason: 'stale-identity' });
  });

  it('includes object-shaped support pictures in receipt checks and reports offline decode failure', async () => {
    const [, original] = pair();
    const manifest = resourceImages(serialize(original));
    expect(manifest.sources).toEqual([png]);
    const loadImage = vi.fn(async () => false);
    expect(await checkImages(manifest, { loadImage })).toMatchObject({ status: 'failed', ready: 0, total: 1, omitted: 0 });
    expect(loadImage).toHaveBeenCalledWith(png, undefined);
    expect(await checkImages(manifest, { loadImage: async () => true })).toMatchObject({ status: 'ready', ready: 1, total: 1 });
  });

  it('reports picture omission while preserving the educator note through another serialization', () => {
    const [, original] = pair();
    original.readingSupports.annotations[0].image.src = 'data:image/png;base64,' + 'A'.repeat(33000);
    const received = serialize(original);
    expect(received.readingSupports.annotations[0]).toMatchObject({ text: 'PRIVATE_GLOSS', pinned: true });
    expect(describeDelivery([received], received.id).readings[0].capabilities.pictures).toMatchObject({ inclusion: 'omitted', omittedCount: 1, reason: 'invalid-or-over-budget' });
    expect(serialize(received).readingDelivery.pictures.omittedCount).toBe(1);
    expect(resourceImages(received)).toMatchObject({ sources: [], omitted: 1 });
  });
});


describe('delivery follow-up accuracy', () => {
  it('clears repaired, removed, and suppressed picture omissions without losing unrelated omissions', () => {
    const [, original] = pair();
    original.readingSupports.annotations[0].image.src = 'data:image/png;base64,' + 'A'.repeat(33000);
    const received = serialize(original);
    expect(received.readingDelivery.pictures.omittedSupportKeys).toHaveLength(1);
    const repaired = roundTrip(received);
    repaired.readingSupports.annotations[0].image = { src: png, alt: 'Repaired' };
    expect(serialize(repaired).readingDelivery.pictures.omittedCount).toBe(0);
    const removed = roundTrip(received);
    removed.readingSupports.annotations = [];
    expect(serialize(removed).readingDelivery.pictures.omittedCount).toBe(0);
    const suppressed = roundTrip(received);
    suppressed.readingSupports.suppressedAnnotations.push({ start: 0, end: 4, quote: 'Fair' });
    expect(serialize(suppressed).readingDelivery.pictures.omittedCount).toBe(0);
    expect(serialize(received).readingDelivery.pictures.omittedCount).toBe(1);
    expect(JSON.stringify(received.readingDelivery)).not.toContain('Fair');
  });

  it('changes the adaptation preview revision when its paired original is curated', () => {
    const [adapted, original] = pair();
    const first = describeDelivery([adapted, original], adapted.id).readings[0].resourceRevision;
    const changed = roundTrip(original); changed.readingSupports.annotations[0].text = 'Revised meaning';
    const second = describeDelivery([adapted, changed], adapted.id).readings[0].resourceRevision;
    expect(second).not.toBe(first);
    expect(describeDelivery([changed, adapted], adapted.id).readings[1].resourceRevision).toBe(second);
    const otherFamily = { ...changed, id: 'other', sourceFamilyId: 'other' };
    expect(describeDelivery([adapted, original, otherFamily], adapted.id).readings[0].resourceRevision).toBe(first);
  });

  it('reports a missing adapted validator as unknown without an invented zero count', () => {
    const [adapted] = pair(), validator = api.validateAdaptedReadingSupports;
    delete api.validateAdaptedReadingSupports;
    try {
      const state = describeDelivery([adapted], adapted.id).readings[0].capabilities.adaptedSupports;
      expect(state).toEqual({ inclusion: 'unknown', availability: 'unverified', reason: 'validator-unavailable' });
      expect(state.activeCount).toBeUndefined();
    } finally { api.validateAdaptedReadingSupports = validator; }
  });

  it('keeps whole-pack advertised counts separate from verified contents and disables subset conversion', () => {
    const manifest = { id: 'manifest-a', type: 'session-resources-manifest', __alloResourcesManifestRef: 'asset-a', __alloResourceCount: 250 };
    const pending = describeDelivery([manifest], manifest.id, null, { received: true });
    expect(pending).toMatchObject({ contentsStatus: 'unverified', resourceCount: null, advertisedResourceCount: 250, verifiedResourceCount: 0, openingResourceId: null, conversionResourceIds: null, readings: [] });
    expect(describeDelivery([manifest], manifest.id, null, { assetStatus: 'failed' })).toMatchObject({ contentsStatus: 'unavailable', contentsReason: 'missing-asset' });
    const [adapted, original] = pair();
    expect(describeDelivery([adapted, manifest], adapted.id).conversionResourceIds).toBeNull();
    expect(describeDelivery([adapted, original], adapted.id)).toMatchObject({ contentsStatus: 'ready', resourceCount: 2, verifiedResourceCount: 2 });
  });
});


describe('received capability consistency', () => {
  it('does not count unavailable supports or their pictures as usable', () => {
    const [adapted, original] = pair();
    original.readingSupports.status = 'unavailable';
    const row = describeDelivery([adapted, original], adapted.id).readings[0];
    expect(row.capabilities.originalSupports).toMatchObject({ availability: 'unavailable', activeCount: 0 });
    expect(row.supportsCount).toBe(0);
    expect(row.supportsStatus).toBe('unavailable');
    expect(row.capabilities.pictures.includedCount).toBe(0);
  });

  it('keeps picture coverage unknown when adapted supports cannot be validated', () => {
    const [adapted] = pair();
    adapted.adaptedReadingSupports.annotations[0].image = { src: png, alt: 'A support picture' };
    const validator = api.validateAdaptedReadingSupports;
    delete api.validateAdaptedReadingSupports;
    try {
      const pictures = describeDelivery([adapted], adapted.id).readings[0].capabilities.pictures;
      expect(pictures).toMatchObject({ inclusion: 'unknown', availability: 'unverified', reason: 'validator-unavailable' });
    } finally { api.validateAdaptedReadingSupports = validator; }
  });

  it.each(['{"broken":', '{"not":"text"}', 'null', '42'])('does not describe malformed explicit text envelopes as ready: %s', data => {
    const [adapted] = pair();
    const damaged = { ...adapted, data, dataEncoding: 'json-text/v1' }, before = JSON.stringify(damaged);
    const row = describeDelivery([damaged], damaged.id).readings[0];
    expect(row.bodyStatus).toBe('unavailable');
    expect(row.capabilities.adaptedText).toMatchObject({ availability: 'unavailable', reason: 'invalid-text-envelope' });
    expect(JSON.stringify(damaged)).toBe(before);
    // JSON-looking prose stays legitimate text when no JSON-text envelope is declared.
    const plain = { ...adapted, data, dataEncoding: 'text/v1' };
    expect(describeDelivery([plain], plain.id).readings[0].capabilities.adaptedText.availability).toBe('ready');
  });
});


describe('explicit reading text across receive and reshare boundaries', () => {
  it.each(['{"broken":', '{"not":"text"}', 'null', '42'])('keeps an invalid explicit envelope unavailable after hydrate, reopen and reshare: %s', data => {
    const [adapted] = pair();
    const damaged = { ...adapted, data, dataEncoding: 'json-text/v1' }, before = JSON.stringify(damaged);
    const hydrated = window.hydrateHistory(roundTrip([damaged]));
    const reopened = window.hydrateHistory(roundTrip(window.sanitizeHistoryForCloud(hydrated)));
    const portable = window.hydrateHistory(roundTrip(reopened.map(serialize)));
    for (const received of [hydrated, reopened, portable]) {
      const row = describeDelivery(received, damaged.id, null, { received: true }).readings[0];
      expect(received[0].dataEncoding).toBe('json-text/v1');
      expect(row).toMatchObject({ bodyStatus: 'unavailable', bodyReason: 'invalid-text-envelope' });
      expect(row.capabilities.adaptedText.availability).toBe('unavailable');
    }
    expect(JSON.stringify(damaged)).toBe(before);
  });

  it('does not accept a matching snapshot as proof that an invalid explicit envelope decoded', () => {
    const original = api.createSupportedReading('{"not":"text"}', { id: 'json-original' });
    const invalid = { ...original, dataEncoding: 'json-text/v1' };
    for (const received of [window.hydrateHistory([invalid])[0], serialize(invalid)]) {
      expect(received.dataEncoding).toBe('json-text/v1');
      expect(received.instructionalText.form).not.toBe('same-text-supported');
      expect(describeDelivery([received], received.id).readings[0].bodyStatus).toBe('unavailable');
    }
  });

  it.each(['"quoted prose"', '{"not":"text"}', 'null', '42'])('decodes valid explicit text once and preserves plain/legacy prose: %s', text => {
    const original = api.createSupportedReading(text, { id: 'json-original' });
    const encoded = { ...original, data: JSON.stringify(text), dataEncoding: 'json-text/v1' };
    for (const received of [window.hydrateHistory([encoded])[0], serialize(encoded)]) {
      expect(received.data).toBe(text);
      expect(received.dataEncoding).toBe('text/v1');
      expect(api.isSupportedOriginal(received)).toBe(true);
      expect(window.hydrateHistory(roundTrip([received]))[0].data).toBe(text);
    }
    for (const encoding of [undefined, 'text/v1']) {
      expect(window.hydrateHistory([{ ...original, dataEncoding: encoding }])[0].data).toBe(text);
    }
  });
});


describe('received source-pair capability ownership', () => {
  it('recognizes a matching received original despite the adaptation carrying an old source-unavailable flag', () => {
    const [adapted, original] = pair();
    adapted.readingSourceAvailability = { status: 'unavailable', reason: 'live-session-size-limit' };
    const before = JSON.stringify([adapted, original]);
    const row = describeDelivery([adapted, original], adapted.id, null, { received: true }).readings[0];
    expect(row.originalStatus).toBe('included');
    expect(row.capabilities.originalText).toMatchObject({ inclusion: 'included', availability: 'ready', resourceId: original.id });
    expect(row.capabilities.originalSupports).toMatchObject({ availability: 'ready', activeCount: 1, educatorCount: 1 });
    expect(row.capabilities.pictures.includedCount).toBe(1);
    expect(JSON.stringify([adapted, original])).toBe(before);
  });

  it('describes the role on the received original instead of the adaptation’s older source-role copy', () => {
    const [adapted, original] = pair();
    adapted.sourceInstructionalText = { form: 'original', role: 'primary', designationSource: 'educator' };
    original.instructionalText = { ...original.instructionalText, role: 'supplemental', designationSource: 'educator' };
    const row = describeDelivery([adapted, original], adapted.id).readings[0];
    expect(row.capabilities.instructionalRoles).toMatchObject({ reading: 'supplemental', original: 'supplemental' });
    expect(describeDelivery([adapted], adapted.id).readings[0].capabilities.instructionalRoles.original).toBe('primary');
  });

  it.each([
    ['wrong family', { sourceFamilyId: 'unrelated' }],
    ['wrong unit', { unitId: 'another-unit' }],
    ['truncated', { syncTruncated: true }],
    ['unavailable', { readingSourceAvailability: { status: 'unavailable' } }],
    ['unresolved asset', { __alloResourceRef: 'not-downloaded' }]
  ])('does not use an original candidate that is %s', (_name, change) => {
    const [adapted, original] = pair();
    adapted.readingSourceAvailability = { status: 'unavailable', reason: 'source-unavailable' };
    const row = describeDelivery([adapted, { ...original, ...change }], adapted.id).readings[0];
    expect(row.originalStatus).toBe('unavailable');
    expect(row.capabilities.originalText.availability).toBe('unavailable');
    expect(row.capabilities.originalSupports.activeCount).toBe(0);
  });

  it('withdraws matching-original evidence after removal from the received bundle', () => {
    const [adapted, original] = pair();
    adapted.readingSourceAvailability = { status: 'unavailable', reason: 'source-unavailable' };
    const included = describeDelivery([adapted, original], adapted.id).readings[0];
    const removed = describeDelivery([adapted], adapted.id).readings[0];
    expect(included.capabilities.originalText.availability).toBe('ready');
    expect(removed.capabilities.originalText.availability).toBe('unavailable');
    expect(removed.resourceRevision).not.toBe(included.resourceRevision);
  });
});
