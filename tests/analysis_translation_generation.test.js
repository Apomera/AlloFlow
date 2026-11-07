import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let dispatcher;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
});
const noop = () => {};
const source = '  **Earth**\r\nEarth completes one orbit around the Sun in approximately 365.25 days. 🌎\r\n';
function report() {
  return {
    readingLevel: { range: '7th-9th Grade', explanation: 'El texto usa vocabulario científico.' },
    concepts: ['órbita'], accuracy: { rating: 'High', reason: 'La afirmación es correcta.', discrepancies: [], verifiedFacts: ['Un año dura unos 365.25 días [1].'] },
    grammar: ['El ejemplo "Earth completes" concuerda.'], sourceLanguage: 'English',
    reportTranslations: { English: {
      readingLevel: { range: 'INVENTED RANGE', explanation: 'The source uses scientific vocabulary.' }, concepts: ['orbit'],
      accuracy: { rating: 'INVENTED RATING', reason: 'The statement is correct.', discrepancies: [], verifiedFacts: ['A year lasts about 365.25 days [1].'] },
      grammar: ['The example "Earth completes" agrees.'],
    } },
    sourceTranslations: { English: source },
    originalText: 'MODEL MUST NOT REPLACE SOURCE', rawEnglishText: 'MODEL MUST NOT REPLACE SOURCE', translatedText: 'LEGACY MODEL OUTPUT', localStats: { words: 9999 },
  };
}
function fixture(result = report(), overrides = {}) {
  const callGemini = vi.fn(async () => JSON.stringify(result));
  const calculateReadability = vi.fn(() => ({ words: 17, score: '8.0' }));
  const deps = new Proxy({
    gradeLevel: '8th Grade', history: [], inputText: source, differentiationRange: 'None', leveledTextLanguage: 'Spanish',
    selectedLanguages: [], studentInterests: [], guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [],
    standardsPromptString: '', sourceTopic: 'Earth orbit', currentUiLanguage: 'English', appLanguage: 'English', generatedContent: null,
    audioRef: { current: null }, alloBotRef: { current: null }, checkAccuracyWithSearch: true, GUIDED_STEPS: [],
    callGemini, calculateReadability, setGeneratedContent: vi.fn(), setHistory: vi.fn(), cleanJson: String,
    performDeepVerification: vi.fn(async () => ({ text: 'The claim is supported by NASA [1].', sources: [{ uri: 'https://science.nasa.gov/earth/facts/', title: 'Earth facts' }] })),
    getGroupDifferentiationContext: () => '', filterEducationalSources: chunks => chunks,
    extractSourceTextForProcessing: text => ({ text, englishBlock: 'WRONG EXTRACTED SOURCE', isBilingual: true }),
    getDefaultTitle: () => 'Source Analysis', t: key => key, resolveTranslationPolicy: () => ({ enabled: true, target: 'English', mode: 'auto' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop });
  return { deps, callGemini, calculateReadability };
}

describe('source-bound multilingual analysis generation', () => {
  it('writes the findings in the app language (not the output language) and keeps translations out of the check call', async () => {
    const f = fixture(report(), { appLanguage: 'French', currentUiLanguage: 'French' });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.originalText).toBe(source);
    expect(item.data.rawEnglishText).toBe(source);
    expect(item.sourceSnapshot.text).toBe(source);
    expect(item.sourceSnapshot.language).toBe('English');
    expect(item.instructionalText.complexity.language).toBe('English');
    expect(item.data.reportLanguage).toBe('French');
    expect(item.data.translatedText).toBeUndefined();
    expect(item.data.reportTranslations).toEqual({});
    expect(item.data.sourceTranslations).toEqual({});
    expect(item.data.localStats).toEqual({ words: 17, score: '8.0' });
    expect(f.calculateReadability).toHaveBeenCalledWith(source);
    expect(item.data.readingLevel.range).toBe('7th-9th Grade');
    expect(item.data.accuracy.rating).toBe('High');
    expect(item.data.accuracy.verifiedFacts[0]).toContain('https://science.nasa.gov/earth/facts/');
    expect(f.callGemini).toHaveBeenCalledTimes(1);
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain('grammar notes) in French.');
    expect(prompt).not.toContain('in Spanish');
    expect(prompt).toContain('accuracy.rating as exactly one word: High, Moderate or Low');
    expect(prompt).not.toContain('reportTranslations');
    expect(prompt).not.toContain('sourceTranslations');
    expect(prompt).not.toContain('BILINGUAL ARRAYS REQUIREMENT');
  });

  it('attaches only retrieved, eligible references to each claim and keeps the rest for review', async () => {
    const raw = report();
    const urls = ['https://alpha.example/facts', 'https://blocked.example/page', 'https://beta.example/research'];
    raw.accuracy.verifiedFacts = ['Two sources [Source 1, 3].', 'Still needs evidence.', 'Wrong ID [99].', 'Filtered [2].', 'Wrong destination [1](https://forged.example).'];
    const f = fixture(raw, {
      performDeepVerification: async () => ({ text: 'Both sources support the finding [1, 3].', sources: urls.map((uri, i) => ({ uri, title: 'Source ' + (i + 1) })) }),
      filterEducationalSources: chunks => chunks.filter(chunk => chunk.web.uri !== urls[1]),
    });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    const a = item.data.accuracy;
    expect(a.verifiedFacts).toHaveLength(1);
    expect(a.unsourcedFacts).toEqual(['Still needs evidence.', 'Wrong ID.', 'Filtered.', 'Wrong destination.']);
    expect(item.data.reportTranslations).toEqual({});
    const rows = dispatcher.getAnalysisFactRows(a, {});
    expect(rows[0].text).toBe('Two sources.');
    expect(rows[0].sources.map(source => [source.title, source.url])).toEqual([['Source 1', urls[0]], ['Source 3', urls[2]]]);
    expect(rows.slice(1).every(row => !row.sources.length)).toBe(true);
    expect(a.citations).not.toContain(urls[1]);
    expect(a.citations).not.toContain('forged');
  });
  it.each(['consulted', 'unavailable', 'off'])('keeps an uncited statement out of verified facts when search is %s', async mode => {
    const raw = report();
    raw.accuracy.verifiedFacts = ['A claim without a citation.', 'The draft guessed a source [1].'];
    raw.accuracy.citations = '1. [Invented source](https://fake.example)';
    raw.accuracy.sourceReferences = [{ number: 1, title: 'Invented source', url: 'https://fake.example' }];
    raw.reportTranslations.English.accuracy.verifiedFacts = ['An uncited claim.', 'Guessed a source [1].'];
    const f = fixture(raw, { checkAccuracyWithSearch: mode !== 'off', performDeepVerification: async () =>
      mode === 'consulted' ? { text: 'Sources consulted as background.', sources: [{ uri: 'https://background.example/page', title: 'Background' }] } : { text: '', sources: [] } });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    const a = item.data.accuracy;
    expect(a.verifiedFacts).toEqual([]);
    expect(a.unsourcedFacts).toEqual(['A claim without a citation.', 'The draft guessed a source.']);
    expect(JSON.stringify(a)).not.toContain('fake.example');
    if (mode === 'consulted') expect(a.citations).toContain('background.example');
  });
  it('does not extract or overwrite an already bilingual original during analysis', async () => {
    const bilingual = 'El planeta gira.\r\n--- ENGLISH TRANSLATION ---\r\nThe planet turns.\r\n';
    const f = fixture(report(), { inputText: bilingual });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.originalText).toBe(bilingual);
    expect(item.sourceSnapshot.text).toBe(bilingual);
    expect(f.calculateReadability).toHaveBeenCalledWith(bilingual);
  });

  it('drops unsafe translated claim arrays without corrupting the usable original report', async () => {
    const raw = report();
    raw.reportTranslations.English.accuracy.verifiedFacts = [{ fake: 'not a translated string' }];
    const f = fixture(raw);
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.originalText).toBe(source);
    expect(item.data.reportTranslations).toEqual({});
    expect(item.data.accuracy.verifiedFacts).toHaveLength(1);
  });

  it('does not present translated claims as verified when search could not supply sources', async () => {
    const f = fixture(report(), { performDeepVerification: async () => ({ text: 'No attributable search sources.', sources: [] }) });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.accuracy.rating).toBe('Not web-verified');
    expect(item.data.accuracy.verifiedFacts).toEqual([]);
    expect(item.data.reportTranslations).toEqual({});
  });

  it('keeps a distinct source translation optional and never promotes it to originalText', () => {
    const raw = report();
    raw.sourceLanguage = 'Spanish';
    raw.sourceTranslations.English = 'The planet turns.';
    const result = dispatcher.createAnalysisSourceContent(dispatcher.normalizeAnalysisResult(raw), raw, {
      sourceText: 'El planeta gira.', reportLanguage: 'Spanish', translationLanguage: 'English', translationEnabled: true,
    });
    expect(result.originalText).toBe('El planeta gira.');
    expect(result.sourceTranslations.English).toBe('The planet turns.');
  });

  it('keeps the output-language companion when the translation target is already the source language', () => {
    const raw = report();
    raw.sourceTranslations.Spanish = 'La Tierra completa una órbita alrededor del Sol.';
    const result = dispatcher.createAnalysisSourceContent(dispatcher.normalizeAnalysisResult(raw), raw, {
      sourceText: source, reportLanguage: 'Spanish', translationLanguage: 'English', translationEnabled: true,
    });
    expect(result.sourceTranslations).toEqual({ Spanish: raw.sourceTranslations.Spanish });
    expect(result.originalText).toBe(source);
  });

  it('omits a companion synthesized from a source with private reference material', () => {
    const raw = report();
    raw.sourceTranslations.Spanish = 'Texto público con referencias privadas traducidas.';
    const result = dispatcher.createAnalysisSourceContent(dispatcher.normalizeAnalysisResult(raw), raw, {
      sourceText: source, reportLanguage: 'Spanish', translationLanguage: 'English', translationEnabled: true, includeSourceTranslations: false,
    });
    expect(result.sourceTranslations).toEqual({});
    expect(result.reportTranslations.English).toBeDefined();
    expect(result.originalText).toBe(source);
  });

  it('suppresses same-language and equivalent-text companions, including when translations are off', () => {
    const raw = report(), base = dispatcher.normalizeAnalysisResult(raw);
    for (const [enabled, sourceLanguage, text] of [[true, 'en', 'A rewrite'], [true, 'en_US', 'A rewrite'], [true, 'Spanish', source.replace(/\s+/g, ' ')], [false, 'Spanish', 'A translation']]) {
      const result = dispatcher.createAnalysisSourceContent(base, { ...raw, sourceLanguage, sourceTranslations: { English: text } }, {
        sourceText: source, reportLanguage: 'English', translationLanguage: 'English', translationEnabled: enabled,
      });
      expect(result.reportTranslations).toEqual({});
      expect(result.sourceTranslations).toEqual({});
      expect(result.originalText).toBe(source);
    }
  });

  it('rejects translations which change quoted source examples, citations, or omit explanations', () => {
    for (const modify of [
      raw => { raw.reportTranslations.English.grammar = ['The example "Earth complete" agrees.']; },
      raw => { raw.reportTranslations.English.accuracy.verifiedFacts = ['A year lasts about 365.25 days [2].']; },
      raw => { raw.reportTranslations.English.readingLevel.explanation = ' '; },
    ]) {
      const raw = report();
      modify(raw);
      const result = dispatcher.createAnalysisSourceContent(dispatcher.normalizeAnalysisResult(raw), raw, {
        sourceText: source, reportLanguage: 'Spanish', translationLanguage: 'English', translationEnabled: true,
      });
      expect(result.reportTranslations).toEqual({});
      expect(result.originalText).toBe(source);
    }
  });
});

