import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Analyze Source Material review fixes (2026-09-27). Each env var swaps in a
// scratch copy of one file so the suite can be mutation-checked.
const read = (envName, file) => fs.readFileSync(path.resolve(process.cwd(), process.env[envName] || file), 'utf8');
const VIEW_MODULE = read('FIX0927_AN_VIEW_MODULE', 'view_analysis_module.js');
const HOST_SOURCE = read('FIX0927_AN_HOST', 'host_handlers_source.jsx');
const DISPATCH_SOURCE = read('FIX0927_AN_DISPATCH', 'generate_dispatcher_source.jsx');
const ANTI = read('FIX0927_AN_ANTI', 'AlloFlowANTI.txt').replace(/\r\n/g, '\n');

const require = createRequire(import.meta.url);
const modulesDir = path.resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, createRoot, act, AnalysisView, Dispatcher, useSelection;
const createHostHandlers = new Function(HOST_SOURCE + '\nreturn createHostHandlers;')();

beforeAll(() => {
  React = require(path.resolve(modulesDir, 'react'));
  ({ createRoot } = require(path.resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(path.resolve(modulesDir, 'react-dom/test-utils')));
  global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.AlloModules = {};
  (0, eval)(VIEW_MODULE);
  (0, eval)('(function(){\n' + DISPATCH_SOURCE + '\n})()');
  AnalysisView = window.AlloModules.AnalysisView;
  Dispatcher = window.AlloModules.GenDispatcher;
  const start = ANTI.indexOf('  const [selectedDiscrepancies, setSelectedDiscrepancies] = useState(new Set());');
  const end = ANTI.indexOf('  const toggleGrammarErrorSelection = (index) => {', start);
  if (start < 0 || end < 0) throw new Error('Analysis selection state moved; retarget this test');
  useSelection = new Function('useState', 'useEffect', 'useRef', 'return function useSelection(generatedContent, activeView) {\n'
    + ANTI.slice(start, end)
    + '\nreturn { selectedDiscrepancies, toggleDiscrepancySelection, selectedGrammarErrors, setSelectedGrammarErrors };\n};')(React.useState, React.useEffect, React.useRef);
});

let container, root;
function render(Component, props) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(React.createElement(Component, props)); });
  return container;
}
afterEach(() => {
  if (root) act(() => root.unmount());
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null; container = null;
  delete window.AlloModules.InstructionalContext;
});

function makeProps(data, overrides = {}) {
  return {
    generatedContent: { id: 'analysis-a', type: 'analysis', data: {
      originalText: 'The quick brown fox jumps over the lazy dog.',
      readingLevel: { range: '5th Grade', explanation: 'Simple.' }, concepts: ['Foxes'],
      accuracy: { rating: 'High', reason: 'ok', discrepancies: [], verifiedFacts: [] }, grammar: [], ...data } },
    isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null,
    selectedDiscrepancies: new Set(), selectedGrammarErrors: new Set([0]), analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(), toggleGrammarErrorSelection: vi.fn(), setGeneratedContent: vi.fn(), setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(), setInputText: vi.fn(), setSelectedGrammarErrors: vi.fn(), setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(), handleAnalysisTextChange: vi.fn(), handleAutoCorrectSource: vi.fn(), handleDownloadAudio: vi.fn(),
    handleFormatText: vi.fn(), handleToggleIsEditingAnalysis: vi.fn(), addToast: vi.fn(), callGemini: vi.fn(), warnLog: () => {},
    t: key => key, formatInlineText: text => text, renderFormattedText: text => text,
    splitReferencesFromBody: text => ({ body: text, references: '' }),
    BilingualFieldRenderer: props => React.createElement('span', null, props.text), SourceReferencesPanel: () => null,
    ...overrides
  };
}
const buttons = el => [...el.querySelectorAll('button')];

