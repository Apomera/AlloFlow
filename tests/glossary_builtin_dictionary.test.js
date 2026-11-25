// Glossary without AI (2026-11-23, lane glossaryA): a glossary built from the built-in dictionary
// (window.AlloVocabBank, Wiktionary / WordNet) from a word list (1b) or from the passage's analysis
// list (1d), with NO AI call of any kind; the part-of-speech field the AI prompts now ask for (2);
// the analysis vocabulary part-of-speech map (1e); and the chooser / Glossary panel controls (1a, 1c, 1d).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

const DISPATCHER = readFileSync(process.env.ALLO_DISPATCHER_CANDIDATE || 'generate_dispatcher_source.jsx', 'utf8');
const SIDEBAR = readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8');
const noop = () => {};
// Same rule as the passage baseline: only names the dispatcher CALLS get a no-op.
const CALLED = new Set([...DISPATCHER.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]));
const PASSAGE = 'Earth\'s crust is broken into huge plates that move slowly over the mantle. '
  + 'Scientists record each earthquake to study how the plates move. Every living thing is made of at least one cell.';

let dispatcher, realBank, realDictionary, sidebarApi;
beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-03-02T15:00:00Z') });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('allo_data_module.js');
  new Function(DISPATCHER)();
  dispatcher = window.AlloModules.GenDispatcher;
  // The real dictionary files, read from disk (the bank's own add/addExt accept a parsed file).
  new Function(readFileSync('packets_vocab_bank_en.js', 'utf8'))();
  realBank = window.AlloVocabBank;
  ['packets_vocab/en-1.json', 'packets_vocab/en-2.json'].forEach((file, i) => realBank.add(JSON.parse(readFileSync(file, 'utf8')), i + 1));
  Object.keys(realBank.extShards).forEach(key => realBank.addExt(JSON.parse(readFileSync(realBank.extShards[key].url, 'utf8')), key));
  new Function(readFileSync('dictionary_loader.js', 'utf8'))();
  realDictionary = window.AlloDictionary;
  delete window.AlloVocabBank;
  delete window.AlloDictionary;
  // The compiled sidebar, as the app loads it.
  window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function('window', 'document', 'console', SIDEBAR)(window, document, console);
  sidebarApi = window.AlloModules;
}, 60000);
afterEach(() => {
  delete window.AlloVocabBank;
  delete window.AlloDictionary;
  delete window.__alloResolveAiCapability;
  if (window.AlloModules) delete window.AlloModules.GlossaryOfflinePictures;
  mounts.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); });
});

// A small stand-in bank with the AlloVocabBank shape (senses in "school sense first" order).
function fakeBank(words, phrases = {}) {
  const sense = (word, [pos, def, example = '', checked = 'good']) => ({ word, pos, def, example, checked, source: 'simple' });
  const heads = Object.fromEntries(Object.entries(words).map(([word, list]) => [word, list.map(row => sense(word, row))]));
  const phraseHeads = Object.fromEntries(Object.entries(phrases).map(([word, list]) => [word, list.map(row => sense(word, row))]));
  const head = word => { const k = String(word).toLowerCase(); return heads[k] ? k : (/s$/.test(k) && heads[k.slice(0, -1)] ? k.slice(0, -1) : null); };
  return {
    credits: [{ set: 'Simple English Wiktionary', author: 'Wiktionary contributors', license: 'CC BY-SA 4.0', url: 'https://simple.wiktionary.org', deed: 'https://creativecommons.org/licenses/by-sa/4.0/' }],
    checking: 'Checked with AI assistance. A teacher can edit every item.',
    load: vi.fn(async () => {}), ready: () => true, ensureForWords: vi.fn(async () => true),
    head, has: word => !!head(word), senses: word => (head(word) ? heads[head(word)].slice() : []),
    phraseSenses: phrase => (phraseHeads[String(phrase).toLowerCase()] || []).slice(),
  };
}
const FAKE_WORDS = {
  plate: [['noun', 'A flat dish that you eat food from', 'Put the cake on a plate.'], ['noun', 'One of the huge moving slabs of rock that make up the outer shell of Earth', 'The plates of the crust move slowly.']],
  fertile: [['adjective', '___ land is land on which crops can grow well', '']],
  honest: [['adjective', 'A ___ person tells the truth', 'She is an honest girl.']],
  record: [['noun', 'A written account of something that happened', 'Keep a record of the weather.'], ['verb', 'To write down or save information so it can be used later', 'Record the temperature every day.']],
  mouse: [['noun', 'A small animal with a long tail', 'The mouse ran under the bed.', '']],
};

