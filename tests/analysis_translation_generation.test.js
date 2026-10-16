import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

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
    standardsPromptString: '', sourceTopic: 'Earth orbit', currentUiLanguage: 'English', generatedContent: null,
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
  it('preserves exact source and source metadata while storing a separately translated report', async () => {
    const f = fixture();
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(item.data.originalText).toBe(source);
    expect(item.data.rawEnglishText).toBe(source);
    expect(item.sourceSnapshot.text).toBe(source);
    expect(item.config.language).toBe('English');
    expect(item.sourceSnapshot.language).toBe('English');
    expect(item.instructionalText.complexity.language).toBe('English');
    expect(item.data.reportLanguage).toBe('Spanish');
    expect(item.data.translatedText).toBeUndefined();
    expect(item.data.sourceTranslations).toEqual({});
    expect(item.data.localStats).toEqual({ words: 17, score: '8.0' });
    expect(f.calculateReadability).toHaveBeenCalledWith(source);
    expect(item.data.reportTranslations.English.readingLevel.range).toBe('7th-9th Grade');
    expect(item.data.reportTranslations.English.accuracy.rating).toBe('High');
    expect(item.data.reportTranslations.English.accuracy.verifiedFacts[0]).toContain('https://science.nasa.gov/earth/facts/');
    expect(item.data.reportTranslations.English.grammar[0]).toContain('"Earth completes"');
    expect(f.callGemini).toHaveBeenCalledTimes(1);
    expect(f.callGemini.mock.calls[0][0]).toContain('Each field contains ONE language');
    expect(f.callGemini.mock.calls[0][0]).not.toContain('BILINGUAL ARRAYS REQUIREMENT');
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
