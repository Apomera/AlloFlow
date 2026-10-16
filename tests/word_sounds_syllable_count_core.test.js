import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pronunciations = require('../word_sounds_pronunciations.js');
const source = readFileSync('word_sounds_core.js', 'utf8');
const makeCore = new Function(source + '\nreturn createWordSoundsCore;')();
const core = makeCore({ pronunciations });
const recordingAsset = (byte = 0) => {
  const wav = Buffer.alloc(68); wav.write('RIFF'); wav.write('WAVE', 8); wav[60] = byte;
  return { mime: 'audio/wav', base64: wav.toString('base64'), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
};
const recordedWord = (word = 'family', language = 'en-US', count = 3, revision = 2) => core.createReviewedSyllableTask({
  targetWord: word, language, reviewed: true, revision,
  syllables: Array.from({ length: count }, (_, i) => 'part' + i), assets: Array.from({ length: count }, () => recordingAsset()),
});
// Prior releases generated this approval from the recording units alone.
const legacyRecordedCount = (recordedTask, audioContext) => {
  const result = { ...core.createReviewedSyllableCount({ targetWord: recordedTask.targetWord, language: recordedTask.language,
    count: recordedTask.syllables.length, revision: recordedTask.revision, reviewed: true, audioContext }),
    source: 'teacher_recording', recordingSignature: recordedTask.review.signature };
  result.review = { confirmed: true, signature: JSON.stringify([result.targetWord, result.language, result.revision, result.count,
    result.source, result.recordingSignature, result.audioContext?.signature || null]) };
  return result;
};
// A genuine v2 fixture uses the old checksum rather than calling the v3 writer.
const legacyRecording = () => {
  const task = { ...recordedWord(), version: 2, language: 'en' };
  const value = JSON.stringify([task.targetWord, task.language, task.revision, task.syllables,
    task.audioUnits.map(unit => [unit.key, unit.text, unit.asset.mime, unit.asset.base64, unit.asset.durationSeconds])]);
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
  task.review = { confirmed: true, signature: (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16) };
  return task;
};

describe('shared syllable count evidence', () => {
  it.each([
    ['apple', 2], ['table', 2], ['people', 2], ['vehicle', 3],
    ['readable', 3], ['lion', 2], ['poem', 2], ['wanted', 2],
    ['jumped', 1], ['communication', 5], ['responsibility', 6],
  ])('resolves %s from pronunciation evidence as %i', (word, count) => {
    expect(core.resolveSyllableCount(word, { language: 'en' })).toMatchObject({
      supported: true, count, counts: [count], source: 'cmudict', status: 'dictionary',
    });
  });

  it.each(['fire', 'hour', 'family', 'every', 'camera'])('requires a choice for %s pronunciation variants', word => {
    const result = core.resolveSyllableCount(word, { language: 'en' });
    expect(result.supported).toBe(false);
    expect(result.count).toBeNull();
    expect(result.reason).toBe('pronunciation_variant');
    expect(result.counts.length).toBeGreaterThan(1);
  });

  it('preserves the selected pronunciation through serialization and rejects a changed target', () => {
    const prepared = JSON.parse(JSON.stringify(core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en', count: 1, reviewed: true, revision: 3 })));
    expect(core.resolveSyllableCount('fire', { language: 'en', prepared })).toMatchObject({ supported: true, count: 1, source: 'teacher_review', revision: 3 });
    expect(core.resolveSyllableCount('hour', { language: 'en', prepared }).supported).toBe(false);
    expect(core.resolveSyllableCount('fire', { language: 'fr', prepared }).supported).toBe(false);
    expect(core.resolveSyllableCount('fire', { language: 'en', prepared: { ...prepared, count: 2 } }).supported).toBe(false);
  });

  it('lets a reviewed local pronunciation override the US English dictionary', () => {
    const prepared = core.createReviewedSyllableCount({ targetWord: 'vehicle', language: 'en-GB', count: 2, reviewed: true, revision: 1 });
    expect(core.resolveSyllableCount('vehicle', { language: 'en-GB', prepared })).toMatchObject({ supported: true, count: 2, source: 'teacher_review' });
    const variant = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-GB', count: 1, reviewed: true, revision: 1 });
    expect(core.resolveSyllableCount('fire', { language: 'en-US', prepared: variant }).supported).toBe(false);
  });

  it('preserves signed dictionary evidence offline but rejects tampered counts', () => {
    const prepared = JSON.parse(JSON.stringify(core.resolveSyllableCount('apple', { language: 'en' })));
    const offline = makeCore({ pronunciations: { lookup: () => [] } });
    expect(offline.resolveSyllableCount('apple', { language: 'en', prepared })).toMatchObject({ supported: true, count: 2, source: 'cmudict' });
    expect(offline.resolveSyllableCount('apple', { language: 'en', prepared: { ...prepared, count: 1, counts: [1] } }).supported).toBe(false);
    expect(offline.resolveSyllableCount('table', { language: 'en', prepared }).supported).toBe(false);
  });

  it('does not turn an old guessed answer or unknown spelling into a graded answer', () => {
    const result = core.resolveSyllableCount('zzzzinventedword', { language: 'en', prepared: { answer: 4, count: 4, syllables: ['zz', 'zz', 'in', 'ventedword'] } });
    expect(result.supported).toBe(false);
    expect(result.count).toBeNull();
    expect(core.resolveSyllableCount('apple', { language: 'fr' }).supported).toBe(false);
  });

  it('keeps the compound bank usable without downloading the dictionary', () => {
    const offline = makeCore({ pronunciations: { lookup: () => [] } });
    for (const word of offline.syllableWords()) {
      expect(offline.resolveSyllableCount(word, { language: 'en' })).toMatchObject({ supported: true, count: 2, source: 'compound_bank' });
    }
  });

  it('offers longer recording drafts without approving or synthesizing fragments', () => {
    expect(core.syllableCountWords()).toHaveLength(101);
    expect(new Set(core.syllableCountWords()).size).toBe(101);
    expect(core.syllableRecordingTemplate('responsibility', 'en')).toMatchObject({ count: 6, reviewRequired: true, source: 'recording_hints' });
    expect(core.resolveSyllableTask('responsibility', null, 'en').supported).toBe(false);
    expect(core.syllableRecordingTemplate('constructor', 'en')).toMatchObject({ count: 3, syllables: [] });
  });

  it('keeps recording counts as suggestions through counting-only serialization', () => {
    const wav = Buffer.alloc(68); wav.write('RIFF'); wav.write('WAVE', 8);
    const asset = { mime: 'audio/wav', base64: wav.toString('base64'), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 };
    const recordedTask = core.createReviewedSyllableTask({ targetWord: 'inventedword', language: 'fr', reviewed: true, revision: 4,
      syllables: Array.from({ length: 8 }, (_, i) => 'part' + i), assets: Array.from({ length: 8 }, () => asset) });
    expect(core.reviewedSyllableReady(recordedTask)).toBe(true);
    const prepared = JSON.parse(JSON.stringify(core.resolveSyllableCount('inventedword', { language: 'fr', recordedTask })));
    expect(prepared).toMatchObject({ supported: false, count: null, counts: [8], recordedCount: 8, source: 'teacher_recording', reason: 'count_recording_review_required' });
    expect(core.resolveSyllableCount('inventedword', { language: 'fr', prepared })).toMatchObject({ supported: false, counts: [8], reason: 'count_recording_review_required' });
    expect(core.resolveSyllableCount('inventedword', { language: 'fr', prepared, recordedTask: { supported: false, syllables: [] } })).toMatchObject({ supported: false, counts: [8] });
    expect(core.resolveSyllableCount('inventedword', { language: 'fr', prepared, recordedTask: { ...recordedTask, syllables: ['changed'] } }).supported).toBe(false);
    expect(core.resolveSyllableCount('otherword', { language: 'fr', prepared }).counts).toEqual([]);
  });

  it('only creates explicitly reviewed, bounded positive integer counts', () => {
    for (const count of [0, 13, 2.5, NaN, '2']) {
      expect(core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en', count, reviewed: true, revision: 1 })).toBeNull();
    }
    expect(core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en', count: 2, reviewed: false, revision: 1 })).toBeNull();
  });
});

describe('recording locale and count/audio review identity', () => {
  it.each(['English\u241fen-US\u241fsouthern', 'English\u241fen-US\u241fuk', 'Custom language', 'Custom language\u241f\u241flocal'])('round-trips the exact recording/count language key for %s', language => {
    const key = core.packAudioLanguageKey(language);
    expect(key).toBeTruthy();
    expect(core.packAudioLanguageKey(key)).toBe(key);
    const task = recordedWord('family', language);
    expect(task?.language).toBe(key);
    expect(core.resolveSyllableTask('family', JSON.parse(JSON.stringify(task)), language).supported).toBe(true);
    const audioContext = core.createSyllableCountAudioContext({ asset: recordingAsset(), language });
    const prepared = core.createReviewedSyllableCount({ targetWord: 'family', language, count: 3, revision: 1, reviewed: true, audioContext });
    expect(core.resolveSyllableCount('family', { language, prepared, audioContext })).toMatchObject({ supported: true, count: 3, language: key });
  });

  it('keeps exact recording locales and recovers other-locale clips only as a draft', () => {
    const task = recordedWord('family', 'en-GB');
    expect(task).toMatchObject({ version: 3, language: 'en-gb' });
    expect(core.resolveSyllableTask('family', task, 'en-GB').supported).toBe(true);
    expect(core.resolveSyllableTask('family', task, 'en-US')).toMatchObject({ supported: false, recoverable: true, reason: 'recording_locale_review_required' });
    expect(core.resolveSyllableCount('family', { language: 'en-US', recordedTask: task }).supported).toBe(false);
    const draft = core.recoverSyllableRecordingDraft('family', task);
    expect(draft).toMatchObject({ supported: false, reviewRequired: true, language: 'en-gb', syllables: task.syllables });
    expect(draft.audioUnits[0].asset).toEqual(task.audioUnits[0].asset);
    expect(draft.audioUnits[0].asset).not.toBe(task.audioUnits[0].asset);
    expect(core.reviewedSyllableReady(draft)).toBe(false);
    expect(core.recoverSyllableRecordingDraft('changed', task)).toBeNull();
  });

  it('requires explicit fresh review to migrate legacy collapsed-English recordings', () => {
    const legacy = legacyRecording();
    expect(core.reviewedSyllableReady(legacy)).toBe(true);
    expect(core.syllableReady(legacy)).toBe(false);
    expect(core.resolveSyllableTask('family', legacy, 'en-US')).toMatchObject({ supported: false, reason: 'recording_locale_review_required' });
    const inventory = core.packAudioInventory([{ targetWord: 'family', activityItems: { syllable_blending: legacy } }]);
    expect(inventory.filter(row => row.key.startsWith('syllable:')).every(row => row.label === 'Syllable recording · needs review')).toBe(true);
    const draft = core.recoverSyllableRecordingDraft('family', legacy);
    expect(draft.audioUnits).toHaveLength(3);
    const upgraded = core.createReviewedSyllableTask({ ...draft, language: 'en-US', assets: draft.audioUnits.map(unit => unit.asset), reviewed: true, revision: 3 });
    expect(core.resolveSyllableTask('family', upgraded, 'en-US').supported).toBe(true);
    expect(core.resolveSyllableTask('family', upgraded, 'en-GB').supported).toBe(false);
    expect(core.reviewedSyllableReady({ ...legacy, version: 3 })).toBe(false);
    expect(core.recoverSyllableRecordingDraft('family', { ...legacy, syllables: ['changed'] })).toBeNull();
  });

  it('does not let an older manual count override conflicting reviewed units', () => {
    const recordedTask = recordedWord('family', 'en-US', 3, 2);
    const prepared = core.createReviewedSyllableCount({ targetWord: 'family', language: 'en-US', count: 2, reviewed: true, revision: 1 });
    const result = core.resolveSyllableCount('family', { language: 'en-US', prepared, recordedTask });
    expect(result).toMatchObject({ supported: false, count: null, reason: 'count_recording_conflict', reviewedCount: 2, recordedCount: 3, counts: [2, 3] });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared: JSON.parse(JSON.stringify(result)) }).supported).toBe(false);
    const resaved = core.createReviewedSyllableCount({ ...prepared, reviewed: true, revision: 5 });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared: resaved, recordedTask }).reason).toBe('count_recording_conflict');
    const corrected = core.createReviewedSyllableCount({ ...prepared, count: 3, reviewed: true, revision: 6 });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared: corrected, recordedTask })).toMatchObject({ supported: true, count: 3 });
  });

  it('uses identical clip bytes across asset/data-URI forms and ignores student voice defaults', () => {
    const asset = { ...recordingAsset(), provenance: { resolvedVoice: 'teacher-voice' } };
    const saved = core.createSyllableCountAudioContext({ asset, voice: 'selected-voice', language: 'en-US' });
    const portable = core.createSyllableCountAudioContext({ audioSource: 'data:' + asset.mime + ';base64,' + asset.base64, voice: 'student-default', language: 'en-US' });
    expect(saved.fingerprint).toBe(portable.fingerprint);
    expect(saved.signature).toBe(portable.signature);
    expect(saved.voice).toBe('teacher-voice');
    expect(core.createSyllableCountAudioContext({ asset, voice: 'different', language: 'en-US' }).signature).toBe(saved.signature);
    expect(core.createSyllableCountAudioContext({ asset, language: 'en-GB' }).signature).not.toBe(saved.signature);
    const changed = core.createSyllableCountAudioContext({ asset: recordingAsset(1), language: 'en-US' });
    expect(changed.signature).not.toBe(saved.signature);
    asset.base64 = recordingAsset(2).base64;
    expect(core.createSyllableCountAudioContext({ asset, language: 'en-US' }).signature).not.toBe(saved.signature);
  });

  it('keeps teacher-spoken approval valid across synthetic voice changes while no clip exists', () => {
    const first = core.createSyllableCountAudioContext({ voice: 'one', language: 'en-US' });
    const second = core.createSyllableCountAudioContext({ voice: 'two', language: 'en-US' });
    expect(first.fingerprint).toBeNull();
    expect(second.signature).not.toBe(first.signature);
    const prepared = core.createReviewedSyllableCount({ targetWord: 'family', language: 'en-US', count: 2, reviewed: true, revision: 1, audioContext: first });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared, audioContext: second })).toMatchObject({ supported: true, deliveryMode: 'teacher_spoken', count: 2 });
  });

  it('blocks stale audio before dictionary or recording fallback and persists the block offline', () => {
    const original = core.createSyllableCountAudioContext({ asset: recordingAsset(), language: 'en-US' });
    const changed = core.createSyllableCountAudioContext({ asset: recordingAsset(1), language: 'en-US' });
    const prepared = core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en-US', count: 2, reviewed: true, revision: 1, audioContext: original });
    const recordedTask = recordedWord('apple', 'en-US', 2);
    const result = core.resolveSyllableCount('apple', { language: 'en-US', prepared, recordedTask, audioContext: changed });
    expect(result).toMatchObject({ supported: false, count: null, reason: 'count_audio_changed' });
    const stored = JSON.parse(JSON.stringify(result));
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: stored, recordedTask })).toMatchObject({ supported: false, reason: 'count_audio_changed' });
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: stored, audioContext: changed }).supported).toBe(false);
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: stored, audioContext: original })).toMatchObject({ supported: true, count: 2 });
    const fresh = core.createReviewedSyllableCount({ ...prepared, audioContext: changed, reviewed: true, revision: 2 });
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: fresh, audioContext: changed }).supported).toBe(true);
  });

  it('retains explicit whole-word context in portable count-only packs and requires review for old unbound approvals', () => {
    const audioContext = core.createSyllableCountAudioContext({ asset: recordingAsset(), language: 'en-US' });
    const prepared = JSON.parse(JSON.stringify(core.createReviewedSyllableCount({ targetWord: 'family', language: 'en-US',
      count: 3, revision: 1, reviewed: true, audioContext })));
    expect(prepared).toMatchObject({ version: 2, source: 'teacher_review', audioContext });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared })).toMatchObject({ supported: true, count: 3, audioContext });
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared, audioContext }).supported).toBe(true);
    const legacy = { version: 1, targetWord: 'apple', language: 'en-us', count: 2, revision: 1, status: 'reviewed', source: 'teacher_review', review: { confirmed: true, signature: JSON.stringify(['apple', 'en-us', 1, 2]) } };
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: legacy, audioContext })).toMatchObject({ supported: false, reason: 'count_audio_review_required' });
    const tampered = { ...prepared, audioContext: core.createSyllableCountAudioContext({ asset: recordingAsset(2), language: 'en-US' }) };
    expect(core.resolveSyllableCount('family', { language: 'en-US', prepared: tampered, audioContext })).toMatchObject({ supported: false, reason: 'count_review_invalid' });
  });

  it('does not approve a whole-word pronunciation by reviewing separate syllable clips', () => {
    const recordedTask = recordedWord('fire', 'en-US', 2);
    const audioContext = core.createSyllableCountAudioContext({ asset: recordingAsset(9), language: 'en-US' });
    const result = core.resolveSyllableCount('fire', { language: 'en-US', recordedTask, audioContext });
    expect(result).toMatchObject({ supported: false, status: 'needs_review', count: null, counts: [2], recordedCount: 2,
      reason: 'count_recording_review_required' });
    expect(result.review).toBeUndefined();
    expect(result.audioContext).toBeUndefined();
    expect(core.reviewedSyllableReady(recordedTask)).toBe(true);
    expect(core.resolveSyllableTask('fire', recordedTask, 'en-US').supported).toBe(true);
    const approved = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 2, reviewed: true, revision: 1, audioContext });
    expect(core.resolveSyllableCount('fire', { language: 'en-US', prepared: approved, recordedTask, audioContext })).toMatchObject({ supported: true, source: 'teacher_review', count: 2 });
    const otherCount = core.createReviewedSyllableCount({ ...approved, count: 1, reviewed: true, revision: 2 });
    expect(core.resolveSyllableCount('fire', { language: 'en-US', prepared: otherCount, recordedTask, audioContext })).toMatchObject({
      supported: false, reason: 'count_recording_conflict', reviewedCount: 1, recordedCount: 2 });
  });

  it('requires an explicit spoken-delivery review when recordings have no whole-word clip', () => {
    const recordedTask = recordedWord('fire', 'en-US', 2);
    const audioContext = core.createSyllableCountAudioContext({ language: 'en-US', voice: 'default' });
    expect(core.resolveSyllableCount('fire', { language: 'en-US', recordedTask, audioContext })).toMatchObject({
      supported: false, reason: 'count_recording_review_required', counts: [2] });
    const prepared = core.createReviewedSyllableCount({ targetWord: 'fire', language: 'en-US', count: 2, reviewed: true, revision: 1, audioContext });
    expect(core.resolveSyllableCount('fire', { language: 'en-US', prepared, recordedTask, audioContext })).toMatchObject({
      supported: true, count: 2, deliveryMode: 'teacher_spoken' });
  });

  it.each([false, true])('rejects historical automatic recording approvals, with whole-word audio: %s', hasAudio => {
    const recordedTask = recordedWord('apple', 'en-US', 2);
    const audioContext = core.createSyllableCountAudioContext({ ...(hasAudio ? { asset: recordingAsset(9) } : {}), language: 'en-US' });
    const prepared = JSON.parse(JSON.stringify(legacyRecordedCount(recordedTask, audioContext)));
    for (const clips of [undefined, recordedTask, { ...recordedTask, syllables: ['altered'] }]) {
      const result = core.resolveSyllableCount('apple', { language: 'en-US', prepared, recordedTask: clips, audioContext });
      expect(result).toMatchObject({ supported: false, count: null, counts: [2], reason: 'count_recording_review_required' });
      // Saving an unresolved result must not fall back to the dictionary, even
      // after the original syllable clips are removed from a counting-only pack.
      expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: JSON.parse(JSON.stringify(result)) })).toMatchObject({
        supported: false, counts: [2], reason: 'count_recording_review_required' });
    }
    const explicit = core.createReviewedSyllableCount({ ...prepared, revision: 3, reviewed: true });
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: explicit, audioContext })).toMatchObject({ supported: true, count: 2, source: 'teacher_review' });
  });

  it('invalidates only affected count approvals when replacing pack audio', () => {
    const asset = recordingAsset();
    const audioContext = core.createSyllableCountAudioContext({ asset, language: 'en-US' });
    const prepared = core.createReviewedSyllableCount({ targetWord: 'apple', language: 'en-US', count: 2, reviewed: true, revision: 1, audioContext });
    const words = [{ targetWord: 'apple', activityItems: { syllable_counting: prepared }, _ttsAssets: { apple: asset } }];
    expect(core.replacePackAssets(words, { other: recordingAsset(1) })[0].activityItems.syllable_counting).toBe(prepared);
    expect(core.replacePackAssets(words, { apple: { ...asset } })[0].activityItems.syllable_counting.supported).toBe(true);
    const replaced = core.replacePackAssets(words, { ' APPLE ': recordingAsset(1) })[0].activityItems.syllable_counting;
    expect(replaced).toMatchObject({ supported: false, reason: 'count_audio_changed' });
    expect(core.resolveSyllableCount('apple', { language: 'en-US', prepared: replaced }).supported).toBe(false);
    expect(words[0].activityItems.syllable_counting.supported).toBe(true);
  });
});

