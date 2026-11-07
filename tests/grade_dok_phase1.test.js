import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const babel = require('@babel/core');

const source = 'Earth completes one orbit around the Sun in approximately 365.25 days.';
let dispatcher, AnalysisView, root, container;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generation_matrix_module.js');
  loadAlloModule('generate_dispatcher_module.js');
  dispatcher = window.AlloModules.GenDispatcher;
  const compiled = babel.transformSync(readFileSync(resolve(process.cwd(), 'view_analysis_source.jsx'), 'utf8'), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
    babelrc: false, configFile: false, parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  });
  AnalysisView = new Function('window', 'React', compiled.code + '\nreturn AnalysisView;')(window, React);
});
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; container = null; });

const noop = () => {};
function rawReport(extra = {}) {
  return {
    readingLevel: { range: '7th Grade', explanation: 'Scientific vocabulary.' }, concepts: ['orbit'],
    accuracy: { rating: 'High', reason: 'Correct.', discrepancies: [], verifiedFacts: [] }, grammar: [], sourceLanguage: 'English', ...extra,
  };
}
function fixture(result, overrides = {}) {
  const callGemini = vi.fn(async () => JSON.stringify(result));
  const deps = new Proxy({
    gradeLevel: '5th Grade', history: [], inputText: source, differentiationRange: 'None', leveledTextLanguage: 'English',
    selectedLanguages: [], studentInterests: [], standardsInput: '', targetStandards: [], standardsPromptString: '', sourceTopic: '',
    currentUiLanguage: 'English', generatedContent: null, audioRef: { current: null }, alloBotRef: { current: null }, checkAccuracyWithSearch: false,
    GUIDED_STEPS: [], callGemini, calculateReadability: () => ({ words: 12, sentences: 1, syllables: 18, score: '8.0' }),
    setGeneratedContent: vi.fn(), setHistory: vi.fn(), cleanJson: String, dokLevel: 'Level 3: Strategic Thinking',
    getGroupDifferentiationContext: () => '', filterEducationalSources: c => c,
    extractSourceTextForProcessing: text => ({ text, englishBlock: text, isBilingual: false }),
    getDefaultTitle: () => 'Source Analysis', t: key => key, resolveTranslationPolicy: () => ({ enabled: false, target: 'English', mode: 'off' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop });
  return { deps, callGemini };
}

function recheckHandler() {
  const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = shell.indexOf('const recheckSourceAnalysis = ') + 'const recheckSourceAnalysis = '.length;
  const end = shell.indexOf(';\n  const handleRestoreView', start);
  expect(end).toBeGreaterThan(start);
  return new Function('isTeacherMode', 'isProcessing', 'gradeLevel', 'dokLevel', 'handleGenerate', '_resourceMutationStateRef', 'onUpdateResource', 'return ' + shell.slice(start, end));
}

describe('Source view check failures', () => {
  const broken = () => fixture(null, { addToast: vi.fn(), setError: vi.fn(), setHistory: vi.fn(() => { throw new Error('storage broke'); }) }).deps;
  it('returns the reason instead of switching to the error screen when asked', async () => {
    const deps = broken();
    const result = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true, inlineFailure: true }, false, deps);
    expect(result.failureMessage).toMatch(/Error generating content/);
    expect(deps.setError.mock.calls.filter(([value]) => value)).toEqual([]);
    expect(deps.addToast).toHaveBeenCalledWith(result.failureMessage, 'error');
  });
  it('keeps the error screen for every other caller', async () => {
    const deps = broken();
    const result = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true }, false, deps);
    expect(result).toBeUndefined();
    expect(deps.setError).toHaveBeenLastCalledWith(expect.stringMatching(/Error generating content/));
  });
});

