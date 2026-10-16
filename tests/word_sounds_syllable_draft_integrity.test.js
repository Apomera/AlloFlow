import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < a) throw new Error('Missing production boundary: ' + start);
  return source.slice(a, b);
};
const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
const { status, countKey, recordingKey, hiddenWords } = new Function('WS_CORE', between('function wordSoundsSyllableDraftBoardIdentity(', 'function WordSoundsSyllableDraftNotice(') +
  ';return {status:wordSoundsSyllableDraftStatus,countKey:wordSoundsSyllableCountDraftKey,recordingKey:wordSoundsSyllableRecordingDraftKey,hiddenWords:wordSoundsSyllableHiddenDraftWords};')(core);
const bytes = Buffer.alloc(80); bytes.write('RIFF'); bytes.write('WAVE', 8);
const asset = { mime: 'audio/wav', base64: bytes.toString('base64'), decoded: true, durationSeconds: 0.4, source: 'teacher_recording' };
const boardFor = language => core.createReviewedSyllableTask({ targetWord: 'fire', language, syllables: ['fi', 're'], assets: [asset, asset], reviewed: true, revision: 1 });

describe('syllable draft integrity', () => {
  it('protects dirty drafts hidden by a word-source or locale switch while leaving current drafts to full validation', () => {
    const draft = (word, language, dirty = true) => ({ dirty, key: JSON.stringify([word, core.packAudioLanguageKey(language)]) });
    const store = new Map([['current', draft('apple', 'en')], ['hidden', draft('fire', 'en')], ['locale', draft('apple', 'en-GB')], ['clean', draft('banana', 'en', false)], ['bad', { dirty: true, key: 'invalid' }]]);
    expect(hiddenWords([store], ['apple'], 'en')).toEqual(['fire', 'apple']);
    store.get('hidden').dirty = false; store.get('locale').dirty = false;
    expect(hiddenWords([store], ['apple'], 'en')).toEqual([]);
  });
  it('treats numeric equivalents and reverted counts as saved while keeping an empty edit dirty', () => {
    const args = { kind: 'count', word: 'fire', language: 'en', resolution: { supported: true, count: 2 } };
    const key = countKey(args.word, args.language, args.resolution);
    for (const count of ['2', '02', '2.0', ' 2 ']) expect(status({ ...args, draft: { version: 1, key, count } })).toEqual({ valid: true, dirty: false });
    for (const count of ['', '3']) expect(status({ ...args, draft: { version: 1, key, count } })).toEqual({ valid: true, dirty: true });
  });
  it('ignores old count drafts after the audio, locale, or recorded task changes', () => {
    const audioContext = core.createSyllableCountAudioContext({ asset, language: 'en' });
    const args = { kind: 'count', word: 'fire', language: 'en', resolution: { supported: true, count: 2 }, audioContext };
    const draft = { version: 1, key: countKey(args.word, args.language, args.resolution, audioContext), count: '3' };
    expect(status({ ...args, draft }).dirty).toBe(true);
    for (const change of [{ language: 'en-GB' }, { audioContext: core.createSyllableCountAudioContext({ language: 'en' }) }, { recordedTask: boardFor('en') }]) {
      expect(status({ ...args, ...change, draft })).toEqual({ valid: false, dirty: false });
    }
  });
  it('compares recording content with the saved clips and ignores cleanup bookkeeping', () => {
    const board = boardFor('en');
    const args = { kind: 'recording', word: 'fire', language: 'en', board };
    const draft = { version: 1, key: recordingKey('fire', 'en', board), units: board.audioUnits.map(unit => ({ label: unit.text, asset: unit.asset, originalAsset: asset, omitted: false })) };
    expect(status({ ...args, draft })).toEqual({ valid: true, dirty: false });
    const changed = structuredClone(draft); changed.units[0].label = 'fye';
    expect(status({ ...args, draft: changed }).dirty).toBe(true);
    changed.units[0].label = draft.units[0].label;
    expect(status({ ...args, draft: changed }).dirty).toBe(false);
    changed.units[0].asset.base64 += 'AA==';
    expect(status({ ...args, draft: changed }).dirty).toBe(true);
    expect(status({ ...args, language: 'en-GB', draft: changed })).toEqual({ valid: false, dirty: false });
  });
  it('keeps recordings for two pronunciation locales and recovers each after switching back', () => {
    const create = new Function('WS_CORE', 'preloadedWords', `
      let wordSoundsLanguage = 'en-US', reviewedSyllableTasks = {}, detachedSyllableRecordings = {};
      const selectionControl = { current: {} };
      const setReviewedSyllableTasks = update => { reviewedSyllableTasks = update(reviewedSyllableTasks); };
      const setDetachedSyllableRecordings = update => { detachedSyllableRecordings = update(detachedSyllableRecordings); };
      ${between('const recordingDraftKey =', 'const [pendingSyllableEdits,')}
      ${between('const syllableCountReviewKey =', 'const savedCountAudioAssets =')}
      ${between('const preparedSyllableFor =', 'const syllableCountAudioFor =')}
      ${between('const saveReviewedSyllableRecording =', 'const useCountWithoutRecording =')}
      return { get: preparedSyllableFor, save: saveReviewedSyllableRecording, locale: value => { wordSoundsLanguage = value; } };
    `);
    const us = boardFor('en-US'), gb = boardFor('en-GB');
    const editor = create(core, [{ word: 'fire', activityItems: { syllable_blending: us } }]);
    expect(editor.get('fire')).toBe(us);
    editor.locale('en-GB'); editor.save('fire', gb);
    expect(editor.get('fire')).toBe(gb);
    editor.locale('en-US'); expect(editor.get('fire')).toBe(us);
    editor.save('fire', us); editor.locale('en-GB'); expect(editor.get('fire')).toBe(gb);
    editor.locale('EN_us'); expect(editor.get(' FIRE ')).toBe(us);
  });
});
