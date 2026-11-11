import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// "Prepare lesson" without an AI call for what the sound dictionary and the
// app's word lists supply. These tests run the real generation loop, the real
// post-processing and the real board compiler from word_sounds_setup_source.jsx.
const require = createRequire(import.meta.url);
const phonemes = require('../word_sounds_phonemes_en.js');
const pronunciations = require('../word_sounds_pronunciations.js');
const builder = require('../dev-tools/build_word_sounds_phonemes.cjs');
const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const core = new Function(coreSource + ';return createWordSoundsCore;')()({ phonemes, pronunciations });
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b < a) throw Error('Missing production boundary: ' + start);
  return source.slice(a, b);
};
const lists = builder.appWordLists(core);
const alloData = { SOUND_MATCH_POOL: lists.soundMatchPool, RIME_FAMILIES: { all: lists.rimeFamilies },
  SIGHT_WORD_PRESETS: { all: lists.sightWords }, WORD_FAMILY_PRESETS: { all: lists.wordFamilies } };
const fillerWords = new Function('return ' + source.match(/const PACK_COMMON_WORDS = (\[[^\]]*\]);/)[1])();
const safePool = new Set([...fillerWords, ...lists.soundMatchPool, ...lists.rimeFamilies, ...lists.sightWords, ...lists.wordFamilies].map(word => String(word).toLowerCase()));

// legacy = the run as it was before the sound dictionary (the helper is absent).
const runner = legacy => new Function('env', `
  const window = env.window;
  ${coreSource}
  const WS_CORE = createWordSoundsCore({ phonemes: env.phonemes, pronunciations: env.pronunciations });
  const instructionalProfile = {}, wordSoundsLanguage = 'en';
  const Math = Object.create(globalThis.Math); Math.random = () => 0.5;
  const espeakPackPhonemes = (...args) => env.espeak(...args);
  ${between('function parseWordSoundsAnalysis(', 'function useWordSoundsAiTopic(')}
  ${between('const PACK_COMMON_WORDS =', '// ── eSpeak G2P')}
  ${between('const preparePackRhyme =', '// BEGIN WORD SOUNDS REVIEWED RECORDING LIBRARY')}
  ${between('const normalizePackKey =', 'const handleStart =')}
  return (async () => {
    ${legacy ? 'const preparePackWordAiFree = undefined;' : ''}
    const { callGemini, callImagen, imageVisibilityMode } = env;
    const wordsToProcess = env.words, processed = [], preloadedMap = env.preloadedMap || {}, preparedActivities = env.activities;
    const sessionType = 'lesson', probeActivitySel = '', topUpOnlyFor = new Map(), syllablePlans = {}, syllableTopUpOff = {};
    const isGenerationActive = () => true, awaitGeneration = value => value, signal = new AbortController().signal;
    const effectiveImageTheme = '', gradeLevel = 'K', packIsEnglish = true, setGeneratedCount = () => {}, warnLog = () => {};
    ${between('             for (let i = 0; i < wordsToProcess.length; i++) {', '             // Flag generated words')}
    ${between('             // Flag generated words', '             // Build every picture required')}
    return processed;
  })();
`);
const runNow = runner(false), runBefore = runner(true);
// The full analysis the text model used to be asked for, for whatever word the prompt names.
const fullAnalysis = prompt => {
  const word = (String(prompt).match(/word "([^"]+)"/) || [])[1];
  return JSON.stringify({ word, phonemes: word.split(''), graphemes: word.split(''), rhymeWord: '', sentence: `I can see the ${word}.`,
    story: [`Look at the ${word}.`, `The ${word} is here.`, `We like the ${word}.`], definition: 'x', imagePrompt: 'Icon of ' + word });
};
const setup = (overrides = {}) => ({
  window: { AlloModules: { AlloData: alloData, WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: 'phonemes' in overrides ? overrides.phonemes : phonemes } },
  phonemes, pronunciations, espeak: vi.fn().mockResolvedValue(null), callGemini: vi.fn(async prompt => fullAnalysis(prompt)),
  callImagen: undefined, imageVisibilityMode: 'smart', ...overrides,
});
const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
const CVC_PLAN = ['blending', 'segmentation', 'mapping', 'spelling_bee'];
const HEARING_PLAN = core.startingPointPlan('hearing_sounds').order;

