// "Two roads" fork: the first non-passage start in a page session offers Guided Quick
// Start instead. Unit tests rebuild the fork from the compiled module per test (its
// "already answered" state lives in one closure); the last block renders the shipped
// Source panel chooser. ALLO_SIDEBAR_CANDIDATE selects a candidate module.
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
const LESS = 'Take the one less traveled by';
const GUIDED = 'Take the guided path (recommended)';
const TOAST_LESS = 'Experimental start is on. Not all those who wander are lost.';
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
const dialog = () => document.querySelector('[role="dialog"]');
const byText = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const toggle = el => el.querySelector('[data-help-key="sidebar_other_ways_toggle"]');
const click = node => { expect(node, 'missing control').toBeTruthy(); act(() => node.click()); };

describe('the fork in "Other ways to start"', () => {
  it('opens directly on a host without Quick Start (old hosts never see the fork)', () => {
    delete window.__alloOpenQuickStart;
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    expect(dialog()).toBeNull();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('[data-path-fork-back]'), 'no way back without Quick Start').toBeNull();
  });

  it('asks first: an accessible dialog with the exact Frost line, focus on the recommended path', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    const d = dialog();
    expect(d).toBeTruthy();
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(d.getAttribute('aria-labelledby')).textContent).toBe(TITLE);
    expect(document.getElementById(d.getAttribute('aria-describedby')).textContent).toMatch(/experimental/);
    expect(d.textContent).toContain('Robert Frost');
    expect(document.activeElement.textContent.trim()).toBe(GUIDED);
    expect(toggle(el).getAttribute('aria-expanded'), 'nothing opens before the choice').toBe('false');
  });

  it('"the one less traveled by" opens the starts, shows the Tolkien toast and the badge, and asks only once', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    click(byText(dialog(), LESS));
    expect(dialog()).toBeNull();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(window.__alloAddToast).toHaveBeenCalledWith(TOAST_LESS, 'info');
    expect(el.querySelector('[data-path-less-traveled]').textContent).toContain('The path less traveled');
    click(toggle(el)); click(toggle(el));
    expect(dialog(), 'answered once per page session').toBeNull();
    expect(window.__alloAddToast).toHaveBeenCalledTimes(1);
  });

  it('"the guided path" opens Quick Start with the return toast and leaves the starts closed', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    click(byText(dialog(), GUIDED));
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
    expect(window.__alloAddToast).toHaveBeenCalledWith(TOAST_GUIDED, 'info');
    expect(dialog()).toBeNull();
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape and "Not now" do nothing, return focus, and ask again next time', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    act(() => toggle(el).focus());
    click(toggle(el));
    act(() => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(toggle(el));
    click(toggle(el));
    click(byText(dialog(), 'Not now'));
    expect(dialog()).toBeNull();
    click(toggle(el));
    expect(dialog(), 'cancelling is not an answer').toBeTruthy();
    expect(window.__alloOpenQuickStart).not.toHaveBeenCalled();
    expect(window.__alloAddToast).not.toHaveBeenCalled();
  });

  it('renders inside the app theme wrapper, so dark and high-contrast themes reach it', () => {
    const themed = document.createElement('div'); themed.className = 'theme-dark'; document.body.appendChild(themed);
    window.ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
    try {
      const el = mount(freshWays(), { onStartBlank: vi.fn() });
      click(toggle(el));
      expect(el.contains(dialog()), 'portaled out of the sidebar').toBe(false);
      expect(dialog().closest('.theme-dark')).toBe(themed);
      act(() => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    } finally { themed.remove(); delete window.ReactDOM; }
  });

  it('keeps Tab inside the dialog', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    const items = [...dialog().querySelectorAll('button, input')];
    act(() => items[items.length - 1].focus());
    act(() => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(items[0]);
    act(() => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('"Don’t ask me again" is remembered on this device', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    act(() => dialog().querySelector('input[type="checkbox"]').click());
    click(byText(dialog(), LESS));
    expect(window.localStorage.getItem(SKIP_KEY)).toBe('1');
    const later = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(later));
    expect(dialog(), 'a new page load skips the fork').toBeNull();
    expect(toggle(later).getAttribute('aria-expanded')).toBe('true');
  });

  it('"Back to the guided path" closes the starts and opens Quick Start', () => {
    const el = mount(freshWays(), { onStartBlank: vi.fn() });
    click(toggle(el));
    click(byText(dialog(), LESS));
    click(el.querySelector('[data-path-fork-back]'));
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
    expect(window.__alloOpenQuickStart).toHaveBeenCalledTimes(1);
    expect(window.__alloAddToast).toHaveBeenLastCalledWith(TOAST_GUIDED, 'info');
  });

  it('with no AI, the direct blank button asks first and starts the blank only on "less traveled"', () => {
    window.__alloResolveAiCapability = () => ({ text: false });
    const onStartBlank = vi.fn();
    const el = mount(freshWays(), { onStartBlank });
    click(el.querySelector('[data-help-key="sidebar_start_blank"]'));
    expect(onStartBlank).not.toHaveBeenCalled();
    click(byText(dialog(), LESS));
    expect(onStartBlank).toHaveBeenCalledTimes(1);
  });
});

