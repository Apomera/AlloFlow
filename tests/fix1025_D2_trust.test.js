// Main-24 fix pass 2026-10-25, lane D2 ("trust"): analysis factual fix goes
// through preview + guards, accuracy is labelled as an AI estimate unless a web
// search verified it, analysis versions count per source, optional learner
// barriers, alignment-report comment leaks + honest DOK labels, and one
// minimum-content rule for single generation and Full Pack.
// FIX1025_D2_* env vars point at scratch copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const ROOT = process.cwd();
const file = (env, name) => path.resolve(ROOT, process.env[env] || name);
const read = (env, name) => fs.readFileSync(file(env, name), 'utf8');
const CMAP_MODULE = read('FIX1025_D2_CMAP', 'concept_map_handlers_module.js');
const VIEW_MODULE = read('FIX1025_D2_VIEW', 'view_analysis_module.js');
const ALIGN_MODULE = read('FIX1025_D2_ALIGN', 'view_alignment_report_module.js');
const DISPATCH_MODULE = read('FIX1025_D2_DISPATCH', 'generate_dispatcher_module.js');
const DISPATCH_SOURCE = read('FIX1025_D2_DISPATCH_SRC', 'generate_dispatcher_source.jsx');
const HELPERS_SOURCE = read('FIX1025_D2_HELPERS', 'generation_helpers_source.jsx');
const HOST_SOURCE = fs.readFileSync(path.resolve(ROOT, 'host_handlers_source.jsx'), 'utf8');

const require = createRequire(import.meta.url);
const modulesDir = path.resolve(ROOT, 'desktop/web-app/node_modules');
let React, createRoot, act, Cmap, AnalysisView, AlignmentView, Dispatcher, Helpers;
const createHostHandlers = new Function(HOST_SOURCE + '\nreturn createHostHandlers;')();
const auditHelpers = new Function(DISPATCH_SOURCE.slice(0, DISPATCH_SOURCE.indexOf('const handleGenerate')) + `
  return { harvestExistingAuditSignals, computeEngagementVariety, applyAuditDokEstimate };`)();

beforeAll(() => {
  React = require(path.resolve(modulesDir, 'react'));
  ({ createRoot } = require(path.resolve(modulesDir, 'react-dom/client')));
  act = React.act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('generation_matrix_module.js');
  (0, eval)(CMAP_MODULE);
  (0, eval)(VIEW_MODULE);
  new Function(ALIGN_MODULE)();
  (0, eval)(DISPATCH_MODULE);
  (0, eval)('(function(){\n' + HELPERS_SOURCE + '\n})()');
  Cmap = window.AlloModules.CmapHandlers;
  AnalysisView = window.AlloModules.AnalysisView;
  AlignmentView = window.AlloModules.AlignmentReportView;
  Dispatcher = window.AlloModules.GenDispatcher;
  Helpers = window.AlloModules.GenerationHelpers;
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
  vi.useRealTimers();
});

// ── 1. Factual "Fix": preview, guards, same resource ─────────────────────
const ORIGINAL = 'Columbus first reached the Americas in 1493 [⁽¹⁾](https://example.org/a).\n\nHe sailed for Spain with three ships.';
const CORRECTED = 'Columbus first reached the Americas in 1492 [⁽¹⁾](https://example.org/a).\n\nHe sailed for Spain with three ships.';
const NOTE = 'The text says 1493, but Columbus first landed in 1492 [1].';

