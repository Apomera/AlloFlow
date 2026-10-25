import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Lane D1 (2026-10-25): generation prompts and parse guards in the dispatcher.
// FIX1025_D1_DISPATCH swaps in a scratch copy so the suite can be mutation-checked.
const DISPATCH_PATH = process.env.FIX1025_D1_DISPATCH || 'generate_dispatcher_source.jsx';
let D;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  new Function(readFileSync(DISPATCH_PATH, 'utf8'))();
  D = window.AlloModules.GenDispatcher;
});
const priorImages = window.AlloImageGeneration;
afterEach(() => { window.AlloImageGeneration = priorImages; vi.restoreAllMocks(); });

const noop = () => {};
const SOURCE = 'The Moon orbits Earth, and its gravitational pull creates tides. Tides rise and fall twice a day along the coast.';
const reading = { id: 'moon', title: 'Moon reading', type: 'analysis', unitId: 'lesson', sourceFamilyId: 'moon',
  data: { originalText: SOURCE }, instructionalText: { role: 'primary', form: 'original', designationSource: 'educator' } };

function fixture(overrides = {}) {
  const callGemini = vi.fn();
  const setHistory = vi.fn();
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [reading], inputText: SOURCE, activeUnitId: 'lesson', selectedReadingSourceId: 'moon',
    differentiationRange: 'None', leveledTextLanguage: 'English', selectedLanguages: [], studentInterests: [],
    guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [], standardsPromptString: '',
    sourceTopic: 'Tides', currentUiLanguage: 'English', generatedContent: null,
    audioRef: { current: null }, alloBotRef: { current: null }, GUIDED_STEPS: [], checkAccuracyWithSearch: false,
    callGemini, setHistory, addToast: vi.fn(), setIsProcessing: vi.fn(), setGeneratedContent: vi.fn(),
    extractSourceTextForProcessing: text => ({ text, englishBlock: '', isBilingual: false }),
    cleanJson: s => String(s).replace(/```json|```/g, '').trim(), getGroupDifferentiationContext: () => '', getDefaultTitle: type => type,
    t: key => (String(key).startsWith('errors.') ? undefined : key), resolveTranslationPolicy: () => ({ enabled: false, target: 'English' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', glossaryTier2Count: 2, glossaryTier3Count: 2,
    glossaryDefinitionLevel: 'Same as Global Level', includeEtymology: false, useEmojis: false, autoRemoveWords: false, dokLevel: '',
    chunkText: text => [text], countWords: text => text.trim().split(/\s+/).length,
    textFormat: 'Standard Text', leveledTextLength: 'Same as Source', keepCitations: false,
    ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop });
  return { deps, callGemini, setHistory };
}
const run = (f, type, config = {}) => D.handleGenerate(type, null, false, null, { rethrowErrors: true, ...config }, true, f.deps);
const imagesOff = () => { window.AlloImageGeneration = { isEnabled: () => false }; };
const savedItems = f => f.setHistory.mock.calls.map(([update]) => typeof update === 'function' ? update([]) : update).flat();

