import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// React lives in the CRA app's tree, not the repo root — same resolution the
// other component tests use.
const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let createRoot;
let act;

// A flagged grammar/spelling "error" is sometimes wrong, and a teacher will
// often just fix it by hand. Before this change the only way to clear a notice
// was to let the AI rewrite the source text: unchecking a box left the note in
// the list forever, and "Clear Resolved Notices" only appeared once EVERY note
// carried '✓ FIXED:'. So a manually-corrected document could never reach a
// clean state.
//
// Dismiss is a pure list edit — no AI call, no text rewrite — and it stays a
// DISTINCT marker from FIXED, because claiming the document was edited when it
// wasn't would misrepresent what happened to the source.

const SRC = fs.readFileSync(path.resolve(process.cwd(), 'view_analysis_module.js'), 'utf8');

let AnalysisView;
let container;
let root;

function renderView(props) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root.render(React.createElement(AnalysisView, props)); });
  return container;
}

function makeProps(grammar, overrides = {}) {
  const state = {
    generatedContent: {
      type: 'analysis',
      data: {
        grammar,
        originalText: 'The quick brown fox jumps over the lazy dog.',
        readingLevel: { range: '5th Grade', explanation: 'Simple.' },
        concepts: [],
        accuracy: { rating: 'High', reason: 'ok', discrepancies: [], verifiedFacts: [] },
      },
    },
    isTeacherMode: true,
    isProcessing: false,
    isEditingAnalysis: false,
    sourceRefineInstruction: '',
    downloadingContentId: null,
    selectedDiscrepancies: new Set(),
    selectedGrammarErrors: new Set(),
    analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(),
    toggleGrammarErrorSelection: vi.fn(),
    setGeneratedContent: vi.fn(),
    setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(),
    setInputText: vi.fn(),
    setSelectedGrammarErrors: vi.fn(),
    setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(),
    handleAnalysisTextChange: vi.fn(),
    handleAutoCorrectSource: vi.fn(),
    handleDownloadAudio: vi.fn(),
    handleFormatText: vi.fn(),
    handleToggleIsEditingAnalysis: vi.fn(),
    addToast: vi.fn(),
    callGemini: vi.fn(),
    warnLog: () => {},
    t: (k) => k,
    formatInlineText: (s) => s,
    renderFormattedText: (s) => s,
    splitReferencesFromBody: (s) => ({ body: s, references: '' }),
    BilingualFieldRenderer: () => null,
    SourceReferencesPanel: () => null,
    ...overrides,
  };
  return state;
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  // This view resolves icons lazily through window.AlloIcons (see _lazyIcon),
  // not as bare globals — an icon missing from the registry renders as null.
  const Stub = () => React.createElement('span', { 'data-icon': true });
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  window.React = React;
  delete window.AlloModules;
  // eslint-disable-next-line no-eval
  (0, eval)(SRC);
  AnalysisView = window.AlloModules && window.AlloModules.AnalysisView;
  if (typeof AnalysisView !== 'function') throw new Error('AnalysisView failed to register');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  if (container && container.parentNode) container.parentNode.removeChild(container);
  root = null;
  container = null;
  vi.restoreAllMocks();
});

const dismissButtons = (el) =>
  [...el.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('analysis.grammar_dismiss_one'));
const restoreButtons = (el) =>
  [...el.querySelectorAll('button')].filter((b) => (b.getAttribute('aria-label') || '').startsWith('analysis.grammar_restore_one'));