describe('a lesson the dictionary can prepare makes no AI text call', () => {
  it('10 CVC words with Blend Sounds, Break It Down, Sound Mapping and Spelling Bee: zero calls, valid boards', async () => {
    const env = setup({ words: CVC, activities: CVC_PLAN });
    const items = await runNow(env);
    expect(env.callGemini).toHaveBeenCalledTimes(0);
    expect(env.espeak).not.toHaveBeenCalled();
    expect(items.map(item => item.word)).toEqual(CVC);
    for (const item of items) {
      const word = item.word, sounds = core.dictionarySounds(word).sounds;
      expect(item.phonemes, word).toEqual(sounds);
      expect(item.phonemeSource, word).toBe('dictionary');
      expect(item._fallbackUsed, word).toBeUndefined();
      expect(item._soundsGlance, word).toBeUndefined();
      expect(Object.keys(item.activityItems).sort(), word).toEqual([...CVC_PLAN].sort());
      const { blending, segmentation, mapping, spelling_bee: bee } = item.activityItems;
      expect(blending.answer, word).toBe(word);
      expect(blending.options, word).toContain(word);
      expect(blending.options.length, word).toBe(6);
      expect(new Set(blending.options).size, word).toBe(6);
      expect(segmentation.slotCount, word).toBe(3);
      expect(segmentation.chips.filter(chip => chip.type === 'correct').map(chip => chip.phoneme).sort(), word).toEqual([...sounds].sort());
      expect(mapping.graphemes, word).toEqual(word.split(''));
      expect(mapping.graphemes.length, word).toBe(item.phonemes.length);
      expect(mapping.chipOrder.map(chip => chip.text).sort(), word).toEqual(word.split('').sort());
      expect(bee, word).toEqual({ answer: word });
    }
  });

  it('counts the AI text calls of two 10-word lessons, before and now', async () => {
    const counts = {};
    for (const [name, activities] of [['cvc', CVC_PLAN], ['cvc_starting_point', ['blending', 'segmentation', 'mapping', 'spelling_bee', 'decoding']], ['hearing_sounds', HEARING_PLAN]]) {
      const before = setup({ words: CVC, activities }), now = setup({ words: CVC, activities });
      await runBefore(before); await runNow(now);
      counts[name] = [before.callGemini.mock.calls.length, now.callGemini.mock.calls.length];
    }
    expect(HEARING_PLAN).toEqual(['rhyming', 'syllable_counting', 'syllable_blending', 'isolation']);
    expect(counts).toEqual({ cvc: [10, 0], cvc_starting_point: [10, 0], hearing_sounds: [10, 0] });
  });

  it('"Hearing sounds" gets a real rhyme board for every word without AI', async () => {
    const items = await runNow(setup({ words: CVC, activities: HEARING_PLAN, callGemini: undefined }));
    for (const item of items) {
      const board = item.activityItems.rhyming;
      expect(board.supported, item.word).not.toBe(false);
      expect(board.answer, item.word).toBe(item.rhymeWord);
      expect(board.options, item.word).toContain(board.answer);
      expect(board.options.length, item.word).toBeGreaterThanOrEqual(3);
      // The answer rhymes by sound and no other choice does.
      const rime = word => { const sounds = core.dictionarySounds(word).sounds; return sounds.slice(sounds.findIndex(sound => 'aeiou'.includes(sound))).join(' '); };
      expect(rime(board.answer), item.word).toBe(rime(item.word));
      for (const option of board.options) if (option !== board.answer) expect(rime(option), item.word + ' vs ' + option).not.toBe(rime(item.word));
      expect(item.activityItems.isolation.correctSound, item.word).toBe(item.phonemes[item.activityItems.isolation.position]);
    }
  });
});

