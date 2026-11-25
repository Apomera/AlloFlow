// "Two roads": a start without a passage (topic, word list, blank) acts at once. Until
// 2026-11-23 the first such start opened a blocking "Two roads diverged" dialog; it gated
// nothing, so it was replaced by its inline note ("The path less traveled · experimental ·
// Back to the guided path"). These tests pin that no dialog appears, that the note shows
// wherever the dialog used to, and that its link opens Quick Start. Unit tests rebuild the
// region from the compiled module per test; the later blocks render the shipped Source
// panel chooser. ALLO_SIDEBAR_CANDIDATE selects a candidate module.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween, expectAnchorCount } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const FILE = process.env.ALLO_SIDEBAR_CANDIDATE || 'view_sidebar_panels_module.js';
const MODULE = readFileSync(FILE, 'utf8');
const SKIP_KEY = 'allo_path_fork_skip';
const TITLE = 'Two roads diverged in a wood';
const BADGE = 'The path less traveled · experimental';
const BACK = 'Back to the guided path';
const TOAST_GUIDED = 'Back on the guided path. There and back again.';

let REGION;
const mounts = [];
beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React;
  for (const anchor of ['function createPathFork(', 'const PathFork = createPathFork();', 'function OtherWaysToStart(']) {
    expectAnchorCount(MODULE, anchor, 1, { file: FILE });
  }
  REGION = sliceBetween(MODULE, 'function useAiTextAvailable(', 'function SourceStartingPointChooser(', { file: FILE });
});
beforeEach(() => {
  window.localStorage.clear();
  window.__alloAddToast = vi.fn();
  window.__alloOpenQuickStart = vi.fn();
  window.__alloResolveAiCapability = () => ({ text: true });
});
afterEach(() => {
  mounts.splice(0).forEach(({ root, el }) => { act(() => root.unmount()); el.remove(); });
  delete window.__alloAddToast; delete window.__alloOpenQuickStart; delete window.__alloResolveAiCapability;
  window.localStorage.clear();
});

// A fresh fork per call, as on a fresh page load.
const freshWays = () => new Function('React', REGION + '\nreturn OtherWaysToStart;')(React);
function mount(Ways, props) {
  const el = document.createElement('div'); document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(React.createElement(Ways, { t: () => '', busy: false, ...props })));
  mounts.push({ root, el });
  return el;
}
// The retired dialog: no role="dialog", no [data-path-fork] backdrop, and none of its text anywhere.
const noDialog = () => {
  expect(document.querySelector('[role="dialog"]'), 'no dialog').toBeNull();
  expect(document.querySelector('[data-path-fork], [data-path-fork-guided], [data-path-fork-less-traveled]'), 'no fork dialog parts').toBeNull();
  expect(document.body.textContent).not.toContain(TITLE);
};
const byText = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const toggle = el => el.querySelector('[data-help-key="sidebar_other_ways_toggle"]');
const click = node => { expect(node, 'missing control').toBeTruthy(); act(() => node.click()); };

