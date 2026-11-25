import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const steps = [
  { id: 'source-input', label: 'Source Material', action: 'Add the text to adapt.', success: 'Source captured.' },
  { id: 'analysis', label: 'Analyze Source', action: 'Analyze the source.', success: 'Analysis done.' },
  { id: 'faq', label: 'Questions', action: 'Make questions.' },
  { id: 'directions', label: 'Directions', action: 'Review directions.' },
  { id: 'package-deliver', label: 'Delivery', action: 'Review the package.' },
  { id: '_final', label: 'Finish', action: 'Finish this lesson.' },
];
const presets = [{ id: 'reading-access', label: 'Reading adaptation', description: 'Adapt a passage.', stepIds: steps.map(step => step.id) }];
let Banner, Shell, SourceView, sampleText, host, root, originalModules, originalCapability, originalSetup;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compile = name => transformSync(readFileSync(name, 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  ({ Banner, sampleText } = new Function('React', compile('view_guided_mode_banner_source.jsx') + '\nreturn { Banner: GuidedModeBanner, sampleText: GUIDED_SAMPLE_TEXT };')(React));
  ({ Shell, SourceView } = new Function('React', compile('view_sidebar_panels_source.jsx') + '\nreturn { Shell: SourceInputShellView, SourceView };')(React));
}, 30000);
beforeEach(() => {
  localStorage.clear();
  originalModules = window.AlloModules;
  originalCapability = window.__alloResolveAiCapability;
  originalSetup = window.__alloOpenAiSetup;
  window.__alloResolveAiCapability = () => ({ text: false });
  window.__alloOpenAiSetup = vi.fn();
});
afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = host = null;
  window.AlloModules = originalModules;
  window.__alloResolveAiCapability = originalCapability;
  window.__alloOpenAiSetup = originalSetup;
  vi.restoreAllMocks();
});
function render(Component, props) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  act(() => root.render(React.createElement(Component, props)));
}
function bannerProps(extra = {}) {
  return {
    GUIDED_STEPS: steps, allGuidedSteps: steps, GUIDED_TOUR_MAP: {}, guidedPresets: presets,
    guidedSelectedIds: steps.map(step => step.id), guidedStep: 0, guidedEngaged: false,
    guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [], history: [],
    wordSoundsHistory: [], tourSteps: [], t: () => '', inputText: '', setInputText: vi.fn(),
    handleExitGuidedMode: vi.fn(), handleGuidedSkip: vi.fn(), setGuidedStep: vi.fn(),
    setShowGuidedTip: vi.fn(), applyGuidedPreset: vi.fn(), markGuidedStepDone: vi.fn(), ...extra,
  };
}
function button(label) { return [...host.querySelectorAll('button')].find(node => node.textContent.includes(label)); }

