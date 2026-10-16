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
let Banner, Shell, sampleText, host, root, originalModules, originalCapability, originalSetup;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const compile = name => transformSync(readFileSync(name, 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  ({ Banner, sampleText } = new Function('React', compile('view_guided_mode_banner_source.jsx') + '\nreturn { Banner: GuidedModeBanner, sampleText: GUIDED_SAMPLE_TEXT };')(React));
  Shell = new Function('React', compile('view_sidebar_panels_source.jsx') + '\nreturn SourceInputShellView;')(React);
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
describe('source actions use progressive disclosure without changing source scope', () => {
  it.each([{ guidedMode: true }, { isParentMode: true }])('keeps upload and the source editor outside optional actions: %j', mode => {
    const captured = vi.fn(() => React.createElement('textarea', { 'aria-label': 'Source text' }));
    window.AlloModules = { SourceInputPanel: captured };
    const scope = { useOwnSources: true, selectedOwnSourceIds: ['doc-1'], documentsOnly: true, setUseOwnSources: vi.fn(), setSelectedOwnSourceIds: vi.fn(), setDocumentsOnly: vi.fn() };
    render(Shell, shellProps({ ...mode, ...scope }));
    const more = host.querySelector('details[data-help-key="source_more_options"]');
    expect(more).toBeTruthy(); expect(more.open).toBe(false);
    expect(host.querySelector('#tour-upload-source').closest('details')).toBeNull();
    expect(host.querySelector('textarea').closest('details')).toBeNull();
    expect(more.textContent).toContain('Books');
    expect(captured.mock.calls.at(-1)[0]).toMatchObject(scope);
  });
  it('keeps the complete source action row in the full workspace', () => {
    window.AlloModules = {};
    render(Shell, shellProps());
    expect(host.querySelector('details[data-help-key="source_more_options"]')).toBeNull();
    expect(button('Books')).toBeTruthy();
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