function fixture({ overrides = {}, answer = '[]' } = {}) {
  const callGemini = vi.fn(async () => answer);
  const callImagen = vi.fn(async () => 'data:image/png;base64,x');
  const callGeminiVision = vi.fn(async () => '{}');
  const callGeminiImageEdit = vi.fn(async () => 'data:image/png;base64,y');
  const generateHelpfulHint = vi.fn();
  const addToast = vi.fn();
  const saved = [];
  const setHistory = vi.fn(update => { const next = typeof update === 'function' ? update([]) : update; if (Array.isArray(next)) saved.push(...next); });
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: '', activeUnitId: 'lesson', selectedReadingSourceId: '',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: '', currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null },
    alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false,
    callGemini, callImagen, callGeminiVision, callGeminiImageEdit, generateHelpfulHint, addToast, setHistory,
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: String, getGroupDifferentiationContext: () => '', getDefaultTitle: type => type, t: key => key,
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }), chunkText: text => [text],
    countWords: text => text.trim().split(/\s+/).length, textFormat: 'Standard Text', selectedConcepts: [],
    formatLessonDNA: () => '', glossaryTier2Count: 2, glossaryTier3Count: 2, glossaryDefinitionLevel: 'Same as Source Text',
    glossaryImageStyle: '', universalImageStyle: '', useEmojis: true, includeEtymology: true, autoRemoveWords: true,
    TIMELINE_MODE_DEFINITIONS: window.AlloModules.AlloData.TIMELINE_MODE_DEFINITIONS, timelineMode: 'auto',
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : (typeof key === 'string' && CALLED.has(key) ? noop : undefined) });
  const noAi = () => {
    for (const fn of [callGemini, callImagen, callGeminiVision, callGeminiImageEdit, generateHelpfulHint]) expect(fn).not.toHaveBeenCalled();
  };
  return { deps, callGemini, addToast, saved, noAi };
}
async function generate(f, config) {
  let error = null;
  try { await dispatcher.handleGenerate('glossary', null, false, null, { rethrowErrors: true, ...config }, true, f.deps); }
  catch (e) { error = e; }
  return error;
}
const wordSeed = (terms, extra = {}) => ({ kind: 'word-list', terms, termLanguage: 'English', dictionary: true, ...extra });

describe('helpers', () => {
  it('normalizes part of speech to four words, "" when unknown', () => {
    const pos = dispatcher.normalizeGlossaryPos;
    expect(['Noun', 'n', 'proper noun', 'verb', 'VT', 'phrasal verb', 'adj.', 'Adjective', 'adverb', 'adv', 'r'].map(pos))
      .toEqual(['noun', 'noun', 'noun', 'verb', 'verb', 'verb', 'adjective', 'adjective', 'adverb', 'adverb', 'adverb']);
    expect(['', 'pronoun', 'preposition', 42, null, undefined, 'banana'].map(pos)).toEqual(['', '', '', '', '', '', '']);
  });
  it('puts the word back into blank-style meanings, with a/an and a capital at a sentence start', () => {
    const fill = dispatcher.fillDictionaryBlank;
    expect(fill('___ land is land on which crops can grow well', 'fertile')).toBe('Fertile land is land on which crops can grow well');
    expect(fill('A ___ person tells the truth', 'honest')).toBe('An honest person tells the truth');
    expect(fill('Something that can be seen through is ___', 'transparent')).toBe('Something that can be seen through is transparent');
    expect(fill('If animals ___ on other animals, they hunt and eat them', 'prey')).toBe('If animals prey on other animals, they hunt and eat them');
    expect(fill('An ___ is a small animal', 'mouse')).toBe('A mouse is a small animal');
    expect(fill('No blank here', 'word')).toBe('No blank here');
  });
  it('keeps the dictionary flag on a word-list seed, for a glossary only', () => {
    expect(dispatcher.normalizeWordListSeed(wordSeed(['cell']))).toEqual(wordSeed(['cell']));
    expect(dispatcher.normalizeWordListSeed({ kind: 'word-list', terms: ['cell'], dictionary: 'yes' })).not.toHaveProperty('dictionary');
    expect(dispatcher.normalizeGenerationSeed('glossary', wordSeed(['cell'])).dictionary).toBe(true);
    expect(dispatcher.normalizeGenerationSeed('concept-sort', wordSeed(['cell']))).not.toHaveProperty('dictionary');
  });
});