describe('Guided source-first entry', () => {
  it('unlocks a short passage when the teacher uses that exact version in Source', () => {
    const next = vi.fn();
    function Lesson({ text, step = 0 }) {
      const [record, setRecord] = React.useState(null);
      return React.createElement(React.Fragment, null,
        React.createElement(SourceView, { inputText: text, setInputText: vi.fn(), sourceRecord: record, setSourceRecord: setRecord, t: () => '', aiTextAvailable: false }),
        React.createElement(Banner, bannerProps({ inputText: text, acceptedSourceText: record?.inUse?.text, guidedStep: step, guidedCompletedIds: ['source-input'], handleGuidedSkip: next })));
    }
    const count = () => Array.from(host.querySelectorAll('[role="listitem"]')).find(item => item.lastElementChild?.textContent === 'Completed')?.firstElementChild?.textContent;
    const draft = 'The sun is hot.';
    render(Lesson, { text: draft });
    expect(button('Next step')).toBeFalsy();
    expect(host.querySelector('.allo-guided-quick-route')).toBeNull();
    expect(host.textContent).toContain('choose Use this source');
    act(() => host.querySelector('[data-source-use]').click());
    expect(host.querySelector('.allo-guided-quick-route')).toBeTruthy();
    act(() => button('Next step').click());
    expect(next).toHaveBeenCalledWith(false);
    render(Lesson, { text: draft, step: steps.length - 1 });
    expect(count()).toBe('1');
    render(Lesson, { text: 'A', step: steps.length - 1 });
    expect(count()).toBe('0');
    render(Lesson, { text: 'A' });
    expect(button('Next step')).toBeFalsy();
    expect(host.querySelector('.allo-guided-quick-route')).toBeNull();
    expect(host.textContent).toContain('choose Use this version');
    act(() => host.querySelector('[data-source-use]').click());
    expect(button('Next step')).toBeTruthy();
  });
  it('starts with the source action and a compact path, not a mandatory planner', () => {
    const props = bannerProps(); render(Banner, props);
    expect(host.textContent).toContain('Add the text to adapt.');
    expect(host.querySelector('[data-help-key="guided_path_summary"]').textContent).toContain('Reading adaptation');
    expect(button('Change path')).toBeTruthy();
    expect(button('Plan with AI')).toBeFalsy();
    expect(props.applyGuidedPreset).not.toHaveBeenCalled();
    act(() => button('Change path').click());
    expect(button('Plan with AI')).toBeTruthy();
    expect(button('Decide later')).toBeTruthy();
  });
  it('does not choose or replace a custom or resumed path on mount', () => {
    const props = bannerProps({ guidedSelectedIds: ['source-input', 'faq'], guidedPlanBrief: { title: 'My lesson' }, guidedCompletedIds: ['source-input'], guidedStep: 1 });
    render(Banner, props);
    expect(host.querySelector('[data-help-key="guided_path_summary"]').textContent).toContain('My lesson');
    expect(props.applyGuidedPreset).not.toHaveBeenCalled();
  });
  it('does not hide Continue when source exists but no explicit path was selected', () => {
    render(Banner, bannerProps({ guidedSelectedIds: null, inputText: 'A complete passage ready for adaptation.' }));
    expect(button('Next step')).toBeTruthy();
    expect(button('Plan with AI')).toBeFalsy();
  });
  it('offers inline AI setup without opening it automatically, then refreshes capability', () => {
    render(Banner, bannerProps());
    expect(window.__alloOpenAiSetup).not.toHaveBeenCalled();
    expect(host.querySelector('[data-help-key="guided_ai_status"]')).toBeTruthy();
    act(() => button('Set up AI').click());
    expect(window.__alloOpenAiSetup).toHaveBeenCalledTimes(1);
    window.__alloResolveAiCapability = () => ({ text: true });
    act(() => window.dispatchEvent(new Event('alloflow:ai-config-changed')));
    expect(host.querySelector('[data-help-key="guided_ai_status"]')).toBeNull();
  });
  it('never offers a dead setup button when an older host has no setup action', () => {
    delete window.__alloOpenAiSetup;
    render(Banner, bannerProps());
    expect(host.querySelector('[data-help-key="guided_ai_status"]')).toBeTruthy();
    expect(button('Set up AI')).toBeFalsy();
  });
});

describe('prepared example analysis stays separate from generated work', () => {
  it.each([false, true])('shows a labeled read-only example with AI available=%s, without completing a step', ready => {
    window.__alloResolveAiCapability = () => ({ text: ready });
    const props = bannerProps({ guidedStep: 1, inputText: sampleText });
    render(Banner, props);
    const sample = host.querySelector('[data-help-key="guided_sample_result"]');
    expect(sample).toBeTruthy();
    expect(sample.textContent).toContain('Prepared in advance');
    expect(sample.textContent).toContain('not generated just now');
    act(() => sample.querySelector('summary').click());
    expect(props.history).toEqual([]);
    expect(props.markGuidedStepDone).not.toHaveBeenCalled();
    expect(props.setInputText).not.toHaveBeenCalled();
    expect(props.handleGuidedSkip).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Analysis done.');
    expect(button('Next step')).toBeFalsy();
  });
  it('hides the example immediately when its passage is edited, even by whitespace', () => {
    const props = bannerProps({ guidedStep: 1, inputText: sampleText }); render(Banner, props);
    expect(host.querySelector('[data-help-key="guided_sample_result"]')).toBeTruthy();
    render(Banner, { ...props, inputText: sampleText + ' ' });
    expect(host.querySelector('[data-help-key="guided_sample_result"]')).toBeNull();
    render(Banner, { ...props, inputText: 'A different passage to analyze.' });
    expect(host.querySelector('[data-help-key="guided_sample_result"]')).toBeNull();
  });
});

