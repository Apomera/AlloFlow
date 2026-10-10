import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let Panel, Dialog, host, root, lastProps;
const noop = () => {};
const passage = 'Desert plants conserve water through specialized leaves and roots.';
const documentRows = [{ id: 'notes', title: 'Plant notes', active: true, allowAI: true, version: 1 }];

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const code = transformSync(readFileSync('view_misc_panels_source.jsx', 'utf8'), { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  const icons = ['ArrowRight', 'Brain', 'Check', 'CheckCircle', 'CheckCircle2', 'Clock', 'Download', 'FileText', 'Globe', 'GripVertical', 'Layers', 'Layout', 'Lightbulb', 'Mic', 'Pencil', 'Plus', 'RefreshCw', 'Search', 'Settings', 'Sparkles', 'StopCircle', 'Undo2', 'Upload', 'UserCheck', 'Users', 'X'];
  Panel = new Function('React', ...icons, code + '\nreturn SourceGenPanel;')(React, ...icons.map(() => () => null));
  Dialog = new Function('React', 'X', code + '\nreturn SourceResearchDialog;')(React, () => null);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; lastProps = null;
  delete window.AlloOwnSources;
  delete window.__alloScrollLockState;
  document.body.style.overflow = '';
  vi.restoreAllMocks();
});

function Harness(props) {
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
    sourceTopic: 'Photosynthesis in desert plants', sourceVocabulary: '', standardInputValue: '',
    standardMode: 'manual', studentInterests: [], suggestedStandards: [], targetStandards: [], t: key => key,
    selectedOwnSourceIds: ids, setSelectedOwnSourceIds: setIds,
    includeSourceCitations: web, setIncludeSourceCitations: setWeb,
    useOwnSources: own, setUseOwnSources: setOwn, documentsOnly: quotes, setDocumentsOnly: setQuotes,
    ...props
  }));
}