describe('1. the factual fix only prepares a correction', () => {
  it('strips preamble, code fences, delimiter lines and wrapping quotes', () => {
    const clean = Cmap.cleanCorrectionReply;
    expect(clean('Here is the corrected text:\n"' + 'Fixed sentence."', 'Original sentence.')).toBe('Fixed sentence.');
    expect(clean('```markdown\nFixed sentence.\n```', 'Original sentence.')).toBe('Fixed sentence.');
    expect(clean('"Fixed sentence.",', 'Original sentence.')).toBe('Fixed sentence.');
    expect(clean('<<<SEGMENT>>>\nFixed sentence.\n<<<END SEGMENT>>>', 'Original sentence.')).toBe('Fixed sentence.');
    // A source that IS a quotation keeps its quote marks.
    expect(clean('"To be, or not to be."', '"To be or not to be."')).toBe('"To be, or not to be."');
  });

  it('rejects a large rewrite, a changed citation, and an unchanged reply', async () => {
    const run = reply => Cmap.prepareFactualCorrection({ sourceText: ORIGINAL, notes: [NOTE], callGemini: async () => reply, chunkText: text => [text] });
    expect(await run(ORIGINAL + ' ' + 'Extra invented paragraph about the voyage and its many consequences for Europe.'.repeat(2))).toMatchObject({ ok: false, reason: 'length' });
    expect(await run(CORRECTED.replace('https://example.org/a', 'https://example.org/b'))).toMatchObject({ ok: false, reason: 'citations' });
    expect(await run('Sure! Here is the text:\n' + ORIGINAL)).toMatchObject({ ok: false, reason: 'no-change' });
    expect(await run('Here is the corrected text:\n' + CORRECTED)).toMatchObject({ ok: true, original: ORIGINAL, corrected: CORRECTED, notes: [NOTE] });
  });

  it('never rewrites the input box or starts a new analysis, and skips fixed or unselected notes', async () => {
    const callGemini = vi.fn(async () => CORRECTED);
    const deps = {
      generatedContent: { id: 'a1', type: 'analysis', data: { originalText: ORIGINAL, accuracy: { discrepancies: ['✓ FIXED: old note', NOTE, 'Unselected note.'] } } },
      selectedDiscrepancies: new Set([0, 1]), setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), t: k => k, callGemini,
      warnLog: () => {}, chunkText: text => [text], setInputText: vi.fn(), handleGenerate: vi.fn(), addToast: vi.fn()
    };
    const result = await Cmap.handleAutoCorrectSource(deps);
    expect(result).toMatchObject({ ok: true, resourceId: 'a1', original: ORIGINAL, corrected: CORRECTED, notes: [NOTE] });
    expect(callGemini.mock.calls[0][0]).toContain(NOTE);
    expect(callGemini.mock.calls[0][0]).not.toContain('old note');
    expect(callGemini.mock.calls[0][0]).not.toContain('Unselected note.');
    expect(deps.setInputText).not.toHaveBeenCalled();
    expect(deps.handleGenerate).not.toHaveBeenCalled();
    expect(deps.setIsProcessing.mock.calls.map(c => c[0])).toEqual([true, false]);
  });
});

function factualHost() {
  const A = { id: 'analysis-a', type: 'analysis', data: {
    originalText: ORIGINAL, readingLevel: { range: '5th Grade', explanation: 'ok' }, concepts: ['Voyages'], grammar: [],
    accuracy: { rating: 'Moderate', reason: 'One date is wrong.', verification: 'web-search', citations: '1. [Source](https://example.org/a)', discrepancies: [NOTE, 'Wrong river name.'], verifiedFacts: [] } } };
  const state = { history: [A], generatedContent: A, inputText: ORIGINAL };
  window.AlloModules.InstructionalContext = {
    resolveArtifactContext: () => ({ grade: '5', language: 'English' }), isEnglishLanguage: () => true,
    getInstructionalText: item => ({ item }), withComplexityEvidence: () => ({ text: 'fresh' }), invalidateComplexityEvidence: () => ({ text: 'fresh' })
  };
  const scope = {
    _resourceMutationStateRef: { current: state }, generatedContent: A, inputText: ORIGINAL, gradeLevel: '5', leveledTextLanguage: 'English',
    setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), addToast: vi.fn(), t: k => k, warnLog: vi.fn(), _recordTextChange: vi.fn(),
    splitReferencesFromBody: text => ({ body: text }), extractSourceTextForProcessing: text => ({ text, isBilingual: false }),
    setHistory: fn => { state.history = fn(state.history); },
    setGeneratedContent: value => { state.generatedContent = typeof value === 'function' ? value(state.generatedContent) : value; },
    setInputText: value => { state.inputText = typeof value === 'function' ? value(state.inputText) : value; }
  };
  const handlers = createHostHandlers(scope);
  scope.onUpdateResource = handlers.onUpdateResource;
  scope._getFreshTextComplexityEvidence = (...args) => handlers._getFreshTextComplexityEvidence(...args);
  const handleGenerate = vi.fn();
  const cmapDeps = () => ({ generatedContent: state.history[0], selectedDiscrepancies: new Set([0]), setIsProcessing: vi.fn(), setGenerationStep: vi.fn(),
    t: k => k, callGemini: async () => 'Here is the corrected text:\n"' + CORRECTED + '"', warnLog: () => {}, chunkText: text => [text], handleGenerate });
  const addToast = vi.fn();
  const props = () => ({
    generatedContent: state.history[0], onCorrectAnalysisText: handlers.onCorrectAnalysisText, onUpdateResource: handlers.onUpdateResource,
    handleAutoCorrectSource: () => Cmap.handleAutoCorrectSource(cmapDeps()),
    isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null,
    selectedDiscrepancies: new Set([0]), selectedGrammarErrors: new Set(), analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(), toggleGrammarErrorSelection: vi.fn(), setGeneratedContent: vi.fn(), setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(), setInputText: vi.fn(), setSelectedGrammarErrors: vi.fn(), setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(), handleAnalysisTextChange: vi.fn(), handleDownloadAudio: vi.fn(), handleFormatText: vi.fn(),
    handleToggleIsEditingAnalysis: vi.fn(), addToast, callGemini: vi.fn(), warnLog: () => {},
    t: key => key, formatInlineText: text => text, renderFormattedText: text => text,
    splitReferencesFromBody: text => ({ body: text, references: '' }),
    BilingualFieldRenderer: p => React.createElement('span', null, p.text), SourceReferencesPanel: () => null
  });
  return { state, props, addToast, handleGenerate };
}
async function clickAsync(el) { await act(async () => { el.click(); await new Promise(r => setTimeout(r, 0)); }); }

