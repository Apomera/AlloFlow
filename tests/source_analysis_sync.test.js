// Source box and analyzed text stay in step (2026-10-29).
// Before this, editing the analyzed text never reached the source box and editing the
// box never reached the analysis, silently. Now:
// - Host: the box follows analysis edits (and their undo/redo) only while it still
//   holds the same text, so nothing typed in the box is ever overwritten.
// - Source view (shipped module): the check shown is the one for the exact text,
//   so an edited text reads as not checked yet, with Run check.
// ALLO_SIDEBAR_CANDIDATE / ALLO_HOST_CANDIDATE point at mutated copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const createHostHandlers = new Function(readFileSync(process.env.ALLO_HOST_CANDIDATE || 'host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
const MODULE = readFileSync(process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js', 'utf8');
const TEXT = 'Plants need light. Roots take in water.';

const analysisItem = (id = 'analysis-1', text = TEXT) => ({
  id, type: 'analysis', title: 'Plants', config: { language: 'English' },
  data: { analysisSourceVersion: 1, originalText: text, rawEnglishText: text, localStats: { words: 7 } }
});

function host({ box = TEXT, items = [analysisItem()] } = {}) {
  const state = { history: items, generatedContent: items[0], inputText: box };
  const textUndo = { current: { applyingInput: false } };
  const deps = {
    get history() { return state.history; }, get generatedContent() { return state.generatedContent; },
    setHistory: setter => { state.history = setter(state.history); },
    setGeneratedContent: setter => { state.generatedContent = typeof setter === 'function' ? setter(state.generatedContent) : setter; },
    setInputText: setter => { state.inputText = typeof setter === 'function' ? setter(state.inputText) : setter; },
    _textUndoLiveRef: { current: state }, textUndoRef: textUndo,
    _recordTextChange: vi.fn(), t: () => '', addToast: vi.fn(), warnLog: vi.fn(), gradeLevel: '3', leveledTextLanguage: 'English',
    _resourceMutationStateRef: { current: state }, _applySimplifiedTextMutation: item => item,
  };
  const handlers = createHostHandlers(deps);
  deps._getFreshTextComplexityEvidence = handlers._getFreshTextComplexityEvidence;
  deps._readTextDomain = handlers._readTextDomain;
  return { state, textUndo, handlers };
}

describe('host: the source box follows the analyzed text only while they match', () => {
  it('updates a matching box and does not record it as a separate undo step', () => {
    const h = host();
    h.handlers.handleAnalysisTextChange('Plants need sunlight. Roots take in water.');
    expect(h.state.generatedContent.data.originalText).toBe('Plants need sunlight. Roots take in water.');
    expect(h.state.inputText).toBe('Plants need sunlight. Roots take in water.');
    expect(h.textUndo.current.applyingInput).toBe(true);
  });

  it('never overwrites a box that already holds different text', () => {
    const h = host({ box: 'A different passage the teacher pasted next.' });
    h.handlers.handleAnalysisTextChange('Plants need sunlight. Roots take in water.');
    expect(h.state.inputText).toBe('A different passage the teacher pasted next.');
    expect(h.textUndo.current.applyingInput).toBe(false);
  });

  it('does nothing when the edit leaves the text unchanged', () => {
    const h = host();
    h.handlers.handleAnalysisTextChange(TEXT);
    expect(h.textUndo.current.applyingInput).toBe(false);
  });

  it('brings a matching box along when an analysis edit is undone or redone', () => {
    const h = host();
    h.handlers._applyTextDomain({ domain: 'analysis', id: 'analysis-1', value: 'Restored earlier wording.' });
    expect(h.state.history[0].data.originalText).toBe('Restored earlier wording.');
    expect(h.state.inputText).toBe('Restored earlier wording.');
  });

  it('leaves a different box alone on undo or redo', () => {
    const h = host({ box: 'Something else.' });
    h.handlers._applyTextDomain({ domain: 'analysis', id: 'analysis-1', value: 'Restored earlier wording.' });
    expect(h.state.inputText).toBe('Something else.');
  });
});

let SourceView;
beforeAll(() => {
  window.React = React; window.AlloModules = {};
  new Function(MODULE)();
  SourceView = window.AlloModules.SidebarPanels && window.AlloModules.SidebarPanels.SourceView;
  if (!SourceView) throw new Error('SourceView not registered');
});
const mounted = [];
afterEach(() => { mounted.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); }); });

function view(initial) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = ReactDOMClient.createRoot(el);
  let props = { t: () => '', inputText: TEXT, setInputText: vi.fn(), sourceRecord: null, setSourceRecord: vi.fn(),
    history: [analysisItem()], handleGenerate: vi.fn(async () => {}), isProcessing: false, aiTextAvailable: true, openAnalysis: vi.fn(), ...initial };
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(SourceView, props))); };
  render({});
  mounted.push({ root, el });
  return { el, render, get props() { return props; } };
}
const state = el => el.querySelector('[data-source-check-state]').getAttribute('data-source-check-state');

// Since the 2026-10-30 source redesign the sidebar holds no text box: the Source
// view's check follows the exact text, so an edit shows as not checked yet.
describe('Source view: the check belongs to the exact text', () => {
  it('shows the check for the analyzed text and opens it', () => {
    const p = view();
    expect(state(p.el)).toBe('done');
    act(() => p.el.querySelector('[data-source-check-details]').click());
    expect(p.props.openAnalysis).toHaveBeenCalledWith(expect.objectContaining({ id: 'analysis-1' }));
  });

  it('offers to check again once the text no longer matches', () => {
    const p = view();
    p.render({ inputText: TEXT + ' Stems hold it up.' });
    expect(state(p.el)).toBe('none');
    expect(p.el.querySelector('[data-source-check-details]')).toBeNull();
    act(() => p.el.querySelector('[data-source-run-check]').click());
    expect(p.props.handleGenerate).toHaveBeenCalledWith('analysis', null, false, TEXT + ' Stems hold it up.', { selectedReadingSourceId: '__input__', stayOnView: true }, false);
  });

  it('shows the new check once an analysis matches the edited text', () => {
    const p = view({ inputText: 'New text.' });
    expect(state(p.el)).toBe('none');
    p.render({ history: [analysisItem(), analysisItem('analysis-2', 'New text.')] });
    expect(state(p.el)).toBe('done');
  });

  it('shows not checked for text that was never analyzed', () => {
    expect(state(view({ history: [] }).el)).toBe('none');
  });
});