describe('1. glossary: in-text sense, context sentence, terms from the source only', () => {
  it('matches words with simple inflections and word boundaries', () => {
    expect(D.glossaryTermInText('Orbit', SOURCE)).toBe(true); // "orbits"
    expect(D.glossaryTermInText('tide', SOURCE)).toBe(true); // "tides"
    expect(D.glossaryTermInText('gravitational pull', SOURCE)).toBe(true);
    expect(D.glossaryTermInText('Volcano', SOURCE)).toBe(false);
    expect(D.glossaryTermInText('Moo', SOURCE)).toBe(false); // not a prefix match
    expect(D.glossaryTermInText('rising', 'The water rises.')).toBe(true);
    expect(D.glossaryTermInText('光合作用', '植物通过光合作用制造食物。')).toBe(true);
  });
  it('drops terms absent from the source, dedupes, and keeps only a quoted context sentence', () => {
    const out = D.normalizeGlossaryTerms([
      { term: 'Tides', def: 'Rise and fall of the sea.', tier: 'Tier 3', contextSentence: 'Tides rise and fall twice a day along the coast.' },
      { term: 'tides', def: 'Duplicate.', tier: 'Tier 3' },
      { term: 'Orbit', def: 'Travel around.', contextSentence: 'Orbits are invented here.' },
      { term: 'Volcano', def: 'Not in this text.' },
    ], SOURCE);
    expect(out.map(item => item.term)).toEqual(['Tides', 'Orbit']);
    expect(out[0].contextSentence).toBe('Tides rise and fall twice a day along the coast.');
    expect(out[1]).not.toHaveProperty('contextSentence');
  });
  it('matches a native-language term through sourceTerm, and fails open when no term matches at all', () => {
    expect(D.normalizeGlossaryTerms([{ term: 'Marea', sourceTerm: 'tides', def: 'x' }, { term: 'Volcán', sourceTerm: 'volcano', def: 'y' }], SOURCE)
      .map(item => item.term)).toEqual(['Marea']);
    expect(D.normalizeGlossaryTerms([{ term: 'Alpha', def: 'a' }, { term: 'Beta', def: 'b' }], SOURCE).map(item => item.term)).toEqual(['Alpha', 'Beta']);
    expect(D.normalizeGlossaryTerms([{ term: 'Alpha', def: 'a' }]).map(item => item.term)).toEqual(['Alpha']);
  });
  it('the cloud branch asks for the in-text sense and a context sentence, and filters the reply against the source', async () => {
    imagesOff();
    const f = fixture();
    f.callGemini.mockResolvedValue(JSON.stringify([
      { term: 'Tides', def: 'The regular rise and fall of the sea.', tier: 'Domain-Specific', contextSentence: 'Tides rise and fall twice a day along the coast.' },
      { term: 'Photosynthesis', def: 'How plants make food.', tier: 'Domain-Specific' },
      { term: 'Tides', def: 'Again.', tier: 'Domain-Specific' },
    ]));
    const resource = await run(f, 'glossary');
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt.includes('IN THIS TEXT'), 'in-text sense').toBe(true);
    expect(prompt.includes('contextSentence'), 'context sentence').toBe(true);
    expect(prompt.includes('Find exactly'), 'no exact count').toBe(false);
    expect(resource.data.map(item => item.term)).toEqual(['Tides']);
    expect(resource.data[0].contextSentence).toBe('Tides rise and fall twice a day along the coast.');
  });
  it('retries a rate-limited icon instead of giving up on the first failure', async () => {
    window.AlloImageGeneration = { isEnabled: () => true };
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn) => { fn(); return 0; });
    const callImagen = vi.fn().mockRejectedValueOnce(new Error('HTTP 429: rate limit')).mockResolvedValue('data:image/png;base64,QUJD');
    const f = fixture({ callImagen });
    f.callGemini.mockResolvedValue(JSON.stringify([{ term: 'Coast', def: 'Land beside the sea, retry case.', tier: 'Academic' }]));
    const resource = await run(f, 'glossary');
    expect(callImagen).toHaveBeenCalledTimes(2);
    expect(resource.data[0].image).toBe('data:image/png;base64,QUJD');
  });
});