describe('1. the teacher reviews the factual fix before it lands', () => {
  it('shows before/after, changes nothing until Apply, then fixes the same resource and marks the note', async () => {
    const h = factualHost();
    const el = render(AnalysisView, h.props());
    await clickAsync(el.querySelector('[data-factual-fix]'));
    const preview = el.querySelector('[data-factual-fix-preview]');
    expect(preview).not.toBeNull();
    expect(preview.querySelector('[data-fix-before]').textContent).toContain('1493');
    expect(preview.querySelector('[data-fix-after]').textContent).toContain('1492');
    expect(preview.querySelector('[data-fix-after]').textContent.startsWith('"')).toBe(false);
    expect(h.state.history[0].data.originalText).toBe(ORIGINAL);
    await clickAsync(preview.querySelector('[data-fix-apply]'));
    expect(h.state.history).toHaveLength(1);
    expect(h.state.history[0].id).toBe('analysis-a');
    expect(h.state.history[0].data.originalText).toBe(CORRECTED);
    expect(h.state.history[0].data.accuracy.discrepancies).toEqual(['✓ FIXED: ' + NOTE, 'Wrong river name.']);
    expect(h.state.inputText).toBe(CORRECTED);
    expect(h.handleGenerate).not.toHaveBeenCalled();
    act(() => root.render(React.createElement(AnalysisView, h.props())));
    expect(el.querySelector('[data-discrepancy-fixed]').textContent).toContain('Fixed in source');
    expect(el.querySelector('[data-factual-fix-stale]')).not.toBeNull();
    expect(el.querySelector('[data-factual-fix]').textContent).toContain('(0)');
  });

  it('Discard leaves the source alone', async () => {
    const h = factualHost();
    const el = render(AnalysisView, h.props());
    await clickAsync(el.querySelector('[data-factual-fix]'));
    await clickAsync(el.querySelector('[data-fix-discard]'));
    expect(el.querySelector('[data-factual-fix-preview]')).toBeNull();
    expect(h.state.history[0].data.originalText).toBe(ORIGINAL);
  });

  it('does not apply over a source the teacher changed while the preview was open', async () => {
    const h = factualHost();
    const el = render(AnalysisView, h.props());
    await clickAsync(el.querySelector('[data-factual-fix]'));
    const edited = 'Teacher rewrote the passage by hand.';
    h.state.history = [{ ...h.state.history[0], data: { ...h.state.history[0].data, originalText: edited } }];
    await clickAsync(el.querySelector('[data-fix-apply]'));
    expect(h.state.history[0].data.originalText).toBe(edited);
    expect(h.state.history[0].data.accuracy.discrepancies[0]).toBe(NOTE);
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('source changed'), 'warning');
  });
});