describe('malformed analysis output', () => {
  it('renders odd shapes instead of crashing the view', () => {
    const el = render(AnalysisView, makeProps({ readingLevel: null, concepts: 'Photosynthesis',
      accuracy: { rating: { level: 'High' }, reason: 5, discrepancies: 'none', verifiedFacts: { fact: 'x' } } }));
    expect(el.textContent).toContain('Photosynthesis');
    expect(el.textContent).toContain('Not rated');
  });

  it('does not claim "no issues" when grammar notes could not be read', () => {
    const el = render(AnalysisView, makeProps({ grammar: [{ error: 'recieve', correction: 'receive' }] }));
    expect(el.textContent).not.toContain('analysis.no_grammar_errors');
    expect(el.textContent).toContain('Some grammar notes could not be read');
  });

  it('the dispatcher turns object-shaped notes into readable strings', () => {
    const normalize = Dispatcher && Dispatcher.normalizeAnalysisResult;
    expect(typeof normalize).toBe('function');
    const result = normalize({ readingLevel: '6th-8th Grade', concepts: [{ term: 'Energy' }, 'Matter', { nothing: 1 }],
      accuracy: { rating: 'High', reason: 'ok', discrepancies: [{ claim: 'Water boils at 90 C', correction: '100 C' }], verifiedFacts: 'The sun is a star.' },
      grammar: [{ error: 'recieve', correction: 'receive', explanation: 'spelling' }, 'Missing comma.', [1, 2]], translatedText: { es: 'Hola' } });
    expect(result.readingLevel).toMatchObject({ range: '6th-8th Grade' });
    expect(result.concepts).toEqual(['Energy', 'Matter']);
    expect(result.accuracy.discrepancies).toEqual(['Water boils at 90 C - 100 C']);
    expect(result.accuracy.verifiedFacts).toEqual(['The sun is a star.']);
    expect(result.grammar).toEqual(['recieve -> receive: spelling', 'Missing comma.']);
    expect(result.grammarUnreadable).toBe(1);
    expect(result.translatedText).toBeUndefined();
    expect(normalize({ accuracy: 'Mostly accurate', grammar: 'None detected' })).toMatchObject({ accuracy: { rating: 'Unknown', reason: 'Mostly accurate', discrepancies: [], verifiedFacts: [] }, grammar: ['None detected'], concepts: [] });
    expect(DISPATCH_SOURCE).toMatch(/analysisData = normalizeAnalysisResult\(analysisData\);/);
  });
});

describe('students see the source text, not the teacher analysis', () => {
  it('renders only the original text and Read with supports in student mode', () => {
    const el = render(AnalysisView, makeProps({ grammar: ['Missing comma'], accuracy: { rating: 'Moderate', reason: 'Dates unverified', discrepancies: ['Wrong year [1]'], verifiedFacts: [] } },
      { isTeacherMode: false, onReadOriginal: vi.fn() }));
    const text = el.textContent;
    expect(text).toContain('The quick brown fox');
    expect(buttons(el).some(button => button.textContent === 'Read with supports')).toBe(true);
    for (const hidden of ['analysis.header_description', 'output.analysis_verification', 'output.analysis_grammar', 'Not designated', 'Moderate', 'Missing comma', 'Wrong year']) {
      expect(text).not.toContain(hidden);
    }
  });
});

describe('grammar fixes with translation on', () => {
  it('offers no Fix Grammar on a translated display, only dismissal', () => {
    const el = render(AnalysisView, makeProps({ originalText: 'El zorro salta.', translatedText: 'El zorro salta.', rawEnglishText: 'The fox jupms.', grammar: ['Spelling: jupms'] }));
    expect(buttons(el).some(button => button.textContent.includes('analysis.fix_grammar_button'))).toBe(false);
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(0);
    expect(buttons(el).some(button => (button.getAttribute('aria-label') || '').startsWith('analysis.grammar_dismiss_one'))).toBe(true);
    expect(el.textContent).toContain('not the translation shown here');
  });
});

