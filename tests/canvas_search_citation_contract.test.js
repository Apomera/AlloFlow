import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let handleGenerate;
let createContentEngine;
let WebSearchProvider;
let originalCanvasDescriptor;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  loadAlloModule('content_engine_module.js');
  WebSearchProvider = window.WebSearchProvider;
  originalCanvasDescriptor = Object.getOwnPropertyDescriptor(WebSearchProvider, '_isCanvas');
  handleGenerate = window.AlloModules?.GenDispatcher?.handleGenerate;
  createContentEngine = window.AlloModules?.createContentEngine;
  if (!WebSearchProvider) throw new Error('WebSearchProvider failed to register');
  if (typeof handleGenerate !== 'function') throw new Error('GenDispatcher.handleGenerate failed to register');
  if (typeof createContentEngine !== 'function') throw new Error('createContentEngine failed to register');
});

afterEach(() => {
  delete window.__contentEngineState;
  delete window.__alloActiveAIBackend;
  delete window.ALLOFLOW_FUNCTIONS_HOST;
  delete window.ALLOFLOW_HOST;
  delete window.ALLOFLOW_CANVAS_SEARCH_PROXY;
  delete window.__alloFirebase;
  if (WebSearchProvider && originalCanvasDescriptor) {
    Object.defineProperty(WebSearchProvider, '_isCanvas', originalCanvasDescriptor);
    WebSearchProvider._serperProxyUrl = null;
    WebSearchProvider._serperAvailable = true;
    WebSearchProvider._serperConsecutiveFailures = 0;
    WebSearchProvider._serperCooldownUntil = 0;
    WebSearchProvider._serperInitialized = false;
  }
  window.localStorage.removeItem('alloflow_ai_config');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const noop = () => {};
const t = (key) => ({
  'meta.analysis_verified': 'Analysis + AI fact-check',
  'meta.analysis_standard': 'Analysis',
}[key] || key);

function forceCanvas(value) {
  Object.defineProperty(WebSearchProvider, '_isCanvas', {
    configurable: true,
    get: () => value,
  });
}

function resetSearchProvider() {
  WebSearchProvider._serperProxyUrl = null;
  WebSearchProvider._serperAvailable = true;
  WebSearchProvider._serperConsecutiveFailures = 0;
  WebSearchProvider._serperCooldownUntil = 0;
  WebSearchProvider._serperInitialized = false;
}

describe('Canvas web-search transport contract', () => {
  it('uses the Canvas-compatible GET endpoint and returns grounding chunks', async () => {
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://prismflow-911fe.web.app/api/searchProxy';
    resetSearchProvider();
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        query: 'orbital period & seasons',
        results: [{
          url: 'https://science.nasa.gov/earth/facts/',
          title: 'Earth Facts — NASA Science',
          snippet: 'Earth completes an orbit in about 365.25 days.',
          source: 'Serper',
        }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await WebSearchProvider.search(
      'Research orbital period and seasons for an educational source.',
      3,
      'orbital period & seasons',
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options = {}] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/prismflow-911fe\.web\.app\/api\/searchProxy\?/);
    expect(String(url)).toContain('orbital%20period%20%26%20seasons');
    expect(String(url)).toMatch(/(?:num|limit)=3(?:&|$)/);
    expect(String(options.method || 'GET').toUpperCase()).toBe('GET');
    expect(result.groundingMetadata?.groundingChunks).toEqual([
      { web: { uri: 'https://science.nasa.gov/earth/facts/', title: 'Earth Facts — NASA Science' } },
    ]);
  });

  it('keeps explicit secure Firebase hosts on authenticated POST, never Canvas GET', async () => {
    forceCanvas(false);
    resetSearchProvider();
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = 'https://must-not-be-used.example/api/searchProxy';
    window.ALLOFLOW_FUNCTIONS_HOST = 'https://secure-functions.example';
    window.__alloFirebase = {
      getFunctionSecurityHeaders: vi.fn(async () => ({
        Authorization: 'Bearer fixture-id-token',
        'X-Firebase-AppCheck': 'fixture-app-check',
      })),
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{
          url: 'https://www.noaa.gov/education/resource-collections/weather-atmosphere',
          title: 'Weather and Atmosphere — NOAA',
          snippet: 'Educational weather resources.',
          source: 'Serper',
        }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await WebSearchProvider.search('weather fronts', 2, 'weather fronts');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://secure-functions.example/api/searchProxy');
    expect(options.method).toBe('POST');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer fixture-id-token',
      'X-Firebase-AppCheck': 'fixture-app-check',
    });
    expect(JSON.parse(options.body)).toEqual({ query: 'weather fronts', num: 2 });
    expect(result.groundingMetadata?.groundingChunks).toHaveLength(1);
  });
});

function createAnalysisDeps({ deepResult, analysisResult }) {
  const setGeneratedContent = vi.fn();
  const callGemini = vi.fn(async () => JSON.stringify(analysisResult));
  const performDeepVerification = vi.fn(async () => deepResult);
  const required = {
    gradeLevel: '8th Grade',
    history: [],
    inputText: 'Earth completes one orbit around the Sun in approximately 365.25 days.',
    differentiationRange: 'None',
    leveledTextLanguage: 'English',
    selectedLanguages: [],
    studentInterests: [],
    guidedMode: false,
    guidedStep: 0,
    standardsInput: '',
    targetStandards: [],
    standardsPromptString: '',
    sourceTopic: 'Earth orbit',
    currentUiLanguage: 'English',
    generatedContent: null,
    audioRef: { current: null },
    alloBotRef: { current: null },
    checkAccuracyWithSearch: true,
    GUIDED_STEPS: [],
    setGeneratedContent,
    callGemini,
    performDeepVerification,
    cleanJson: (value) => String(value || '').trim(),
    getGroupDifferentiationContext: () => '',
    calculateReadability: () => ({ score: '8.0', words: 12, sentences: 1, syllables: 18 }),
    filterEducationalSources: (chunks) => chunks,
    extractSourceTextForProcessing: (text) => ({ text, englishBlock: text, isBilingual: false }),
    generateHelpfulHint: noop,
    getDefaultTitle: (type) => type === 'analysis' ? 'Source Analysis' : type,
    t,
    warnLog: noop,
    debugLog: noop,
    addToast: noop,
  };

  // The dispatcher has a broad dependency surface because it serves every
  // resource type. For this focused analysis fixture, unspecified callbacks
  // are inert setters/helpers; data-bearing dependencies are explicit above.
  const deps = new Proxy(required, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
  });
  return { deps, setGeneratedContent, callGemini, performDeepVerification };
}