function shellProps(extra = {}) {
  const icons = Object.fromEntries(['BookOpen', 'CheckSquare', 'ChevronDown', 'ChevronUp', 'ClipboardList', 'FileDown', 'FileText', 'Globe', 'Layout', 'Link', 'RefreshCw', 'Sparkles', 'Upload', 'X'].map(name => [name, () => null]));
  return { ...icons, activeView: 'input', isGuidedToolVisible: () => true, expandedTools: ['source-input'],
    fileInputRef: { current: null }, t: () => '', inputText: '', toggleTool: vi.fn(),
    showSourceGen: false, showUrlInput: false, ...extra };
}
// 2026-11-23, owner: the six ways to bring in a passage (Upload, Find online, Write with AI, Reading
// catalog, Dictate, Open PDF project) are always on show, in that order, with Paste (in SourceInputPanel).
// Only starting WITHOUT a passage (teacher, no passage: topic, word list, blank) sits behind ONE
// "Other ways to start" disclosure; its body stays mounted, hidden, so the request listener keeps working.
const DIRECT = ['#tour-upload-source', '[data-help-key="source_link_btn"]', '[data-help-key="source_generate_btn"]', '[data-help-key="source_books_btn"]', '[data-source-dictate-btn="true"]', '[data-source-open-pdf-project="true"]'];
const otherWays = () => {
  const toggle = host.querySelector('[data-source-other-ways-toggle]');
  expect(toggle, 'the "Other ways to start" toggle').toBeTruthy();
  const region = document.getElementById(toggle.getAttribute('aria-controls'));
  expect(region, 'aria-controls names the disclosure body').toBeTruthy();
  return { toggle, region };
};
describe('source actions: six ways in on show, starts without a passage one click away', () => {
  it.each([{ guidedMode: true }, { isParentMode: true }, {}, { isTeacherMode: true }])('shows all six ways in directly, in order, as pills in one grid: %j', mode => {
    const captured = vi.fn(() => React.createElement('textarea', { 'aria-label': 'Source text' }));
    window.AlloModules = { SourceInputPanel: captured };
    const scope = { useOwnSources: true, selectedOwnSourceIds: ['doc-1'], documentsOnly: true, setUseOwnSources: vi.fn(), setSelectedOwnSourceIds: vi.fn(), setDocumentsOnly: vi.fn() };
    render(Shell, shellProps({ ...mode, ...scope, handleGenerate: vi.fn() }));
    expect(host.querySelector('details[data-help-key="source_more_options"]')).toBeNull();
    expect(host.textContent).not.toContain('More sources');
    const grid = host.querySelector('.allo-source-action-grid');
    expect(grid).toBeTruthy();
    const controls = DIRECT.map((selector) => host.querySelector(selector));
    controls.forEach((control, i) => {
      expect(control, DIRECT[i]).toBeTruthy();
      expect(control.parentElement, DIRECT[i]).toBe(grid);
      expect(control.closest('[hidden]'), DIRECT[i]).toBeNull();
      expect(control.className, DIRECT[i] + ' keeps the pill style').toContain(controls[0].className);
      if (i > 0) expect(controls[i - 1].compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING, DIRECT[i] + ' order').toBeTruthy();
    });
    expect(host.querySelector('textarea').closest('details')).toBeNull();
    expect(captured.mock.calls.at(-1)[0]).toMatchObject(scope);
  });
  it('a teacher with no passage gets one full-width "Other ways to start" after the six, holding only the starts without a passage', () => {
    window.AlloModules = {};
    render(Shell, shellProps({ isTeacherMode: true, handleGenerate: vi.fn() }));
    const grid = host.querySelector('.allo-source-action-grid');
    const { toggle, region } = otherWays();
    expect(toggle.parentElement).toBe(grid);
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle.textContent).toBe('Other ways to start');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.className, 'same pill as its neighbours').toBe(host.querySelector('#tour-upload-source').className);
    expect(toggle.style.gridColumn, 'a full-width row, no empty cell beside it').toBe('1 / -1');
    const last = host.querySelector('[data-source-open-pdf-project="true"]');
    expect(last.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING, 'after the six').toBeTruthy();
    expect(toggle.nextElementSibling, 'the body follows the toggle in tab order').toBe(region);
    expect(region.hasAttribute('hidden')).toBe(true);
    for (const selector of DIRECT) expect(region.querySelector(selector), selector + ' is not in the fold').toBeNull();
    expect(region.querySelector('[data-source-start-chooser]')).toBeTruthy();
    act(() => toggle.click());
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(region.hasAttribute('hidden')).toBe(false);
    act(() => toggle.click());
    expect(region.hasAttribute('hidden')).toBe(true);
  });
  it.each([{ guidedMode: true }, { isParentMode: true }, {}])('no fold when there is nothing to put in it (no teacher start chooser): %j', mode => {
    window.AlloModules = {};
    render(Shell, shellProps(mode));
    expect(host.querySelector('[data-source-other-ways-toggle]')).toBeNull();
    expect(host.querySelector('[data-source-other-ways]')).toBeNull();
  });
  it('the six ways in keep their hooks and handlers', () => {
    window.AlloModules = {};
    const props = shellProps({ setShowSourceGen: vi.fn(), setIsReadingLibraryOpen: vi.fn(), openSourceView: vi.fn(), setExpandedTools: vi.fn() });
    render(Shell, props);
    const heard = vi.fn();
    window.addEventListener('alloflow:open-source-dictation', heard);
    try {
      act(() => host.querySelector('[data-source-dictate-btn="true"]').click());
    } finally { window.removeEventListener('alloflow:open-source-dictation', heard); }
    expect(heard).toHaveBeenCalledTimes(1);
    expect(window.__alloOpenSourceDictation).toBe(true);
    delete window.__alloOpenSourceDictation;
    expect(props.openSourceView).toHaveBeenCalledWith({ focus: false });
    act(() => host.querySelector('[data-help-key="source_books_btn"]').click());
    expect(props.setIsReadingLibraryOpen).toHaveBeenCalledWith(true);
    act(() => host.querySelector('[data-help-key="source_generate_btn"]').click());
    expect(props.setShowSourceGen).toHaveBeenCalledWith(true);
    expect(host.querySelector('[data-source-open-pdf-project="true"] input[type="file"][accept=".json"]')).toBeTruthy();
    expect(host.querySelector('[data-help-key="source_dictate_btn"]').getAttribute('data-source-dictate-btn')).toBe('true');
  });
  it('Write with AI stays on the first view, so its Cancel is always in view; the fold stays closed', () => {
    window.AlloModules = {};
    render(Shell, shellProps({ showSourceGen: true, isTeacherMode: true, handleGenerate: vi.fn() }));
    const writeAi = host.querySelector('[data-help-key="source_generate_btn"]');
    expect(writeAi.closest('[hidden]')).toBeNull();
    expect(writeAi.getAttribute('aria-expanded')).toBe('true');
    expect(otherWays().region.hasAttribute('hidden')).toBe(true);
  });
  it('opening it expands a collapsed Source card', () => {
    window.AlloModules = {};
    const setExpandedTools = vi.fn();
    render(Shell, shellProps({ expandedTools: [], setExpandedTools, isTeacherMode: true, handleGenerate: vi.fn() }));
    act(() => otherWays().toggle.click());
    expect(setExpandedTools).toHaveBeenCalledTimes(1);
    expect(setExpandedTools.mock.calls[0][0]([])).toEqual(['source-input']);
  });
  it('holds the three starts without a passage for a teacher, and a start request opens it and focuses the form', () => {
    window.AlloModules = {};
    window.__alloBlankStartTypes = ['quiz'];
    try {
      render(Shell, shellProps({ isTeacherMode: true, handleGenerate: vi.fn(), setExpandedTools: vi.fn() }));
      const { region, toggle } = otherWays();
      const chooser = host.querySelector('[data-source-start-chooser]');
      expect(chooser, 'mounted while closed').toBeTruthy();
      expect(chooser.closest('[hidden]')).toBe(region);
      expect(host.querySelectorAll('[data-source-start-chooser]')).toHaveLength(1);
      act(() => { window.__alloRequestSourceStart('word-list'); });
      expect(region.hasAttribute('hidden')).toBe(false);
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(chooser.querySelector('form textarea'));
      expect(chooser.querySelector('[data-path-less-traveled]'), 'the experimental note').toBeTruthy();
    } finally { delete window.__alloBlankStartTypes; }
  });
  it('with a passage, there is no disclosure and the separate starts stay below the source card', () => {
    window.AlloModules = {};
    render(Shell, shellProps({ isTeacherMode: true, handleGenerate: vi.fn(), inputText: 'A complete passage ready for adaptation.' }));
    expect(host.querySelector('[data-source-other-ways-toggle]')).toBeNull();
    const chooser = host.querySelector('[data-source-start-chooser]');
    expect(chooser).toBeTruthy();
    expect(chooser.closest('[hidden]')).toBeNull();
    expect(chooser.querySelector('[data-source-start-toggle]'), 'folded behind its own "Show these options"').toBeTruthy();
  });
  it('opens a Family tool only on an explicit adult action, without generating', () => {
    window.AlloModules = {};
    const onFamilyAction = vi.fn();
    const props = shellProps({ isParentMode: true, isTeacherMode: true, inputText: 'The family has added a complete reading passage.', onFamilyAction });
    render(Shell, props);
    expect(onFamilyAction).not.toHaveBeenCalled();
    for (const [label, kind] of [['Simpler text', 'simplified'], ['Word list', 'glossary'], ['Story', 'adventure']]) {
      act(() => button(label).click());
      expect(onFamilyAction).toHaveBeenLastCalledWith(kind);
    }
    render(Shell, { ...props, isTeacherMode: false });
    expect(host.querySelector('[data-help-key="family_source_actions"]')).toBeNull();
    render(Shell, { ...props, inputText: '' });
    expect(host.querySelector('[data-help-key="family_source_actions"]')).toBeNull();
  });
  it('disables Family actions while a source or generation operation is pending', () => {
    window.AlloModules = {};
    const onFamilyAction = vi.fn();
    render(Shell, shellProps({ isParentMode: true, isTeacherMode: true, inputText: 'A reading passage that is already long enough.', isProcessing: true, onFamilyAction }));
    expect(button('Simpler text').disabled).toBe(true);
    act(() => button('Simpler text').click());
    expect(onFamilyAction).not.toHaveBeenCalled();
  });
});