describe('analysis labels go through the translation helper', () => {
  it('uses translated role, issue and checkbox labels', () => {
    const dictionary = { 'simplified.role_not_designated': 'SIN-DESIGNAR', 'analysis.issue_plural': 'PROBLEMAS', 'analysis.include_in_correction': 'INCLUIR' };
    const el = render(AnalysisView, makeProps({ grammar: ['One', 'Two'] }, { selectedGrammarErrors: new Set([0, 1]), t: key => dictionary[key] || key }));
    expect(el.textContent).toContain('SIN-DESIGNAR');
    expect(el.textContent).toContain('2 PROBLEMAS');
    expect(el.querySelector('input[type=checkbox]').getAttribute('title')).toBe('INCLUIR');
  });
});

describe('teacher "ignore" choices survive unrelated edits', () => {
  let current;
  const Harness = ({ gc, view }) => { current = useSelection(gc, view); return null; };
  const analysisItem = (id, grammar, accuracy) => ({ id, type: 'analysis', data: { grammar, accuracy } });

  it('dismissing one grammar note does not re-select notes the teacher excluded', () => {
    const accuracy = { discrepancies: [] };
    render(Harness, { gc: analysisItem('A', ['a', 'b', 'c'], accuracy), view: 'analysis' });
    expect([...current.selectedGrammarErrors].sort()).toEqual([0, 1, 2]);
    act(() => current.setSelectedGrammarErrors(new Set([0, 2])));
    act(() => root.render(React.createElement(Harness, { gc: analysisItem('A', ['✓ DISMISSED: a', 'b', 'c'], accuracy), view: 'analysis' })));
    expect([...current.selectedGrammarErrors].sort()).toEqual([2]);
    act(() => root.render(React.createElement(Harness, { gc: analysisItem('B', ['x', 'y'], { discrepancies: [] }), view: 'analysis' })));
    expect([...current.selectedGrammarErrors].sort()).toEqual([0, 1]);
  });

  it('an unrelated edit to the resource does not reset discrepancy choices', () => {
    const accuracy = { discrepancies: ['d1', 'd2'] };
    render(Harness, { gc: analysisItem('A', ['a'], accuracy), view: 'analysis' });
    expect([...current.selectedDiscrepancies].sort()).toEqual([0, 1]);
    act(() => current.toggleDiscrepancySelection(1));
    act(() => root.render(React.createElement(Harness, { gc: analysisItem('A', ['✓ DISMISSED: a'], accuracy), view: 'analysis' })));
    expect([...current.selectedDiscrepancies]).toEqual([0]);
  });
});

function refineHost({ original = 'The quick brown fox jumps over the lazy dog near the quiet river bank today.' } = {}) {
  const A = { id: 'analysis-a', type: 'analysis', data: { originalText: original, grammar: ['Spelling: quiet'] } };
  const B = { id: 'analysis-b', type: 'analysis', data: { originalText: 'Other source.', grammar: [] } };
  const state = { history: [A, B], generatedContent: A, inputText: original };
  window.AlloModules.InstructionalContext = {
    resolveArtifactContext: () => ({ grade: '5', language: 'English' }), isEnglishLanguage: () => true,
    getInstructionalText: item => ({ item }), withComplexityEvidence: () => ({ text: 'fresh' }), invalidateComplexityEvidence: () => ({ text: 'fresh' })
  };
  let release;
  const scope = {
    _resourceMutationStateRef: { current: state }, generatedContent: A, inputText: original, gradeLevel: '5', leveledTextLanguage: 'English',
    sourceRefineInstruction: 'Simplify', setSourceRefineInstruction: vi.fn(), setIsProcessing: vi.fn(), setGenerationStep: vi.fn(),
    addToast: vi.fn(), t: k => k, warnLog: vi.fn(), _recordTextChange: vi.fn(),
    splitReferencesFromBody: text => ({ body: text }), extractSourceTextForProcessing: text => ({ text, isBilingual: false }),
    setHistory: fn => { state.history = fn(state.history); },
    setGeneratedContent: value => { state.generatedContent = typeof value === 'function' ? value(state.generatedContent) : value; },
    setInputText: value => { state.inputText = typeof value === 'function' ? value(state.inputText) : value; },
    callGemini: vi.fn(() => new Promise(resolve => { release = resolve; }))
  };
  const handlers = createHostHandlers(scope);
  scope.onUpdateResource = handlers.onUpdateResource;
  scope.handleAnalysisTextChange = value => handlers.handleAnalysisTextChange(value);
  scope._getFreshTextComplexityEvidence = (...args) => handlers._getFreshTextComplexityEvidence(...args);
  return { state, scope, A, B, run: () => handlers.handleAiRefineSource(), release: value => release(value) };
}