describe('2-3. adapted text keeps lesson glossary terms; news quotes come only from the source', () => {
  const glossary = (id, unitId, family, terms) => ({ id, type: 'glossary', unitId, sourceFamilyId: family, data: terms.map(term => ({ term, def: term + ' meaning' })) });
  it('requires the related glossary words that occur in the passage, with an in-sentence gloss', async () => {
    const f = fixture({ history: [reading, glossary('g-other', 'other', 'plants', ['Chlorophyll']), glossary('g-moon', 'lesson', 'moon', ['Tides', 'Orbit', 'Volcano'])] });
    f.callGemini.mockResolvedValue('The Moon goes around Earth. It pulls on the sea and makes tides.');
    await run(f, 'simplified').catch(noop);
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt.includes('LESSON GLOSSARY (REQUIRED)'), 'glossary rule present').toBe(true);
    const rule = prompt.slice(prompt.indexOf('LESSON GLOSSARY'), prompt.indexOf('\n', prompt.indexOf('LESSON GLOSSARY')));
    expect(rule).toContain('"Tides"');
    expect(rule).toContain('"Orbit"');
    expect(rule).not.toContain('Volcano');
    expect(rule).not.toContain('Chlorophyll');
    expect(rule).toContain('same sentence');
    expect(prompt.includes('Every Tier 3 term you keep'), 'no license to drop terms').toBe(false);
  });
  it('adds nothing when the lesson has no glossary', async () => {
    const f = fixture();
    f.callGemini.mockResolvedValue('Adapted.');
    await run(f, 'simplified').catch(noop);
    expect(f.callGemini.mock.calls[0][0].includes('LESSON GLOSSARY')).toBe(false);
  });
  it('News Report forbids invented or misattributed quotations', async () => {
    const f = fixture({ textFormat: 'News Report' });
    f.callGemini.mockResolvedValue('Adapted.');
    await run(f, 'simplified').catch(noop);
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt.includes('Only quote words that appear in the source text'), 'source-only quotes').toBe(true);
    expect(prompt.includes('Never invent a quotation'), 'no invented quotes').toBe(true);
    expect(prompt.includes('Include "quotes" from relevant figures'), 'old rule gone').toBe(false);
  });
});

describe('4. FAQ targets misconceptions grounded in the text', () => {
  it('asks for likely misconceptions and confusing terms, with answers from the text', async () => {
    const f = fixture();
    f.callGemini.mockResolvedValue(JSON.stringify([{ question: 'Does the Moon cause tides?', answer: 'Yes, its pull creates tides.' }]));
    await run(f, 'faq');
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain('likely misconceptions');
    expect(prompt).toContain('Do not present outside facts as coming from the text');
  });
});

describe('5-6. KWL examples and non-narrative Story Maps', () => {
  it('KWL Know/Want items are flagged teacher examples and Learned is left empty', async () => {
    const f = fixture({ outlineType: 'KWL Chart' });
    f.callGemini.mockResolvedValue(JSON.stringify({ main: 'Tides', branches: [
      { title: 'Know', items: ['I know the sea moves.'] }, { title: 'Want to Know', items: ['Why twice a day?'] }, { title: 'Learned', items: ['The Moon pulls water.'] }] }));
    const resource = await run(f, 'outline');
    expect(f.callGemini.mock.calls[0][0]).toContain('TEACHER EXAMPLES');
    expect(resource.data.branches.map(b => b.teacherExample === true)).toEqual([true, true, false]);
    expect(resource.data.branches[2].items).toEqual([]);
    expect(resource.data.kwlTeacherExamples).toBe(true);
  });
  it.each([
    ['the notNarrative signal', { notNarrative: true, branches: [] }],
    ['a single "not applicable" branch', { main: 'x', branches: [{ title: 'Not applicable', items: ['This text is non-narrative.'] }] }],
  ])('a Story Map for %s throws a retryable error and saves nothing', async (_, reply) => {
    const f = fixture({ outlineType: 'Story Map' });
    f.callGemini.mockResolvedValue(JSON.stringify(reply));
    const error = await run(f, 'outline').catch(e => e);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toMatch(/does not read as a story/);
    expect(error.emptyGeneration).toBe(true);
    expect(savedItems(f)).toEqual([]);
    loadAlloModule('utils_pure_source.jsx');
    expect(window.AlloModules.UtilsPure.classifyProviderError(error).retryable).toBe(true);
  });
  it('the Story Map message goes through the translation helper', async () => {
    const f = fixture({ outlineType: 'Story Map', t: key => key === 'errors.story_map_not_narrative' ? 'Ce texte ne raconte pas une histoire.' : key });
    f.callGemini.mockResolvedValue(JSON.stringify({ notNarrative: true, branches: [] }));
    expect((await run(f, 'outline').catch(e => e)).message).toBe('Ce texte ne raconte pas une histoire.');
  });
});

