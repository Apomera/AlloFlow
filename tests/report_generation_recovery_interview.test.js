import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.REPORT_INTERVIEW_PERSONA_SOURCE || 'personas_source.jsx', 'utf8');
const sourceUrls = { groundingChunks: [{ web: { uri: 'https://example.org/ada-notes', title: 'Lesson source' } }] };
const candidates = [{ name: 'Ada Lovelace', role: 'Mathematician', year: '1843', context: 'Notes about the analytical engine', quests: [], suggestedQuestions: ['What did the notes explain?'] }];
const sourcedResult = () => ({ text: JSON.stringify(candidates), groundingMetadata: sourceUrls });
const deferred = () => { let resolve, reject; const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; }); return { promise, resolve, reject }; };

function harness(callGemini, { prior = true, analysisSources = false, t = key => key } = {}) {
  const noop = vi.fn();
  const previous = { id: 'prior-interview', type: 'persona', data: [{ name: 'Prior candidate', role: 'Saved perspective' }], config: { teacherSupports: ['Keep this annotation'] } };
  let generated = prior ? previous : { id: 'source-resource', type: 'simplified', data: { originalText: 'Ada wrote notes about the analytical engine.' } };
  const analysis = { id: 'analysis', type: 'analysis', data: { originalText: 'Ada wrote notes about the analytical engine.', ...(analysisSources ? { groundingMetadata: sourceUrls } : {}) } };
  let history = [analysis, generated];
  let state = { options: prior ? previous.data : [], selectedCharacter: prior ? previous.data[0] : null, chatHistory: [{ role: 'user', text: 'Keep my previous question' }] };
  let pending = false;
  const toasts = [];
  const liveRef = { current: {} };
  const sync = () => Object.assign(liveRef.current, { generatedContent: generated, history, personaState: state });
  Object.assign(liveRef.current, {
    inputText: 'Ada wrote notes about the analytical engine.', sourceTopic: 'Computing history', gradeLevel: '8th Grade', personaCustomInstructions: '', leveledTextLanguage: 'English', selectedLanguages: ['English'],
    setGeneratedContent: value => { generated = typeof value === 'function' ? value(generated) : value; sync(); },
    setHistory: value => { history = typeof value === 'function' ? value(history) : value; sync(); },
    setPersonaState: value => { state = typeof value === 'function' ? value(state) : value; sync(); },
    setIsGeneratingPersona: value => { pending = value; },
    setPersonaInput: noop, setPersonaReflectionInput: noop, setReflectionFeedback: noop,
    setIsPersonaDefining: noop, setIsGradingReflection: noop, setIsGeneratingReflectionPrompt: noop,
    setPanelTtsPending: noop, setShowPersonaHints: noop, setPersonaTurnHintsViewed: noop,
    setIsPersonaReflectionOpen: noop, setPlayingContentId: noop, setPlaybackState: noop,
    lastReadPersonaIndexRef: { current: -1 }, personaDefinitionCache: { current: new Map() },
    addToast: (message, level) => toasts.push({ message, level }), t,
  });
  sync();
  const windowObject = { AlloModules: {}, callGemini };
  vm.runInNewContext(source, { window: windowObject, console: { log: noop, warn: noop }, setTimeout, clearTimeout, Date, Math, JSON, Promise, Set, Map, WeakMap, AbortController });
  const warnLog = vi.fn();
  const api = windowObject.AlloModules.createPersonas({ liveRef, warnLog, debugLog: noop, cleanJson: value => String(value), safeJsonParse: JSON.parse, fisherYatesShuffle: values => values, SafetyContentChecker: { check: () => [] } });
  return { api, liveRef, toasts, warnLog, previous, get generated() { return generated; }, get history() { return history; }, get state() { return state; }, get pending() { return pending; }, navigate(resource) { generated = resource; sync(); } };
}

afterEach(() => vi.useRealTimers());