describe('AI refine source writes only to its own, unchanged resource', () => {
  it('a late result lands on resource A without jumping the view or restoring stale findings', async () => {
    const h = refineHost();
    const pending = h.run();
    h.state.generatedContent = h.B;
    h.state.history = [{ ...h.A, data: { ...h.A.data, grammar: ['✓ DISMISSED: Spelling: quiet'] } }, h.B];
    const refined = 'The quick brown fox leaps over the lazy dog near the calm river bank today.';
    h.release(refined);
    await pending;
    expect(h.state.generatedContent.id).toBe('analysis-b');
    expect(h.state.history[0].data.originalText).toBe(refined);
    expect(h.state.history[0].data.analysisNeedsRecheck).toBe(true);
    expect(h.state.history[0].data.grammar).toBeUndefined();
  });

  it('rejects empty output and a drastic length change', async () => {
    for (const bad of ['', 'Fox.']) {
      const h = refineHost();
      const pending = h.run();
      h.release(bad);
      await pending;
      expect(h.state.history[0].data.originalText).toBe(h.A.data.originalText);
      expect(h.scope.addToast).toHaveBeenCalledWith(expect.any(String), 'warning');
    }
  });

  it('does not overwrite a source the teacher edited while the AI was working', async () => {
    const h = refineHost();
    const pending = h.run();
    h.state.history = [{ ...h.A, data: { ...h.A.data, originalText: 'Teacher typed a new version of the whole passage just now, by hand.' } }, h.B];
    h.release('The quick brown fox leaps over the lazy dog near the calm river bank today.');
    await pending;
    expect(h.state.history[0].data.originalText).toBe('Teacher typed a new version of the whole passage just now, by hand.');
    expect(h.scope.addToast).toHaveBeenCalledWith(expect.any(String), 'warning');
  });
});