describe('1b: a word-list glossary from the built-in dictionary', () => {
  it('makes no AI call, keeps the teacher\'s spelling and order, and fills every dictionary field', async () => {
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const f = fixture();
    const error = await generate(f, { seed: wordSeed(['Record', 'fertile', 'zorbleflax', 'honest']) });
    expect(error).toBeNull();
    f.noAi();
    expect(f.saved).toHaveLength(1);
    const item = f.saved[0];
    expect(item.data.map(entry => entry.term)).toEqual(['Record', 'fertile', 'zorbleflax', 'honest']);
    const [record, fertile, missing, honest] = item.data;
    expect(record).toMatchObject({ def: 'A written account of something that happened', pos: 'noun', example: 'Keep a record of the weather.',
      defSource: 'dictionary', dictSense: { word: 'record', index: 0, total: 2 }, senseCheck: true, tier: 'Academic',
      termLanguage: 'English', sourceLanguage: 'English', wordLanguage: 'English', definitionLanguage: 'English', sourceTerm: 'Record' });
    expect(fertile).toMatchObject({ def: 'Fertile land is land on which crops can grow well', pos: 'adjective', dictSense: { word: 'fertile', index: 0, total: 1 } });
    expect(fertile).not.toHaveProperty('senseCheck');
    expect(fertile).not.toHaveProperty('example');
    expect(honest.def).toBe('An honest person tells the truth');
    // A word the dictionary does not have stays, flagged for the teacher.
    expect(missing).toMatchObject({ term: 'zorbleflax', def: '', pos: '', dictMissing: true });
    expect(missing).not.toHaveProperty('defSource');
    // No translations, word roots, emoji or images (all AI) even though the settings ask for them.
    item.data.forEach(entry => ['translations', 'etymology', 'roots', 'emoji', 'image'].forEach(key => expect(entry[key] || undefined).toBeUndefined()));
    expect(item.credits[0]).toMatchObject({ kind: 'dictionary', adapted: true, label: 'AlloFlow School Vocabulary (Wiktionary / WordNet, CC BY-SA 4.0)' });
    expect(item.credits[0].sources[0]).toMatchObject({ set: 'Simple English Wiktionary', license: 'CC BY-SA 4.0' });
    expect(item.config.builtInDictionary).toBe(true);
    expect(item.lessonPath.seed).toEqual(wordSeed(['Record', 'fertile', 'zorbleflax', 'honest']));
    expect(item.meta).toBe('4 teacher-selected terms - English - Built-in dictionary');
    expect(f.addToast).toHaveBeenCalledWith('3 of 4 words defined; 1 need a definition.', 'warning');
    expect(window.AlloVocabBank.ensureForWords).toHaveBeenCalledWith(['Record', 'fertile', 'zorbleflax', 'honest']);
  });

  it('says so when every word is defined', async () => {
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const f = fixture();
    await generate(f, { seed: wordSeed(['honest', 'fertile']) });
    expect(f.addToast).toHaveBeenCalledWith('Glossary made from the built-in dictionary: 2 words defined.', 'success');
  });

  it('chooses the sense from the topic when one decides it, and flags a sense nothing decided', async () => {
    window.AlloDictionary = realDictionary;
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const f = fixture();
    await generate(f, { seed: wordSeed(['plate'], { topic: 'slabs of rock in the outer shell of Earth' }) });
    expect(f.saved[0].data[0]).toMatchObject({ dictSense: { index: 1 }, def: 'One of the huge moving slabs of rock that make up the outer shell of Earth' });
    expect(f.saved[0].data[0]).not.toHaveProperty('senseCheck');
    const g = fixture();
    await generate(g, { seed: wordSeed(['plate']) });
    expect(g.saved[0].data[0]).toMatchObject({ dictSense: { index: 0 }, senseCheck: true });
    // A sense list with only one checked meaning is not flagged.
    window.AlloVocabBank = fakeBank({ plate: [FAKE_WORDS.plate[0], [...FAKE_WORDS.plate[1].slice(0, 3), '']] });
    const h = fixture();
    await generate(h, { seed: wordSeed(['plate']) });
    expect(h.saved[0].data[0]).not.toHaveProperty('senseCheck');
  });

  it('fails with a clear message, and saves nothing, when the dictionary cannot load', async () => {
    const f = fixture();
    const error = await generate(f, { seed: wordSeed(['cell']) });
    expect(error && error.message).toBe('The built-in dictionary could not be loaded, so no glossary was made. Check the connection and try again.');
    f.noAi();
    expect(f.saved).toHaveLength(0);
    expect(f.addToast).toHaveBeenCalledWith('The built-in dictionary could not be loaded, so no glossary was made. Check the connection and try again.', 'error', null);
  });

  it('with no AlloVocabBank script (not in the delivery manifest), reads the core shards through dictionary_loader.js', async () => {
    // The loader's own reader, fed the real core shard files (the app fetches them from the page or the CDN).
    const fetchFile = vi.fn(async url => ({ ok: true, json: async () => JSON.parse(readFileSync('packets_vocab/' + String(url).split('/').pop(), 'utf8')) }));
    expect(await realDictionary.loadOfflineBank({ base: 'packets_vocab/', fetch: fetchFile })).toBe(true);
    window.AlloDictionary = realDictionary;
    const f = fixture();
    await generate(f, { seed: wordSeed(['plate', 'mice', 'carbon dioxide']) });
    f.noAi();
    const [plate, mice, phrase] = f.saved[0].data;
    expect(plate).toMatchObject({ defSource: 'dictionary', dictSense: { word: 'plate', index: 0, list: 'loader' } });
    expect(plate.def).toBe(realDictionary.lookupOfflineBank('plate').meanings[0].definitions[0].definition);
    expect(mice.def, 'word forms still resolve').toMatch(/\w{3}/);
    expect(phrase, 'phrases need the full bank').toMatchObject({ def: '', dictMissing: true });
    expect(f.saved[0].credits[0].sources.map(source => source.set)).toEqual(['Simple English Wiktionary', 'English Wiktionary', 'Open English WordNet 2025']);
  });

  it('is English only', async () => {
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const f = fixture();
    const error = await generate(f, { seed: { ...wordSeed(['casa']), termLanguage: 'Spanish' } });
    expect(error && error.message).toBe('The built-in dictionary has English words only. Connect AI to make this glossary.');
    f.noAi();
    expect(f.saved).toHaveLength(0);
  });

  it('adds an offline picture when the glossary image helpers are present (no AI images, no alt drafting)', async () => {
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const matchWord = vi.fn(({ word }) => (word === 'honest' ? { svg: '<svg/>', set: 'mulberry', matchTier: 'exact', label: 'honest' }
      : word === 'fertile' ? { svg: '<svg/>', set: 'mulberry', matchTier: 'concept', label: 'farm' } : null));
    window.AlloModules.GlossaryOfflinePictures = { ensure: vi.fn(async () => ({ matchWord })), prepare: vi.fn(async () => 'data:image/png;base64,offline'),
      attribution: hit => ({ set: 'Mulberry Symbols', label: hit.label }) };
    const f = fixture();
    await generate(f, { seed: wordSeed(['honest', 'fertile']) });
    f.noAi();
    const [honest, fertile] = f.saved[0].data;
    expect(honest).toMatchObject({ image: 'data:image/png;base64,offline', imageSource: 'mulberry', imageAlt: '', imageAttribution: { set: 'Mulberry Symbols', label: 'honest' }, imageCreditBand: 48 });
    expect(fertile.image, 'a loose concept cue is not used').toBeUndefined();
  });
});