// ── 2. accuracy is an AI estimate unless a web search verified it ────────
function viewProps(data) {
  const h = factualHost();
  return { ...h.props(), generatedContent: { id: 'v', type: 'analysis', data: { ...h.state.history[0].data, ...data } } };
}
describe('2. accuracy verification label', () => {
  it('shows a neutral AI-estimate badge, not a green rating, when no search ran', () => {
    const el = render(AnalysisView, viewProps({ accuracy: { rating: 'High', reason: 'Looks right.', verification: 'ai-estimate', discrepancies: [], verifiedFacts: [] } }));
    const badge = el.querySelector('[data-accuracy-verification]');
    expect(badge.getAttribute('data-accuracy-verification')).toBe('ai-estimate');
    expect(badge.textContent).toContain('AI estimate, not verified');
    expect(badge.textContent).toContain('AI rating: High');
    expect(el.querySelector('.bg-green-100')).toBeNull();
  });
  it('keeps the coloured rating for a web-verified report and labels legacy reports by their citations', () => {
    let el = render(AnalysisView, viewProps({ accuracy: { rating: 'High', reason: 'ok', verification: 'web-search', citations: '1. [x](https://e.org)', discrepancies: [], verifiedFacts: [] } }));
    expect(el.querySelector('[data-accuracy-verification]').getAttribute('data-accuracy-verification')).toBe('web-search');
    expect(el.querySelector('[data-accuracy-verification]').className).toContain('bg-green-100');
    act(() => root.unmount()); root = null;
    el = render(AnalysisView, viewProps({ accuracy: { rating: 'High', reason: 'ok', discrepancies: [], verifiedFacts: [] } }));
    expect(el.querySelector('[data-accuracy-verification]').getAttribute('data-accuracy-verification')).toBe('ai-estimate');
  });
  it('does not repeat "Not web-verified" as an AI rating', () => {
    const el = render(AnalysisView, viewProps({ accuracy: { rating: 'Not web-verified', reason: 'x', verification: 'ai-estimate', verificationNote: 'search-unavailable', discrepancies: [], verifiedFacts: [] } }));
    expect(el.querySelector('[data-accuracy-verification]').textContent).not.toContain('AI rating');
  });
});

const ANALYSIS_SOURCE = 'Earth completes one orbit around the Sun in about 365.25 days. It rains cats and dogs in spring.';
function analysisReport(extra = {}) {
  return { readingLevel: { range: '6th-8th Grade', explanation: 'ok' }, concepts: ['orbit'],
    accuracy: { rating: 'High', reason: 'Correct.', discrepancies: [], verifiedFacts: ['A year is about 365.25 days [1].'] },
    grammar: [], sourceLanguage: 'English', ...extra };
}
function analysisDeps(result, overrides = {}) {
  const noop = () => {};
  const callGemini = vi.fn(async () => JSON.stringify(result));
  return { callGemini, deps: new Proxy({
    gradeLevel: '8th Grade', history: [], inputText: ANALYSIS_SOURCE, differentiationRange: 'None', leveledTextLanguage: 'English',
    selectedLanguages: [], studentInterests: [], guidedMode: false, guidedStep: 0, standardsInput: '', targetStandards: [],
    standardsPromptString: '', sourceTopic: 'Earth', currentUiLanguage: 'English', generatedContent: null,
    audioRef: { current: null }, alloBotRef: { current: null }, checkAccuracyWithSearch: false, GUIDED_STEPS: [],
    callGemini, calculateReadability: () => ({ words: 18, score: '6.0' }), setGeneratedContent: vi.fn(), setHistory: vi.fn(), cleanJson: String,
    performDeepVerification: vi.fn(async () => ({ text: 'Supported by NASA [1].', sources: [{ uri: 'https://science.nasa.gov/earth/', title: 'Earth' }] })),
    getGroupDifferentiationContext: () => '', filterEducationalSources: chunks => chunks,
    extractSourceTextForProcessing: text => ({ text, isBilingual: false }),
    getDefaultTitle: () => 'Source Analysis', t: key => key, resolveTranslationPolicy: () => ({ enabled: false, mode: 'off' }),
    glossaryImageStyle: '', universalImageStyle: '', imageGenerationStyle: '', activeUnitId: null, selectedReadingSourceId: null, ...overrides,
  }, { get: (target, key) => key in target ? target[key] : noop }) };
}
const generateAnalysis = (f) => Dispatcher.handleGenerate('analysis', null, false, null, { rethrowErrors: true }, true, f.deps);

describe('2. the dispatcher records how accuracy was checked', () => {
  it('marks the rating as an AI estimate when web search was off', async () => {
    const item = await generateAnalysis(analysisDeps(analysisReport()));
    expect(item.data.accuracy.rating).toBe('High');
    expect(item.data.accuracy.verification).toBe('ai-estimate');
  });
  it('marks a search with attributable sources as web-verified', async () => {
    const item = await generateAnalysis(analysisDeps(analysisReport(), { checkAccuracyWithSearch: true }));
    expect(item.data.accuracy.verification).toBe('web-search');
  });
  it('a failed search falls back to an AI estimate whose override text goes through t()', async () => {
    const t = key => ({ 'analysis.not_web_verified_rating': 'SIN-VERIFICAR', 'analysis.not_web_verified_reason': 'MOTIVO' })[key] || key;
    const item = await generateAnalysis(analysisDeps(analysisReport(), { checkAccuracyWithSearch: true, t,
      performDeepVerification: async () => ({ text: 'nothing', sources: [] }) }));
    expect(item.data.accuracy).toMatchObject({ rating: 'SIN-VERIFICAR', reason: 'MOTIVO', verification: 'ai-estimate', verificationNote: 'search-unavailable', verifiedFacts: [] });
  });
});