describe('Interview candidate failure recovery', () => {
  it('explains the Canvas no-attribution refusal without publishing or losing prior work', async () => {
    const error = Object.assign(new Error('Canvas web search returned no attributable sources.'), { code: 'allo/search-unavailable' });
    const h = harness(vi.fn().mockRejectedValue(error));
    const before = h.state;
    await h.api.handleGeneratePersonas();
    expect(h.generated).toBe(h.previous);
    expect(h.history).toHaveLength(2);
    expect(h.generated.config.teacherSupports).toEqual(['Keep this annotation']);
    expect(h.state).toBe(before);
    expect(h.toasts).toEqual([{ message: expect.stringContaining('no attributable sources'), level: 'error' }]);
    expect(h.toasts[0].message).toContain('Sources will not be invented');
    expect(h.toasts[0].message).toContain('more specific lesson source or topic');
    expect(h.toasts[0].message).toContain('previous interview candidates are kept');
    expect(h.warnLog).toHaveBeenCalledWith('Persona Generation Error:', error);
    expect(h.pending).toBe(false);
  });

  it.each([
    ['search not loaded', { code: 'allo/search-unavailable' }, 'Canvas web search provider is not loaded.', 'web search is unavailable'],
    ['search timeout', { code: 'allo/search-unavailable', name: 'TimeoutError' }, 'Search timed out', 'took too long'],
    ['access', { httpStatus: 401, classification: { kind: 'auth' } }, 'Connection rejected', 'approved access'],
    ['permission', { status: 403 }, 'Permission denied', 'approved access'],
    ['quota', { classification: { kind: 'quota' }, isQuota: true }, 'Usage quota exhausted', 'usage allowance'],
    ['throttling', { status: 429 }, 'Too many requests', 'Wait briefly'],
    ['network', {}, 'Failed to fetch', 'connection failed'],
    ['unexpected', {}, 'Unexpected candidate-generation exception', 'diagnostic details'],
  ])('provides specific %s guidance and does not invent an attribution explanation', async (_, fields, message, expected) => {
    const h = harness(vi.fn().mockRejectedValue(Object.assign(new Error(message), fields)));
    await h.api.handleGeneratePersonas();
    expect(h.toasts[0].message).toContain(expected);
    expect(h.toasts[0].message).not.toContain('no attributable sources');
    expect(h.generated).toBe(h.previous);
    expect(h.history).toHaveLength(2);
  });

  it('does not claim previous candidates exist when the first attempt fails', async () => {
    const h = harness(vi.fn().mockRejectedValue(new Error('Canvas web search returned no attributable sources.')), { prior: false });
    await h.api.handleGeneratePersonas();
    expect(h.toasts[0].message).not.toContain('previous interview candidates');
    expect(h.generated.id).toBe('source-resource');
  });

  it('checks the current retained resource before claiming previous candidates were kept', async () => {
    const response = deferred();
    const h = harness(vi.fn(() => response.promise));
    const task = h.api.handleGeneratePersonas();
    const edited = { ...h.previous, data: [] };
    h.navigate(edited);
    response.reject(new Error('Canvas web search returned no attributable sources.'));
    await task;
    expect(h.generated).toBe(edited);
    expect(h.toasts[0].message).toContain('no attributable sources');
    expect(h.toasts[0].message).not.toContain('previous interview candidates');
  });

  it.each([null, undefined, { groundingChunks: [] }, { webSearchQueries: ['Ada notes'] }, { groundingChunks: [{ web: { uri: 'javascript:unsafe' } }] }])('refuses an explicit current search envelope with no source URL (%j), even with earlier analysis sources', async groundingMetadata => {
    const h = harness(vi.fn().mockResolvedValue({ text: JSON.stringify(candidates), groundingMetadata }), { analysisSources: true });
    await h.api.handleGeneratePersonas();
    expect(h.generated).toBe(h.previous);
    expect(h.history).toHaveLength(2);
    expect(h.toasts[0].message).toContain('no attributable sources');
  });

  it('allows retry after no attribution, then publishes valid sourced output with its lesson binding', async () => {
    const callGemini = vi.fn().mockRejectedValueOnce(Object.assign(new Error('Canvas web search returned no attributable sources.'), { code: 'allo/search-unavailable' })).mockResolvedValueOnce(sourcedResult());
    const h = harness(callGemini);
    await h.api.handleGeneratePersonas();
    expect(h.pending).toBe(false);
    await h.api.handleGeneratePersonas();
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(callGemini.mock.calls[1][0]).toContain('Ada wrote notes about the analytical engine');
    expect(callGemini.mock.calls[1][2]).toBe(true);
    expect(h.generated.data[0].name).toBe('Ada Lovelace');
    expect(h.generated.config.personaSource.groundingMetadata).toEqual(sourceUrls);
    expect(h.generated.config.personaSource.analysisId).toBe('analysis');
    expect(h.generated.config.regeneratedFromId).toBe('prior-interview');
    expect(h.history).toContain(h.previous);
    expect(h.history).toHaveLength(3);
    expect(h.toasts.at(-1).level).toBe('success');
  });

  it.each([
    ['data', result => ({ data: result })],
    ['content/data', result => ({ content: { data: result } })],
  ])('refuses explicit empty grounding in a supported %s wrapper without borrowing earlier analysis sources', async (_, wrap) => {
    const h = harness(vi.fn().mockResolvedValue(wrap({ text: JSON.stringify(candidates), groundingMetadata: null })), { analysisSources: true });
    await h.api.handleGeneratePersonas();
    expect(h.generated).toBe(h.previous);
    expect(h.toasts[0].message).toContain('no attributable sources');
  });

  it.each([
    ['data', result => ({ data: result })],
    ['content/data', result => ({ content: { data: result } })],
  ])('persists attributable current grounding from a supported %s wrapper', async (_, wrap) => {
    const h = harness(vi.fn().mockResolvedValue(wrap(sourcedResult())));
    await h.api.handleGeneratePersonas();
    expect(h.generated.data[0].name).toBe('Ada Lovelace');
    expect(h.generated.config.personaSource.groundingMetadata).toEqual(sourceUrls);
  });

  it.each([
    ['alternative field after empty object', { groundingMetadata: {}, grounding: sourceUrls }],
    ['candidate grounding field', { candidates: [{ grounding: sourceUrls }] }],
  ])('persists the attributable current %s accepted by validation', async (_, fields) => {
    const h = harness(vi.fn().mockResolvedValue({ text: JSON.stringify(candidates), ...fields }));
    await h.api.handleGeneratePersonas();
    expect(h.generated.data[0].name).toBe('Ada Lovelace');
    expect(h.generated.config.personaSource.groundingMetadata).toEqual(sourceUrls);
  });

  it('reports the known provider safety refusal without falsely claiming search lacked sources', async () => {
    const h = harness(vi.fn().mockResolvedValue({ text: 'Definition unavailable due to content safety filters.', groundingMetadata: null }));
    await h.api.handleGeneratePersonas();
    expect(h.toasts[0].message).toContain('content safety');
    expect(h.toasts[0].message).not.toContain('no attributable sources');
    expect(h.generated).toBe(h.previous);
  });

  it('reports a typed provider refusal distinctly from source-evidence failure', async () => {
    const h = harness(vi.fn().mockRejectedValue(Object.assign(new Error('The response was blocked.'), { classification: { kind: 'refusal' } })));
    await h.api.handleGeneratePersonas();
    expect(h.toasts[0].message).toContain('content safety');
    expect(h.toasts[0].message).not.toContain('no attributable sources');
    expect(h.generated).toBe(h.previous);
  });

  it('preserves legacy passage-based candidate responses that make no explicit search-envelope claim', async () => {
    const h = harness(vi.fn().mockResolvedValue(JSON.stringify(candidates)));
    await h.api.handleGeneratePersonas();
    expect(h.generated.data[0].name).toBe('Ada Lovelace');
    expect(h.generated.config.personaSource.groundingMetadata).toBeNull();
    expect(h.history).toContain(h.previous);
  });

  it('accepts attributable current-call grounding from a supported alternative envelope field', async () => {
    const h = harness(vi.fn().mockResolvedValue({ text: JSON.stringify(candidates), groundingMetadata: null, grounding: sourceUrls }));
    await h.api.handleGeneratePersonas();
    expect(h.generated.data[0].name).toBe('Ada Lovelace');
    expect(h.generated.config.personaSource.groundingMetadata).toEqual(sourceUrls);
    expect(h.history).toContain(h.previous);
  });

  it.each(['No candidate data', '[]', '{"unexpected":"object"}', '{bad json}'])('retains prior output and gives usable-response retry guidance for %s', async response => {
    const h = harness(vi.fn().mockResolvedValue(response));
    await h.api.handleGeneratePersonas();
    expect(h.generated).toBe(h.previous);
    expect(h.history).toHaveLength(2);
    expect(h.toasts[0].message).toContain('usable interview candidates');
  });

  it('uses a localized recovery message when available and an honest localized preservation suffix', async () => {
    const translated = { 'persona.candidates_no_sources': 'No se encontraron fuentes atribuibles.', 'persona.candidates_previous_kept': 'Se conservan las opciones anteriores.' };
    const h = harness(vi.fn().mockRejectedValue(new Error('Canvas web search returned no attributable sources.')), { t: key => translated[key] || key });
    await h.api.handleGeneratePersonas();
    expect(h.toasts[0].message).toBe('No se encontraron fuentes atribuibles. Se conservan las opciones anteriores.');
  });

  it('deduplicates repeated pending attempts and publishes only one result', async () => {
    const response = deferred();
    const callGemini = vi.fn(() => response.promise);
    const h = harness(callGemini);
    const first = h.api.handleGeneratePersonas();
    await h.api.handleGeneratePersonas();
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(h.pending).toBe(true);
    expect(h.generated).toBe(h.previous);
    response.resolve(sourcedResult());
    await first;
    expect(h.history).toHaveLength(3);
    expect(h.pending).toBe(false);
  });

  it.each(['success', 'failure'])('does not publish or show stale %s after navigating to another resource', async outcome => {
    const response = deferred();
    const h = harness(vi.fn(() => response.promise));
    const task = h.api.handleGeneratePersonas();
    const other = { id: 'other', type: 'notes', data: 'Current notes' };
    h.navigate(other);
    if (outcome === 'success') response.resolve(sourcedResult());
    else response.reject(new Error('Canvas web search returned no attributable sources.'));
    await task;
    expect(h.generated).toBe(other);
    expect(h.history).toHaveLength(2);
    expect(h.toasts).toEqual([]);
    expect(h.pending).toBe(false);
  });

  it('aborts a superseded context and prevents its failure from ending the newer pending attempt', async () => {
    const old = deferred(), current = deferred();
    const callGemini = vi.fn().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
    const h = harness(callGemini);
    const oldTask = h.api.handleGeneratePersonas();
    h.liveRef.current.sourceTopic = 'New source topic';
    const newTask = h.api.handleGeneratePersonas();
    expect(callGemini.mock.calls[0][5].aborted).toBe(true);
    old.reject(new Error('Canvas web search returned no attributable sources.'));
    await oldTask;
    expect(h.pending).toBe(true);
    expect(h.toasts).toEqual([]);
    current.resolve(sourcedResult());
    await newTask;
    expect(h.pending).toBe(false);
    expect(h.history).toHaveLength(3);
    expect(h.generated.config.personaSource.topic).toBe('New source topic');
  });

  it('reports a timeout truthfully, aborts the request, and ignores its late sourced result', async () => {
    vi.useFakeTimers();
    const response = deferred();
    const callGemini = vi.fn(() => response.promise);
    const h = harness(callGemini);
    const task = h.api.handleGeneratePersonas();
    await vi.advanceTimersByTimeAsync(90000);
    await task;
    expect(callGemini.mock.calls[0][5].aborted).toBe(true);
    expect(h.toasts[0].message).toContain('took too long');
    expect(h.toasts[0].message).not.toContain('no attributable sources');
    response.resolve(sourcedResult());
    await Promise.resolve();
    expect(h.generated).toBe(h.previous);
    expect(h.pending).toBe(false);
  });

  it('reports the timeout when an abort-aware provider rejects synchronously on timeout cancellation', async () => {
    vi.useFakeTimers();
    const callGemini = vi.fn((_, __, ___, ____, _____, signal) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('AI request cancelled.'), { name: 'AbortError' })))));
    const h = harness(callGemini);
    const task = h.api.handleGeneratePersonas();
    await vi.advanceTimersByTimeAsync(90000);
    await task;
    expect(h.toasts[0].message).toContain('took too long');
    expect(h.generated).toBe(h.previous);
  });
});