describe('source analysis vocabulary extraction and display', () => {
  it('requests tiered vocabulary in the analysis prompt and normalizes/deduplicates vocabulary and vocabularyTiers', () => {
    const normalize = Dispatcher && Dispatcher.normalizeAnalysisResult;
    // 2026-11-23: each item also carries its part of speech in the passage ("pos"), stored as data.vocabularyPos.
    expect(DISPATCH_SOURCE).toMatch(/"vocabulary":\s*\[\{\s*"term":\s*"\.\.\.",\s*"tier":\s*"Academic",\s*"pos":\s*"noun"\s*\}\]/);
    const res = normalize({
      readingLevel: '6th-8th Grade',
      concepts: ['Photosynthesis'],
      vocabulary: [
        { term: 'chlorophyll', tier: 'Domain-Specific' },
        { term: 'analyze', tier: 'Academic' },
        { term: 'stomata', tier: 'Domain-Specific' },
        'Chlorophyll',
        { word: 'transpiration', tier: 'Domain-Specific' },
      ],
      accuracy: { rating: 'High', reason: 'Accurate.' },
      grammar: [],
    });
    expect(res.vocabulary).toEqual(['chlorophyll', 'analyze', 'stomata', 'transpiration']);
    expect(res.vocabularyTiers).toEqual({ tier2: ['analyze'], tier3: ['chlorophyll', 'stomata', 'transpiration'] });
    const legacy = normalize({ tier2Words: ['analyze', 'infer'] });
    expect(legacy.vocabulary).toEqual(['analyze', 'infer']);
    expect(legacy.vocabularyTiers).toEqual({ tier2: ['analyze', 'infer'], tier3: [] });
    const untiered = normalize({ vocabulary: ['evaporation', 'condensation', 'precipitation'] });
    expect(untiered.vocabularyTiers.tier2.length + untiered.vocabularyTiers.tier3.length).toBe(3);
  });

  it('displays Key Vocabulary in teacher mode with action buttons and hides it in student mode', () => {
    const onSendVocabToFocus = vi.fn(() => 2);
    const onGenerateGlossaryFromVocab = vi.fn();
    const teacherProps = makeProps({ concepts: ['Water Cycle'], vocabulary: ['evaporation', 'condensation'] }, { onSendVocabToFocus, onGenerateGlossaryFromVocab });
    const teacherEl = render(AnalysisView, teacherProps);
    expect(teacherEl.querySelector('[data-analysis-vocabulary]')).not.toBeNull();
    expect(teacherEl.textContent).toContain('Key Vocabulary (2)');
    expect(teacherEl.textContent).toContain('evaporation');
    expect(teacherEl.textContent).toContain('condensation');
    act(() => { teacherEl.querySelector('[data-analysis-send-vocab]').click(); });
    expect(onSendVocabToFocus).toHaveBeenCalledWith(['evaporation', 'condensation']);
    expect(teacherProps.addToast).toHaveBeenCalledWith('Added 2 vocabulary terms to Vocabulary Focus.', 'success');
    act(() => { teacherEl.querySelector('[data-analysis-build-glossary]').click(); });
    expect(onGenerateGlossaryFromVocab).toHaveBeenCalledWith(['evaporation', 'condensation']);
    const studentEl = render(AnalysisView, makeProps({ concepts: ['Water Cycle'], vocabulary: ['evaporation'] }, { isTeacherMode: false, onReadOriginal: vi.fn(), onSendVocabToFocus, onGenerateGlossaryFromVocab }));
    expect(studentEl.querySelector('[data-analysis-vocabulary]')).toBeNull();
    expect(studentEl.textContent).not.toContain('evaporation');
  });

  it('auto-syncs glossary tier counts on analysis completion and uses the exact analyzed list when matched', () => {
    expect(DISPATCH_SOURCE).toContain('deps.setGlossaryTier2Count(aT2);');
    expect(DISPATCH_SOURCE).toContain('deps.setGlossaryTier3Count(aT3);');
    expect(DISPATCH_SOURCE).toContain('Use this exact list of ${_exactAnalysisTerms.length} vocabulary terms identified from the source analysis');
    const sidebarSrc = fs.readFileSync(path.resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
    expect(sidebarSrc).toContain('data-glossary-analysis-sync');
    expect(sidebarSrc).toContain('data-glossary-match-analysis');
  });

  it('connects Source Analysis findings to Adapted Text, Sentence Frames, Concept Sort, and AlloBot counts', () => {
    expect(DISPATCH_SOURCE).toContain('LEARNER BARRIERS FROM SOURCE ANALYSIS');
    expect(DISPATCH_SOURCE).toContain('prioritize these lesson/analysis vocabulary terms');
    expect(DISPATCH_SOURCE).toContain('Key concepts from Source Analysis');
    const botSrc = fs.readFileSync(path.resolve(process.cwd(), 'allobot_source.jsx'), 'utf8');
    expect(botSrc).toContain("type === 'scaffolds' || type === 'sentence-frames') ? data?.items");
    expect(botSrc).toContain("localized('bot_events.educator_quiz_ready_count'");
    expect(botSrc).toContain('const quizReflections = type === \'quiz\' ? alloBotTipList(data?.reflections) : [];');
    expect(botSrc).toContain('Array.isArray(glossaryEntry?.data) ? glossaryEntry.data : glossaryEntry?.data?.terms');
    expect(botSrc).toContain("data?.events || (type === 'timeline' ? data?.items : null)");
    expect(botSrc).toContain('data?.sections || data?.branches || data?.outline');
    expect(botSrc).toContain("Array.isArray(data) ? data[0]?.name : null");
    expect(botSrc).toContain("type === 'alignment' || type === 'alignment-report'");
    expect(botSrc).toContain("localized('bot_events.educator_glossary_ready_count'");
    expect(botSrc).toContain("type === 'concept-sort' && categories.length && items.length");
  });
});