describe('with no AI at all the full derive path runs', () => {
  it('prepares sounds, spellings and every derived answer set', async () => {
    const items = await runNow(setup({ words: CVC, activities: null, callGemini: undefined }));
    for (const item of items) {
      expect(item.phonemeSource, item.word).toBe('dictionary');
      expect(item._fallbackUsed, item.word).toBeUndefined();
      expect(item.graphemes, item.word).toEqual(item.word.split(''));
      expect(item.rhymeWord, item.word).toBeTruthy();
      expect(item._rhymeSource, item.word).toBe('derived');
      expect(item.blendingDistractors.length, item.word).toBe(5);
      expect(item.orthographyDistractors.length, item.word).toBeGreaterThanOrEqual(2);
      expect(item.familyMembers.length, item.word).toBeGreaterThanOrEqual(1);
      expect(item.activityItems.word_families, item.word).toBeTruthy();
      expect(item.activityItems.orthography.options, item.word).toContain(item.word);
      expect(item.activityItems.sound_sort, item.word).toBeTruthy();
      // No model means no sentence: the reading boards are absent, not invented.
      expect(item.sentence, item.word).toBe('');
      expect(item.activityItems.read_sentence, item.word).toBeUndefined();
    }
  });

  it('is deterministic: the same lesson derives the same answers', async () => {
    const pick = items => items.map(item => [item.phonemes, item.graphemes, item.rhymeWord, item.rhymeDistractors, item.blendingDistractors, item.familyMembers, item.orthographyDistractors]);
    const first = await runNow(setup({ words: CVC, activities: null, callGemini: undefined }));
    const second = await runNow(setup({ words: CVC, activities: null, callGemini: undefined }));
    expect(pick(second)).toEqual(pick(first));
  });

  it('still prepares when the dictionary file did not load: estimate, flagged, never auto-accepted', async () => {
    const items = await runNow(setup({ words: ['cat'], activities: CVC_PLAN, callGemini: undefined, phonemes: undefined }));
    expect(items[0]).toMatchObject({ word: 'cat', phonemeSource: 'estimate', _fallbackUsed: true, _phonemeSource: 'estimated', _soundsGlance: ['estimate'] });
  });
});