describe('lazy syllable pronunciation loading', () => {
  it('shares one plugin request across separate embedded core instances', async () => {
    const root = { AlloModules: {} };
    const document = { currentScript: { src: 'https://school.example/word_sounds_module.js?v=123' } };
    root.__alloLoadPlugin = vi.fn(async () => { root.AlloModules.WordSoundsPronunciations = pronunciations; });
    const factory = new Function('window', 'document', source + '\nreturn createWordSoundsCore;')(root, document);
    const first = factory(); const second = factory();
    expect(await Promise.all([first.loadSyllablePronunciations(), second.loadSyllablePronunciations()])).toEqual([true, true]);
    expect(root.__alloLoadPlugin).toHaveBeenCalledTimes(1);
    expect(first.resolveSyllableCount('apple', { language: 'en' }).count).toBe(2);
  });

  it('retries a failed download and preserves the module version on relative script loading', async () => {
    const root = { AlloModules: {} };
    const scripts = [];
    const document = {
      currentScript: { src: 'https://school.example/assets/word_sounds_module.js?v=123' },
      createElement: () => ({ remove: vi.fn() }),
      head: { appendChild: script => {
        scripts.push(script);
        if (scripts.length === 1) script.onerror();
        else { root.AlloModules.WordSoundsPronunciations = pronunciations; script.onload(); }
      } },
    };
    const local = new Function('window', 'document', source + '\nreturn createWordSoundsCore();')(root, document);
    expect(await local.loadSyllablePronunciations()).toBe(false);
    expect(await local.loadSyllablePronunciations()).toBe(true);
    expect(scripts).toHaveLength(2);
    expect(scripts[1].src).toBe('https://school.example/assets/word_sounds_pronunciations.js?v=123');
  });

  it('removes a failed data script retained by the host plugin loader before retrying', async () => {
    const root = { AlloModules: {} };
    const failed = { src: 'https://cdn.example/word_sounds_pronunciations.js?v=host', dataset: {}, remove: vi.fn() };
    const unrelated = { src: 'https://cdn.example/another_module.js?v=host', dataset: {}, remove: vi.fn() };
    const document = { baseURI: 'https://school.example/', querySelectorAll: () => [failed, unrelated] };
    root.__alloLoadPlugin = vi.fn().mockResolvedValueOnce(false).mockImplementationOnce(async () => {
      expect(failed.remove).toHaveBeenCalledTimes(1);
      root.AlloModules.WordSoundsPronunciations = pronunciations;
      return true;
    });
    const local = new Function('window', 'document', source + '\nreturn createWordSoundsCore();')(root, document);
    expect(await local.loadSyllablePronunciations()).toBe(false);
    expect(await local.loadSyllablePronunciations()).toBe(true);
    expect(unrelated.remove).not.toHaveBeenCalled();
  });
});