describe('"Other ways to start": no fork dialog, the inline note instead', () => {
  it('opens directly on a host without Quick Start, with the note but no way back', () => {
    delete window.__alloOpenQuickStart;
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    noDialog();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('[data-path-less-traveled]').textContent).toBe(BADGE);
    expect(el.querySelector('[data-path-fork-back]'), 'no way back without Quick Start').toBeNull();
  });

  it('opens at once on the first try with Quick Start registered, and the note carries the experimental signal and the way back', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    noDialog();
    expect(toggle(el).getAttribute('aria-expanded'), 'the starts open on the first click').toBe('true');
    const note = el.querySelector('[data-path-less-traveled]');
    expect(note.textContent).toContain(BADGE);
    expect(note.textContent).toContain(BACK);
    expect(window.__alloOpenQuickStart).not.toHaveBeenCalled();
    expect(window.__alloAddToast, 'no toast on opening').not.toHaveBeenCalled();
  });

  it('every start acts on the first click: blank, topic and word list', () => {
    const onStartBlank = vi.fn(), onStartFromTopic = vi.fn(), onStartFromWordList = vi.fn();
    const el = mount(freshWays(), { onStartBlank, onStartFromTopic, onStartFromWordList });
    click(toggle(el));
    click(el.querySelector('[data-help-key="sidebar_start_blank"]'));
    expect(onStartBlank).toHaveBeenCalledTimes(1);
    click(el.querySelector('[data-help-key="sidebar_start_word_list"]'));
    expect(onStartFromWordList).toHaveBeenCalledTimes(1);
    click(el.querySelector('[data-help-key="sidebar_source_needed_topic_toggle"]'));
    expect(el.querySelector('[data-help-key="sidebar_source_needed_topic_create"]'), 'topic form opened').toBeTruthy();
    noDialog();
  });

  it('closing and reopening never asks, and the old "Don’t ask me again" key is neither read nor written', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    for (let i = 0; i < 3; i++) { click(toggle(el)); click(toggle(el)); }
    noDialog();
    expect(window.localStorage.getItem(SKIP_KEY), 'nothing is remembered').toBeNull();
    window.localStorage.setItem(SKIP_KEY, '1');
    const later = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(later));
    expect(toggle(later).getAttribute('aria-expanded')).toBe('true');
    expect(later.querySelector('[data-path-less-traveled]'), 'a stale skip key does not hide the note').toBeTruthy();
  });

  it('renders nothing outside the sidebar (no portal), even with ReactDOM and a theme wrapper present', () => {
    const themed = document.createElement('div'); themed.className = 'theme-dark'; document.body.appendChild(themed);
    window.ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
    try {
      const el = mount(freshWays(), { onStartBlank: vi.fn() });
      click(toggle(el));
      expect(themed.childElementCount, 'nothing portaled into the theme wrapper').toBe(0);
      expect(el.contains(el.querySelector('[data-path-less-traveled]'))).toBe(true);
      noDialog();
    } finally { themed.remove(); delete window.ReactDOM; }
  });

  it('the way back is a real button in the tab order', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    const back = el.querySelector('[data-path-fork-back]');
    expect(back.tagName).toBe('BUTTON');
    expect(back.getAttribute('type')).toBe('button');
    expect(back.disabled).toBe(false);
    act(() => back.focus());
    expect(document.activeElement).toBe(back);
  });

  it('"Back to the guided path" closes the starts and opens Quick Start', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    click(el.querySelector('[data-path-fork-back]'));
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
    expect(window.__alloAddToast).toHaveBeenLastCalledWith(TOAST_GUIDED, 'info');
  });

  it('with no AI, Blank starts at once and the note with its way back sits beside it', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const onStartBlank = vi.fn();
    const el = mount(freshWays(), { onStartBlank });
    expect(el.querySelector('[data-path-less-traveled]').textContent).toContain(BADGE);
    click(el.querySelector('[data-help-key="sidebar_start_blank"]'));
    expect(onStartBlank).toHaveBeenCalledTimes(1);
    noDialog();
    click(byText(el, BACK));
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
  });
});

describe('the Source panel chooser (shipped module): no fork, the note in every form', () => {
  it('opens the form on the first choice, with the note, and focus in the first field', async () => {
    window.AlloModules = {};
    new Function('window', 'document', 'console', MODULE)(window, document, console);
    const api = window.AlloModules.SidebarPanels;
    expect(api && api.SourceInputShellView).toBeTruthy();
    const icons = Object.fromEntries(['BookOpen', 'CheckSquare', 'ChevronDown', 'ChevronUp', 'ClipboardList', 'FileDown', 'FileText', 'Globe', 'Layout', 'Link', 'RefreshCw', 'Sparkles', 'Upload', 'X'].map(n => [n, () => null]));
    const text = 'The class garden collects rainwater.';
    const handleGenerate = vi.fn(async () => ({ id: 'r' }));
    const props = {
      ...icons, activeView: 'input', isGuidedToolVisible: () => true, isTeacherMode: true, isParentMode: false,
      isIndependentMode: false, guidedMode: false, expandedTools: ['source-input'], inputText: text,
      sourceRecord: { inUse: { text, version: 1, at: 1 }, versions: [{ text, version: 1, at: 1 }], pending: null },
      sourceReplacement: null, history: [], fileInputRef: { current: { click: vi.fn() } }, isProcessing: false,
      isExtracting: false, isGeneratingSource: false, showSourceGen: false, showUrlInput: false, searchOptions: [],
      sourceVocabulary: '', sourceTopic: '', t: key => key, handleGenerate, handleGenerateSource: vi.fn(),
      handleSourceFileUpload: vi.fn(), setInputText: vi.fn(), setSourceRecord: vi.fn(), setSourceReplacement: vi.fn(),
      setSourceTopic: vi.fn(), setSourceVocabulary: vi.fn(), openSourceView: vi.fn(), setExpandedTools: vi.fn(),
      setShowSourceGen: vi.fn(), setShowUrlInput: vi.fn(), toggleTool: vi.fn(), addToast: vi.fn(),
    };
    window.__alloBlankStartTypes = ['quiz'];
    const el = document.createElement('div'); document.body.appendChild(el);
    const root = createRoot(el);
    mounts.push({ root, el });
    act(() => root.render(React.createElement(api.SourceInputShellView, props)));
    const chooser = el.querySelector('[data-source-start-chooser]');
    click(chooser.querySelector('[data-source-start-toggle]')); // a passage is in the box, so the choices start folded
    expect(chooser.querySelector('form'), 'no form before the choice').toBeNull();
    click(byText(chooser, 'From a topic'));
    noDialog();
    expect(chooser.querySelector('form')).toBeTruthy();
    expect(chooser.querySelector('[data-path-less-traveled]').textContent).toContain(BADGE);
    expect(document.activeElement, 'focus lands in the topic field').toBe(chooser.querySelector('form input[type="text"]'));
    click(byText(chooser, 'Cancel'));
    click(byText(chooser, 'From a word list'));
    noDialog();
    expect(chooser.querySelector('form')).toBeTruthy();
    expect(document.activeElement, 'language is prefilled, so the terms box gets focus').toBe(chooser.querySelector('form textarea'));
    click(byText(chooser, 'Cancel'));
    click(byText(chooser, 'Blank resource'));
    expect(chooser.querySelector('[data-path-less-traveled]'), 'the blank form carries the note too').toBeTruthy();
    // "Back to the guided path" closes the form and opens Quick Start.
    click(chooser.querySelector('[data-path-fork-back]'));
    expect(chooser.querySelector('form')).toBeNull();
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
    expect(handleGenerate).not.toHaveBeenCalled();
    delete window.__alloBlankStartTypes;
  });
});