describe('the AI is asked only for what nothing else can write', () => {
  it('a plan with Finish the Sentence asks for the sentence fields only', async () => {
    const callGemini = vi.fn(async prompt => {
      const word = prompt.match(/word "([^"]+)"/)[1];
      return JSON.stringify({ word, phonemes: ['z', 'z'], graphemes: ['zz'], rhymeWord: 'zzz', sentence: `I can see the ${word}.`, sentenceDistractors: ['hat', 'mat', 'bat'], definition: 'A thing.' });
    });
    const env = setup({ words: ['cat', 'dog'], activities: ['blending', 'read_sentence'], callGemini });
    const items = await runNow(env);
    expect(callGemini).toHaveBeenCalledTimes(2);
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('DECODABLE SENTENCE');
    expect(prompt).not.toContain('DECODABLE STORY');
    expect(prompt).not.toContain('PHONEME NOTATION');
    expect(prompt).not.toContain('MANIPULATION TASK');
    expect(prompt).toContain('Do NOT return phonemes');
    // The model's sounds, spellings and rhyme are ignored: the dictionary's stand.
    expect(items[0]).toMatchObject({ word: 'cat', phonemes: ['k', 'a', 't'], graphemes: ['c', 'a', 't'], phonemeSource: 'dictionary', sentence: 'I can see the cat.', definition: 'A thing.' });
    expect(items[0].rhymeWord).not.toBe('zzz');
    expect(items[0].activityItems.read_sentence).toMatchObject({ sentence: 'I can see the cat.' });
    expect(items[0].activityItems.read_sentence.options).toContain('cat');
  });

  it('a story is requested only when Read the Story is in the plan', async () => {
    const env = setup({ words: ['cat'], activities: ['read_passage'] });
    await runNow(env);
    expect(env.callGemini).toHaveBeenCalledTimes(1);
    expect(env.callGemini.mock.calls[0][0]).toContain('DECODABLE STORY');
    expect(env.callGemini.mock.calls[0][0]).not.toContain('DECODABLE SENTENCE');
  });

  it('a failed sentence request keeps the prepared word and its sounds', async () => {
    const env = setup({ words: ['cat'], activities: ['blending', 'read_sentence'], callGemini: vi.fn().mockRejectedValue(new Error('429')) });
    const items = await runNow(env);
    expect(items[0]).toMatchObject({ word: 'cat', phonemes: ['k', 'a', 't'], phonemeSource: 'dictionary', sentence: '' });
    expect(items[0]._fallbackUsed).toBeUndefined();
    expect(items[0].activityItems.blending.options).toContain('cat');
  });

  it('asks for a picture as before, but not when the plan shows none and pictures are off', async () => {
    const shown = setup({ words: ['cat'], activities: CVC_PLAN, callImagen: vi.fn().mockResolvedValue('image:cat') });
    expect((await runNow(shown))[0].image).toBe('image:cat');
    expect(shown.callImagen).toHaveBeenCalledTimes(1);
    const off = setup({ words: ['cat'], activities: CVC_PLAN, imageVisibilityMode: 'off', callImagen: vi.fn().mockResolvedValue('image:cat') });
    expect((await runNow(off))[0].image).toBeNull();
    expect(off.callImagen).not.toHaveBeenCalled();
    const needed = setup({ words: ['cat'], activities: [...CVC_PLAN, 'decoding'], imageVisibilityMode: 'off', callImagen: vi.fn().mockResolvedValue('image:cat') });
    await runNow(needed);
    expect(needed.callImagen).toHaveBeenCalledTimes(1);
  });
});

describe('where sounds come from, in order', () => {
  it('never replaces sounds a teacher reviewed', async () => {
    const reviewed = { word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't', 's'], phonemeSource: 'teacher' };
    const env = setup({ words: ['cat', 'dog'], activities: CVC_PLAN, preloadedMap: { cat: reviewed } });
    const items = await runNow(env);
    expect(items[0]).toMatchObject({ word: 'cat', phonemes: ['k', 'a', 't', 's'], phonemeSource: 'teacher' });
    expect(items[0]._soundsGlance).toBeUndefined();
    expect(items[1]).toMatchObject({ word: 'dog', phonemes: ['d', 'o', 'g'], phonemeSource: 'dictionary' });
    expect(env.callGemini).not.toHaveBeenCalled();
  });

  it('a word the dictionary lacks goes to eSpeak, is flagged, and makes no AI call', async () => {
    expect(core.dictionarySounds('blorf')).toBeNull();
    const espeak = vi.fn().mockResolvedValue([{ ipa: 'b', grapheme: 'b' }, { ipa: 'l', grapheme: 'l' }, { ipa: 'ɔr', grapheme: 'or' }, { ipa: 'f', grapheme: 'f' }]);
    const env = setup({ words: ['blorf'], activities: CVC_PLAN, espeak });
    const items = await runNow(env);
    expect(espeak).toHaveBeenCalledWith('blorf', 'en');
    expect(env.callGemini).not.toHaveBeenCalled();
    expect(items[0]).toMatchObject({ word: 'blorf', phonemeSource: 'espeak', _phonemeSource: 'espeak', _soundsGlance: ['not_dictionary'] });
    expect(items[0]._fallbackUsed).toBeUndefined();
  });

  it('with no eSpeak and no AI it falls to the spelling estimate, flagged and without derived rhymes', async () => {
    const items = await runNow(setup({ words: ['blorf'], activities: null, callGemini: undefined }));
    expect(items[0]).toMatchObject({ word: 'blorf', phonemeSource: 'estimate', _fallbackUsed: true, _soundsGlance: ['estimate'], rhymeWord: '' });
    expect(items[0].activityItems.mapping.supported).toBe(false);
  });

  it('with no eSpeak the AI analysis is the next rung, and its sounds are flagged as not from the dictionary', async () => {
    const env = setup({ words: ['blorf', 'cat'], activities: CVC_PLAN });
    const items = await runNow(env);
    expect(env.callGemini).toHaveBeenCalledTimes(1);
    expect(env.callGemini.mock.calls[0][0]).toContain('"blorf"');
    expect(items[0]).toMatchObject({ word: 'blorf', phonemeSource: 'ai', _phonemeSource: 'gemini', _soundsGlance: ['not_dictionary'] });
    expect(items[1]).toMatchObject({ word: 'cat', phonemeSource: 'dictionary' });
  });

  it('flags more than one pronunciation and a schwa for a glance', async () => {
    const items = await runNow(setup({ words: ['use', 'about', 'cat'], activities: CVC_PLAN, callGemini: undefined }));
    expect(items[0]).toMatchObject({ word: 'use', phonemeAlternates: [['y', 'oo', 'z']], _soundsGlance: ['alternate'] });
    expect(items[1]).toMatchObject({ word: 'about', _soundsGlance: ['schwa'] });
    expect(items[1].soundNotes).toMatchObject({ schwa: true });
    expect(items[2]._soundsGlance).toBeUndefined();
  });
});

