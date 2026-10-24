import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let DI, compile, core;
beforeAll(() => {
  DI = require(resolve('word_sounds_di_loader.js'));
  const pronunciation = require(resolve('word_sounds_pronunciations.js'));
  core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
  const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
  const between = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start) + start.length));
  compile = new Function('pronunciations', `
    ${readFileSync('word_sounds_core.js', 'utf8')}
    const window = {AlloModules:{AlloData:{},WordSoundsPronunciations:pronunciations}};
    const WS_CORE = createWordSoundsCore();
    const instructionalProfile = {}, wordSoundsLanguage = 'en';
    const Math = Object.create(globalThis.Math); Math.random = () => 0.5;
    ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
    ${between('const normalizePackKey =', 'const handleStart =')}
    return compileActivityItems;
  `)(pronunciation);
});

const rabbit = () => ({ word: 'rabbit', phonemes: ['r', 'a', 'b', 'i', 't'], graphemes: ['r', 'a', 'bb', 'i', 't'], syllables: ['rab', 'bit'] });
function scriptFor(item, activity) {
  const analysis = DI.analyzeWordSet([item], {language: 'en'});
  const script = DI.buildLessonScript(analysis, {masteryThreshold: 3, activities: [{id: activity, count: 1}]});
  return {analysis: analysis.words[0], script, section: script.sections.find(section => section.id === 'test_' + activity)};
}

