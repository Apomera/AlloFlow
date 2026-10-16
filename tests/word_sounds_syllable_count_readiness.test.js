import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const makeCore = new Function(coreSource + '\nreturn createWordSoundsCore;')();
// Exercise current canonical behavior before generated embeddings are synced.
const source = readFileSync('word_sounds_readiness_contract.js', 'utf8').replace(
  /\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/,
  () => coreSource + '\nconst WS_CORE = createWordSoundsCore();',
);
const pronunciations = { lookup: word => ({ apple: ['10'], fire: ['1', '10'] })[word] || [] };
const core = makeCore({ pronunciations });

function load(data) {
  const host = { AlloModules: data ? { WordSoundsPronunciations: data } : {} };
  const module = { exports: {} };
  new Function('globalThis', 'window', 'module', source)({ window: host }, host, module);
  return module.exports;
}
function wav(value = 0) {
  const bytes = Buffer.alloc(204);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(196, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(160, 40); bytes[50] = value;
  return { mime: 'audio/wav', base64: bytes.toString('base64') };
}
function resource(word, prepared, asset, extra = {}) {
  return { type: 'word-sounds', id: 'count-lesson', isProbeMode: true,
    sessionConfig: { wordSoundsLanguage: 'en-US', selectedVoice: 'student-default' },
    lessonPlanSequence: ['syllable_counting'],
    data: [{ word, activityItems: prepared ? { syllable_counting: prepared } : {},
      _ttsRequiredKeys: [word], ...(asset ? { _ttsAssets: { [word]: asset } } : {}) }], ...extra };
}
function reviewed(word, count, asset) {
  return core.createReviewedSyllableCount({ targetWord: word, language: 'en-US', count,
    revision: 1, reviewed: true,
    audioContext: core.createSyllableCountAudioContext({ asset, language: 'en-US', voice: 'teacher-default' }) });
}
function recorded(word, count = 2) {
  return core.createReviewedSyllableTask({ targetWord: word, language: 'en-US',
    syllables: ['one', 'two', 'three'].slice(0, count), revision: 1, reviewed: true,
    assets: Array.from({ length: count }, () => ({ ...wav(), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 })) });
}
function legacyRecordingCount(recording, clip) {
  // Authentic persisted shape from the former automatic derivation. A valid
  // signature does not prove the whole-word pronunciation was ever reviewed.
  const task = { ...reviewed(recording.targetWord, recording.syllables.length, clip),
    source: 'teacher_recording', recordingSignature: recording.review.signature };
  task.review = { confirmed: true, signature: JSON.stringify([task.targetWord, task.language, task.revision,
    task.count, task.source, task.recordingSignature, task.audioContext.signature]) };
  return task;
}
function checkOptions(api, item) {
  const banks = {};
  api.requirements(item).entries.forEach(entry => {
    if (entry.category !== 'speech') (banks[entry.category] ||= {})[entry.key] = wav();
  });
  return { banks, audioFactory: () => {
    const audio = { readyState: 2, duration: 0.01, canPlayType: () => 'probably', pause() {},
      removeAttribute() { audio.src = ''; }, load() { if (audio.src) queueMicrotask(() => audio.oncanplay?.()); } };
    return audio;
  } };
}

describe('syllable count readiness evidence', () => {
  it.each([undefined, { answer: 3, syllables: ['in', 'ven', 'ted'] }])('reports an unknown missing or guessed count as a content issue', async prepared => {
    const api = load(pronunciations), item = resource('quuxzz', prepared, wav());
    expect(api.requirements(item).contentIssues).toEqual(['Syllable count for quuxzz needs review: no checked pronunciation count is available.']);
    const report = await api.check(item, checkOptions(api, item));
    expect(report).toMatchObject({ status: 'attention', complete: false, independentReady: false, materialsComplete: false });
    expect(report.clips.find(clip => clip.id === 'speech:quuxzz').checked).toBe(true);
  });

  it('allows known raw words through current dictionary or curated evidence', () => {
    expect(load(pronunciations).requirements(resource('apple', undefined, wav())).contentIssues).toEqual([]);
    expect(load().requirements(resource('football', undefined, wav())).contentIssues).toEqual([]);
  });

  it('preserves checked dictionary counts offline but rejects missing or altered evidence', () => {
    const api = load(), prepared = core.resolveSyllableCount('apple', { language: 'en-US' });
    expect(api.requirements(resource('apple', JSON.parse(JSON.stringify(prepared)), wav())).contentIssues).toEqual([]);
    expect(api.requirements(resource('apple', undefined, wav())).contentIssues[0]).toContain('pronunciation data is unavailable');
    expect(api.requirements(resource('apple', { ...prepared, count: 1, counts: [1] }, wav())).contentIssues).toHaveLength(1);
  });

  it('requires review for pronunciation variants instead of accepting decoded audio as a count', () => {
    const api = load(pronunciations);
    expect(api.requirements(resource('fire', undefined, wav())).contentIssues[0]).toContain('different pronunciations have different counts');
  });

  it.each(['recording only', 'legacy count with recording', 'legacy count without recording'])(
    'keeps %s in attention until the actual whole-word count is explicitly reviewed', async shape => {
      const api = load(pronunciations), clip = wav(3), recording = recorded('apple');
      const approval = shape === 'recording only' ? undefined : legacyRecordingCount(recording, clip);
      const item = resource('apple', approval, clip);
      if (shape !== 'legacy count without recording') item.data[0].activityItems.syllable_blending = recording;
      const issues = api.requirements(item).contentIssues;
      expect(issues).toHaveLength(1);
      expect(issues[0]).toContain('Syllable count for apple needs review');
      expect(issues[0]).toContain('whole-word');
      const report = await api.check(item, checkOptions(api, item));
      expect(report).toMatchObject({ status: 'attention', complete: false, independentReady: false, materialsComplete: false });
      expect(report.clips.find(value => value.id === 'speech:apple').checked).toBe(true);
      // Current dictionary data and decodable speech must not retroactively
      // turn a syllable-sequence review into a whole-word count approval.
      item.data[0].activityItems.syllable_counting = reviewed('apple', 2, clip);
      expect(api.requirements(item).contentIssues).toEqual([]);
      const approvedReport = await api.check(item, checkOptions(api, item));
      expect(approvedReport.contentIssues).toEqual([]);
      expect(approvedReport.missingLabels).toEqual([]);
      expect(approvedReport.clips.find(value => value.id === 'speech:apple').checked).toBe(true);
    });

  it('detects changed whole-word audio using the last aggregate asset, including later-word buckets', () => {
    const api = load(pronunciations), first = wav(1), last = wav(2);
    const item = resource('apple', reviewed('apple', 2, first), first);
    item.data.push({ word: 'football', _ttsAssets: { apple: last, football: wav() } });
    expect(api.requirements(item).contentIssues).toEqual(['Syllable count for apple needs review: the whole-word audio changed after approval.']);
    expect(api.inspect(item).contentIssues).toHaveLength(1);
    item.data[0].activityItems.syllable_counting = reviewed('apple', 2, last);
    expect(api.requirements(item).contentIssues).toEqual([]);
    expect(api.inspect(item).contentIssues).toEqual([]);
  });

  it('uses the prioritized preloaded layout and accepts the same portable clip with a different selected voice', () => {
    const api = load(), clip = wav(1), item = resource('apple', reviewed('apple', 2, clip), wav(2));
    item.wsPreloadedWords = [{ word: 'apple', activityItems: { syllable_counting: reviewed('apple', 2, clip) },
      _ttsAssets: { apple: 'data:' + clip.mime + ';base64,' + clip.base64 } }];
    expect(api.inspect(item).contentIssues).toEqual([]);
    expect(api.requirements(item).teacherLedWords).toEqual([]);
  });

  it('reports count conflicts with valid reviewed recordings and rejects unsigned legacy approvals', () => {
    const api = load(), clip = wav(), item = resource('quuxzz', reviewed('quuxzz', 2, clip), clip);
    item.data[0].activityItems.syllable_blending = core.createReviewedSyllableTask({
      targetWord: 'quuxzz', language: 'en-US', syllables: ['one', 'two', 'three'], reviewed: true, revision: 1,
      assets: Array.from({ length: 3 }, () => ({ ...wav(), decoded: true, source: 'teacher_recording', durationSeconds: 0.4 })),
    });
    expect(item.data[0].activityItems.syllable_blending).not.toBeNull();
    expect(api.inspect(item).contentIssues[0]).toContain('conflicts with the reviewed syllable recordings');
    delete item.data[0].activityItems.syllable_blending;
    item.data[0].activityItems.syllable_counting.review.signature = 'stale';
    expect(api.requirements(item).contentIssues[0]).toContain('saved count approval is no longer valid');
  });

  it('retains stale review failures even when the dictionary could otherwise provide a count', () => {
    const api = load(pronunciations), oldClip = wav(1), newClip = wav(2);
    const prepared = core.resolveSyllableCount('apple', { language: 'en-US', prepared: reviewed('apple', 2, oldClip),
      audioContext: core.createSyllableCountAudioContext({ asset: newClip, language: 'en-US' }) });
    expect(prepared.reason).toBe('count_audio_changed');
    expect(api.requirements(resource('apple', prepared, newClip)).contentIssues[0]).toContain('audio changed after approval');
  });
});

describe('teacher-spoken count readiness', () => {
  it('exempts intentional target and manifest duplicates only for count-only teacher-led delivery', async () => {
    const api = load(), item = resource('quuxzz', reviewed('quuxzz', 3));
    item.data.push({ word: 'quuxzz', activityItems: item.data[0].activityItems, _ttsRequiredKeys: [' QUUXZZ '] });
    const needed = api.requirements(item);
    expect(needed).toMatchObject({ teacherLedWords: ['quuxzz'], contentIssues: [] });
    expect(needed.entries.map(entry => entry.id)).toEqual(['instruction:inst_syllable_counting']);
    expect(api.inspect(item)).toMatchObject({ requiresTeacher: true, teacherLedReady: false, complete: false, independentReady: false });
    const report = await api.check(item, checkOptions(api, item));
    expect(report).toMatchObject({ status: 'teacher-led', requiresTeacher: true, teacherLedReady: true,
      materialsComplete: false, complete: false, independentReady: false, offlinePortable: false, teacherLedWords: ['quuxzz'] });
    expect(report.missingLabels).toEqual([]);
  });

  it('keeps instruction and feedback dependencies required for teacher-led delivery', async () => {
    const api = load(), item = resource('quuxzz', reviewed('quuxzz', 3), undefined, { isProbeMode: false });
    const needed = api.requirements(item);
    expect(needed.entries.map(entry => entry.id)).toEqual(expect.arrayContaining(['instruction:inst_syllable_counting', 'feedback:fb_correct']));
    const options = checkOptions(api, item);
    delete options.banks.feedback.fb_correct;
    expect(await api.check(item, options)).toMatchObject({ requiresTeacher: true, teacherLedReady: false, status: 'needs-check' });
    expect(await api.check(item, checkOptions(api, item))).toMatchObject({ teacherLedReady: true, status: 'teacher-led', independentReady: false });
  });

  it('keeps target audio required when another activity uses it', async () => {
    const api = load(), item = resource('quuxzz', reviewed('quuxzz', 3), undefined,
      { lessonPlanSequence: ['syllable_counting', 'decoding'] });
    item.data[0].activityItems.decoding = { choices: ['quuxzz'] };
    expect(api.requirements(item).entries.map(entry => entry.id)).toContain('speech:quuxzz');
    const report = await api.check(item, checkOptions(api, item));
    expect(report).toMatchObject({ requiresTeacher: true, teacherLedReady: false, status: 'attention', complete: false });
    expect(report.missingLabels).toContain('speech: quuxzz');
  });

  it('requires fresh review if a clip arrives after a spoken approval', () => {
    const api = load(), item = resource('quuxzz', reviewed('quuxzz', 3), wav());
    const report = api.inspect(item);
    expect(report).toMatchObject({ requiresTeacher: false, teacherLedWords: [], teacherLedReady: false, status: 'attention' });
    expect(report.contentIssues[0]).toContain('audio changed after approval');
    expect(report.clips.some(clip => clip.id === 'speech:quuxzz')).toBe(true);
  });
});