describe('real dictionary files', () => {
  it('defines school words, plural forms and phrases, and chooses senses from a passage sentence', () => {
    const terms = ['plate', 'cell', 'analyze', 'photosynthesis', 'democracy', 'mice', 'food chain', 'record', 'carbon dioxide'];
    const sentences = {};
    const built = dispatcher.buildDictionaryGlossaryEntries(terms, { bank: realBank, dictionary: realDictionary,
      posHints: { record: 'verb' }, contexts: term => [(sentences[term] = dispatcher.dictionarySentenceFor(term, PASSAGE)), PASSAGE] });
    const byTerm = Object.fromEntries(built.entries.map(entry => [entry.term, entry]));
    expect(built.entries.map(entry => entry.term)).toEqual(terms);
    for (const term of terms.slice(0, -1)) expect(byTerm[term].def, term + ' has a definition').toMatch(/\w{3}/);
    // "carbon dioxide" is not in the bank (2026-11-23): kept, flagged for the teacher.
    expect(built.missing).toBe(1);
    expect(byTerm['carbon dioxide']).toMatchObject({ def: '', dictMissing: true });
    expect(byTerm.mice.dictSense.word).toBe('mouse');
    expect(byTerm['food chain'].dictSense).toMatchObject({ word: 'food chain', index: 0, phrase: true });
    expect(sentences.plate).toBe('Earth\'s crust is broken into huge plates that move slowly over the mantle.');
    // "plate" in a plate-tectonics sentence: the sentence picks a later sense over sense 0 (a dish).
    const plateSenses = realBank.senses('plate');
    expect(plateSenses[0].def).not.toMatch(/rock|crust|earth/i);
    expect(byTerm.plate.dictSense.index).toBeGreaterThan(0);
    expect(byTerm.plate.def).toMatch(/rock|crust|earth/i);
    // The analysis said "record" is a verb here: the verb sense, not the first (noun) sense.
    expect(normalize(realBank.senses('record')[0].pos)).toBe('noun');
    expect(byTerm.record.pos).toBe('verb');
    built.entries.filter(entry => !entry.dictMissing).forEach(entry => { expect(entry.defSource).toBe('dictionary'); expect(entry.def).not.toMatch(/_{2,}/); });
  });
  const normalize = value => dispatcher.normalizeGlossaryPos(value);
});