// ── 3. version numbers count analyses of the same source ────────────────
describe('3. analysis version numbering', () => {
  it('a new text gets no version suffix however many other analyses exist', async () => {
    const others = [1, 2, 3].map(i => ({ id: 'other-' + i, type: 'analysis', sourceFamilyId: 'fam-' + i, data: { originalText: 'Another reading ' + i + '.' } }));
    const item = await generateAnalysis(analysisDeps(analysisReport(), { history: others }));
    expect(item.title).toBe('Source Analysis');
  });
  it('a second analysis of the same text is V2', async () => {
    const prior = { id: 'prior', type: 'analysis', data: { originalText: ANALYSIS_SOURCE } };
    const item = await generateAnalysis(analysisDeps(analysisReport(), { history: [prior] }));
    expect(item.title).toBe('Source Analysis (V2)');
  });
  it('counts by source family as well', () => {
    const history = [{ id: 'x', type: 'analysis', sourceFamilyId: 'f1' }, { id: 'y', type: 'analysis', config: { sourceFamilyId: 'f1' } },
      { id: 'z', type: 'analysis', sourceFamilyId: 'f2' }, { id: 'q', type: 'quiz', sourceFamilyId: 'f1' }];
    expect(Dispatcher.countPriorAnalysisVersions(history, { id: 'new', sourceFamilyId: 'f1' }, [])).toBe(2);
    expect(Dispatcher.countPriorAnalysisVersions(history, { id: 'new', sourceFamilyId: 'f9' }, [])).toBe(0);
  });
});

// ── 4. optional learner barriers ─────────────────────────────────────────
describe('4. learner barriers', () => {
  it('the prompt asks for them and the dispatcher keeps only non-empty categories', async () => {
    const f = analysisDeps(analysisReport({ learnerBarriers: { figurativeLanguage: ['"rains cats and dogs" is an idiom ELLs may read literally'], textStructure: [], biasRepresentation: ['None'] } }));
    const item = await generateAnalysis(f);
    expect(f.callGemini.mock.calls[0][0]).toContain('Learner Barriers');
    expect(item.data.learnerBarriers).toEqual({ figurativeLanguage: ['"rains cats and dogs" is an idiom ELLs may read literally'] });
  });
  it('the view renders them when present and old analyses still render without them', () => {
    let el = render(AnalysisView, viewProps({ learnerBarriers: { backgroundKnowledge: ['Assumes the reader knows what an orbit is.'] } }));
    const card = el.querySelector('[data-analysis-learner-barriers]');
    expect(card.querySelector('[data-barrier-group="backgroundKnowledge"]').textContent).toContain('orbit');
    act(() => root.unmount()); root = null;
    el = render(AnalysisView, viewProps({}));
    expect(el.querySelector('[data-analysis-learner-barriers]')).toBeNull();
    expect(el.textContent).toContain('Voyages');
  });
});

// ── 5. JSX comments never render as text in any built view ───────────────
const parser = require(path.resolve(ROOT, 'node_modules/@babel/parser'));
function findJsxCommentLeaks(source) {
  const ast = parser.parse(source, { sourceType: 'script', errorRecovery: true, plugins: ['jsx'] });
  const aliases = new Set(['createElement']);
  const leaks = [];
  const isCreateElement = callee => (callee.type === 'MemberExpression' && callee.property && aliases.has(callee.property.name))
    || (callee.type === 'Identifier' && aliases.has(callee.name));
  const walk = node => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'VariableDeclarator' && node.id && node.id.type === 'Identifier' && node.init && node.init.type === 'MemberExpression'
      && node.init.property && node.init.property.name === 'createElement') aliases.add(node.id.name);
    if (node.type === 'CallExpression' && isCreateElement(node.callee)) {
      node.arguments.slice(2).forEach(arg => { if (arg.type === 'StringLiteral' && /^\s*\/\/\s/.test(arg.value)) leaks.push(arg.value.trim().slice(0, 60)); });
    }
    if (node.type === 'JSXText' && /^\s*\/\/\s/.test(node.value)) leaks.push(node.value.trim().slice(0, 60));
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'leadingComments' || key === 'trailingComments') continue;
      const value = node[key];
      if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value.type === 'string') walk(value);
    }
  };
  walk(ast.program);
  return leaks;
}
describe('5. JSX comment leak gate', () => {
  it('self-test: detects babel output of a `> // comment` child and ignores real comments', () => {
    expect(findJsxCommentLeaks('var h = React.createElement; h("div", null, " // Top stat row", h("span", null, "ok"));')).toEqual(['// Top stat row']);
    expect(findJsxCommentLeaks('React.createElement("div", null, /* note */ "Visible text"); // trailing note')).toEqual([]);
    expect(findJsxCommentLeaks('const x = <div> // leak\n<span/></div>;')).toEqual(['// leak']);
  });
  it('no built view_*_module.js in the repo root renders a // comment as text', () => {
    const dir = process.env.FIX1025_D2_VIEW_DIR || ROOT;
    const modules = fs.readdirSync(dir).filter(name => /^view_.*_module\.js$/.test(name));
    expect(modules.length).toBeGreaterThan(20);
    const leaks = modules.flatMap(name => findJsxCommentLeaks(fs.readFileSync(path.join(dir, name), 'utf8')).map(text => name + ': ' + text));
    expect(leaks).toEqual([]);
  });
});

