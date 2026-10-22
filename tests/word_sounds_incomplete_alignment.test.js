import {describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {core, coreSource, compileWords} from './helpers/word_sounds_core.js';

const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const section = (start, end) => {
  const a = setup.indexOf(start), b = setup.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw Error('Missing production boundary: ' + start);
  return setup.slice(a, b);
};
const currentCore = source => source.replace(/\/\/ BEGIN GENERATED WORD SOUNDS CORE[\s\S]*?\/\/ END GENERATED WORD SOUNDS CORE/,
  '// BEGIN GENERATED WORD SOUNDS CORE\n' + coreSource + '\nconst WS_CORE=createWordSoundsCore();\n// END GENERATED WORD SOUNDS CORE');
function api(file, name) {
  const module = {exports: {}}, window = {};
  new Function('module', 'window', currentCore(readFileSync(file, 'utf8')))(module, window);
  return window[name] || module.exports;
}
const DI = api('word_sounds_di_loader.js', 'AlloWordSoundsDI');
const readiness = api('word_sounds_readiness_contract.js', 'unused');

// Actual espeak-ng@1.0.2 responses captured through phonics_g2p_loader.js in
// reports/word-sounds-review-2026-10-21-followup/content-audio-evidence.json.
// No network/provider mock is used after this captured response boundary.
const responses = {
  box: {ipa: ['b', 'ɑ', 'k', 's'], count: 4, voice: 'en-us'},
  fox: {ipa: ['f', 'ɑ', 'k', 's'], count: 4, voice: 'en-us'},
  ship: {ipa: ['ʃ', 'ɪ', 'p'], count: 3, voice: 'en-us'},
};
function preparation() {
  const window = {};
  new Function('window', 'console', readFileSync('phonics_g2p_loader.js', 'utf8'))(window, {log() {}});
  window.AlloPhonics.toPhonemes = vi.fn(async word => responses[word] || null);
  const helpers = new Function('window', 'WS_CORE', 'setTimeout',
    section('const PACK_COMMON_WORDS =', '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY') +
    ';return {espeakPackPhonemes};')(window, core, () => 0);
  return {...helpers, phonics: window.AlloPhonics};
}
const parse = new Function(section('function parseWordSoundsAnalysis(', 'const WordSoundsGenerator =') + ';return parseWordSoundsAnalysis;')();
const runLoop = new Function('env', `
  const {wordsToProcess,processed,preloadedMap,isGenerationActive,wordSoundsLanguage,gradeLevel,packIsEnglish,
    signal,awaitGeneration,callImagen,effectiveImageTheme,callGemini,espeakPackPhonemes,estimatePackPhonemes,
    WS_CORE,preparePackRhyme,isUnusableAsPhonicsWord,setGeneratedCount,warnLog,parseWordSoundsAnalysis}=env;
  return (async()=>{${section('             for (let i = 0; i < wordsToProcess.length; i++) {', '             // Flag generated words')}
    return processed;})();
`);
async function generate(word, providerFailure = false) {
  const helper = preparation(), estimate = vi.fn(() => word.split(''));
  const processed = await runLoop({wordsToProcess: [word], processed: [], preloadedMap: {},
    isGenerationActive: () => true, wordSoundsLanguage: 'en', gradeLevel: 'K', packIsEnglish: true,
    signal: new AbortController().signal, awaitGeneration: value => value,
    callGemini: providerFailure ? vi.fn().mockRejectedValue(Error('offline')) : vi.fn().mockResolvedValue(JSON.stringify({word})),
    espeakPackPhonemes: helper.espeakPackPhonemes, estimatePackPhonemes: estimate, WS_CORE: core,
    preparePackRhyme: async () => ({answer: ''}), isUnusableAsPhonicsWord: () => false,
    setGeneratedCount() {}, warnLog() {}, parseWordSoundsAnalysis: parse});
  return {item: processed[0], estimate, helper};
}

describe('valid sound sequences survive incomplete spelling alignment', () => {
  it.each(['box', 'fox'])('preserves four provider sounds for %s without inventing a partial spelling map', async word => {
    const h = preparation();
    expect(h.phonics.alignGraphemes(word, 4)).toBeNull();
    const built = h.phonics.buildPhonemes(word, responses[word], null);
    expect(built.phonemeCount).toBe(4);
    expect(built.phonemes.map(p => p.ipa)).toEqual(responses[word].ipa);
    expect(built.phonemes.map(p => p.grapheme)).toEqual(['', '', '', '']);
    expect(await h.espeakPackPhonemes(word, 'en')).toEqual(built.phonemes);
  });

  it.each([false, true])('uses G2P in the real generation loop when Gemini fails or omits sounds (failure=%s)', async failure => {
    const {item, estimate} = await generate('box', failure);
    expect(item).toMatchObject({word: 'box', phonemeCount: 4, _phonemeSource: 'espeak'});
    expect(item._fallbackUsed).toBeFalsy();
    expect(item.phonemes.map(p => p.ipa)).toEqual(['b', 'ɑ', 'k', 's']);
    expect(estimate).not.toHaveBeenCalled();
  });

  it('keeps valid sounds but discards non-reconstructing spelling data', async () => {
    const h = preparation();
    h.phonics.buildPhonemes = () => ({phonemes: responses.box.ipa.map((ipa, i) => ({ipa, grapheme: ['b', 'o', 'x', 'z'][i]}))});
    const result = await h.espeakPackPhonemes('box', 'en');
    expect(result).toEqual(responses.box.ipa.map(ipa => ({ipa, grapheme: ''})));
    h.phonics.buildPhonemes = () => ({phonemes: [{ipa: 'b'}, {ipa: ''}, {ipa: 's'}]});
    expect(await h.espeakPackPhonemes('box', 'en')).toBeNull();
  });

  it('delivers four-sound boards and a separate mapping review state through portable save/reopen and DI', async () => {
    const {item} = await generate('box');
    const compiled = compileWords([item], {}, 'en', ['counting', 'segmentation', 'blending', 'mapping', 'word_scramble', 'orthography']);
    const board = compiled[0].activityItems;
    expect(board.counting.answer).toBe(4);
    expect(board.segmentation.slotCount).toBe(4);
    expect(board.segmentation.chips.filter(chip => !chip.isDistractor).map(chip => chip.phoneme).sort()).toEqual(['b', 'o', 'k', 's'].sort());
    expect(board.mapping).toEqual({supported: false, contentStatus: 'teacher_review_required', graphemes: [], chipOrder: []});
    expect(compiled[0].graphemes).toEqual([]);
    expect(board.word_scramble.letters.slice().sort()).toEqual(['b', 'o', 'x']);
    expect(board.orthography.answer).toBe('box');
    const saved = JSON.parse(JSON.stringify(readiness.portable({type: 'word-sounds', lessonPlanSequence: ['counting'], data: compiled}))).data[0];
    expect(DI.presenterLines('counting', saved, {language: 'en', words: [saved]}).model).toContain('/b/ /ɑ/ /k/ /s/. Four sounds.');
    expect(DI.presenterLines('mapping', saved, {language: 'en', words: [saved]})).toBeNull();
    expect(DI.presenterLines('word_scramble', saved, {language: 'en', words: [saved]}).model).toContain('b, o, x');
    expect(readiness.requirements({type: 'word-sounds', lessonPlanSequence: ['counting'], data: [saved]}).contentIssues).toEqual([]);
    expect(readiness.requirements({type: 'word-sounds', lessonPlanSequence: ['mapping'], data: [saved]}).contentIssues).toEqual([
      'Sound Mapping for box needs a checked match between letters and sounds.']);
  });

  it('preserves real digraph mappings, including the teacher-approved spelling chunks on existing rows', async () => {
    const phonemes = await preparation().espeakPackPhonemes('ship', 'en');
    const ship = compileWords([{word: 'ship', phonemes}])[0];
    expect(ship.activityItems.mapping.graphemes).toEqual(['sh', 'i', 'p']);
    expect(ship.activityItems.mapping.supported).not.toBe(false);
    expect(DI.presenterLines('mapping', ship, {language: 'en', words: [ship]}).model).toContain('/ʃ/ is spelled sh');
    expect(readiness.requirements({type: 'word-sounds', lessonPlanSequence: ['mapping'], data: [ship]}).contentIssues).toEqual([]);
    const rabbit = compileWords([{word: 'rabbit', phonemes: ['r', 'a', 'b', 'i', 't'], graphemes: ['r', 'a', 'bb', 'i', 't']}])[0];
    expect(rabbit.activityItems.mapping.graphemes).toEqual(['r', 'a', 'bb', 'i', 't']);
  });
});

describe('scramble teacher model describes the individual letter tiles', () => {
  it.each([
    ['ship', [{ipa: 'ʃ', grapheme: 'sh'}, {ipa: 'ɪ', grapheme: 'i'}, {ipa: 'p', grapheme: 'p'}], 's, h, i, p'],
    ['chip', [{ipa: 'tʃ', grapheme: 'ch'}, {ipa: 'ɪ', grapheme: 'i'}, {ipa: 'p', grapheme: 'p'}], 'c, h, i, p'],
    ['cat', ['k', 'a', 't'], 'c, a, t'],
  ])('models the actual %s tiles in both projected and printed lines', (word, phonemes, letters) => {
    const compiled = compileWords([{word, phonemes}]);
    expect(compiled[0].activityItems.word_scramble.letters.every(letter => letter.length === 1)).toBe(true);
    const line = DI.presenterLines('word_scramble', compiled[0], {language: 'en', words: compiled});
    expect(line.model).toBe('My turn. ' + word[0].toUpperCase() + word.slice(1) + '. I put the letters in order: ' + letters + '.');
    expect(line.model).not.toMatch(/sh goes first|ch goes first/);
    const analysis = DI.analyzeWordSet(compiled, {language: 'en'});
    const script = DI.buildLessonScript(analysis, {activities: [{id: 'word_scramble', count: 1}]});
    expect(DI.scriptToText(script)).toContain('I put the letters in order: ' + letters + '.');
  });

  it('does not require one-grapheme-per-sound alignment for a legacy letter scramble', () => {
    const item = {word: 'box', phonemes: responses.box.ipa.map(ipa => ({ipa}))};
    expect(DI.presenterLines('word_scramble', item, {language: 'en', words: [item]}).model).toContain('b, o, x');
    expect(DI.presenterLines('mapping', item, {language: 'en', words: [item]})).toBeNull();
  });
});