describe('Analyze Source: Depth of Knowledge estimate and targets', () => {
  it.each(['unstructured response', '{}', '[]', '{"accuracy":[]}', '{"readingLevel":""}', '{"readingLevel":" "}', '{"accuracy":"Unknown"}', '{"accuracy":{"rating":"unknown"}}', '{"concepts":["N/A"]}', ''])('keeps an unusable first check retryable (%s)', async response => {
    const { deps } = fixture(null, { callGemini: vi.fn(async () => response), addToast: vi.fn() });
    const item = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true }, false, deps);
    expect(item.data).toMatchObject({ analysisIncomplete: true, originalText: source, localStats: { score: '8.0' } });
    expect(item.data.concepts).toBeUndefined();
    expect(item.data.accuracy).toBeUndefined();
    expect(deps.setHistory.mock.calls[0][0]([])).toEqual([item]);
    expect(deps.addToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(window.AlloModules.GenerationMatrix.findExistingSourceAnalysis([item], source)).toBeNull();
  });
  it('keeps an unstructured local response incomplete without requesting a second local generation', async () => {
    const previous = window.__alloActiveAIBackend;
    try {
      window.__alloActiveAIBackend = { backend: 'ollama' };
      const { deps } = fixture(null, { callGemini: vi.fn(async () => 'No structured output.') });
      const item = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true }, false, deps);
      expect(item.data).toMatchObject({ analysisIncomplete: true, originalText: source, localStats: { score: '8.0' } });
      expect(deps.callGemini).toHaveBeenCalledTimes(1);
      expect(window.AlloModules.GenerationMatrix.findExistingSourceAnalysis([item], source)).toBeNull();
    } finally {
      if (previous === undefined) delete window.__alloActiveAIBackend;
      else window.__alloActiveAIBackend = previous;
    }
  });
  it('resumes after the last confirmed section and only then accepts the full local passage', async () => {
    const text = 'Seeds grow. '.repeat(800) + 'New evidence changes the conclusion. '.repeat(260) + 'END OF LESSON.';
    const matrix = window.AlloModules.GenerationMatrix;
    const previous = window.__alloActiveAIBackend;
    try {
      window.__alloActiveAIBackend = { backend: 'ollama' };
      const provider = vi.fn()
        .mockResolvedValueOnce(JSON.stringify(rawReport({ concepts: ['first section'], accuracy: { rating: 'High', verifiedFacts: ['A local observation [1].'] } })))
        .mockResolvedValueOnce(JSON.stringify(rawReport({ concepts: ['middle section'] })))
        .mockResolvedValueOnce('unstructured')
        .mockResolvedValueOnce(JSON.stringify(rawReport({ concepts: ['ending'], readingLevel: '10th Grade' })));
      const measure = vi.fn(() => ({ score: 7.2 }));
      const { deps } = fixture(null, { inputText: text, callGemini: provider, calculateReadability: measure });
      const run = (extra = {}) => dispatcher.handleGenerate('analysis', null, false, text, { stayOnView: true }, false, Object.assign(deps, extra));
      let saved = await run();
      expect(provider).toHaveBeenCalledTimes(1);
      expect(provider.mock.calls[0][0]).not.toContain('END OF LESSON.');
      expect(saved.data).toMatchObject({ originalText: text, localStats: { score: 7.2 }, analysisIncomplete: true });
      expect(saved.data.analysisCoverage.sections[0].report.accuracy).toMatchObject({ verifiedFacts: [], unsourcedFacts: ['A local observation.'] });
      expect(matrix.findExistingSourceAnalysis([saved], text)).toBeNull();
      expect(measure).toHaveBeenCalledWith(text);
      const checkpoint = vi.fn(data => { saved = { ...saved, data }; return true; });
      const failed = await run({ returnAnalysisDraft: true, resumeAnalysis: saved, onAnalysisSectionChecked: checkpoint });
      expect(failed).toBeUndefined();
      expect(checkpoint).toHaveBeenCalledOnce();
      expect(matrix.getSourceAnalysisCoverage(saved).sections).toHaveLength(2);
      expect(matrix.findExistingSourceAnalysis([saved], text)).toBeNull();
      const finished = await run({ returnAnalysisDraft: true, resumeAnalysis: saved, onAnalysisSectionChecked: checkpoint });
      expect(provider).toHaveBeenCalledTimes(4);
      expect(provider.mock.calls[2][0]).toBe(provider.mock.calls[3][0]);
      expect(provider.mock.calls[3][0]).toContain('END OF LESSON.');
      const coverage = matrix.getSourceAnalysisCoverage(finished);
      expect(coverage).toMatchObject({ complete: true, total: text.length, through: text.length });
      expect(finished.data.concepts).toEqual(['first section', 'middle section', 'ending']);
      expect(finished.data.accuracy).toMatchObject({ verifiedFacts: [], unsourcedFacts: ['A local observation.'] });
      expect(finished.data.readingLevel.range).toBe('Varies by section');
      expect(matrix.findExistingSourceAnalysis([finished], text)).toBe(finished);
      expect(coverage.sections.map(({ start,end }) => text.slice(start,end)).join('')).toBe(text);
      expect(coverage.sections.every(section => section.end - section.start <= 7000)).toBe(true);
      const altered = { ...finished, data: { ...finished.data, originalText: text.replace('Seeds', 'Roots') } };
      expect(matrix.getSourceAnalysisCoverage(altered).through).toBe(0);
      expect(matrix.findExistingSourceAnalysis([altered], altered.data.originalText)).toBeNull();
      expect(deps.setHistory).toHaveBeenCalledTimes(1);
    } finally {
      if (previous === undefined) delete window.__alloActiveAIBackend;
      else window.__alloActiveAIBackend = previous;
    }
  });
  it('keeps only the confirmed prefix when a saved section is oversized, empty or a display placeholder', () => {
    const text = 'A long passage. '.repeat(610);
    const fingerprint = window.AlloModules.InstructionalContext.fingerprintText(text);
    const matrix = window.AlloModules.GenerationMatrix;
    const good = { start: 0, end: 5000, report: rawReport() };
    const record = sections => ({ id: 'import', type: 'analysis', data: { originalText: text, analysisCoverage: { sourceFingerprint: fingerprint, sections } } });
    const oversized = record([{ ...good, end: text.length }]);
    expect(matrix.getSourceAnalysisCoverage(oversized).through).toBe(0);
    for (const bad of [{ readingLevel: {}, concepts: [], accuracy: {} }, { readingLevel: { range: 'N/A', explanation: 'Could not determine level.' },
      concepts: [], accuracy: { rating: 'Unknown', reason: 'Could not verify accuracy.' } }]) {
      const item = record([good, { start: good.end, end: text.length, report: bad }]);
      expect(matrix.getSourceAnalysisCoverage(item)).toMatchObject({ through: good.end, complete: false });
      expect(matrix.findExistingSourceAnalysis([item], text)).toBeNull();
    }
  });
  it('commits continuation to the original report and discards late results after an edit', async () => {
    const text = 'A moon lesson. '.repeat(1170);
    const previous = window.__alloActiveAIBackend;
    try {
      window.__alloActiveAIBackend = { backend: 'ollama' };
      const { deps } = fixture(rawReport(), { inputText: text });
      const initial = await dispatcher.handleGenerate('analysis', null, false, text, { stayOnView: true }, false, deps);
      let live = initial;
      const update = (id, apply, options) => {
        expect([id, options.returnUpdated]).toEqual([initial.id, true]);
        const next = apply(live);
        if (next === live) return false;
        live = next;
        return live;
      };
      const generate = (type, lang, loading, passage, config, switchView, extra) =>
        dispatcher.handleGenerate(type, lang, loading, passage, config, switchView, Object.assign(deps, extra));
      const resume = recheckHandler()(true, false, '', '', generate, { current: { isTeacherMode: true } }, update);
      await resume(initial);
      expect(live.id).toBe(initial.id);
      expect(window.AlloModules.GenerationMatrix.getSourceAnalysisCoverage(live)).toMatchObject({ complete: true, through: text.length });
      live = initial;
      deps.callGemini = vi.fn(async () => {
        live = { ...live, data: { originalText: 'Edited during analysis.', analysisNeedsRecheck: true } };
        return JSON.stringify(rawReport());
      });
      await resume(initial);
      expect(deps.callGemini).toHaveBeenCalledOnce();
      expect(live.data).toEqual({ originalText: 'Edited during analysis.', analysisNeedsRecheck: true });
      expect(deps.setHistory).toHaveBeenCalledOnce();
    } finally {
      if (previous === undefined) delete window.__alloActiveAIBackend;
      else window.__alloActiveAIBackend = previous;
    }
  });
  it('checks every local section in batch requests and recognizes older excerpt-only reports', async () => {
    const text = 'Clouds bring rain. '.repeat(410) + 'ENDING.';
    const matrix = window.AlloModules.GenerationMatrix;
    const legacy = { id: 'old', type: 'analysis', meta: 'Standard - Local', data: { originalText: text, ...rawReport() } };
    expect(matrix.getSourceAnalysisCoverage(legacy)).toMatchObject({ legacy: true, complete: false });
    expect(matrix.findExistingSourceAnalysis([legacy], text)).toBeNull();
    expect(matrix.findExistingSourceAnalysis([{ ...legacy, meta: 'Standard' }], text)?.id).toBe('old');
    const previous = window.__alloActiveAIBackend;
    try {
      window.__alloActiveAIBackend = { backend: 'ollama' };
      const { deps, callGemini } = fixture(rawReport(), { inputText: text });
      const complete = await dispatcher.handleGenerate('analysis', null, false, text, { rethrowErrors: true }, false, deps);
      expect(callGemini).toHaveBeenCalledTimes(2);
      expect(matrix.getSourceAnalysisCoverage(complete).complete).toBe(true);
      expect(callGemini.mock.calls[1][0]).toContain('ENDING.');
      const { deps: failed } = fixture(null, { inputText: text, callGemini: vi.fn().mockResolvedValueOnce(JSON.stringify(rawReport())).mockResolvedValueOnce('Error') });
      await expect(dispatcher.handleGenerate('analysis', null, false, text, { rethrowErrors: true }, false, failed)).rejects.toThrow(/section/i);
      expect(failed.setHistory).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete window.__alloActiveAIBackend;
      else window.__alloActiveAIBackend = previous;
    }
  });
  it('accepts a repaired first check and propagates an unusable check to batch callers', async () => {
    const { deps } = fixture(null, { callGemini: vi.fn().mockResolvedValueOnce('Unexpected response.').mockResolvedValueOnce(JSON.stringify(rawReport())) });
    const repaired = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true }, false, deps);
    expect(repaired.data.concepts).toEqual(['orbit']);
    expect(window.AlloModules.GenerationMatrix.findExistingSourceAnalysis([repaired], source)).toBe(repaired);
    const failed = fixture({});
    await expect(dispatcher.handleGenerate('analysis', null, false, source, { rethrowErrors: true }, false, failed.deps)).rejects.toThrow(/retry/i);
    expect(failed.deps.setHistory).not.toHaveBeenCalled();
  });
  it('keeps an unsuccessful recheck retryable instead of treating a format-error placeholder as a checked report', async () => {
    const { deps } = fixture(rawReport(), { returnAnalysisDraft: true, callGemini: vi.fn(async () => 'An unstructured response.'), addToast: vi.fn() });
    const result = await dispatcher.handleGenerate('analysis', null, false, source, { stayOnView: true }, false, deps);
    expect(result).toBeUndefined();
    expect(deps.setHistory).not.toHaveBeenCalled();
    expect(deps.callGemini).toHaveBeenCalledTimes(2);
    expect(deps.addToast).toHaveBeenCalledWith(expect.stringMatching(/retry/i), 'error');
  });
  it.each(['analysisNeedsRecheck', 'analysisIncomplete'])('rechecks a report marked %s in place and leaves a later edit untouched', async flag => {
    const handler = recheckHandler();
    const initial = { id: 'edited-report', _artifactInstanceId: 'copy-a', type: 'analysis', title: 'Teacher’s title', data: { originalText: source, [flag]: true, sourceLanguage: 'English', analysisTargets: { grade: '5th Grade', dok: 'Level 2' } } };
    let live = { ...initial, title: 'Title updated while checking' };
    const { deps } = fixture(rawReport());
    const generate = async (type, language, loading, input, options, switchView, overrides) => dispatcher.handleGenerate(type, language, loading, input, options, switchView, Object.assign(deps, overrides));
    const update = (id, apply, options) => { expect([id, options.instanceId]).toEqual([initial.id, 'copy-a']); live = apply(live); return options.returnUpdated ? live : true; };
    const opened = await handler(true, false, '12th Grade', '', generate, { current: { isTeacherMode: true } }, update)(initial);
    expect(opened).toBe(live);
    expect(live).toMatchObject({ id: initial.id, title: 'Title updated while checking', data: { originalText: source, concepts: ['orbit'] } });
    expect(live.data.analysisNeedsRecheck).toBeUndefined();
    expect(deps.setHistory).not.toHaveBeenCalled();
    expect(deps.setGeneratedContent).not.toHaveBeenCalled();
    const checked = live;
    live = { ...initial, data: { ...initial.data, originalText: 'A newer edit.' } };
    await handler(true, false, '12th Grade', '', async () => checked, { current: { isTeacherMode: true } }, update)(initial);
    expect(live.data).toMatchObject({ originalText: 'A newer edit.', [flag]: true });
  });
  it('analyzes the edited wording, not the wording saved in the report it replaces', async () => {
    const edited = source + ' Tides follow the Moon.';
    const initial = { id: 'old-report', type: 'analysis', title: 'Teacher’s title', sourceFamilyId: 'old-report', config: { grade: '5th Grade', language: 'English' },
      sourceSnapshot: window.AlloModules.InstructionalContext.createSourceSnapshot(source, { sourceArtifactId: 'old-report', language: 'English' }),
      data: { originalText: source, sourceLanguage: 'English', concepts: ['old finding'], readingLevel: { range: 'Grade 3' }, accuracy: { rating: 'High', reason: '' }, grammar: [] } };
    let live = initial;
    const { deps, callGemini } = fixture(rawReport(), { history: [initial], inputText: edited });
    const generate = async (type, language, loading, input, options, switchView, overrides) => dispatcher.handleGenerate(type, language, loading, input, options, switchView, Object.assign(deps, overrides));
    const update = (id, apply) => { const next = apply(live); if (next === live) return false; live = next; return live; };
    globalThis._alloHostHandlers = () => ({ analysisForSourceText: (item, text) => ({ ...item, data: { ...item.data, originalText: text } }) });
    try {
      const opened = await recheckHandler()(true, false, '5th Grade', '', generate, { current: { isTeacherMode: true } }, update)(initial, { replace: true, text: edited, inlineFailure: true });
      expect(opened).toBe(live);
      expect(callGemini.mock.calls.some(([prompt]) => String(prompt).includes('Tides follow the Moon.'))).toBe(true);
      expect(live).toMatchObject({ id: 'old-report', title: 'Teacher’s title', data: { originalText: edited, concepts: ['orbit'] } });
      expect(deps.setHistory).not.toHaveBeenCalled();
      expect(deps.setGeneratedContent).not.toHaveBeenCalled();
    } finally { delete globalThis._alloHostHandlers; }
  });
  it('keeps a well-formed estimate, rounds the level and caps the ideas', () => {
    const r = dispatcher.normalizeAnalysisResult(rawReport({ depthOfKnowledge: { level: '2', reason: 'Facts only.', ideas: ['a', 'b', 'c', 'd', 'e'] } }));
    expect(r.depthOfKnowledge).toEqual({ level: 2, reason: 'Facts only.', ideas: ['a', 'b', 'c', 'd'] });
  });
  it('drops malformed or out-of-range estimates', () => {
    for (const bad of [undefined, null, 'three', [], { level: 0 }, { level: 5 }, { level: 'x' }]) {
      expect(dispatcher.normalizeAnalysisResult(rawReport({ depthOfKnowledge: bad })).depthOfKnowledge, JSON.stringify(bad)).toBeUndefined();
    }
  });
  it('asks for the estimate, names the teacher target and records the targets used', async () => {
    const f = fixture(rawReport({ depthOfKnowledge: { level: 2, reason: 'r', ideas: ['i'] } }));
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    const prompt = f.callGemini.mock.calls[0][0];
    expect(prompt).toContain('Depth of Knowledge');
    expect(prompt).toContain("The teacher is aiming for Webb's Depth of Knowledge Level 3: Strategic Thinking");
    expect(item.data.depthOfKnowledge.level).toBe(2);
    expect(item.data.analysisTargets).toEqual({ grade: '5th Grade', dok: 'Level 3: Strategic Thinking' });
  });
  it('states no target when none is set', async () => {
    const f = fixture(rawReport(), { dokLevel: '' });
    const item = await dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);
    expect(f.callGemini.mock.calls[0][0]).not.toContain('The teacher is aiming for');
    expect(item.data.analysisTargets.dok).toBe('');
  });
});