describe('Sound Mapping never grades a wrong board', () => {
  it('x, long u, -le and qu map with a chip over two sound boxes; "one" is left out with the reason; welded words record their unit', async () => {
    const items = await runNow(setup({ words: ['fox', 'cute', 'little', 'queen', 'one', 'bank', 'ship'], activities: ['mapping'], callGemini: undefined }));
    const item = word => items.find(entry => entry.word === word);
    const board = word => item(word).activityItems.mapping;
    expect(board('fox')).toMatchObject({ graphemes: ['f', 'o', 'x'], chipSpans: [1, 1, 2] });
    expect(board('cute')).toMatchObject({ graphemes: ['c', 'u', 'te'], chipSpans: [1, 2, 1] });
    expect(board('little')).toMatchObject({ graphemes: ['l', 'i', 'tt', 'le'], chipSpans: [1, 1, 1, 2] });
    expect(board('queen')).toMatchObject({ graphemes: ['qu', 'ee', 'n'], chipSpans: [2, 1, 1], soundUnits: [{ unit: 'qu', start: 0, length: 2 }] });
    expect(board('queen').chipOrder.map(chip => chip.text).sort()).toEqual(['ee', 'n', 'qu']);
    // Sounds stay one per phoneme everywhere else: queen is 4 sounds.
    expect(item('queen').phonemes).toEqual(['k', 'w', 'ee', 'n']);
    expect(board('queen').supported).toBeUndefined();
    expect(item('queen').phonemeCount).toBe(4);
    expect(board('one')).toMatchObject({ supported: false, contentStatus: 'teacher_review_required', reason: 'two_sound_spelling', graphemes: [] });
    expect(board('bank')).toMatchObject({ graphemes: ['b', 'a', 'n', 'k'], soundUnits: [{ unit: 'ank', start: 1, length: 3 }] });
    expect(board('ship')).toMatchObject({ graphemes: ['sh', 'i', 'p'] });
    expect(board('ship').soundUnits).toBeUndefined();
    expect(board('ship').chipSpans).toBeUndefined();
  });

  it('the one-letter-per-sound guess is refused for AI sounds too when the aligner disagrees', async () => {
    // "cute": four letters, four sounds, but u is two sounds and e is silent:
    // the aligner's board (u over two boxes) is used, never c-u-t-e.
    const callGemini = vi.fn(async () => JSON.stringify({ word: 'cute', phonemes: ['k', 'y', 'oo', 't'], graphemes: [] }));
    const items = await runBefore(setup({ words: ['cute'], activities: ['mapping'], callGemini }));
    expect(items[0].activityItems.mapping.graphemes).not.toEqual(['c', 'u', 't', 'e']);
    expect(items[0].activityItems.mapping).toMatchObject({ graphemes: ['c', 'u', 'te'], chipSpans: [1, 2, 1] });
  });
});