describe('the fork in the Source panel chooser (shipped module)', () => {
  it('asks on the first choice, opens the form after "less traveled", and does not ask on later choices', async () => {
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
    click(byText(chooser, 'From a topic'));
    expect(dialog()).toBeTruthy();
    expect(chooser.querySelector('form'), 'no form before the choice').toBeNull();
    click(byText(dialog(), LESS));
    expect(chooser.querySelector('form')).toBeTruthy();
    expect(chooser.querySelector('[data-path-less-traveled]')).toBeTruthy();
    expect(document.activeElement, 'focus lands in the topic field, not back on the button').toBe(chooser.querySelector('form input[type="text"]'));
    click(byText(chooser, 'Cancel'));
    click(byText(chooser, 'From a word list'));
    expect(dialog(), 'answered once per page session').toBeNull();
    expect(chooser.querySelector('form')).toBeTruthy();
    expect(document.activeElement, 'language is prefilled, so the terms box gets focus').toBe(chooser.querySelector('form textarea'));
    expect(handleGenerate).not.toHaveBeenCalled();
    delete window.__alloBlankStartTypes;
  });
});

describe('the glossary tool opens the Source panel on "From a word list"', () => {
  // One evaluation, so the tool link, the request channel and the chooser share state as in the module.
  const build = () => {
    expectAnchorCount(MODULE, 'const sourceStartRequests = ', 1, { file: FILE });
    const region = sliceBetween(MODULE, 'function useAiTextAvailable(', 'function SourceNeededNotice(', { file: FILE });
    return new Function('React', region + '\nreturn { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests };')(React);
  };
  const chooserProps = { t: () => '', handleGenerate: vi.fn(), busy: false };

  it('fills the chooser with the word-list form and focuses it, without asking the fork twice', () => {
    const { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests } = build();
    const chooserHost = mount(SourceStartingPointChooser, chooserProps);
    const el = mount(OtherWaysToStart, { onStartFromWordList: () => sourceStartRequests.request('word-list') });
    click(toggle(el));
    click(byText(dialog(), LESS));
    click(el.querySelector('[data-help-key="sidebar_start_word_list"]'));
    expect(dialog(), 'the fork was answered in the tool').toBeNull();
    expect(chooserHost.querySelector('[data-source-word-language]')).toBeTruthy();
    expect(document.activeElement).toBe(chooserHost.querySelector('form textarea'));
  });

  it('also opens the word-list form when a passage folded the chooser away', () => {
    const { OtherWaysToStart, SourceStartingPointChooser, sourceStartRequests } = build();
    const chooserHost = mount(SourceStartingPointChooser, { ...chooserProps, hasSource: true });
    expect(chooserHost.querySelector('form'), 'folded before the request').toBeNull();
    const el = mount(OtherWaysToStart, { onStartFromWordList: () => sourceStartRequests.request('word-list') });
    click(toggle(el));
    click(byText(dialog(), LESS));
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

  it('is offered only with AI and only where the host wires it (the glossary tool, teacher mode)', () => {
    const { OtherWaysToStart } = build();
    window.__alloResolveAiCapability = () => ({ text: false });
    const off = mount(OtherWaysToStart, { onStartFromWordList: vi.fn(), onStartBlank: vi.fn() });
    expect(off.querySelector('[data-help-key="sidebar_start_word_list"]')).toBeNull();
    const wiring = sliceBetween(MODULE, 'const openWordListStart = () => {', 'return /* @__PURE__ */', { file: FILE });
    expect(MODULE).toContain('onStartFromWordList: isTeacherMode ? openWordListStart : void 0');
    expect(wiring).toContain('sourceStartRequests.request("word-list")');
  });
});
