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

describe('Analyze Source: Depth of Knowledge estimate and targets', () => {
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
  function show(data) {
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    const props = new Proxy({
      generatedContent: { id: 'a', type: 'analysis', data: { analysisSourceVersion: 1, originalText: source, rawEnglishText: source, sourceLanguage: 'English', reportLanguage: 'English',
        readingLevel: { range: '5th Grade', explanation: 'x' }, concepts: [], accuracy: { rating: 'High', reason: 'r', discrepancies: [], verifiedFacts: [] }, grammar: [], ...data } },
      isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null, selectedDiscrepancies: new Set(), selectedGrammarErrors: new Set(), analysisEditorRef: { current: null },
      t: key => (data.__t && key === 'input.level_options.g5' ? '5.º grado' : key), formatInlineText: x => x, renderFormattedText: x => x, splitReferencesFromBody: x => ({ body: x, references: '' }),
      BilingualFieldRenderer: p => React.createElement('span', null, p.text), SourceReferencesPanel: () => null,
    }, { get: (target, key) => key in target ? target[key] : noop });
    act(() => root.render(React.createElement(AnalysisView, props)));
    return container.querySelector('[data-analysis-target-fit]');
  }
  const stats = (score, words = 100, sentences = 4, syllables = 160) => ({ words, sentences, syllables, score });
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