async function render(extra = {}) {
  if (!root) {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    window.AlloOwnSources = { available: () => true, readLibrary: async () => ({ ok: true, sources: documentRows }), acceptAttribute: () => '.txt' };
    lastProps = { setSourceTopic: vi.fn(), handleGenerateSource: vi.fn(async () => ({ ok: true })) };
  }
  lastProps = { ...lastProps, ...extra };
  await act(async () => root.render(React.createElement(Harness, lastProps)));
}
const button = label => [...host.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
async function settings() { const opener = button('Research settings'); opener.focus(); await click(opener); return opener; }
async function mode(value) { await click(host.querySelector(`input[name="source-research-mode"][value="${value}"]`)); }
async function change(el, value) {
  const prototype = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const checkbox = label => [...host.querySelectorAll('label')].find(el => el.textContent.trim() === label)?.querySelector('input');

describe('unified research settings', () => {
  it('restores unsent review fields after closing and remounting without storage or generation', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await render(); await settings(); await click(checkbox('Review sources before writing')); await click(button('Apply settings'));
    await click(button('Review sources'));
    const fields = () => [...host.querySelectorAll('[data-research-review] input:not([type="checkbox"]), [data-research-review] textarea')];
    const values = ['Desert plants', 'https://example.edu/plants', 'Private notes', passage];
    for (const [index, field] of fields().entries()) await change(field, values[index]);
    await click(button('Close')); await click(button('Review sources'));
    expect(fields().map(field => field.value)).toEqual(values);
    expect(fields().every(field => field.closest('details').open)).toBe(true);
    await click(button('Close'));
    const owner = lastProps;
    await act(async () => root.unmount()); root = createRoot(host);
    await act(async () => root.render(React.createElement(Harness, owner)));
    await click(button('Review sources'));
    expect(fields().map(field => field.value)).toEqual(values);
    expect(owner.handleGenerateSource).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it('discards review drafts when the topic changes while review is closed', async () => {
    await render(); await settings(); await click(checkbox('Review sources before writing')); await click(button('Apply settings'));
    await click(button('Review sources')); await change(host.querySelector('[data-research-review] textarea'), passage);
    await click(button('Close'));
    await render({ sourceTopic: 'Clouds' }); await render({ sourceTopic: 'Photosynthesis in desert plants' });
    await click(button('Review sources'));
    expect(host.querySelector('[data-research-review] textarea').value).toBe('');
    expect(lastProps.handleGenerateSource).not.toHaveBeenCalled();
  });

  it('locks background scrolling and restores the exact prior style on close and parent unmount', async () => {
    document.body.style.overflow = 'scroll';
    await render(); await settings();
    expect(document.body.style.overflow).toBe('hidden');
    expect(window.__alloScrollLockState.count).toBe(1);
    await click(button('Cancel'));
    expect(document.body.style.overflow).toBe('scroll');
    expect(window.__alloScrollLockState.count).toBe(0);
    await settings(); await act(async () => root.unmount()); root = null;
    expect(document.body.style.overflow).toBe('scroll');
    expect(window.__alloScrollLockState.count).toBe(0);
  });

  it('does not release another modal owner\'s scroll lock', async () => {
    document.body.style.overflow = 'hidden';
    window.__alloScrollLockState = { count: 1, prev: 'scroll' };
    await render(); await settings();
    expect(window.__alloScrollLockState.count).toBe(2);
    await click(button('Close'));
    expect(window.__alloScrollLockState.count).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('skips controls disabled by a parent fieldset when wrapping keyboard focus', async () => {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
    await act(async () => root.render(React.createElement(Dialog, { title: 'Research', sourceText: (_, fallback) => fallback, onClose: noop },
      React.createElement('button', null, 'Ready'), React.createElement('fieldset', { disabled: true }, React.createElement('input', { 'aria-label': 'Unavailable' })))));
    const first = button('Close'); first.focus();
    await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(button('Ready'));
  });

  it('keeps the ordinary surface compact and sends an arbitrary topic through default web research', async () => {
    await render();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(host.querySelector('#ownSourcesImport')).toBeNull();
    expect(host.textContent).not.toContain('Supported web-search topics');
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(lastProps.handleGenerateSource.mock.lastCall[0].researchConfig).toMatchObject({ enabled: true, mode: 'web', urls: [], reviewBeforeWriting: false });
  });

  it('cancels draft configuration and document selection, then restores keyboard focus', async () => {
    await render(); const opener = await settings();
    await mode('sources');
    await change(host.querySelector('#source-research-urls'), 'https://example.edu/plants');
    await click(button('input.my_sources_exclude'));
    expect(host.firstChild.dataset.selected).toBe('[]');
    await click(button('Cancel'));
    expect(host.firstChild.dataset.selected).toBe('["notes"]');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    await settings();
    expect(host.querySelector('input[value="web"]').checked).toBe(true);
    expect(host.querySelector('#source-research-urls').value).toBe('');
  });

  it('supports URL-only sources without forcing quotations, and remembers settings when research is toggled off', async () => {
    await render({ selectedOwnSourceIds: [] }); await settings(); await mode('sources');
    await change(host.querySelector('#source-research-urls'), 'https://example.edu/plants\nhttps://example.edu/plants');
    await click(button('Apply settings'));
    expect(host.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(false);
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(lastProps.handleGenerateSource.mock.lastCall[0].researchConfig).toMatchObject({ enabled: true, mode: 'sources', exactQuotes: false, urls: ['https://example.edu/plants'] });
    await click(host.querySelector('#includeCitations'));
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(lastProps.handleGenerateSource.mock.lastCall[0].researchConfig.enabled).toBe(false);
    expect(lastProps.handleGenerateSource.mock.lastCall[0].researchPacket).toBeUndefined();
    await click(host.querySelector('#includeCitations')); await settings();
    expect(host.querySelector('input[value="sources"]').checked).toBe(true);
    expect(host.querySelector('#source-research-urls').value).toBe('https://example.edu/plants');
  });

  it('keeps exact quotations independent of discovery and validates URLs before applying', async () => {
    await render(); await settings(); await mode('combined');
    await click(checkbox('Exact quotations only'));
    expect(host.querySelector('input[value="combined"]').checked).toBe(true);
    await change(host.querySelector('#source-research-urls'), 'javascript:alert(1)');
    await click(button('Apply settings'));
    expect(host.querySelector('[role="alert"]').textContent).toContain('http or https');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    await change(host.querySelector('#source-research-urls'), 'https://example.edu/plants');
    await click(button('Apply settings'));
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(lastProps.handleGenerateSource.mock.lastCall[0].researchConfig).toMatchObject({ mode: 'combined', exactQuotes: true });
  });

  it('restores this editor configuration after a panel remount without writing private evidence to storage', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    await render(); await settings(); await mode('sources');
    await change(host.querySelector('#source-research-urls'), 'https://example.edu/plants');
    await click(button('Apply settings'));
    const owner = lastProps;
    await act(async () => root.unmount());
    root = createRoot(host);
    await act(async () => root.render(React.createElement(Harness, owner)));
    await settings();
    expect(host.querySelector('input[value="sources"]').checked).toBe(true);
    expect(host.querySelector('#source-research-urls').value).toBe('https://example.edu/plants');
    expect(storage).not.toHaveBeenCalled();
  });

  it('contains keyboard navigation and cancels the settings dialog with Escape', async () => {
    await render(); const opener = await settings();
    const first = button('Close'), last = button('Apply settings');
    first.focus();
    await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(last);
    await act(async () => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(first);
    await act(async () => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('retains review exclusions through close/reopen and supplies pasted evidence to quick generation', async () => {
    const packet = { version: 1, topic: 'Photosynthesis in desert plants', items: [{ id: 'pasted', kind: 'paste', title: 'Notes', passage, evidenceType: 'Pasted text', included: true }], activity: [] };
    const generate = vi.fn(async () => ({ ok: true, packet }));
    await render({ handleGenerateSource: generate, selectedOwnSourceIds: [] }); await settings(); await mode('sources');
    await click(checkbox('Review sources before writing')); await click(button('Apply settings'));
    await click(button('Review sources'));
    await change(host.querySelector('[role="dialog"] textarea'), passage);
    await click(button('Add passage'));
    await click(host.querySelector('input[aria-label="Use source for writing: Notes"]')); await click(button('Close'));
    await click(button('Review sources'));
    expect(button('Generate from included passages').disabled).toBe(true);
    await click(host.querySelector('input[aria-label="Use source for writing: Notes"]')); await click(button('Close'));
    await settings(); await click(checkbox('Review sources before writing')); await click(button('Apply settings'));
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(generate.mock.lastCall[0].researchPacket.items[0].passage).toBe(passage);
    expect(generate.mock.lastCall[0].researchConfig).toMatchObject({ mode: 'sources', reviewBeforeWriting: false });
  });
  it('retains quick collection results and preserves removals when the collection becomes empty', async () => {
    const packet = { version: 1, topic: 'Photosynthesis in desert plants', items: [{ id: 'web', kind: 'web', title: 'Plant reference', url: 'https://example.edu/plants', passage, evidenceType: 'Page excerpt', included: true }], activity: [] };
    const generate = vi.fn(async () => ({ ok: false, packet, error: 'Writing interrupted' }));
    await render({ handleGenerateSource: generate });
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    await click(button('Review sources'));
    await click(button('Remove source from research: Plant reference'));
    await click(button('Close'));
    expect(button('Review sources')).toBeTruthy();
    await click(host.querySelector('[data-help-key="source_generate_button"]'));
    expect(generate.mock.lastCall[0].researchPacket.items).toHaveLength(0);
    expect(Object.values(generate.mock.lastCall[0].researchPacket.removedSources)).toEqual([true]);
  });
});