describe('Analyze Source Text search provenance contract', () => {
  it('does not label a prose-only, zero-source search result as fact-checked', async () => {
    const { deps, setGeneratedContent } = createAnalysisDeps({
      deepResult: {
        text: 'The search synthesis produced prose, but returned no attributable sources.',
        sources: [],
      },
      analysisResult: {
        readingLevel: { range: '7th-9th Grade', explanation: 'Moderate complexity.' },
        concepts: ['orbital period'],
        accuracy: {
          rating: 'High',
          reason: 'The statement is accurate.',
          discrepancies: [],
          verifiedFacts: ['Earth takes approximately 365.25 days to orbit the Sun.'],
        },
        grammar: [],
      },
    });

    const item = await handleGenerate('analysis', null, false, null, {}, true, deps);

    expect(item).toBeTruthy();
    expect(item.meta).toBe('Analysis');
    expect(item.meta).not.toContain('fact-check');
    expect(item.data.accuracy.rating).toBe('Not web-verified');
    expect(item.data.accuracy.verifiedFacts).toEqual([]);
    expect(item.data.accuracy.citations).toBeUndefined();
    expect(setGeneratedContent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'analysis',
      data: expect.objectContaining({ accuracy: expect.any(Object) }),
    }));
  });

  it('publishes linked analysis references when verification returns attributable sources', async () => {
    const source = {
      uri: 'https://science.nasa.gov/earth/facts/',
      title: 'Earth Facts — NASA Science',
    };
    const { deps } = createAnalysisDeps({
      deepResult: {
        text: 'The orbital-period claim is supported by NASA [1].',
        sources: [source],
      },
      analysisResult: {
        readingLevel: { range: '7th-9th Grade', explanation: 'Moderate complexity.' },
        concepts: ['orbital period'],
        accuracy: {
          rating: 'High',
          reason: 'The statement agrees with the cited source.',
          discrepancies: [],
          verifiedFacts: ['The orbital period is approximately 365.25 days [1].'],
        },
        grammar: [],
      },
    });

    const item = await handleGenerate('analysis', null, false, null, {}, true, deps);

    expect(item.meta).toBe('Analysis + AI fact-check');
    expect(item.data.accuracy.citations).toContain('[Earth Facts — NASA Science](https://science.nasa.gov/earth/facts/)');
    expect(item.data.accuracy.verifiedFacts[0]).toContain('https://science.nasa.gov/earth/facts/');
  });
});

describe('Research with Web Search reference contract', () => {
  it('appends a visible Source Text References list from grounding chunks', async () => {
    const source = {
      web: {
        uri: 'https://science.nasa.gov/earth/facts/',
        title: 'Earth Facts — NASA Science',
      },
    };
    const groundingMetadata = { groundingChunks: [source] };
    const setInputText = vi.fn();
    const callGemini = vi.fn()
      .mockResolvedValueOnce({
        text: 'Research brief with enough factual background to satisfy the source-generation preflight requirement.',
        groundingMetadata,
      })
      .mockResolvedValueOnce({
        text: '## A Moving Planet\n\nEarth travels around the Sun in a predictable orbit that defines the length of a year [Source 1].',
        groundingMetadata,
      });

    window.__contentEngineState = {
      inputText: '',
      gradeLevel: '8th Grade',
      sourceTopic: 'Earth orbit',
      generatedContent: null,
      leveledTextLanguage: 'English',
      selectedLanguages: [],
      studentInterests: [],
      selectedConcepts: [],
      sourceCustomInstructions: '',
      sourceLength: '250',
      sourceLevel: '8th Grade',
      sourceTone: 'Informative',
      sourceVocabulary: '',
      resourceCount: 1,
      targetStandards: [],
      dokLevel: '',
      selectedFont: 'Default',
      includeSourceCitations: true,
      standardsPromptString: '',
      ai: { backend: 'gemini' },
      alloBotRef: { current: null },
      setActiveView: noop,
      setError: noop,
      setGeneratedContent: noop,
      setGenerationStep: noop,
      setInputText,
      setIsGeneratingSource: noop,
      setShowSourceGen: noop,
    };

    const engine = createContentEngine({
      callGemini,
      addToast: noop,
      t: (key) => key,
      getBilingualPromptInstruction: () => '',
      flyToElement: noop,
    });

    await engine.handleGenerateSource({}, true);

    const finalDocument = setInputText.mock.calls.at(-1)?.[0] || '';
    expect(finalDocument).toMatch(/^#{2,3} Source Text References$/m);
    expect(finalDocument).toContain('[Earth Facts — NASA Science](https://science.nasa.gov/earth/facts/)');
  });
});