// 1d: the Glossary panel's "built-in dictionary" with a passage: terms from the latest Source Analysis.
function analysisItem(data = {}) {
  const contract = window.AlloModules.InstructionalContext;
  return {
    id: 'plates-analysis', type: 'analysis', unitId: 'lesson', sourceFamilyId: 'plates-family', title: 'Plates reading',
    config: { language: 'English' },
    sourceSnapshot: contract.createSourceSnapshot(PASSAGE, { sourceArtifactId: 'plates-analysis', language: 'English' }),
    data: { analysisSourceVersion: 1, reportLanguage: 'English', sourceLanguage: 'English', originalText: PASSAGE, rawEnglishText: PASSAGE,
      readingLevel: { range: '5th Grade', explanation: '' }, concepts: [], accuracy: { rating: 'Not checked', reason: '' }, grammar: [], ...data },
  };
}
const passageDeps = (history, extra = {}) => ({ history, inputText: PASSAGE, selectedReadingSourceId: history.length ? 'plates-analysis' : '', ...extra });

describe('1d: a passage glossary from the built-in dictionary', () => {
  it('uses the analysis list with its tiers, capped per tier, the passage sentence and the part of speech, with no AI call', async () => {
    window.AlloDictionary = realDictionary;
    window.AlloVocabBank = realBank;
    const analysis = analysisItem({ vocabulary: ['plates', 'record', 'mantle', 'earthquake', 'cell'],
      vocabularyTiers: { tier2: ['record', 'cell'], tier3: ['plates', 'mantle', 'earthquake'] }, vocabularyPos: { record: 'verb', plates: 'noun' } });
    const f = fixture({ overrides: passageDeps([analysis], { glossaryTier2Count: 2, glossaryTier3Count: 2 }) });
    const error = await generate(f, { builtInDictionary: true });
    expect(error).toBeNull();
    f.noAi();
    const entries = f.saved[0].data;
    // Tier 3 capped at 2 in list order (earthquake dropped); Tier 2 kept both.
    expect(entries.map(entry => [entry.term, entry.tier])).toEqual([['plates', 'Domain-Specific'], ['record', 'Academic'], ['mantle', 'Domain-Specific'], ['cell', 'Academic']]);
    const plates = entries[0];
    expect(plates.contextSentence).toBe('Earth\'s crust is broken into huge plates that move slowly over the mantle.');
    expect(plates.def).toMatch(/rock|crust|earth/i);
    expect(entries[1]).toMatchObject({ pos: 'verb', contextSentence: 'Scientists record each earthquake to study how the plates move.' });
    expect(f.saved[0].meta).toBe('4 Terms - English - Built-in dictionary');
    expect(f.saved[0].credits[0].kind).toBe('dictionary');
    expect(f.saved[0]).not.toHaveProperty('lessonPath');
  });

  it('an old analysis with no part-of-speech map falls back to the passage match', async () => {
    window.AlloDictionary = realDictionary;
    window.AlloVocabBank = realBank;
    const f = fixture({ overrides: passageDeps([analysisItem({ vocabulary: ['plates'], vocabularyTiers: { tier2: [], tier3: ['plates'] } })]) });
    await generate(f, { builtInDictionary: true });
    f.noAi();
    expect(f.saved[0].data[0].def).toMatch(/rock|crust|earth/i);
  });

  it('falls back to the source vocabulary list, and says what to do when there is no list at all', async () => {
    window.AlloVocabBank = fakeBank(FAKE_WORDS);
    const f = fixture({ overrides: passageDeps([], { sourceVocabulary: 'honest, fertile; plate' }) });
    const first = await generate(f, { builtInDictionary: true });
    expect(first).toBeNull();
    f.noAi();
    expect(f.saved[0].data.map(entry => entry.term)).toEqual(['honest', 'fertile', 'plate']);
    const g = fixture({ overrides: passageDeps([]) });
    const error = await generate(g, { builtInDictionary: true });
    expect(error && error.message).toBe('Run Analyze Source first, or start from a word list.');
    g.noAi();
    expect(g.saved).toHaveLength(0);
  });

  it('without the option, the same passage still goes to AI', async () => {
    const f = fixture({ overrides: passageDeps([analysisItem({ vocabulary: ['plates'] })]) });
    await generate(f, {});
    expect(f.callGemini).toHaveBeenCalled();
  });
});