describe('7. sentence frames: tiers and a word bank, backward compatible', () => {
  it('asks for tiered starters plus a source word bank and keeps only valid, in-source extras', async () => {
    const f = fixture({ frameType: 'Sentence Starters' });
    f.callGemini.mockResolvedValue(JSON.stringify({ mode: 'list', items: [
      { text: 'Tides are ___.', tier: 'beginning' }, { text: 'One reason tides happen is ___.', tier: 'Expanding' }, { text: 'The evidence suggests', tier: 'expert' }],
      wordBank: ['tides', 'gravitational pull', 'volcano', 'tides'], rubric: '| a |' }));
    const resource = await run(f, 'sentence-frames');
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain('"tier": "emerging"');
    expect(prompt).toContain('wordBank');
    expect(resource.data.items.map(item => item.tier)).toEqual(['emerging', 'expanding', undefined]);
    expect(resource.data.items.map(item => item.text)).toEqual(['Tides are ___.', 'One reason tides happen is ___.', 'The evidence suggests']);
    expect(resource.data.wordBank).toEqual(['tides', 'gravitational pull']);
  });
  it('old scaffolds without the new fields still normalize unchanged', () => {
    expect(D.normalizeScaffoldExtras({ mode: 'list', items: [{ text: 'A' }] }, SOURCE)).toEqual({ mode: 'list', items: [{ text: 'A' }] });
  });
});

describe('8-9. larger source budgets and no silent empty templates', () => {
  const LONG = SOURCE + ' ' + 'Filler sentence about the shore. '.repeat(300) + 'MARKER_DEEP_IN_SOURCE.';
  const longFixture = (extra) => fixture({ history: [{ ...reading, data: { originalText: LONG } }], inputText: LONG, ...extra });
  it('Guided Notes with no blanks throws instead of saving an empty template', async () => {
    const f = fixture();
    f.callGemini.mockResolvedValue('Sorry, I cannot help with that.');
    const error = await run(f, 'note-taking', { templateType: 'guided-notes' }).catch(e => e);
    expect(error.message).toMatch(/no Guided Notes blanks/);
    expect(savedItems(f)).toEqual([]);
  });
  it('Cornell cues still save, and note-taking sees source text past the old 3,000-character cut', async () => {
    const f = longFixture();
    f.callGemini.mockResolvedValue(JSON.stringify({ title: 'Tides', cues: ['What causes tides?'] }));
    const resource = await run(f, 'note-taking', { templateType: 'cornell-notes' });
    expect(resource.data.cues.map(c => c.text)).toEqual(['What causes tides?']);
    expect(f.callGemini.mock.calls[0][0].includes('MARKER_DEEP_IN_SOURCE'), 'deep source reached the prompt').toBe(true);
  });
  it('an anchor chart with no sections throws; a real one sees the deep source', async () => {
    const empty = fixture();
    empty.callGemini.mockResolvedValue('not json');
    const error = await run(empty, 'anchor-chart').catch(e => e);
    expect(error.message).toMatch(/no sections/);
    expect(savedItems(empty)).toEqual([]);
    const f = longFixture();
    f.callGemini.mockResolvedValue(JSON.stringify({ chartType: 'reference', title: 'TIDES', sections: [{ label: 'WHY', bullets: ['Moon pulls water'], iconPrompt: 'moon' }] }));
    const resource = await run(f, 'anchor-chart');
    expect(resource.data.sections).toHaveLength(1);
    expect(f.callGemini.mock.calls[0][0].includes('MARKER_DEEP_IN_SOURCE'), 'deep source reached the prompt').toBe(true);
  });
  it('the multi-panel plan gets the first-pass reading and more than the opening 500 characters', async () => {
    imagesOff();
    const generateVisualPlan = vi.fn(async () => null);
    const f = longFixture({ generateVisualPlan, visualLayoutMode: 'auto' });
    f.callGemini.mockResolvedValue(JSON.stringify({ visualElements: 'moon, ocean, arrows', altText: 'The Moon pulling the ocean.' }));
    await run(f, 'image').catch(noop);
    const concept = generateVisualPlan.mock.calls[0][0];
    expect(concept).toContain('Key visual elements: moon, ocean, arrows');
    expect(concept.length).toBeGreaterThan(2000);
  });
  it('memory aid uses the 12,000-character cloud excerpt budget (source pin)', () => {
    const src = readFileSync(DISPATCH_PATH, 'utf8');
    expect(src.includes("(textToProcess || '').substring(0, 12000);\n          if (configOverride.memoryAidPreviewSource"), 'memory aid budget').toBe(true);
    expect(src.includes('sanitizeMemoryAidPromptData(memorySourceText, 12000, true)'), 'sanitizer keeps it').toBe(true);
    expect(src.includes('[VisualDebug]'), 'debug logs removed').toBe(false);
  });
});