// ── 6. alignment DOK: per-item tags first, honest estimate labels ───────
describe('6. alignment report DOK', () => {
  const quiz = levels => ({ id: 'q', type: 'quiz', data: { questions: levels.map((dok, i) => ({ question: 'Stem ' + i, ...(dok === undefined ? {} : { dok }) })) } });
  it('reads valid per-item DOK, counts invalid values as unknown, and keeps untagged stems for the estimate', () => {
    const harvest = auditHelpers.harvestExistingAuditSignals([quiz([1, '2', 'Level 3', 7, undefined])]);
    expect(harvest.dokLevels).toEqual([1, 2, 3, 'unknown']);
    expect(harvest.untaggedQuizStems).toEqual(['Stem 4']);
    const engagement = auditHelpers.computeEngagementVariety(harvest, [quiz([])]);
    expect(engagement).toMatchObject({ dokTotal: 4, dokQuestionCount: 5, dokSource: 'item-tags' });
    expect(engagement.dokDistribution).toMatchObject({ L1: 25, L2: 25, L3: 25, L4: 0, unknown: 25 });
  });
  it('the over-80%-recall rule fires on tagged items', () => {
    const harvest = auditHelpers.harvestExistingAuditSignals([quiz([1, 1, 1, 1, 1])]);
    const engagement = auditHelpers.computeEngagementVariety(harvest, [quiz([]), { id: 'g', type: 'glossary' }, { id: 'o', type: 'outline' }]);
    expect(engagement.recommendations.join(' ')).toContain('Level 1: 100%');
  });
  it('an AI estimate records how many stems it read, not the whole quiz', () => {
    const engagement = { status: 'Aligned', dokTotal: 0 };
    auditHelpers.applyAuditDokEstimate(engagement, { distribution: { L1: 90, L2: 10, L3: 0, L4: 0 }, sampled: 40, total: 55 });
    expect(engagement).toMatchObject({ dokTotal: 40, dokQuestionCount: 55, dokSource: 'llm-estimated', status: 'Partially Aligned' });
  });
  function renderEngagement(engagement) {
    return render(AlignmentView, { t: () => undefined, history: [], isProcessing: false, generatedContent: { id: 'r', type: 'alignment-report', data: { reports: [], comprehensive: {
      overall: { score: null, dimensionsEvaluated: 1, totalDimensions: 9, dimensionScores: {}, perDimensionPercent: {}, blockingIssues: [] },
      engagement: { status: 'Aligned', distinctTypeCount: 2, totalArtifacts: 2, diversityScore: 0.5, distinctTypes: ['quiz'], multimodalCoverage: { present: ['text'], missing: [] },
        scaffoldCounts: {}, recommendations: [], dokDistribution: { L1: 50, L2: 50, L3: 0, L4: 0, unknown: 0 }, ...engagement } } } } });
  }
  it('the view names the DOK source and the measured count', () => {
    let el = renderEngagement({ dokTotal: 40, dokQuestionCount: 55, dokSource: 'llm-estimated' });
    expect(el.querySelector('[data-dok-source]').getAttribute('data-dok-source')).toBe('llm-estimated');
    expect(el.textContent).toContain('AI estimate from 40 of 55 questions');
    expect(el.textContent).toContain('the AI estimated these levels');
    act(() => root.unmount()); root = null;
    el = renderEngagement({ dokTotal: 8, dokQuestionCount: 10, dokSource: 'item-tags' });
    expect(el.textContent).toContain('from the DOK tags on 8 of 10 questions');
    expect(el.textContent).not.toContain('// ');
  });
  it('the engagement review uses every untagged stem up to the cap and re-applies a cached estimate', () => {
    expect(DISPATCH_SOURCE.includes('untaggedStems.slice(0, AUDIT_DOK_ESTIMATE_MAX_STEMS)'), 'stems are not capped by the old first-12 slice').toBe(true);
    expect(DISPATCH_SOURCE.includes('applyAuditDokEstimate(content.comprehensive.engagement, cached.dokEstimate)'), 'cached reviews must re-apply the estimate').toBe(true);
    expect(DISPATCH_SOURCE.includes('quizItem.data.questions.slice(0, 12)'), 'old 12-stem sample is gone').toBe(false);
  });
});

