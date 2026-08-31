import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { loadAlloModule } from './setup.js';

const LOADER_SOURCE = readFileSync(resolve(process.cwd(), 'sre_loader.js'), 'utf8');
let createTTS;

beforeAll(() => {
  loadAlloModule('tts_module.js');
  createTTS = window.AlloModules.createTTS;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete window.AlloMathSpeech;
  delete window._kokoroTTS;
  delete window._piperTTS;
  delete window.__ttsGeminiAuthFailed;
  delete window.__ttsGeminiQuotaFailed;
  delete window.__ttsKeylessLogged;
});

function mockLoaderDom() {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://app.example.test/index.html',
    runScripts: 'outside-only',
  });
  const requested = [];
  const requestedStyles = [];
  const temmlCalls = [];
  let activeProfile = null;
  Object.defineProperty(dom.window.document, 'currentScript', {
    configurable: true,
    get: () => ({ src: 'https://app.example.test/sre_loader.js' }),
  });
  dom.window.document.head.appendChild = (element) => {
    if (element.tagName === 'LINK') {
      requestedStyles.push(element.href);
      dom.window.queueMicrotask(() => element.onload());
      return element;
    }
    requested.push(element.src);
    dom.window.queueMicrotask(() => {
      if (element.src.endsWith('/sre-assets/temml.min.js')) {
        dom.window.temml = {
          renderToString: (latex, options = {}) => {
            temmlCalls.push({ latex, options: { ...options } });
            return `<math><mrow><mtext>${latex}</mtext></mrow></math>`;
          },
        };
        element.onload();
        return;
      }
      if (element.src.endsWith('/sre-assets/sre.js')) {
        dom.window.SRE = {
          setupEngine: async (features) => {
            await new Promise((done) => dom.window.setTimeout(done, features.locale === 'en' ? 8 : 1));
            activeProfile = { ...features };
          },
          engineReady: async () => {},
          toSpeech: (mathml) => `${activeProfile.locale}:${activeProfile.domain || 'default'}:${mathml}`,
        };
        element.onload();
        return;
      }
      element.onerror(new Error(`unexpected script ${element.src}`));
    });
    return element;
  };
  dom.window.eval(LOADER_SOURCE);
  return { dom, requested, requestedStyles, temmlCalls };
}
describe('offline Speech Rule Engine loader', () => {
  it('loads local pinned assets first and serializes concurrent locale changes', async () => {
    const { dom, requested } = mockLoaderDom();
    const speech = dom.window.AlloMathSpeech;
    const [english, spanish] = await Promise.all([
      speech.toSpeech('x^2', { lang: 'English', allowRemoteFallback: false }),
      speech.toSpeech('x^2', { lang: 'Spanish', allowRemoteFallback: false }),
    ]);

    expect(english).toMatch(/^en:clearspeak:/);
    expect(spanish).toMatch(/^es:clearspeak:/);
    expect(requested).toEqual(expect.arrayContaining([
      'https://app.example.test/sre-assets/temml.min.js',
      'https://app.example.test/sre-assets/sre.js',
    ]));
    expect(requested.every((url) => url.startsWith('https://app.example.test/'))).toBe(true);
    expect(speech.diagnostics().mathmapsSource).toBe('https://app.example.test/sre-assets/mathmaps');
    dom.window.close();
  });

  it('renders complex LaTeX as semantic MathML with local visual assets', async () => {
    const { dom, requested, requestedStyles, temmlCalls } = mockLoaderDom();
    const renderer = dom.window.AlloMathRenderer;
    const mathml = await renderer.renderToString('\\frac{1}{1+\\frac{1}{x}}', {
      displayMode: false,
      allowRemoteFallback: false,
    });

    expect(mathml).toContain('<math>');
    expect(requested).toEqual(['https://app.example.test/sre-assets/temml.min.js']);
    expect(requestedStyles).toEqual(['https://app.example.test/sre-assets/Temml-Local.css']);
    expect(temmlCalls[0]).toMatchObject({
      latex: '\\frac{1}{1+\\frac{1}{x}}',
      options: { displayMode: false, throwOnError: false, strict: 'warn', trust: false },
    });
    expect(renderer.diagnostics()).toMatchObject({
      ready: true,
      role: 'semantic-math-renderer',
      temmlSource: 'https://app.example.test/sre-assets/temml.min.js',
      cssSource: 'https://app.example.test/sre-assets/Temml-Local.css',
      preserves: expect.arrayContaining(['AlgebraCAS-grading', 'MathLive-input', 'SRE-speech']),
    });
    dom.window.close();
  });

  it('passes unsupported languages through unless English fallback is explicitly chosen', async () => {
    const { dom, requested } = mockLoaderDom();
    const speech = dom.window.AlloMathSpeech;

    await expect(speech.toSpeech('x^2', { lang: 'Russian', allowRemoteFallback: false })).resolves.toBeNull();
    expect(requested).toHaveLength(0);

    speech.configure({
      domain: 'mathspeak',
      style: 'brief',
      unsupportedLocale: 'english',
      allowRemoteFallback: false,
    });
    await expect(speech.toSpeech('x^2', { lang: 'Russian' })).resolves.toMatch(/^en:mathspeak:/);
    expect(speech.settings()).toEqual({
      domain: 'mathspeak',
      style: 'brief',
      unsupportedLocale: 'english',
      allowRemoteFallback: false,
    });
    dom.window.close();
  });
});