describe('prepared task to printable teacher script contract', () => {
  it('prints the actual prepared isolation position and answer', () => {
    const item = compile([rabbit()])[0];
    expect(item.activityItems.isolation).toMatchObject({position: 3, correctSound: 'i'});
    const {section} = scriptFor(item, 'isolation');
    expect(section.teacherSays.join(' ')).toMatch(/fourth sound/i);
    expect(section.teacherSays[0]).toContain('/i/');
    expect(section.teacherSays.join(' ')).not.toMatch(/first sound/i);
    expect(section.items[0].secondary).toContain('/i/');
  });

  it('models the prepared ending sound rather than an onset', () => {
    const item = {word: 'cat', phonemes: ['k', 'a', 't'], graphemes: ['c', 'a', 't'], syllables: ['cat'],
      activityItems: {sound_sort: {mode: 'last', targetChar: 't', options: ['hat'], distractors: ['dog']}}};
    const {section} = scriptFor(item, 'sound_sort');
    expect(section.teacherSays.join(' ')).toMatch(/end/);
    expect(section.teacherSays[0]).toContain('/t/');
    expect(section.teacherSays.join(' ')).not.toContain('/k/');
  });

  it('models the missing letter at its spelling position without inventing its sound', () => {
    const item = {word: 'rainy', phonemes: ['r', 'ā', 'n', 'ē'], graphemes: ['r', 'ai', 'n', 'y'],
      activityItems: {missing_letter: {hiddenIndex: 2, correctLetter: 'i', options: ['i', 'a', 'o']}}};
    const {section} = scriptFor(item, 'missing_letter');
    expect(section.teacherSays[0]).toMatch(/third letter is i/i);
    expect(section.teacherSays[1]).toContain('ra_ny');
    expect(section.teacherSays.join(' ')).not.toContain('/r/');
  });

  it('uses prepared rhyme, family, and manipulation answers rather than legacy fields', () => {
    const item = {word: 'cat', phonemes: ['k', 'a', 't'], graphemes: ['c', 'a', 't'], syllables: ['cat'],
      rhymeWord: 'dog', familyEnding: '-og', manipulationTask: {instruction: 'Old instruction.', answer: 'wrong'},
      activityItems: {
        rhyming: {answer: 'hat', options: ['hat', 'dog']},
        word_families: {rime: 'at', options: ['hat', 'mat'], distractors: ['dog']},
        manipulation: {task: core.resolveManipulationTask('cat', null, 'en'), options: ['at', 'it']},
      }};
    expect(scriptFor(item, 'rhyming').section.teacherSays[0]).toMatch(/cat and hat/i);
    expect(scriptFor(item, 'word_families').section.teacherSays.join(' ')).toContain('-at');
    const lines = scriptFor(item, 'manipulation').section.teacherSays.join(' ');
    expect(lines).toContain('leave out the /k/ sound');
    expect(lines).toContain('answer is at');
    expect(lines).not.toContain('wrong');
  });

  it.each([
    ['isolation', {position: 99, correctSound: 'x', options: ['x', 'a']}],
    ['missing_letter', {hiddenIndex: 99, correctLetter: 'x', options: ['x', 'a']}],
    ['sound_sort', {mode: 'last', targetChar: 't', options: ['hat'], distractors: ['hat']}],
    ['syllable_blending', {supported: false, contentStatus: 'syllable_audio_required', syllables: []}],
  ])('gives an explicit review state for an invalid prepared %s task', (activity, board) => {
    const {section} = scriptFor({...rabbit(), activityItems: {[activity]: board}}, activity);
    expect(section.teacherSays.join(' ')).toMatch(/review|unavailable/i);
    expect(section.teacherSays.join(' ')).not.toMatch(/___|\/_\//);
  });

  it('does not substitute a legacy first-sound task for an omitted prepared board', () => {
    const {section} = scriptFor({...rabbit(), activityItems: {counting: {answer: 5}}}, 'isolation');
    expect(section.teacherSays.join(' ')).toMatch(/review|unavailable/i);
  });
});

describe('checked syllable counts remain separate from spoken splits', () => {
  it('exports a dictionary-backed count and concrete model without inventing a split', () => {
    const item = compile([rabbit()])[0];
    expect(item.syllables).toEqual([]);
    expect(item.activityItems.syllable_counting).toMatchObject({count: 2, supported: true});
    const {analysis, script, section} = scriptFor(item, 'syllable_counting');
    expect(analysis.syllableCount).toBe(2);
    expect(analysis.syllableType).toBe('multisyllabic (2)');
    expect(analysis.syllables).toEqual([]);
    expect(section.teacherSays[0]).toContain('Two parts');
    expect(section.teacherSays.join(' ')).not.toMatch(/___|rab - bit/i);
    expect(DI.scriptToText(script)).toContain('multisyllabic (2)');
  });

  it('permits a verified one-syllable counting model', () => {
    const item = compile([{word: 'cat', phonemes: ['k', 'a', 't'], syllables: []}])[0];
    expect(scriptFor(item, 'syllable_counting').section.teacherSays[0]).toContain('One part.');
  });

  it('keeps an unresolved count unknown even when unreviewed splits exist', () => {
    const item = {...rabbit(), word: 'blorplet', activityItems: {syllable_counting: {supported: false, counts: [1, 2], status: 'needs_review'}}};
    const {analysis, section} = scriptFor(item, 'syllable_counting');
    expect(analysis.syllableCount).toBeNull();
    expect(analysis.syllableType).toBe('syllable count needs review');
    expect(section.teacherSays.join(' ')).toMatch(/review|unavailable/i);
  });

  it('rejects an unsigned legacy numeric suggestion instead of declaring it checked', () => {
    const {analysis, section} = scriptFor({...rabbit(), word: 'blorplet', syllables: [],
      activityItems: {syllable_counting: {answer: 3}}}, 'syllable_counting');
    expect(analysis.syllableCount).toBeNull();
    expect(section.teacherSays.join(' ')).toMatch(/review|unavailable/i);
  });

  it('does not read stale written splits alongside a different verified count', () => {
    const item = compile([rabbit()])[0];
    item.syllables = ['ra', 'b', 'bit'];
    const {analysis, section} = scriptFor(item, 'syllable_counting');
    expect(analysis.syllableCount).toBe(2);
    expect(section.teacherSays[0]).toContain('Two parts.');
    expect(section.teacherSays[0]).not.toContain('Ra - b - bit');
  });

  it('rejects an invalidated teacher approval even for a dictionary word', () => {
    const item = {...rabbit(), activityItems: {syllable_counting: {
      version: 2, targetWord: 'rabbit', language: 'en-us', status: 'reviewed', source: 'teacher_review',
      supported: true, count: 2, revision: 1, review: {confirmed: true, signature: 'stale'}
    }}};
    expect(scriptFor(item, 'syllable_counting').analysis.syllableCount).toBeNull();
  });

  it('uses winning pack-wide audio when checking a teacher count approval', () => {
    const audio = sample => {
      const wav = Buffer.alloc(46);
      wav.write('RIFF', 0); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
      wav.writeUInt32LE(2, 40); wav.writeInt16LE(sample, 44);
      return {mime: 'audio/wav', base64: wav.toString('base64')};
    };
    const clipA = audio(0), clipB = audio(100);
    const approval = core.createReviewedSyllableCount({targetWord: 'rabbit', language: 'en', count: 2,
      reviewed: true, revision: 1, audioContext: core.createSyllableCountAudioContext({asset: clipA, language: 'en'})});
    const item = {...rabbit(), _ttsAssets: {rabbit: clipA}, activityItems: {syllable_counting: approval}};
    expect(scriptFor(item, 'syllable_counting').analysis.syllableCount).toBe(2);
    const analysis = DI.analyzeWordSet([item, {word: 'dog', phonemes: ['d', 'o', 'g'], _ttsAssets: {rabbit: clipB}}], {language: 'en'});
    expect(analysis.words[0].syllableCount).toBeNull();
    expect(DI.buildLessonScript(analysis, {activities: [{id: 'syllable_counting', count: 1}]}).sections
      .find(section => section.id === 'test_syllable_counting').teacherSays.join(' ')).toMatch(/review|unavailable/i);
  });

  it('binds count approvals to the same clip for supported string and descriptor assets', () => {
    const audio = sample => {
      const wav = Buffer.alloc(46);
      wav.write('RIFF', 0); wav.writeUInt32LE(38, 4); wav.write('WAVEfmt ', 8);
      wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
      wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
      wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
      wav.writeUInt32LE(2, 40); wav.writeInt16LE(sample, 44);
      return {mime: 'audio/wav', base64: wav.toString('base64')};
    };
    const first = audio(0), replacement = audio(100);
    const dataUri = asset => 'data:' + asset.mime + ';base64,' + asset.base64;
    const approval = core.createReviewedSyllableCount({targetWord: 'fire', language: 'en', count: 1,
      reviewed: true, revision: 1, audioContext: core.createSyllableCountAudioContext({asset: first, language: 'en'})});
    const spokenApproval = core.createReviewedSyllableCount({targetWord: 'fire', language: 'en', count: 1,
      reviewed: true, revision: 2, audioContext: core.createSyllableCountAudioContext({language: 'en'})});
    const item = clip => ({word: 'fire', phonemes: ['f', 'ie', 'er'], _ttsAssets: {fire: clip},
      activityItems: {syllable_counting: approval}});
    for (const clip of [first, dataUri(first)]) {
      expect(scriptFor(item(clip), 'syllable_counting').analysis.syllableCount).toBe(1);
      expect(scriptFor(item(clip), 'syllable_counting').section.teacherSays[0]).toContain('One part');
    }
    for (const clip of [replacement, dataUri(replacement)]) {
      const result = scriptFor(item(clip), 'syllable_counting');
      expect(result.analysis.syllableCount).toBeNull();
      expect(result.section.teacherSays.join(' ')).toMatch(/review|unavailable/i);
    }
    for (const clip of [first, dataUri(first)]) {
      expect(scriptFor({...item(clip), activityItems: {syllable_counting: spokenApproval}}, 'syllable_counting').analysis.syllableCount).toBeNull();
    }
    expect(scriptFor({...item(undefined), _ttsAssets: {}, activityItems: {syllable_counting: spokenApproval}}, 'syllable_counting').analysis.syllableCount).toBe(1);
  });
});