// ── 7. one minimum-content rule for single generation and Full Pack ─────
describe('7. minimum content', () => {
  const cases = [
    ['quiz', { questions: [], reflections: [] }, { questions: [{ question: 'Q?' }] }],
    ['glossary', [], [{ term: 'orbit', def: 'path' }]],
    ['anchor-chart', { sections: [{ label: 'A', bullets: [''] }] }, { sections: [{ label: 'A', bullets: ['one'] }] }],
    ['outline', { branches: [] }, { branches: [{ title: 'Main', items: [] }] }],
    ['timeline', { items: [] }, { items: [{ event: 'Launch', date: '1969' }] }],
    ['concept-sort', { categories: [{ id: 'c' }], items: [] }, { categories: [{ id: 'c' }], items: [{ text: 'Mars' }] }],
    ['faq', [], [{ question: 'Why?', answer: 'Because.' }]],
    ['sentence-frames', { mode: 'list', items: [] }, { mode: 'list', items: [{ text: 'I think ___ because ___.' }] }],
    ['note-taking', { templateType: 'cornell-notes', cues: [] }, { templateType: 'cornell-notes', cues: [{ text: 'What is an orbit?' }] }],
    ['note-taking', { templateType: 'guided-notes', blanks: [] }, { templateType: 'guided-notes', blanks: [{ text: 'An orbit is ___.' }] }],
    ['note-taking', { templateType: 'q-and-a', pairs: [{ question: '', answer: '' }] }, { templateType: 'q-and-a', pairs: [{ question: 'Q?', answer: 'A.' }] }],
    ['note-taking', { templateType: 'double-entry', entries: [{ quote: '', response: '' }] }, { templateType: 'double-entry', entries: [{ quote: '"x"', response: '' }] }],
  ];
  it.each(cases)('%s: empty fails, content passes', (type, empty, full) => {
    expect(Dispatcher.hasMinimumContent(type, empty)).toBe(false);
    expect(Dispatcher.hasMinimumContent(type, full)).toBe(true);
  });
  it('types without a rule, and paragraph frames and blank student templates, pass', () => {
    expect(Dispatcher.hasMinimumContent('analysis', {})).toBe(true);
    expect(Dispatcher.hasMinimumContent('sentence-frames', { mode: 'paragraph', text: 'First, ___.' })).toBe(true);
    expect(Dispatcher.hasMinimumContent('note-taking', { templateType: 'reading-response', title: 'R' })).toBe(true);
  });

  function quizDeps(questions, extra = {}) {
    const explicit = {
      history: [], inputText: 'Planets orbit the Sun.', gradeLevel: '5th Grade', leveledTextLanguage: 'English', selectedLanguages: [], differentiationRange: 'None',
      quizMcqCount: 2, quizReflectionCount: 0, dokLevel: '', targetStandards: [], standardsInput: '', isTeacherMode: true, isParentMode: false, isIndependentMode: false,
      GUIDED_STEPS: [], LENGTH_THRESHOLDS: { short: 200, medium: 500, long: 900 }, TIMELINE_MODE_DEFINITIONS: {},
      cleanJson: s => String(s).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, ''),
      callGemini: vi.fn(async prompt => String(prompt).includes('Return ONLY valid JSON') ? JSON.stringify({ questions, reflections: [] }) : '[[KEY:CONFIRMED]]'),
      setGeneratedContent: vi.fn(), setHistory: vi.fn(), t: key => key, warnLog: () => {}, debugLog: () => {}, addToast: vi.fn(), setError: vi.fn(),
      getDefaultTitle: type => type === 'quiz' ? 'Quiz' : type, ...extra
    };
    const CALLABLE = /^(set|handle|get|call|build|format|parse|validate|compute|generate|execute|apply|fetch|is|has|can|should|split|chunk|count|filter|detect|repair|reset|reverify|perform|normalize|sanitize|fix|extract|process|reg|flyTo|fisher)/;
    return new Proxy(explicit, { get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop !== 'string') return undefined;
      if (CALLABLE.test(prop)) return () => '';
      if (/s$/.test(prop) && /^(selected|target|suggested)/.test(prop)) return [];
      return '';
    }, has: () => true });
  }
  it('single generation: a quiz with no questions is an error and is never saved', async () => {
    const deps = quizDeps([]);
    const error = await Dispatcher.handleGenerate('quiz', null, false, null, { rethrowErrors: true, quizMcqCount: 2 }, true, deps).then(() => null, e => e);
    expect(error && error.emptyGeneration).toBe(true);
    expect(error.message).toContain('Quiz came back with no content');
    expect(deps.setHistory).not.toHaveBeenCalled();
    const interactive = quizDeps([]);
    await Dispatcher.handleGenerate('quiz', null, false, null, { quizMcqCount: 2 }, true, interactive);
    expect(interactive.addToast).toHaveBeenCalledWith(expect.stringContaining('came back with no content'), 'error');
    expect(interactive.setHistory).not.toHaveBeenCalled();
  });

  it('Full Pack marks an empty row failed and retryable instead of landed', async () => {
    vi.useFakeTimers();
    let latestRun = null;
    const handleGenerate = vi.fn(async type => type === 'quiz'
      ? { id: 'quiz-1', type, data: { questions: [], reflections: [] } }
      : { id: 'outline-1', type, data: { branches: [{ title: 'Main', items: ['x'] }] } });
    const deps = {
      isProcessing: false, fullPackTargetGroup: 'none', rosterKey: null, gradeLevel: '5th Grade', leveledTextLanguage: 'English', translationMode: 'auto',
      currentUiLanguage: 'English', studentInterests: [], dokLevel: '', leveledTextCustomInstructions: '', selectedLanguages: [], differentiationRange: 'None',
      differentiationTypes: ['simplified'], differentiationCustomGrades: [], targetStandards: [], useEmojis: false, textFormat: 'Standard Text',
      imageGenerationStyle: 'Auto', imageAspectRatio: '16:9', aiProviderProfile: { backend: 'gemini', model: 'gemini-test', imageProvider: 'auto', imageModel: 'imagen-test', isLocal: false },
      history: [], inputText: 'A reliable source text for the pack.', sourceTopic: 'Test topic', standardsInput: '', standardsContext: null,
      instructionalContext: { primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'omit', adaptedTextPolicySource: 'educator' },
      resourceCount: '5', isAutoConfigEnabled: true, setIsProcessing: vi.fn(), setGenerationStep: vi.fn(), setFullPackTargetGroup: vi.fn(), setGradeLevel: vi.fn(),
      setLeveledTextLanguage: vi.fn(), setStudentInterests: vi.fn(), setDokLevel: vi.fn(), setLeveledTextCustomInstructions: vi.fn(), setSelectedLanguages: vi.fn(),
      setTargetStandards: vi.fn(), setUseEmojis: vi.fn(), setTextFormat: vi.fn(), setPersistedLessonDNA: vi.fn(), setError: vi.fn(), addToast: vi.fn(),
      t: (key, values) => values ? `${key}:${values.count || ''}` : key, warnLog: vi.fn(), handleApplyRosterGroup: vi.fn(),
      autoConfigureSettings: vi.fn(async () => ({ resourcePlan: [{ tool: 'quiz', directive: '' }, { tool: 'outline', directive: '' }] })),
      applyDetailedAutoConfig: vi.fn(), getGroupDifferentiationContext: vi.fn(() => ''), getAssetManifest: vi.fn(() => []), getDifferentiationGrades: vi.fn(grade => [grade]),
      handleGenerate, setFullPackRun: next => { latestRun = typeof next === 'function' ? next(latestRun) : next; },
    };
    const run = Helpers.handleGenerateFullPack(null, deps);
    await vi.runAllTimersAsync();
    await run;
    const rows = Object.values(latestRun.resources);
    const quizRow = rows.find(row => row.type === 'quiz');
    const outlineRow = rows.find(row => row.type === 'outline');
    expect(quizRow.status).toBe('failed');
    expect(quizRow.retryable).not.toBe(false);
    expect(String(quizRow.failureReason || quizRow.reason || JSON.stringify(quizRow))).toContain('no content');
    expect(outlineRow.status).toBe('landed');
    expect(handleGenerate.mock.calls.filter(call => call[0] === 'quiz').length).toBe(2);
  });
});