describe('the glossary tool opens the Source panel on "From a word list"', () => {
  // One evaluation, so the tool link, the request channel and the chooser share state as in the module.
  const build = () => {
    expectAnchorCount(MODULE, 'const sourceStartRequests = ', 1, { file: FILE });
    const region = sliceBetween(MODULE, 'const _spSafeJsonReviver = ', 'function SourceNeededNotice(', { file: FILE });
    return new Function('React', region + '\nreturn { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests };')(React);
  };
  const chooserProps = { t: () => '', handleGenerate: vi.fn(), busy: false };

  it('fills the chooser with the word-list form and focuses it, with no dialog on the way', () => {
    const { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests } = build();
    const chooserHost = mount(SourceStartingPointChooser, chooserProps);
    const el = mount(OtherWaysToStart, { onStartFromWordList: () => sourceStartRequests.request('word-list') });
    click(toggle(el));
    click(el.querySelector('[data-help-key="sidebar_start_word_list"]'));
    noDialog();
    expect(chooserHost.querySelector('[data-path-less-traveled]'), 'the word-list form carries the note').toBeTruthy();
    expect(chooserHost.querySelector('[data-source-word-language]')).toBeTruthy();
    expect(document.activeElement).toBe(chooserHost.querySelector('form textarea'));
  });

  it('also opens the word-list form when a passage folded the chooser away', () => {
    const { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests } = build();
    const chooserHost = mount(SourceStartingPointChooser, { ...chooserProps, hasSource: true });
    expect(chooserHost.querySelector('form'), 'folded before the request').toBeNull();
    const el = mount(OtherWaysToStart, { onStartFromWordList: () => sourceStartRequests.request('word-list') });
    click(toggle(el));
    click(el.querySelector('[data-help-key="sidebar_start_word_list"]'));
    expect(chooserHost.querySelector('[data-source-word-language]')).toBeTruthy();
    expect(document.activeElement).toBe(chooserHost.querySelector('form textarea'));
  });

  it('waits for a chooser that has not mounted yet (the Source panel was collapsed)', () => {
    const { SourceStartingPointChooser, sourceStartRequests } = build();
    sourceStartRequests.request('word-list');
    const chooserHost = mount(SourceStartingPointChooser, chooserProps);
    expect(chooserHost.querySelector('[data-source-word-language]')).toBeTruthy();
    expect(sourceStartRequests.take(), 'consumed once').toBeNull();
  });

  it('is offered with AI, with no AI only where the built-in dictionary applies, and only where the host wires it (the glossary tool, teacher mode)', () => {
    const { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests } = build();
    window.__alloResolveAiCapability = () => ({ text: false });
    const off = mount(OtherWaysToStart, { onStartFromWordList: vi.fn(), onStartBlank: vi.fn() });
    expect(off.querySelector('[data-help-key="sidebar_start_word_list"]')).toBeNull();
    // The glossary passes wordListWithoutAi: with no AI the link is shown directly, beside the blank start.
    const chooserHost = mount(SourceStartingPointChooser, chooserProps);
    const glossary = mount(OtherWaysToStart, { onStartFromWordList: () => sourceStartRequests.request('word-list', { type: 'glossary' }), onStartBlank: vi.fn(), wordListWithoutAi: true });
    const noAiLink = glossary.querySelector('[data-start-word-list-no-ai]');
    expect(noAiLink.textContent).toBe('Start from a word list (no AI)');
    click(noAiLink);
    expect(chooserHost.querySelector('[data-source-word-resource]').value).toBe('glossary');
    expect(chooserHost.querySelector('[data-builtin-dictionary-toggle]').checked, 'locked on with no AI').toBe(true);
    delete window.__alloResolveAiCapability;
    const wiring = sliceBetween(MODULE, 'const openWordListStart = (type) => {', 'return /* @__PURE__ */', { file: FILE });
    expect(MODULE).toContain('onStartFromWordList: isTeacherMode ? () => openWordListStart("glossary") : void 0, wordListWithoutAi: true');
    expect(wiring).toContain('sourceStartRequests.request("word-list", typeof type === "string" ? { type } : {})');
  });
});