describe('10. simulation steps render as strings', () => {
  it('normalizes objects, wrappers and junk to plain strings', () => {
    expect(D.normalizeSimulationSteps([{ step: 1, prompt: 'Build A' }, { text: 'Add B' }, { content: 'Style C' }, 5, null, '  Done  '])).toEqual(['Build A', 'Add B', 'Style C', 'Done']);
    expect(D.normalizeSimulationSteps({ steps: ['x', { prompt: 'y' }] })).toEqual(['x', 'y']);
  });
  it('the gemini-bridge branch saves strings and throws on an empty guide', async () => {
    const f = fixture({ bridgeStepCount: 2, bridgeSimType: 'react' });
    f.callGemini.mockResolvedValue(JSON.stringify([{ step: 1, prompt: 'Create the app.' }, { step: 2, prompt: 'Add a tide chart.' }]));
    const resource = await run(f, 'gemini-bridge');
    expect(resource.data).toEqual(['Create the app.', 'Add a tide chart.']);
    const g = fixture({ bridgeStepCount: 2, bridgeSimType: 'react' });
    g.callGemini.mockResolvedValue(JSON.stringify({ note: 'nothing' }));
    expect((await run(g, 'gemini-bridge').catch(e => e)).message).toMatch(/no prompt steps/);
  });
});

describe('11-12. quiz DOK per item and the fill-blank alternatives wording', () => {
  it('clamps dok to 1-4 and drops invalid values', () => {
    expect([1, '2', 'DOK 3', 7, 0, 'x', null].map(D.clampDok)).toEqual([1, 2, 3, 4, null, null, null]);
  });
  it('the quiz prompt asks for dok and the saved items carry validated integers', async () => {
    const f = fixture();
    f.callGemini.mockResolvedValue(JSON.stringify({ questions: [
      { type: 'mcq', question: 'What pulls the sea?', options: ['Moon', 'Sun', 'Wind', 'Fish'], correctAnswer: 'Moon', conceptLabel: 'tides', dok: '2' },
      { type: 'mcq', question: 'How often?', options: ['Twice', 'Once', 'Never', 'Hourly'], correctAnswer: 'Twice', conceptLabel: 'tides', dok: 'high' }], reflections: [] }));
    const resource = await run(f, 'quiz', { quizMcqCount: 2 });
    expect(f.callGemini.mock.calls[0][0]).toContain("Webb's Depth of Knowledge (1 = recall");
    expect(resource.data.questions[0].dok).toBe(2);
    expect(resource.data.questions[1]).not.toHaveProperty('dok');
  });
  it('fill-blank alternatives say misspellings go to the teacher (source pin)', () => {
    const src = readFileSync(DISPATCH_PATH, 'utf8');
    expect(src.includes('acceptableAlternatives: synonyms or accepted spellings that should earn full credit; other misspellings are sent to the teacher for review.')).toBe(true);
    expect(src.includes('typos NOT included')).toBe(false);
  });
});