describe('Lesson Images: grade guidance', () => {
  const src = readFileSync(resolve(process.cwd(), 'generate_dispatcher_source.jsx'), 'utf8');
  it('limits labels by grade band in both prompts', () => {
    const fn = src.slice(src.indexOf('const _imageGradeGuidance'), src.indexOf('const createAnalysisSourceContent'));
    const guide = new Function(fn + '\nreturn _imageGradeGuidance;')();
    expect([guide('Kindergarten'), guide('2nd Grade'), guide('4th Grade'), guide('7th Grade'), guide('11th Grade'), guide('College')].map(g => g.maxLabels)).toEqual([4, 4, 6, 8, 10, 10]);
    expect(guide('')).toBeNull();
    expect(src).toContain('Audience: ${effectiveGrade} students.');
    expect(src).toContain('For ${effectiveGrade} students: at most');
  });
});

describe('Analysis view: fit to your targets', () => {
  function show(data, extra = {}) {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    const props = new Proxy({
      generatedContent: { id: 'a', type: 'analysis', data: { analysisSourceVersion: 1, originalText: source, rawEnglishText: source, sourceLanguage: 'English', reportLanguage: 'English',
        readingLevel: { range: '5th Grade', explanation: 'x' }, concepts: [], accuracy: { rating: 'High', reason: 'r', discrepancies: [], verifiedFacts: [] }, grammar: [], ...data } },
      isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null, selectedDiscrepancies: new Set(), selectedGrammarErrors: new Set(), analysisEditorRef: { current: null },
      t: key => (data.__t && key === 'input.level_options.g5' ? '5.º grado' : key), formatInlineText: x => x, renderFormattedText: x => x, splitReferencesFromBody: x => ({ body: x, references: '' }),
      BilingualFieldRenderer: p => React.createElement('span', null, p.text), SourceReferencesPanel: () => null, ...extra,
    }, { get: (target, key) => key in target ? target[key] : noop });
    act(() => root.render(React.createElement(AnalysisView, props)));
    return container.querySelector('[data-analysis-target-fit]');
  }
  const stats = (score, words = 100, sentences = 4, syllables = 160) => ({ words, sentences, syllables, score });
  it('shows a conflicting qualitative estimate beside the formula without averaging them', () => {
    const card = show({ analysisTargets: { grade: '5th Grade' }, localStats: stats('5.5'), readingLevel: { range: '7th–8th Grade', explanation: 'The passage assumes knowledge of cell division.' } });
    expect(card.querySelector('[data-grade-fit]').dataset.gradeFit).toBe('within');
    expect(card.querySelector('[data-qualitative-fit]').dataset.qualitativeFit).toBe('above');
    expect(card.querySelector('[data-fit-disagreement]')).toBeTruthy();
    expect(card.textContent).toContain('cell division');
  });
  it('lets the teacher edit an idea and choose the resource before generation', () => {
    const generate = vi.fn();
    const card = show({ depthOfKnowledge: { level: 2, ideas: ['Compare two orbits'] } }, { onGenerateFromIdea: generate });
    act(() => card.querySelector('li button').click());
    const form = card.querySelector('form');
    expect(form.querySelector('textarea').value).toBe('Compare two orbits');
    act(() => { const select = form.querySelector('select'); select.value = 'quiz'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(generate).not.toHaveBeenCalled();
    act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(generate).toHaveBeenCalledWith('quiz', 'Compare two orbits');
  });
  it('flags text above the grade with sentence and word tips from the local measurement', () => {
    const card = show({ analysisTargets: { grade: '5th Grade', dok: '' }, localStats: stats('12.4', 100, 4, 190) });
    expect(card.querySelector('[data-grade-fit="above"]')).toBeTruthy();
    expect(card.textContent).toContain('Flesch-Kincaid 12.4');
    expect(card.querySelector('[data-fit-tip="sentences"]').textContent).toContain('25.0');
    expect(card.querySelector('[data-fit-tip="syllables"]')).toBeTruthy();
  });
  it('names the grade with the grade picker translation', () => {
    const card = show({ analysisTargets: { grade: '5th Grade', dok: '' }, localStats: stats('12.4', 100, 4, 190), __t: true });
    expect(card.textContent).toContain('5.º grado');
    expect(card.textContent).not.toContain('5th Grade');
  });
  it('reports within and below without tips', () => {
    const within = show({ analysisTargets: { grade: '5th Grade', dok: '' }, localStats: stats('5.5', 100, 8, 140) });
    expect(within.querySelector('[data-grade-fit="within"]')).toBeTruthy();
    expect(within.querySelector('[data-fit-tip]')).toBeNull();
    act(() => root.unmount()); container.remove();
    const below = show({ analysisTargets: { grade: '8th Grade', dok: '' }, localStats: stats('2.1', 100, 12, 120) });
    expect(below.querySelector('[data-grade-fit="below"]')).toBeTruthy();
  });
  it('makes no grade comparison for a non-English source', () => {
    const card = show({ sourceLanguage: 'Spanish', analysisTargets: { grade: '5th Grade', dok: '' }, localStats: stats('12.4') });
    expect(card.querySelector('[data-grade-fit]')).toBeNull();
    expect(card.textContent).toContain('no grade comparison');
  });
  it('compares the Depth of Knowledge estimate with the target and lists ideas', () => {
    const met = show({ analysisTargets: { grade: '', dok: 'Level 2: Skill/Concept' }, depthOfKnowledge: { level: 3, reason: 'Compares causes.', ideas: ['Compare two orbits'] } });
    expect(met.querySelector('[data-dok-level="3"][data-dok-target="2"]')).toBeTruthy();
    expect(met.textContent).toContain('this text can support it');
    expect(met.textContent).toContain('Ideas to go further');
    act(() => root.unmount()); container.remove();
    const below = show({ analysisTargets: { grade: '', dok: 'Level 3: Strategic Thinking' }, depthOfKnowledge: { level: 1, reason: 'Lists facts.', ideas: ['Ask why'] } });
    expect(below.textContent).toContain('this text alone reaches DOK 1');
    expect(below.textContent).toContain('Ideas to reach your target');
    expect(below.textContent).toContain('Ask why');
  });
  it('shows nothing when there is nothing to compare', () => {
    expect(show({})).toBeNull();
  });
});