describe('derived answer choices', () => {
  it('come only from the app\'s own word lists and the lesson\'s words', async () => {
    const words = [...CVC, 'ship', 'frog', 'cake', 'rain', 'star', 'jump'];
    const items = await runNow(setup({ words, activities: null, callGemini: undefined }));
    const allowed = new Set([...safePool, ...words]);
    const outside = [];
    for (const item of items) {
      const boards = item.activityItems;
      const shown = [item.rhymeWord, ...item.rhymeDistractors, ...item.blendingDistractors, ...item.familyMembers,
        ...boards.blending.options, ...(boards.rhyming.options || []), ...((boards.word_families || {}).options || []), ...((boards.word_families || {}).distractors || [])];
      shown.filter(Boolean).forEach(word => { if (!allowed.has(word)) outside.push(item.word + ':' + word); });
      expect(item._unverifiedWords, item.word).toBeUndefined();
    }
    expect(outside).toEqual([]);
  });

  it('family members share the sound of the ending, not just its letters', () => {
    const derive = word => core.derivedAnswerSets({ word, sounds: core.dictionarySounds(word).sounds, pool: [...safePool],
      soundsOf: value => (core.dictionarySounds(value) || {}).sounds || null });
    expect(derive('cat').familyMembers).not.toContain('what');
    expect(derive('cat').familyMembers.every(word => word.endsWith('at'))).toBe(true);
    expect(derive('food').familyMembers).not.toContain('good');
    expect(derive('food').rhymeWord).not.toBe('good');
    // A homophone is never offered as the rhyme or as a blending choice.
    expect(derive('see').rhymeWord).not.toBe('sea');
    expect(derive('see').blendingDistractors).not.toContain('sea');
  });

  it('misspellings follow the rules and are never a real word or the word itself', () => {
    // A real word: any of the sound dictionary's words or any word on the app's lists.
    const isRealWord = word => !!core.dictionarySounds(word) || safePool.has(word);
    const spell = word => core.misspellings(word, { sounds: (core.dictionarySounds(word) || {}).sounds || [], isRealWord });
    expect(spell('duck')).toContain('duk');
    expect(spell('cat')).toContain('catt');
    expect(spell('cake')).toContain('caik');
    expect(spell('queen')).toContain('kween');
    expect(spell('phone')).toContain('fone');
    expect(spell('bell')).toContain('bel');
    expect(spell('jumped')).toContain('jumpt');
    // Dropping the k of "knight" gives a real word, so that rule yields nothing here.
    expect(spell('said')).toContain('sed');
    expect(spell('girl').slice(0, 2)).toEqual(['gerl', 'gril']);
    expect(spell('go')).toContain('gow');
    expect(spell('look')).toContain('luk');
    expect(spell('knight')).not.toContain('night');
    expect(spell('bee')).not.toContain('be');
    expect(spell('bed')).not.toContain('bd');
    const real = [], same = [];
    let total = 0, short = 0;
    for (const raw of new Set(Object.values(lists).flat())) {
      const word = String(raw).toLowerCase();
      if (!/^[a-z]{2,}$/.test(word)) continue;
      const made = spell(word);
      total++;
      if (made.length < 2) short++;
      made.forEach(value => { if (isRealWord(value) || safePool.has(value)) real.push(word + '>' + value); if (value === word) same.push(word); });
      expect(new Set(made).size, word).toBe(made.length);
    }
    expect(real).toEqual([]);
    expect(same).toEqual([]);
    expect(total).toBeGreaterThan(1300);
    // Nearly every word gets at least two wrong spellings to choose among (me, to and be get none).
    expect(short / total).toBeLessThan(0.01);
  });
});