// Students read in the output language: the check adds that passage in a second,
// separate request through the same translator the check's language buttons use.
describe('output-language passage added after the check', () => {
  const passage = 'La Tierra completa una órbita alrededor del Sol en unos 365,25 días.';
  const companionReply = prompt => /Translate the source passage into/.test(prompt) ? JSON.stringify({ sourceTranslation: passage }) : JSON.stringify(report());
  beforeAll(async () => {
    const { createRequire } = await import('node:module');
    window.React = window.React || createRequire(import.meta.url)(process.cwd() + '/desktop/web-app/node_modules/react');
    loadAlloModule('phase_k_helpers_module.js');
  });

  it('adds the passage in the output language without touching the findings or their language', async () => {
    const f = fixture(report(), { addToast: vi.fn() });
    f.callGemini.mockImplementation(async prompt => companionReply(prompt));
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(f.callGemini).toHaveBeenCalledTimes(2);
    expect(f.callGemini.mock.calls[1][0]).toContain('Translate the source passage into Spanish');
    expect(f.callGemini.mock.calls[1][0]).toContain('Earth completes one orbit');
    expect(item.data.sourceTranslations).toEqual({ Spanish: passage });
    expect(item.data.reportLanguage).toBe('English');
    expect(item.data.reportTranslations).toEqual({});
    expect(item.data.displayReportLanguage).toBeUndefined();
    expect(item.data.originalText).toBe(source);
    expect(f.deps.addToast.mock.calls.some(([message]) => /passage did not finish/.test(message))).toBe(false);
  });

  it('makes no second request when the source is already in the output language or mixes languages', async () => {
    for (const [output, sourceLanguage] of [['English', 'English'], ['Spanish', 'Multiple languages']]) {
      const raw = { ...report(), sourceLanguage };
      const f = fixture(raw, { leveledTextLanguage: output });
      const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
      expect(f.callGemini).toHaveBeenCalledTimes(1);
      expect(item.data.sourceTranslations).toEqual({});
    }
  });

  it('keeps the saved findings and says so when the passage translation fails', async () => {
    const f = fixture(report(), { addToast: vi.fn() });
    f.callGemini.mockImplementation(async prompt => /Translate the source passage into/.test(prompt) ? 'not json' : JSON.stringify(report()));
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.sourceTranslations).toEqual({});
    expect(item.data.accuracy.rating).toBe('High');
    expect(f.deps.addToast).toHaveBeenCalledWith('The check is saved. The Spanish passage did not finish; add it from the check.', 'info');
  });

  it('names the language in the app language when the language names are available', async () => {
    const extras = readFileSync(resolve(process.cwd(), 'module_scope_extras_source.jsx'), 'utf8');
    const from = extras.indexOf('const getSpeechLangCode = ');
    const before = { extras: window.AlloModules.ModuleScopeExtras, pipeline: window.AlloModules.TextPipelineHelpers, flag: window.AlloModules.TextPipelineHelpersModule };
    try {
      window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: new Function(extras.slice(from, extras.indexOf('const languageToTTSCode', from)) + '\nreturn getSpeechLangCode;')() };
      delete window.AlloModules.TextPipelineHelpersModule;
      loadAlloModule('text_pipeline_helpers_module.js');
      const f = fixture(report(), { addToast: vi.fn(), appLanguage: 'French', currentUiLanguage: 'French' });
      f.callGemini.mockImplementation(async prompt => /Translate the source passage into/.test(prompt) ? 'not json' : JSON.stringify(report()));
      await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
      expect(f.deps.addToast).toHaveBeenCalledWith('The check is saved. The espagnol passage did not finish; add it from the check.', 'info');
    } finally {
      window.AlloModules.ModuleScopeExtras = before.extras;
      window.AlloModules.TextPipelineHelpers = before.pipeline;
      window.AlloModules.TextPipelineHelpersModule = before.flag;
    }
  });
});
