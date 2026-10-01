import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const source = readFileSync(process.env.REPORT_GENERATION_SOURCE_PATH || 'generate_dispatcher_source.jsx', 'utf8');
const helperSource = readFileSync('generation_helpers_source.jsx', 'utf8');
let dispatcher, helpers, context, pipeline;

beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('text_pipeline_helpers_module.js');
  context = window.AlloModules.InstructionalContext;
  pipeline = window.AlloModules.TextPipelineHelpers;
  // Execute the owned source candidate, independent of the generated mirrors.
  new Function(source)();
  new Function(helperSource)();
  dispatcher = window.AlloModules.GenDispatcher;
  helpers = window.AlloModules.GenerationHelpers;
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

const text = 'Plants use light to make sugars. Animals get energy by eating plants or other animals. Decomposers break down dead organisms and return nutrients to the soil.';
const adapted = 'Plants use sunlight to make sugars. Animals obtain energy by eating plants or other animals. Decomposers break down dead organisms and return nutrients to the soil.';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(provider, options = {}) {
  const snapshot = context.createSourceSnapshot(text, { sourceArtifactId: 'source' });
  const reading = { id: 'source', type: 'analysis', data: { originalText: text }, sourceSnapshot: snapshot,
    instructionalText: { role: 'primary', form: 'original' },
    readingSupports: { version: 1, sourceFingerprint: snapshot.fingerprint, status: 'complete',
      annotations: [{ id: 'support-one', start: 0, end: 6, quote: 'Plants', text: 'Living things that make sugars using light.' }] } };
  const previous = { id: 'previous', type: 'simplified', data: adapted, sourceSnapshot: snapshot,
    title: 'Saved adaptation', config: { grade: '5th Grade', language: 'English' },
    instructionalText: { role: 'supplemental', form: 'adapted' } };
  const state = { generatedContent: previous, history: [reading, previous], activeView: 'simplified', isProcessing: false, error: null };
  const setterCalls = {};
  const controller = new AbortController();
  const base = {
    ...state, inputText: text, selectedReadingSourceId: 'source', gradeLevel: '5th Grade',
    differentiationRange: 'None', differentiationTypes: [], studentInterests: [], selectedConcepts: [], selectedLanguages: [],
    leveledTextLanguage: 'English', translationMode: 'off', leveledTextLength: 'Same as Source',
    textFormat: 'Keep Source Format and Tone', isTeacherMode: false, keepCitations: false,
    audioRef: { current: null }, alloBotRef: { current: null },
    generationSignal: controller.signal, isGenerationCurrent: () => true,
    callGemini: vi.fn(provider), addToast: vi.fn(), warnLog: vi.fn(), flyToElement: vi.fn(),
    getDefaultTitle: kind => kind === 'simplified' ? 'Adapted Text' : kind,
    formatLessonDNA: () => '', getGroupDifferentiationContext: () => '',
    extractSourceTextForProcessing: pipeline.extractSourceTextForProcessing,
    chunkText: value => [value], countWords: value => String(value).trim().split(/\s+/).filter(Boolean).length,
    calculateReadability: () => null, LENGTH_THRESHOLDS: { MIN_VARIANCE: .7, MAX_VARIANCE: 1.3 },
    cleanJson: value => value, safeJsonParse: value => { try { return JSON.parse(value); } catch (_) { return null; } },
    t: key => key, generateHelpfulHint: vi.fn(), repairGeneratedText: vi.fn(async value => value),
    resolveTranslationPolicy: () => ({ enabled: false, target: 'English', mode: 'off' }),
    ...options.deps,
  };
  const deps = new Proxy(base, { get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string' && key.startsWith('set')) {
      const stateKey = key.charAt(3).toLowerCase() + key.slice(4);
      const setter = vi.fn(value => { state[stateKey] = typeof value === 'function' ? value(state[stateKey]) : value; });
      setterCalls[key] = setter;
      target[key] = setter;
      return setter;
    }
    return '';
  } });
  const run = (config = {}, switchView = true) => dispatcher.handleGenerate('simplified', null, false, null, { skipDifferentiation: true, ...config }, switchView, deps);
  return { state, deps, reading, previous, snapshot, controller, setterCalls, run };
}

