import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Fix grammar errors, Refine with AI and a factual fix rewrite the passage in the source box as well as the
// analysis report. They used to say only "Grammar errors fixed!", and the earlier wording was reachable only
// through Ctrl+Z. The analysis view now says the source box changed and offers one Undo that puts back the
// report exactly as it was and the source box too (unless the teacher has changed it since).
// ANALYSIS_UNDO_HOST / ANALYSIS_UNDO_VIEW point the suite at other copies for the fail-first check.

const anti = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const createHostHandlers = new Function(readFileSync(process.env.ANALYSIS_UNDO_HOST || 'host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
function actual(name, end, scope) {
  const start = anti.indexOf('  const ' + name + ' =');
  const finish = anti.indexOf(end, start);
  if (start < 0 || finish < 0) throw new Error('Missing host callback boundary: ' + name);
  return new Function(...Object.keys(scope), anti.slice(start, finish) + '\nreturn ' + name + ';')(...Object.values(scope));
}
afterEach(() => { if (window.AlloModules) delete window.AlloModules.InstructionalContext; });

const ORIGINAL = 'The dog run fast.';
function report() {
  return { id: 'analysis-a', type: 'analysis', levelCheck: { old: true },
    data: { originalText: ORIGINAL, grammar: ['"dog run" should be "dog runs"'], readingLevel: { range: 'Grade 2' }, localStats: { words: 4 } } };
}
function host(inputText = ORIGINAL) {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.InstructionalContext = {
    resolveArtifactContext: () => ({ grade: '5', language: 'English' }), isEnglishLanguage: () => true,
    getInstructionalText: item => ({ item }), withComplexityEvidence: () => ({ text: 'fresh' }), invalidateComplexityEvidence: () => ({ text: 'fresh' }),
  };
  const item = report();
  const state = { history: [item], generatedContent: item, inputText };
  const ref = { current: state };
  const set = key => value => { state[key] = typeof value === 'function' ? value(state[key]) : value; };
  const scope = { useCallback: fn => fn, _resourceMutationStateRef: ref, setHistory: set('history'), setGeneratedContent: set('generatedContent'), setInputText: set('inputText') };
  const onUpdateResource = actual('onUpdateResource', '  const handleNoteUpdate =', scope);
  const textSteps = [];
  const d = { ...scope, onUpdateResource, _recordTextChange: (...args) => textSteps.push(args), gradeLevel: '5', leveledTextLanguage: 'English',
    splitReferencesFromBody: text => ({ body: text }), extractSourceTextForProcessing: text => ({ text, isBilingual: false }),
    get inputText() { return state.inputText; } };
  const h = createHostHandlers(d);
  return { state, h, textSteps, current: () => state.history[0] };
}

describe('undoing a correction that rewrote the source', () => {
  it('offers Undo after a fix, and Undo restores the report exactly and the source box', () => {
    const { state, h, textSteps, current } = host();
    const before = JSON.stringify(current());
    expect(h.getAnalysisSourceUndo('analysis-a', ORIGINAL), 'nothing to undo yet').toBeNull();
    expect(h.onCorrectAnalysisText('analysis-a', ORIGINAL, 'The dog runs fast.', [report().data.grammar[0]])).toBe(true);
    expect(state.inputText).toBe('The dog runs fast.');
    expect(current().data.readingLevel, 'the fix clears findings for the old wording').toBeUndefined();
    expect(h.getAnalysisSourceUndo('analysis-a', 'The dog runs fast.')).toEqual({ previousText: ORIGINAL });
    const result = h.onUndoAnalysisSourceEdit('analysis-a');
    expect(result).toEqual({ ok: true, sourceRestored: true });
    const { updatedAt, ...restored } = current(); // the edit time is bookkeeping, set on every change
    expect(typeof updatedAt).toBe('string');
    expect(restored, 'report, findings and level check come back as they were').toStrictEqual(JSON.parse(before));
    expect(state.inputText).toBe(ORIGINAL);
    expect(textSteps.at(-1), 'Ctrl+Z history records the undo too').toEqual(['analysis', 'analysis-a', 'The dog runs fast.', ORIGINAL]);
    expect(h.getAnalysisSourceUndo('analysis-a', ORIGINAL)).toBeNull();
  });

  it('walks back two fixes one at a time', () => {
    const { state, h, current } = host();
    h.onCorrectAnalysisText('analysis-a', ORIGINAL, 'The dog runs fast.', []);
    h.onCorrectAnalysisText('analysis-a', 'The dog runs fast.', 'The dog runs very fast.', []);
    expect(h.onUndoAnalysisSourceEdit('analysis-a').ok).toBe(true);
    expect([current().data.originalText, state.inputText]).toEqual(['The dog runs fast.', 'The dog runs fast.']);
    expect(h.getAnalysisSourceUndo('analysis-a', 'The dog runs fast.')).toEqual({ previousText: ORIGINAL });
    expect(h.onUndoAnalysisSourceEdit('analysis-a').ok).toBe(true);
    expect([current().data.originalText, state.inputText]).toEqual([ORIGINAL, ORIGINAL]);
  });

  it('leaves a source box the teacher changed since, and says so', () => {
    const { state, h, current } = host();
    h.onCorrectAnalysisText('analysis-a', ORIGINAL, 'The dog runs fast.', []);
    state.inputText = 'The dog runs fast. A new sentence I typed.';
    expect(h.onUndoAnalysisSourceEdit('analysis-a')).toEqual({ ok: true, sourceRestored: false });
    expect(current().data.originalText).toBe(ORIGINAL);
    expect(state.inputText).toBe('The dog runs fast. A new sentence I typed.');
  });

  it('offers nothing once the report wording has been edited again, and changes nothing', () => {
    const { state, h, current } = host();
    h.onCorrectAnalysisText('analysis-a', ORIGINAL, 'The dog runs fast.', []);
    state.history = [{ ...current(), data: { ...current().data, originalText: 'Edited by hand.' } }];
    expect(h.getAnalysisSourceUndo('analysis-a', 'Edited by hand.')).toBeNull();
    const snapshot = JSON.stringify(state);
    expect(h.onUndoAnalysisSourceEdit('analysis-a').ok).toBe(false);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('the host passes Undo to the analysis view', () => {
  it('wires both callbacks without starting a module load during render', () => {
    expect(anti).toContain('onUpdateResource, onCorrectAnalysisText, getAnalysisSourceUndo, onUndoAnalysisSourceEdit, onReadOriginal: handleReadOriginal,');
    const pending = new Proxy({}, { get: () => () => Promise.resolve() });
    const scope = { _alloHostHandlers: () => pending, _alloHostHandlersPending: pending };
    const get = actual('getAnalysisSourceUndo', '\n', scope);
    expect(get('analysis-a', 'x'), 'not loaded yet: no note, not a truthy promise').toBeNull();
    const old = { _alloHostHandlers: () => ({}), _alloHostHandlersPending: pending };
    expect(actual('getAnalysisSourceUndo', '\n', old)('a', 'x'), 'an older cached module: no note').toBeNull();
    expect(actual('onUndoAnalysisSourceEdit', '\n', old)('a')).toEqual({ ok: false });
  });
});

describe('the analysis view says the source changed and offers Undo', () => {
  const require = createRequire(import.meta.url);
  const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
  let React, createRoot, act, AnalysisView, container, root;
  beforeAll(() => {
    React = require(resolve(modulesDir, 'react'));
    ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
    ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
    global.React = React; window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
    const Stub = () => React.createElement('span');
    window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
    delete window.AlloModules;
    (0, eval)(readFileSync(process.env.ANALYSIS_UNDO_VIEW || 'view_analysis_module.js', 'utf8'));
    AnalysisView = window.AlloModules.AnalysisView;
  });
  afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); root = null; });
  const props = (overrides) => ({
    generatedContent: { id: 'analysis-a', type: 'analysis', data: { originalText: 'The dog runs fast.', grammar: [], concepts: [], accuracy: { rating: 'High', reason: 'ok', discrepancies: [], verifiedFacts: [] } } },
    isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null,
    selectedDiscrepancies: new Set(), selectedGrammarErrors: new Set(), analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(), toggleGrammarErrorSelection: vi.fn(), setGeneratedContent: vi.fn(), setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(), setInputText: vi.fn(), setSelectedGrammarErrors: vi.fn(), setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(), handleAnalysisTextChange: vi.fn(), handleAutoCorrectSource: vi.fn(), handleDownloadAudio: vi.fn(),
    handleFormatText: vi.fn(), handleToggleIsEditingAnalysis: vi.fn(), addToast: vi.fn(), callGemini: vi.fn(), warnLog: () => {},
    t: (k) => k, formatInlineText: (s) => s, renderFormattedText: (s) => s, splitReferencesFromBody: (s) => ({ body: s, references: '' }),
    BilingualFieldRenderer: () => null, SourceReferencesPanel: () => null, ...overrides,
  });
  const mount = (p) => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); act(() => root.render(React.createElement(AnalysisView, p))); return container; };

  it('shows the note with Undo while a change can be undone, and Undo reports what came back', () => {
    const p = props({ getAnalysisSourceUndo: vi.fn(() => ({ previousText: 'The dog run fast.' })), onUndoAnalysisSourceEdit: vi.fn(() => ({ ok: true, sourceRestored: true })) });
    const el = mount(p);
    expect(p.getAnalysisSourceUndo).toHaveBeenCalledWith('analysis-a', 'The dog runs fast.');
    const note = el.querySelector('[data-analysis-source-undo]');
    expect(note.textContent).toContain('Your passage was updated in the source box too. The earlier wording is kept.');
    expect(note.querySelector('[role="status"]')).toBeTruthy();
    const button = note.querySelector('[data-analysis-source-undo-button]');
    expect(button.textContent).toBe('Undo this change');
    act(() => button.click());
    expect(p.onUndoAnalysisSourceEdit).toHaveBeenCalledWith('analysis-a');
    expect(p.addToast).toHaveBeenCalledWith('The earlier wording is back in the report and in your source box.', 'success');
  });

  it('says when the source box was left alone, and when Undo is no longer possible', () => {
    const results = [{ ok: true, sourceRestored: false }, { ok: false }];
    const p = props({ getAnalysisSourceUndo: () => ({ previousText: 'x' }), onUndoAnalysisSourceEdit: () => results.shift() });
    const button = mount(p).querySelector('[data-analysis-source-undo-button]');
    act(() => button.click());
    expect(p.addToast).toHaveBeenLastCalledWith(expect.stringContaining('Your source box had changed since'), 'success');
    act(() => button.click());
    expect(p.addToast).toHaveBeenLastCalledWith(expect.stringContaining('can no longer be undone here'), 'warning');
  });

  it('shows no note when nothing can be undone, for students, or on an older host', () => {
    expect(mount(props({ getAnalysisSourceUndo: () => null })).querySelector('[data-analysis-source-undo]')).toBeNull();
    act(() => root.unmount()); container.remove();
    expect(mount(props({ isTeacherMode: false, getAnalysisSourceUndo: () => ({ previousText: 'x' }) })).querySelector('[data-analysis-source-undo]')).toBeNull();
    act(() => root.unmount()); container.remove();
    expect(mount(props({})).querySelector('[data-analysis-source-undo]')).toBeNull();
  });
});
