import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const noop = () => {};
let Panel, Dialog, root, host, generate;

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'ChevronLeft', 'ChevronRight', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  Panel = new Function('React', ...icons, code + '\nreturn SourceGenPanel;')(React, ...icons.map(() => () => null));
  Dialog = new Function('React', 'X', code + '\nreturn SourceResearchDialog;')(React, () => null);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  delete window.AlloOwnSources;
  delete window.__alloScrollLockState;
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

function mount() {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
}
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label || node.getAttribute('aria-label') === label);
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function tab(node, shiftKey = false) {
  node.focus();
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  await act(async () => node.dispatchEvent(event));
  return event;
}
async function dialog(children) {
  mount();
  await act(async () => root.render(React.createElement(Dialog, { title: 'Research', onClose: noop, sourceText: (_, fallback) => fallback }, children)));
}
async function change(node, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function Harness({ setSourceTopic }) {
  const [ids, setIds] = React.useState(['notes']);
  const [web, setWeb] = React.useState(true);
  const [own, setOwn] = React.useState(false);
  const [quotes, setQuotes] = React.useState(false);
  return React.createElement('div', { 'data-selected': JSON.stringify(ids) }, React.createElement(Panel, {
    aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade', addToast: noop,
    handleAddStandard: noop, handleFindStandards: noop, handleRemoveStandard: noop,
    handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop,
    isFindingStandards: false, isGeneratingSource: false, isIndependentMode: false,
    setAiStandardQuery: noop, setAiStandardRegion: noop, setSourceCustomInstructions: noop,
    setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop, setSourceVocabulary: noop,
    setStandardInputValue: noop, setTargetStandards: noop, showSourceGen: true,
    sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade', sourceTone: 'Informative',
    sourceTopic: 'Desert plants', setSourceTopic, sourceVocabulary: '', standardInputValue: '',
    standardMode: 'manual', studentInterests: [], suggestedStandards: [], targetStandards: [], t: key => key,
    selectedOwnSourceIds: ids, setSelectedOwnSourceIds: setIds,
    includeSourceCitations: web, setIncludeSourceCitations: setWeb,
    useOwnSources: own, setUseOwnSources: setOwn, documentsOnly: quotes, setDocumentsOnly: setQuotes,
    handleGenerateSource: generate
  }));
}
async function settings() {
  mount(); generate = vi.fn(async () => ({ ok: true }));
  window.AlloOwnSources = { available: () => true, readLibrary: async () => ({ ok: true, sources: [{ id: 'notes', title: 'Plant notes', active: true, allowAI: true, version: 1 }] }), acceptAttribute: () => '.txt' };
  await act(async () => root.render(React.createElement(Harness, { setSourceTopic: vi.fn() })));
  const opener = button('Research settings'); opener.focus(); await click(opener);
  return opener;
}

describe('research dialog accessible keyboard boundaries', () => {
  it('does not wrap into a nested summary hidden by an outer closed disclosure', async () => {
    await dialog(React.createElement('details', null,
      React.createElement('summary', null, 'Visible disclosure'),
      React.createElement('details', null, React.createElement('summary', null, 'Hidden disclosure'), React.createElement('button', null, 'Hidden action'))));
    const visible = [...host.querySelectorAll('summary')].find(node => node.textContent === 'Visible disclosure');
    expect((await tab(button('Close'), true)).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(visible);
    expect((await tab(visible)).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Close'));
  });

  it('retains a closed nested disclosure summary when every outer disclosure is open', async () => {
    await dialog(React.createElement('details', { open: true },
      React.createElement('summary', null, 'Outer disclosure'),
      React.createElement('details', null, React.createElement('summary', null, 'Visible nested disclosure'), React.createElement('button', null, 'Hidden action'))));
    const nested = [...host.querySelectorAll('summary')].find(node => node.textContent === 'Visible nested disclosure');
    await tab(button('Close'), true); expect(document.activeElement).toBe(nested);
    await tab(nested); expect(document.activeElement).toBe(button('Close'));
  });

  it.each([
    ['hidden control', 'control', 'hidden', ''],
    ['hidden ancestor', 'ancestor', 'hidden', ''],
    ['inert control', 'control', 'inert', ''],
    ['inert ancestor', 'ancestor', 'inert', ''],
    ['aria-hidden control', 'control', 'aria-hidden', 'true'],
    ['aria-hidden ancestor', 'ancestor', 'aria-hidden', 'true'],
    ['negative tabindex', 'control', 'tabindex', '-1']
  ])('excludes a %s from both wrapping boundaries', async (_, target, attribute, value) => {
    await dialog(React.createElement(React.Fragment, null,
      React.createElement('button', null, 'Ready'),
      React.createElement('div', { 'data-unavailable': true }, React.createElement('button', null, 'Unavailable'))));
    const hidden = target === 'control' ? button('Unavailable') : host.querySelector('[data-unavailable]');
    hidden.setAttribute(attribute, value);
    expect((await tab(button('Close'), true)).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Ready'));
    expect((await tab(button('Ready'))).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(button('Close'));
  });

  it('keeps aria-hidden=false content reachable', async () => {
    await dialog(React.createElement('div', { 'aria-hidden': 'false' }, React.createElement('button', null, 'Ready')));
    await tab(button('Close'), true); expect(document.activeElement).toBe(button('Ready'));
  });
});

describe('research settings URL error feedback', () => {
  it.each([
    ['invalid URL', 'not a complete URL', 'http or https'],
    ['disallowed scheme', 'javascript:alert(1)', 'http or https'],
    ['too many URLs', Array.from({ length: 13 }, (_, index) => `https://example.edu/source-${index}`).join('\n'), '12 webpages']
  ])('focuses and describes the URL field for %s without applying settings', async (_, value, message) => {
    await settings();
    const field = host.querySelector('#source-research-urls');
    expect(field.getAttribute('aria-invalid')).not.toBe('true');
    await change(field, value); button('Apply settings').focus(); await click(button('Apply settings'));
    const error = host.querySelector('#source-research-urls-error');
    expect(error?.getAttribute('role')).toBe('alert');
    expect(error?.textContent).toContain(message);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby').split(/\s+/)).toEqual(expect.arrayContaining(['source-research-urls-hint', error.id]));
    expect(field.getAttribute('aria-describedby').split(/\s+/).every(id => document.getElementById(id))).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(field.value).toBe(value);
    expect(generate).not.toHaveBeenCalled();
  });

  it('clears stale invalid state while correcting a URL, then applies only the corrected value', async () => {
    await settings(); const field = host.querySelector('#source-research-urls');
    await change(field, 'invalid'); await click(button('Apply settings'));
    expect(field.getAttribute('aria-invalid')).toBe('true');
    await change(field, 'https://example.edu/plants');
    expect(field.getAttribute('aria-invalid')).not.toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('source-research-urls-hint');
    expect(host.querySelector('#source-research-urls-error')).toBeNull();
    expect(generate).not.toHaveBeenCalled();
    await click(button('Apply settings'));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(generate.mock.lastCall[0].researchConfig.urls).toEqual(['https://example.edu/plants']);
  });

  it('keeps cancellation and restored document choices unchanged after a validation error', async () => {
    const opener = await settings();
    await click(host.querySelector('input[name="source-research-mode"][value="sources"]'));
    await click(button('input.my_sources_exclude'));
    await change(host.querySelector('#source-research-urls'), 'invalid'); await click(button('Apply settings'));
    expect(host.firstChild.dataset.selected).toBe('[]');
    await click(button('Cancel'));
    expect(document.activeElement).toBe(opener);
    expect(host.firstChild.dataset.selected).toBe('["notes"]');
    expect(generate).not.toHaveBeenCalled();
    await click(opener);
    const field = host.querySelector('#source-research-urls');
    expect(field.value).toBe('');
    expect(field.getAttribute('aria-invalid')).not.toBe('true');
    expect(host.querySelector('#source-research-urls-error')).toBeNull();
    expect(host.querySelector('input[name="source-research-mode"][value="web"]').checked).toBe(true);
  });
});