function makeTTS({ canvas = false, config = {}, ai = null } = {}) {
  return createTTS({
    state: { queue: Promise.resolve(), botQueue: Promise.resolve(), urlCache: new Map(), rateLimitedUntil: 0 },
    apiKey: 'test-key',
    GEMINI_MODELS: { tts: 'test-tts' },
    AVAILABLE_VOICES: ['Kore', 'Puck'],
    _isCanvasEnv: canvas,
    languageToTTSCode: () => 'en',
    isGlobalMuted: () => false,
    warnLog: () => {},
    debugLog: () => {},
    getLeveledTextLanguage: () => 'English',
    getCurrentUiLanguage: () => 'English',
    getAiUserConfig: () => config,
    getAi: () => ai,
    setShowKokoroOfferModal: () => {},
  });
}

function stubGeminiAudio() {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:math-speech'),
  });
  const fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ inlineData: { data: Buffer.from('pcm').toString('base64') } }] } }],
    }),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('shared spoken-math TTS preprocessing', () => {
  it('feeds converted math and per-call speech preferences to Gemini voices', async () => {
    const toSpeech = vi.fn(async () => 'x squared');
    window.AlloMathSpeech = { toSpeech };
    const fetchMock = stubGeminiAudio();
    const { callTTS } = makeTTS({ canvas: true });

    await callTTS('Area is $x^2$.', 'Kore', 1, {
      maxRetries: 0,
      mathSpeech: { domain: 'mathspeak', style: 'brief' },
    }, 'English');

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.contents[0].parts[0].text).toContain('Area is x squared .');
    expect(payload.contents[0].parts[0].text).not.toContain('$x^2$');
    expect(toSpeech).toHaveBeenCalledWith('x^2', expect.objectContaining({
      lang: 'English', domain: 'mathspeak', style: 'brief',
    }));
  });

  it('feeds converted MathML to Kokoro before local cleanup', async () => {
    window.AlloMathSpeech = { toSpeech: vi.fn(async () => 'one half') };
    const speak = vi.fn(async () => 'blob:kokoro-math');
    window._kokoroTTS = { ready: true, speak };
    const { callTTS } = makeTTS();

    const result = await callTTS(
      'The value is <math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.',
      'af_bella', 1, 0, 'English',
    );

    expect(result).toBe('blob:kokoro-math');
    expect(speak.mock.calls[0][0]).toContain('one half');
    expect(speak.mock.calls[0][0]).not.toContain('<math>');
  });

  it('feeds the converted sentence to a provider-managed voice, and browser policy exits early', async () => {
    // V6 (tts fallback ladder): ttsProvider 'browser' is authoritative — callTTS
    // returns null immediately (the caller speaks via speechSynthesis) and no
    // math plugin or provider is consulted.
    window.AlloMathSpeech = { toSpeech: vi.fn(async () => 'a equals b') };
    const browserTextToSpeech = vi.fn(async (text) => `provider:${text}`);
    const { callTTS: browserCallTTS } = makeTTS({ config: { ttsProvider: 'browser' }, ai: { textToSpeech: browserTextToSpeech } });
    await expect(browserCallTTS('Solve \\(a=b\\).', 'browser', 1, 0, 'English')).resolves.toBeNull();
    expect(browserTextToSpeech).not.toHaveBeenCalled();

    // A provider-managed route still receives the CONVERTED sentence.
    const textToSpeech = vi.fn(async (text) => `provider:${text}`);
    const { callTTS } = makeTTS({ config: { ttsProvider: 'local' }, ai: { textToSpeech } });
    const result = await callTTS('Solve \\(a=b\\).', 'Kore', 1, 0, 'English');
    expect(result).toContain('a equals b');
    expect(textToSpeech.mock.calls[0][0]).not.toContain('\\(a=b\\)');
  });

  it('keeps currency unchanged instead of treating paired dollar signs as math', async () => {
    const toSpeech = vi.fn(async () => 'wrong math');
    window.AlloMathSpeech = { toSpeech };
    // The browser-policy path now returns null before preprocessing, so the
    // currency invariant is asserted on a path that DOES the math scan.
    const fetchMock = stubGeminiAudio();
    const { callTTS } = makeTTS({ canvas: true });

    await expect(callTTS('It costs $5 and $10 today.', 'Kore', 1, 0, 'English'))
      .resolves.toBe('blob:math-speech');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(JSON.stringify(body)).toContain('It costs $5 and $10 today.');
    expect(toSpeech).not.toHaveBeenCalled();
  });

  it('also preprocesses the direct AlloBot voice path', async () => {
    window.AlloMathSpeech = { toSpeech: vi.fn(async () => 'y cubed') };
    const fetchMock = stubGeminiAudio();
    const { callTTSDirect } = makeTTS({ canvas: true });

    await callTTSDirect('Graph $y^3$.', 'Kore', 1, {
      maxRetries: 0,
      mathSpeech: { domain: 'clearspeak', style: 'sbrief' },
    });

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.contents[0].parts[0].text).toContain('y cubed');
    expect(payload.contents[0].parts[0].text).not.toContain('$y^3$');
  });
});