describe('2 and 1e: part of speech from the AI', () => {
  it('asks for "pos" in the word-list and native glossary prompts', () => {
    expect(dispatcher.buildWordListGlossaryPrompt({ kind: 'word-list', terms: ['cell'] })).toContain('"pos":"noun, verb, adjective or adverb (the sense defined)"');
    const native = dispatcher.buildNativeGlossaryPrompt({ languagePlan: { baseLanguage: 'English', translationLanguages: [] }, text: 'x' });
    expect(native).toContain('"tier":"Academic or Domain-Specific","pos":"noun, verb, adjective or adverb (the sense defined)"');
    expect(DISPATCHER.match(/"tier": "Academic" \| "Domain-Specific", "pos": "noun" \| "verb" \| "adjective" \| "adverb"/g)).toHaveLength(3);
  });
  it('keeps "pos" optional when parsing and normalizes it', () => {
    const seed = { kind: 'word-list', terms: ['cell', 'run', 'big'] };
    const rows = [{ id: 0, term: 'cell', def: 'A small unit of life', tier: 'Domain', pos: 'Noun' },
      { id: 1, term: 'run', def: 'To move fast', tier: 'Academic', pos: 'gerund??' }, { id: 2, term: 'big', def: 'Large', tier: 'Academic' }];
    const parsed = dispatcher.parseWordListGlossary(rows, seed);
    expect(parsed.map(entry => entry.pos)).toEqual(['noun', '', undefined]);
    const passage = dispatcher.normalizeGlossaryTerms([{ term: 'orbit', def: 'A path around', partOfSpeech: 'verb' }, { term: 'tide', def: 'Rise of the sea' }]);
    expect(passage[0].pos).toBe('verb');
    expect(passage[0]).not.toHaveProperty('partOfSpeech');
    expect(passage[1]).not.toHaveProperty('pos');
  });
  it('stores analysis vocabulary part of speech as a separate map; the vocabulary lists stay plain strings', () => {
    const res = dispatcher.normalizeAnalysisResult({ vocabulary: [{ term: 'record', tier: 'Academic', pos: 'Verb' },
      { term: 'mantle', tier: 'Domain-Specific', pos: 'thing' }, { term: 'plates', tier: 'Domain-Specific', partOfSpeech: 'n' }, 'erode', { term: '__proto__', pos: 'noun' }] });
    expect(res.vocabulary).toEqual(['record', 'mantle', 'plates', 'erode', '__proto__']);
    expect(res.vocabularyTiers.tier3).toEqual(['mantle', 'plates']);
    expect(res.vocabularyPos).toEqual({ record: 'verb', plates: 'noun' });
    expect(Object.getPrototypeOf(res.vocabularyPos)).toBe(Object.prototype);
    // A saved report keeps its map when normalized again; garbage maps are dropped.
    expect(dispatcher.normalizeAnalysisResult({ vocabulary: ['record'], vocabularyPos: { record: 'verb', other: 'noun' } }).vocabularyPos).toEqual({ record: 'verb' });
    expect(dispatcher.normalizeAnalysisResult({ vocabulary: ['record'], vocabularyPos: ['verb'] })).not.toHaveProperty('vocabularyPos');
    expect(dispatcher.normalizeAnalysisResult({ vocabulary: ['record'] })).not.toHaveProperty('vocabularyPos');
  });
  it('the analysis prompt asks for "pos" in the same call', async () => {
    const prompts = [];
    const f = fixture({ overrides: { history: [], inputText: PASSAGE, callGemini: vi.fn(async prompt => { prompts.push(prompt); return '{}'; }) } });
    try { await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps); } catch (_) {}
    expect(prompts[0]).toContain('"vocabulary": [{ "term": "...", "tier": "Academic", "pos": "noun" }]');
    expect(prompts[0]).toContain('"pos" with its part of speech in this passage (noun, verb, adjective or adverb)');
  });
});

