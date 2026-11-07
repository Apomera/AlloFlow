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

describe('readability of pasted passages', () => {
  const measure = createHostHandlers({}).calculateReadability;
  const lines = ['When the river rises after several days of rain,', 'the water spreads into nearby fields', 'and leaves fresh soil behind.'];
  it.each(['\n', '\r\n', '\r'])('scores soft wrapping like an unwrapped sentence', newline => {
    const expected = measure(lines.join(' '));
    expect(expected).toMatchObject({ words: 20, sentences: 1, score: '8.7' });
    expect(measure(lines.join(newline))).toEqual(expected);
  });
  it.each([["The solution contained 3.5 grams of dissolved salt in a small container.",1],["Dr. Rivera carefully observed the plant as it grew toward the sunlight.",1],["Prof. Green and Ms. Rivera measured 0.25 liters. The water was clear.",2],["J. R. Tolkien wrote this story. We read it.",2],["The U.S. government published a report. Read the report.",2],["He moved to the U.S. We wrote to him.",2],["Try vegetables, e.g. carrots, in the soup. Mix them in.",2],["Bring paper, pencils, etc. We will begin soon.",2],["Read Fig. 2 and compare the results.",1]])('counts sentences around decimals and abbreviations: %s', (text, count) => { expect(measure(text).sentences).toBe(count); });
  it.each(['We selected solution B. Then we measured it.', 'No. We need another sample.'])('retains a real stop after a letter or short reply: %s', text => { expect(measure(text).sentences).toBe(2); });
  it('keeps paragraph, heading and list boundaries while joining list continuations', () => {
    expect(measure('First thought\n  \nSecond thought').sentences).toBe(2);
    expect(measure('# River study\nWe observed plants.').sentences).toBe(2);
    const list = '- Follow the river\n  to the bank\n- Find two plants\n  near the water';
    expect(measure(list).sentences).toBe(2);
    expect(measure(list)).toEqual(measure('1. Follow the river to the bank\n2) Find two plants near the water'));
  });
});

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
  it('does not accept an edited analysis as a finished check for its own new wording', () => {
    const item = analysisItem();
    Object.assign(item.data, { concepts: ['orbits'], readingLevel: { range: '8th Grade' }, accuracy: { rating: 'High' }, depthOfKnowledge: { level: 3 }, learnerBarriers: ['Old barrier'], analysisCoverage: { sections: [] }, analysisIncomplete: true });
    const h = host({ items: [item] });
    const text = 'Seeds need water to sprout.';
    h.handlers.handleAnalysisTextChange(text);
    const edited = h.state.history[0];
    expect(edited.data).toMatchObject({ analysisNeedsRecheck: true, originalText: text });
    for (const key of ['concepts', 'readingLevel', 'accuracy', 'depthOfKnowledge', 'learnerBarriers', 'analysisCoverage', 'analysisIncomplete']) expect(edited.data).not.toHaveProperty(key);
    const p = view({ history: h.state.history, inputText: text });
    expect(state(p.el)).toBe('changed');
    p.render({history: [edited, analysisItem('fresh', text)]});
    expect(state(p.el)).toBe('done');
  });
  it('shows partial coverage in the Source view and offers to check the remaining sections', async () => {
    const before = window.AlloModules.GenerationMatrix;
    new Function(readFileSync('generation_matrix_module.js', 'utf8'))();
    try {
      const signature = new Function(readFileSync('instructional_context_module.js', 'utf8')+'; return window.AlloModules.InstructionalContext.fingerprintText;')();
      const partial = analysisItem('partial', TEXT);
      Object.assign(partial.data, { analysisIncomplete: true, analysisCoverage: { sourceFingerprint: signature(TEXT), sections: [
        { start: 0, end: 5, report: { concepts: ['seed'], readingLevel: { range: '5th Grade' }, accuracy: { rating: 'High' } } }
      ] } });
      const onRecheckAnalysis = vi.fn(async () => analysisItem('partial', TEXT));
      const p = view({ history: [partial], onRecheckAnalysis });
      expect(state(p.el)).toBe('partial');
      expect(p.el.querySelector('[data-source-run-check]').textContent).toBe('Check remaining sections');
      p.el.querySelector('[data-source-check-details]').click();
      expect(p.props.openAnalysis).toHaveBeenCalledWith(partial);
      await act(async () => p.el.querySelector('[data-source-run-check]').click());
      expect(onRecheckAnalysis).toHaveBeenCalledWith(partial, { inlineFailure: true });
    } finally {
      window.AlloModules.GenerationMatrix = before;
    }
  });
  it('remembers an incomplete check and retries that report in place from the source view', async () => {
    const incomplete = analysisItem('attempt', TEXT);
    incomplete.data.analysisIncomplete = true;
    const completed = analysisItem('attempt', TEXT);
    const onRecheckAnalysis = vi.fn(async () => completed);
    const p = view({ history: [incomplete], onRecheckAnalysis });
    expect(state(p.el)).toBe('failed');
    expect(p.el.querySelector('[data-source-run-check]').textContent).toBe('Retry');
    await act(async () => p.el.querySelector('[data-source-run-check]').click());
    expect(onRecheckAnalysis).toHaveBeenCalledWith(incomplete, { inlineFailure: true });
    expect(p.props.handleGenerate).not.toHaveBeenCalled();
    expect(p.props.openAnalysis).toHaveBeenCalledWith(completed);
    p.render({ history: [completed, incomplete] });
    expect(state(p.el)).toBe('done');
  });
  it('opens the successful result for a deliberate analysis and keeps automatic checks in the source view', async () => {
    const result = analysisItem('checked', TEXT);
    const p = view({ history: [], handleGenerate: vi.fn(async () => result) });
    await act(async () => { p.el.querySelector('[data-source-run-check]').click(); });
    expect(p.props.openAnalysis).toHaveBeenCalledWith(result);
    p.props.openAnalysis.mockClear();
    await act(async () => { p.el.querySelector('[data-source-use]').click(); });
    expect(p.props.openAnalysis).not.toHaveBeenCalled();
  });

  it('keeps an edited source in place if an earlier check finishes later', async () => {
    let complete;
    const p = view({ history: [], handleGenerate: () => new Promise(resolve => { complete = resolve; }) });
    act(() => p.el.querySelector('[data-source-run-check]').click());
    p.render({ inputText: TEXT + ' New sentence.' });
    await act(async () => complete(analysisItem('older', TEXT)));
    expect(p.props.openAnalysis).not.toHaveBeenCalled();
  });
  it('shows the check for the analyzed text and opens it', () => {
    const p = view();
    expect(state(p.el)).toBe('done');
    act(() => p.el.querySelector('[data-source-check-details]').click());
    expect(p.props.openAnalysis).toHaveBeenCalledWith(expect.objectContaining({ id: 'analysis-1' }));
  });

  it('offers to check again once the text no longer matches', () => {
    const p = view();
    p.render({ inputText: TEXT + ' Stems hold it up.' });
    expect(state(p.el)).toBe('changed');
    expect(p.el.querySelector('[data-source-check-details]')).toBeNull();
    act(() => p.el.querySelector('[data-source-run-check]').click());
    expect(p.props.handleGenerate).toHaveBeenCalledWith('analysis', null, false, TEXT + ' Stems hold it up.', { selectedReadingSourceId: '__input__', stayOnView: true, inlineFailure: true }, false);
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