describe('report generation recovery: candidate adaptation lifecycle', () => {
  it('keeps last-good content and original supports during pending and after provider failure', async () => {
    const response = deferred();
    const h = harness(() => response.promise);
    const before = JSON.stringify(h.state.history);
    const pending = h.run();
    expect(h.state.generatedContent).toBe(h.previous);
    expect(JSON.stringify(h.state.history)).toBe(before);
    expect(h.state.isProcessing).toBe(true);
    response.reject(new Error('Network unavailable'));
    await pending;
    expect(h.state.generatedContent).toBe(h.previous);
    expect(JSON.stringify(h.state.history)).toBe(before);
    expect(h.state.isProcessing).toBe(false);
    expect(h.state.error).toContain('Previously saved resources were kept');
    expect(h.deps.addToast.mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
  });

  it.each(['', '   ', '```\n\n```'])('rejects empty provider text %j without leaving a student-visible draft', async candidate => {
    const h = harness(async () => candidate);
    await h.run();
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.state.history.every(item => item.data !== '')).toBe(true);
    expect(h.state.generatedContent).toBe(h.previous);
  });

  it('publishes one complete adaptation after all sections, retaining exact source and original annotations', async () => {
    vi.useFakeTimers();
    const second = deferred();
    const h = harness(vi.fn().mockResolvedValueOnce(adapted).mockImplementationOnce(() => second.promise),
      { deps: { chunkText: () => [text, text] } });
    const pending = h.run();
    await vi.advanceTimersByTimeAsync(801);
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.state.generatedContent).toBe(h.previous);
    second.resolve(adapted);
    const result = await pending;
    expect(h.state.history).toEqual([h.reading, h.previous, result]);
    expect(result.data).toBe(adapted + '\n\n' + adapted);
    expect(result.sourceSnapshot.text).toBe(text);
    expect(h.state.history[0]).toBe(h.reading);
    expect(h.state.history[0].readingSupports.annotations[0].text).toContain('using light');
    expect(h.setterCalls.setHistory).toHaveBeenCalledTimes(1);
    expect(h.state.generatedContent).toBe(result);
  });

  it('keeps a prior re-level resource on failure and replaces it only after usable completion', async () => {
    const response = deferred();
    const h = harness(() => response.promise);
    const pending = h.run({ relevelReplaceId: h.previous.id });
    expect(h.state.history).toEqual([h.reading, h.previous]);
    response.reject(new Error('Re-level failed'));
    await pending;
    expect(h.state.history).toEqual([h.reading, h.previous]);
    h.deps.callGemini.mockResolvedValue(adapted + ' Light provides energy.');
    const result = await h.run({ relevelReplaceId: h.previous.id });
    expect(h.state.history).toEqual([h.reading, result]);
    expect(h.state.generatedContent).toBe(result);
  });

  it('keeps the completed parent adaptation when automatic re-level fails', async () => {
    const judge = JSON.stringify({ alignment: 'Too Complex', rubric: {
      vocabulary: { score: 3 }, sentenceStructure: { score: 3 }, conceptDensity: { score: 3 },
    } });
    const provider = vi.fn().mockResolvedValueOnce(adapted).mockResolvedValueOnce(judge)
      .mockRejectedValueOnce(new Error('Automatic re-level provider failed'));
    const h = harness(provider, { deps: { isTeacherMode: true, calculateReadability: () => ({ gradeLevel: 9, score: 9 }) } });
    const result = await h.run();
    expect(provider).toHaveBeenCalledTimes(3);
    expect(h.state.history).toEqual([h.reading, h.previous, result]);
    expect(result.data).toBe(adapted);
    expect(result.generationRecovery).toMatchObject({ stage: 'automatic-relevel', status: 'failed', preserved: 'completed-adaptation' });
    expect(h.state.generatedContent).toBe(result);
    expect(h.state.history.every(item => item.data !== '')).toBe(true);
    expect(h.state.error).toBeNull();
    expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('review its reading level before delivery'), 'warning');
  });

  it('preserves the prior resource when a later required section fails', async () => {
    vi.useFakeTimers();
    const provider = vi.fn().mockResolvedValueOnce(adapted).mockRejectedValueOnce(new Error('Section two failed'));
    const h = harness(provider, { deps: { chunkText: () => [text, text] } });
    const pending = h.run();
    await vi.advanceTimersByTimeAsync(801);
    await pending;
    expect(provider).toHaveBeenCalledTimes(2);
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.state.generatedContent).toBe(h.previous);
    expect(h.state.error).toContain('Previously saved resources were kept');
  });

  it('does not overwrite an educator edit or resurrect a deleted re-level resource', async () => {
    for (const remove of [false, true]) {
      const response = deferred();
      const h = harness(() => response.promise);
      const pending = h.run({ relevelReplaceId: h.previous.id });
      const edited = { ...h.previous, data: 'Educator-reviewed text.' };
      h.state.history = remove ? [h.reading] : [h.reading, edited];
      h.state.generatedContent = remove ? h.reading : edited;
      response.resolve(adapted);
      await pending;
      expect(h.state.history).toEqual(remove ? [h.reading] : [h.reading, edited]);
      expect(h.state.generatedContent).toBe(remove ? h.reading : edited);
    }
  });

  it('ignores a provider response after cancellation even when the provider ignores the signal', async () => {
    const response = deferred();
    const h = harness(() => response.promise);
    const pending = h.run();
    expect(h.deps.callGemini.mock.calls[0][5]).toBe(h.controller.signal);
    h.controller.abort();
    await pending;
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.state.generatedContent).toBe(h.previous);
    expect(h.state.error).toBeNull();
    expect(h.state.generationStep).toContain('cancelled');
    expect(h.deps.addToast.mock.calls.some(([, kind]) => kind === 'error' || kind === 'success')).toBe(false);
    response.resolve(adapted);
    await Promise.resolve();
    expect(h.state.history).toEqual([h.reading, h.previous]);
  });

  it('a stale repeated run cannot overwrite, append, announce failure, or clear newer loading', async () => {
    const response = deferred();
    let current = true;
    const h = harness(() => response.promise, { deps: { isGenerationCurrent: () => current } });
    const pending = h.run();
    const newer = { id: 'newer', type: 'simplified', data: 'Newer reviewed result.' };
    current = false;
    h.state.history = [h.reading, h.previous, newer];
    h.state.generatedContent = newer;
    h.state.isProcessing = true;
    response.resolve(adapted);
    await pending;
    expect(h.state.generatedContent).toBe(newer);
    expect(h.state.history).toEqual([h.reading, h.previous, newer]);
    expect(h.state.isProcessing).toBe(true);
    expect(h.state.error).toBeNull();
    expect(h.deps.addToast).not.toHaveBeenCalled();
  });

  it('keeps navigation ownership with the host while a background resource finishes', async () => {
    const response = deferred();
    const h = harness(() => response.promise);
    const pending = h.run({}, false);
    h.state.generatedContent = h.reading;
    h.state.activeView = 'analysis';
    response.resolve(adapted);
    const result = await pending;
    expect(h.state.generatedContent).toBe(h.reading);
    expect(h.state.activeView).toBe('analysis');
    expect(h.state.history).toContain(result);
  });

  it('allows a legacy no-op ownership hook while still rejecting explicit stale ownership', async () => {
    const h = harness(async () => adapted, { deps: { isGenerationCurrent: () => undefined } });
    const result = await h.run();
    expect(result.data).toBe(adapted);
    expect(h.state.history).toEqual([h.reading, h.previous, result]);
  });

  it('does not publish before optional reading-level review, and cancels a late reviewer response', async () => {
    const review = deferred();
    const provider = vi.fn().mockResolvedValueOnce(adapted).mockImplementationOnce(() => review.promise);
    const h = harness(provider, { deps: { isTeacherMode: true } });
    const pending = h.run();
    await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(2));
    expect(h.state.history).toEqual([h.reading, h.previous]);
    h.controller.abort();
    review.resolve(JSON.stringify({ alignment: 'Aligned' }));
    await pending;
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.deps.addToast.mock.calls.some(([, kind]) => kind === 'success')).toBe(false);
  });

  it.each([
    [{ status: 401, message: '401 unauthorized' }, 'Authorization failed'],
    [{ status: 403, message: 'Forbidden' }, 'Authorization failed'],
    [{ status: 429, message: 'Quota exceeded' }, 'usage limit'],
    [{ status: 429, message: 'Too many requests' }, 'too many requests'],
  ])('gives accurate recovery for provider failure %j', async (failure, expected) => {
    const h = harness(async () => { throw Object.assign(new Error(failure.message), failure); });
    await h.run();
    expect(h.state.error).toContain(expected);
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.deps.warnLog).toHaveBeenCalledWith('Unhandled error:', expect.objectContaining(failure));
  });
});

describe('report generation recovery: math last-good output', () => {
  it('retains the selected resource and History when math provider generation fails', async () => {
    const h = harness(async () => { throw new Error('Math provider unavailable'); }, { deps: {
      mathInput: 'Addition within 20', useMathSourceContext: false, mathMode: 'Problem Set Generator', mathSubject: 'Arithmetic', mathQuantity: 2,
    } });
    await helpers.handleGenerateMath(null, true, null, h.deps);
    expect(h.state.generatedContent).toBe(h.previous);
    expect(h.state.history).toEqual([h.reading, h.previous]);
    expect(h.state.activeView).toBe('simplified');
    expect(h.state.isProcessing).toBe(false);
  });
});