// ---- the controls (compiled sidebar) ----
const mounts = [];
function mountView(Component, props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  const m = { el, root, props };
  m.render = patch => { m.props = { ...m.props, ...patch }; act(() => root.render(React.createElement(Component, m.props))); };
  m.render({});
  mounts.push(m);
  return m;
}
function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  act(() => { Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); });
}
const click = el => act(() => { el.click(); });

describe('1a: the word-list chooser option', () => {
  const chooserView = () => sidebarApi.SidebarPanels.SourceInputShellView;
  const shellProps = extra => ({ activeView: 'input', isGuidedToolVisible: () => true, isTeacherMode: true, expandedTools: ['source-input'], inputText: '',
    sourceRecord: { inUse: { text: '', version: 1, at: 1 }, versions: [], pending: null }, history: [], fileInputRef: { current: { click: vi.fn() } },
    searchOptions: [], t: key => key, handleGenerate: vi.fn(async () => ({})), setExpandedTools: vi.fn(), addToast: vi.fn(),
    ...Object.fromEntries(['BookOpen', 'CheckSquare', 'ChevronDown', 'ChevronUp', 'ClipboardList', 'FileDown', 'FileText', 'Globe', 'Layout', 'Link', 'RefreshCw', 'Sparkles', 'Upload', 'X'].map(n => [n, () => null])), ...extra });
  const openWordList = m => {
    const chooser = m.el.querySelector('[data-source-start-chooser]');
    click([...chooser.querySelectorAll('button')].find(b => b.textContent.trim() === 'From a word list'));
    setValue(chooser.querySelector('textarea'), 'cell\nplate');
    return chooser;
  };
  it('with AI: shown and off by default; the choice is kept for the session and sent as seed.dictionary', async () => {
    window.__alloResolveAiCapability = () => ({ text: true });
    const m = mountView(chooserView(), shellProps());
    const chooser = openWordList(m);
    const toggle = chooser.querySelector('[data-builtin-dictionary-toggle]');
    expect(toggle.checked).toBe(false);
    expect(toggle.disabled).toBe(false);
    expect(chooser.textContent).toContain('Use the built-in dictionary (no AI)');
    expect(chooser.textContent).toContain('English words only. Definitions come from an open dictionary (Wiktionary and WordNet).');
    await act(async () => { chooser.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(m.props.handleGenerate.mock.calls[0][4].seed).not.toHaveProperty('dictionary');
    click(toggle);
    expect(toggle.checked).toBe(true);
    await act(async () => { chooser.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    expect(m.props.handleGenerate.mock.calls[1][4].seed).toMatchObject({ kind: 'word-list', terms: ['cell', 'plate'], dictionary: true });
    // A second chooser in the same session starts with the teacher's choice.
    const n = mountView(chooserView(), shellProps());
    expect(openWordList(n).querySelector('[data-builtin-dictionary-toggle]').checked).toBe(true);
    click(n.el.querySelector('[data-builtin-dictionary-toggle]'));
    expect(toggle.checked, 'one shared choice').toBe(false);
  });
  it('is hidden for a non-English list (and with no AI says the dictionary is English only)', () => {
    window.__alloResolveAiCapability = () => ({ text: true });
    const m = mountView(chooserView(), shellProps());
    const chooser = openWordList(m);
    setValue(chooser.querySelector('[data-source-word-language]'), 'Spanish');
    expect(chooser.querySelector('[data-builtin-dictionary-option]')).toBeNull();
    window.__alloResolveAiCapability = () => ({ text: false });
    act(() => window.dispatchEvent(new Event('alloflow:ai-config-changed')));
    expect(chooser.querySelector('[data-builtin-dictionary-english-only]').textContent).toBe('The built-in dictionary has English words only.');
    expect([...chooser.querySelectorAll('button')].find(b => b.textContent.trim() === 'Create glossary').disabled).toBe(true);
    setValue(chooser.querySelector('[data-source-word-language]'), 'English');
    expect(chooser.querySelector('[data-builtin-dictionary-toggle]').checked).toBe(true);
    expect(chooser.querySelector('[data-builtin-dictionary-toggle]').disabled).toBe(true);
  });
});

describe('1c and 1d: the Glossary panel', () => {
  const panelProps = extra => ({ expandedTools: ['glossary'], InfoTooltip: () => null, t: key => key, handleGenerate: vi.fn(), hasSourceOrAnalysis: true,
    isProcessing: false, glossaryTier2Count: 2, glossaryTier3Count: 2, glossaryDefinitionLevel: 'Same as Source Text', includeEtymology: false,
    autoRemoveWords: false, glossaryCustomInstructions: '', leveledTextLanguage: 'English', selectedLanguages: [], nativeLanguageDefaultsVersion: 1,
    appLanguage: 'English', setAutoRemoveWords: noop, setGlossaryCustomInstructions: noop, setGlossaryDefinitionLevel: noop, setGlossaryTier2Count: noop,
    setGlossaryTier3Count: noop, setIncludeEtymology: noop, onStartFromWordList: vi.fn(), analyzedGlossaryCounts: { total: 4, tier2: 2, tier3: 2 }, ...extra });
  const panel = () => sidebarApi.GlossaryPanel;
  const generateButton = m => m.el.querySelector('[data-guided-primary]');
  const aiControls = m => [m.el.querySelector('[data-help-key="glossary_definition_level"] select'), m.el.querySelector('[data-help-key="glossary_etymology_info"] input'),
    m.el.querySelector('[data-help-key="glossary_auto_remove"] input'), m.el.querySelector('[data-help-key="glossary_custom_instructions"] button')];
  it('with AI: the option is off by default; on, it disables the AI-only settings with one note and generates with no AI', () => {
    window.__alloResolveAiCapability = () => ({ text: true });
    const m = mountView(panel(), panelProps());
    const toggle = m.el.querySelector('[data-builtin-dictionary-toggle]');
    expect(toggle.checked).toBe(false);
    expect(aiControls(m).map(el => el.disabled)).toEqual([false, false, false, false]);
    expect(m.el.querySelector('[data-builtin-dictionary-note]')).toBeNull();
    click(toggle);
    expect(aiControls(m).map(el => el.disabled)).toEqual([true, true, true, true]);
    expect(m.el.querySelectorAll('[data-builtin-dictionary-note]')).toHaveLength(1);
    expect(m.el.querySelector('[data-help-key="glossary_tier2_count"] input').disabled, 'tier counts still cap the list').toBe(false);
    click(generateButton(m));
    expect(m.props.handleGenerate).toHaveBeenLastCalledWith('glossary', null, false, null, { builtInDictionary: true });
    click(toggle);
    expect(aiControls(m).map(el => el.disabled), 'off restores every control').toEqual([false, false, false, false]);
    click(generateButton(m));
    expect(m.props.handleGenerate).toHaveBeenLastCalledWith('glossary');
  });
  it('with no AI: locked on, Generate works from the analysis list; with nothing to use it is disabled with a hint and the word-list link', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const m = mountView(panel(), panelProps());
    const toggle = m.el.querySelector('[data-builtin-dictionary-toggle]');
    expect([toggle.checked, toggle.disabled]).toEqual([true, true]);
    expect(m.el.querySelector('[data-builtin-dictionary-locked-note]').textContent).toContain('No AI is connected');
    expect(generateButton(m).disabled).toBe(false);
    m.render({ analyzedGlossaryCounts: null });
    expect(generateButton(m).disabled).toBe(true);
    expect(m.el.querySelector('[data-builtin-dictionary-needs-terms]').textContent).toBe('Start from a word list to use the built-in dictionary.');
    const link = m.el.querySelector('[data-glossary-word-list-start]');
    expect(link.textContent).toBe('Start from a word list (no AI)');
    click(link);
    expect(m.props.onStartFromWordList).toHaveBeenCalledTimes(1);
    m.render({ sourceVocabulary: 'plate, cell' });
    expect(generateButton(m).disabled, 'the source vocabulary list is enough').toBe(false);
  });
  it('with AI and no list: hint names Analyze Source; English only', () => {
    window.__alloResolveAiCapability = () => ({ text: true });
    const m = mountView(panel(), panelProps({ analyzedGlossaryCounts: null }));
    click(m.el.querySelector('[data-builtin-dictionary-toggle]'));
    expect(m.el.querySelector('[data-builtin-dictionary-needs-terms]').textContent).toBe('Run Analyze Source first, or start from a word list.');
    expect(m.el.querySelector('[data-glossary-word-list-start]')).toBeTruthy();
    click(m.el.querySelector('[data-builtin-dictionary-toggle]'));
    m.render({ leveledTextLanguage: 'Spanish' });
    expect(m.el.querySelector('[data-builtin-dictionary-option]')).toBeNull();
    expect(generateButton(m).disabled).toBe(false);
  });
});