describe('dismissing a grammar notice without the AI', () => {
  it('offers a dismiss control on every open notice', () => {
    const el = renderView(makeProps(['Missing comma after "However"', 'Spelling: "recieve"']));
    expect(dismissButtons(el)).toHaveLength(2);
  });

  it('marks the note DISMISSED without calling the AI or touching the source text', () => {
    const props = makeProps(['Spelling: "recieve"']);
    const el = renderView(props);

    act(() => { dismissButtons(el)[0].click(); });

    expect(props.setGeneratedContent).toHaveBeenCalledTimes(1);
    const updater = props.setGeneratedContent.mock.calls[0][0];
    const next = updater({ data: { grammar: ['Spelling: "recieve"'], originalText: 'UNCHANGED' } });

    expect(next.data.grammar[0]).toBe('✓ DISMISSED: Spelling: "recieve"');
    // The whole point: no rewrite, no AI.
    expect(next.data.originalText).toBe('UNCHANGED');
    expect(props.callGemini).not.toHaveBeenCalled();
    expect(props.setIsProcessing).not.toHaveBeenCalled();
  });

  it('keeps DISMISSED distinct from FIXED so the record stays honest', () => {
    // FIXED means the AI rewrote the text; DISMISSED means it did not. Merging
    // them would claim an edit that never happened.
    const el = renderView(makeProps(['✓ FIXED: Missing comma', '✓ DISMISSED: Not actually wrong']));
    const text = el.textContent;
    expect(text).toContain('Missing comma');
    expect(text).toContain('Not actually wrong');
    // Only the dismissed row gets the restore affordance.
    expect(restoreButtons(el)).toHaveLength(1);
  });

  it('lets a dismissal be undone', () => {
    const props = makeProps(['✓ DISMISSED: Not actually wrong']);
    const el = renderView(props);

    act(() => { restoreButtons(el)[0].click(); });

    const updater = props.setGeneratedContent.mock.calls[0][0];
    const next = updater({ data: { grammar: ['✓ DISMISSED: Not actually wrong'] } });
    expect(next.data.grammar[0]).toBe('Not actually wrong');
  });

  it('counts only OPEN notices in the issue badge', () => {
    const el = renderView(makeProps([
      'Open one',
      '✓ FIXED: Already fixed',
      '✓ DISMISSED: Not an error',
    ]));
    // The amber pill is the outstanding-issue badge. One open note, not three —
    // it used to count every note forever, so a teacher who had dealt with all
    // of them still saw "3 Issues".
    const badge = [...el.querySelectorAll('span')]
      .find((s) => /bg-amber-100/.test(s.className || '') && /Issue/.test(s.textContent || ''));
    expect(badge, 'outstanding-issue badge should render').toBeTruthy();
    expect(badge.textContent.replace(/\s+/g, ' ').trim()).toBe('1 Issue');
  });

  it('unlocks the clear-all button once everything is resolved by ANY means', () => {
    // Previously this required every note to be AI-FIXED, so a teacher who
    // corrected anything by hand could never clear the panel.
    const el = renderView(makeProps(['✓ FIXED: one', '✓ DISMISSED: two']));
    expect(el.textContent).toContain('analysis.dismiss_fixed');
    expect(el.textContent).toContain('analysis.grammar_all_resolved');
  });

  it('still shows outstanding work when only some notices are resolved', () => {
    const el = renderView(makeProps(['Open one', '✓ DISMISSED: two']));
    expect(el.textContent).not.toContain('analysis.dismiss_fixed');
    expect(dismissButtons(el)).toHaveLength(1);
  });

  it('hides dismiss controls from students', () => {
    const el = renderView(makeProps(['Missing comma'], { isTeacherMode: false }));
    expect(dismissButtons(el)).toHaveLength(0);
  });
});

describe('analysis grammar updates persist through the host artifact boundary', () => {
  it('routes dismissal and clearing to the originating saved artifact', () => {
    const props = makeProps(['Spelling: lazy']);
    props.generatedContent.id = 'analysis-a';
    let history = [props.generatedContent, {id:'analysis-b',type:'analysis',data:{grammar:['Other note']}}];
    props.onUpdateResource = vi.fn((id, updater) => { history = history.map(item => item.id === id ? updater(item) : item); return true; });
    const el = renderView(props);
    act(()=>dismissButtons(el)[0].click());
    expect(props.onUpdateResource).toHaveBeenCalledWith('analysis-a', expect.any(Function));
    expect(history[0].data.grammar[0]).toBe('✓ DISMISSED: Spelling: lazy');
    expect(history[1].data.grammar).toEqual(['Other note']);
    expect(props.setGeneratedContent).not.toHaveBeenCalled();
    act(()=>root.render(React.createElement(AnalysisView,{...props,generatedContent:history[0]})));
    const clear = [...el.querySelectorAll('button')].find(button=>button.textContent.includes('analysis.dismiss_fixed'));
    act(()=>clear.click());
    expect(history[0].data.grammar).toEqual([]);
  });
  it('delegates correction, revision checking and text bookkeeping to the host', async () => {
    const corrected = 'The quick brown fox jumps over the lazi dog.';
    const props = makeProps(['Spelling: lazy'], {selectedGrammarErrors:new Set([0]),callGemini:vi.fn().mockResolvedValue(corrected),onCorrectAnalysisText:vi.fn().mockResolvedValue(true)});
    props.generatedContent.id = 'analysis-a';
    const el = renderView(props);
    await act(async()=>{el.querySelector('[aria-label="common.fix_grammar_errors"]').click();});
    expect(props.onCorrectAnalysisText).toHaveBeenCalledWith('analysis-a',props.generatedContent.data.originalText,corrected,['Spelling: lazy']);
    expect(props.setGeneratedContent).not.toHaveBeenCalled(); expect(props.setInputText).not.toHaveBeenCalled();
    expect(props.addToast).toHaveBeenCalledWith('process.grammar_fixed','success');
  });
  it('reports a concurrent source edit without claiming corrections were applied', async () => {
    const props = makeProps(['Spelling: lazy'], {selectedGrammarErrors:new Set([0]),callGemini:vi.fn().mockResolvedValue('The quick brown fox jumps over the lazi dog.'),onCorrectAnalysisText:vi.fn().mockResolvedValue(false)});
    props.generatedContent.id = 'analysis-a';
    const el = renderView(props);
    await act(async()=>{el.querySelector('[aria-label="common.fix_grammar_errors"]').click();});
    expect(props.addToast).toHaveBeenCalledWith('analysis.grammar_source_changed','warning');
    expect(props.addToast).not.toHaveBeenCalledWith('process.grammar_fixed','success');
    expect(props.setInputText).not.toHaveBeenCalled();
  });
});
