// Source box and analyzed text stay in step (2026-10-29).
// Before this, editing the analyzed text never reached the source box and editing the
// box never reached the analysis, silently. Now:
// - Host: the box follows analysis edits (and their undo/redo) only while it still
//   holds the same text, so nothing typed in the box is ever overwritten.
// - Source box (shipped module): a note when an analyzed text is focused, and another
//   if the box drifts from its analysis, with Edit in Analyze Source / Re-analyze.
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

// Slice a compiled declaration by matching its braces.
function sliceBlock(text, start) {
  const at = text.indexOf(start);
  expect(at, 'missing ' + start).toBeGreaterThanOrEqual(0);
  const body = /\)\s*\{|=>\s*\{/g; body.lastIndex = at;
  let depth = 0, i = body.exec(text).index;
  for (; i < text.length; i++) { if (text[i] === '{') depth++; else if (text[i] === '}' && --depth === 0) break; }
  return text.slice(at, i + 1);
}

let SourceInputPanel;
beforeAll(() => {
  window.React = React;
  const Icon = () => null;
  SourceInputPanel = new Function('React', 'RefreshCw', 'CheckCircle2', 'Download', 'Search', 'Upload', 'FileText', 'Globe', 'X',
    sliceBlock(MODULE, 'function SourceInputPanel(') + '\nreturn SourceInputPanel;')(React, Icon, Icon, Icon, Icon, Icon, Icon, Icon, Icon);
});
const mounted = [];
afterEach(() => { mounted.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); }); delete window.__alloOpenSourceForRevision; });

function panel(initial) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = ReactDOMClient.createRoot(el);
  let props = { t: () => '', expandedTools: ['source-input'], isCanvas: true, searchOptions: {}, inputText: TEXT,
    setInputText: vi.fn(), history: [analysisItem()], handleGenerate: vi.fn(), isProcessing: false, ...initial };
  const render = next => { props = { ...props, ...next }; act(() => root.render(React.createElement(SourceInputPanel, props))); };
  render({});
  mounted.push({ root, el });
  return { el, render, get props() { return props; } };
}
const note = el => el.querySelector('[data-source-analysis-note]');
const box = el => el.querySelector('textarea[data-allo-textundo="input"]');

describe('source box: notes about its analysis', () => {
  it('says nothing until an analyzed text is focused, then offers to edit it in Analyze Source', () => {
    const open = vi.fn();
    window.__alloOpenSourceForRevision = open;
    const p = panel();
    expect(note(p.el)).toBeNull();
    act(() => box(p.el).focus());
    expect(note(p.el).getAttribute('data-source-analysis-note')).toBe('analyzed');
    expect(box(p.el).getAttribute('aria-describedby')).toBe('source-analysis-note');
    act(() => p.el.querySelector('[data-source-edit-in-analysis]').click());
    expect(open).toHaveBeenCalledWith('analysis-1');
  });

  it('turns into a re-analyze offer once the box no longer matches', () => {
    const p = panel();
    act(() => box(p.el).focus());
    p.render({ inputText: TEXT + ' Stems hold it up.' });
    expect(note(p.el).getAttribute('data-source-analysis-note')).toBe('changed');
    act(() => p.el.querySelector('[data-source-reanalyze]').click());
    expect(p.props.handleGenerate).toHaveBeenCalledWith('analysis');
  });

  it('warns about drift even if the box was never focused first', () => {
    const p = panel();
    p.render({ inputText: TEXT + ' Pasted more.' });
    expect(note(p.el).getAttribute('data-source-analysis-note')).toBe('changed');
  });

  it('stays quiet after Keep editing here', () => {
    const p = panel();
    act(() => box(p.el).focus());
    act(() => p.el.querySelector('[data-source-analysis-dismiss]').click());
    expect(note(p.el)).toBeNull();
    p.render({ inputText: TEXT + ' More.' });
    expect(note(p.el)).toBeNull();
  });

  it('clears once a new analysis matches the edited text', () => {
    const p = panel();
    p.render({ inputText: 'New text.' });
    expect(note(p.el)).not.toBeNull();
    p.render({ history: [analysisItem(), analysisItem('analysis-2', 'New text.')] });
    expect(note(p.el)).toBeNull();
  });

  it('shows nothing for text that was never analyzed', () => {
    const p = panel({ history: [] });
    act(() => box(p.el).focus());
    expect(note(p.el)).toBeNull();
    p.render({ inputText: 'Something else.' });
    expect(note(p.el)).toBeNull();
  });

  it('offers no editor button on a host without the hook', () => {
    const p = panel();
    act(() => box(p.el).focus());
    expect(note(p.el)).not.toBeNull();
    expect(p.el.querySelector('[data-source-edit-in-analysis]')).toBeNull();
  });
});
