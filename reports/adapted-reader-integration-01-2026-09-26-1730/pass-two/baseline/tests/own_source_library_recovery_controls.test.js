import path from 'node:path';
import { createRequire } from 'node:module';
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.join(ROOT, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.join(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
const { flushSync } = require(path.join(ROOT, 'desktop/web-app/node_modules/react-dom'));
const noop = () => {};
const t = (key, values) => values && 'count' in values ? `${key}:${values.count}` : key;
let Panel, Wizard;
const mounts = [];
beforeAll(() => {
  globalThis.React = window.React = React;
  window.AlloLanguageContext = React.createContext({ t });
  loadAlloModule('view_misc_panels_module.js');
  loadAlloModule('quickstart_module.js');
  Panel = window.AlloModules.SourceGenPanel; Wizard = window.AlloModules.QuickStartWizard;
});
afterEach(() => {
  mounts.splice(0).forEach(item => { flushSync(() => item.root.unmount()); item.container.remove(); });
  delete window.AlloOwnSources;
});
const baseProps = {
  addToast: noop, aiStandardQuery: '', aiStandardRegion: '', gradeLevel: '5th Grade',
  handleAddStandard: noop, handleFindStandards: noop, handleGenerateSource: noop, handleRemoveStandard: noop,
  handleSetStandardModeToAi: noop, handleSetStandardModeToManual: noop, isFindingStandards: false,
  isGeneratingSource: false, isIndependentMode: false, setAiStandardQuery: noop, setAiStandardRegion: noop,
  setSourceCustomInstructions: noop, setSourceLength: noop, setSourceLevel: noop, setSourceTone: noop,
  setSourceTopic: noop, setSourceVocabulary: noop, setStandardInputValue: noop, setTargetStandards: noop,
  showSourceGen: true, sourceCustomInstructions: '', sourceLength: '250', sourceLevel: '5th Grade',
  sourceTone: 'Informative', sourceTopic: 'Clouds', sourceVocabulary: '', standardInputValue: '',
  standardMode: 'manual', studentInterests: [], suggestedStandards: [], t, targetStandards: [],
};
const wizardProps = { isOpen: true, onClose: noop, onComplete: noop, onUpload: noop, onLookupStandards: noop,
  onCallGemini: noop, onWebSearch: noop, addToast: noop, isParentMode: false, isIndependentMode: false,
  isHelpMode: false, setIsHelpMode: noop, initialSourceMode: 'generate', onInitialModeConsumed: noop };
function Harness({ visible = true, initialIds = ['a'], strict = false, use = true, generate = noop }) {
  const [ids, setIds] = React.useState(initialIds);
  const [documentsOnly, setDocumentsOnly] = React.useState(strict);
  const [useOwnSources, setUseOwnSources] = React.useState(use);
  const [includeSourceCitations, setIncludeSourceCitations] = React.useState(!strict);
  return React.createElement('div', { 'data-ids': JSON.stringify(ids), 'data-use': String(useOwnSources) },
    React.createElement(Panel, { ...baseProps, handleGenerateSource: generate, showSourceGen: visible, selectedOwnSourceIds: ids, setSelectedOwnSourceIds: setIds,
      documentsOnly, setDocumentsOnly, useOwnSources, setUseOwnSources, includeSourceCitations, setIncludeSourceCitations }));
}
function mount(Component = Harness, props = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const render = next => flushSync(() => root.render(React.createElement(Component, next)));
  render(props); const item = { root, container, render }; mounts.push(item); return item;
}
async function until(check) {
  const start = Date.now();
  while (!check() && Date.now() - start < 3000) await new Promise(resolve => setTimeout(resolve, 15));
  expect(!!check()).toBe(true);
}
const rows = [{ id: 'a', title: 'Cloud notes', active: true, allowAI: true }];
const good = sources => ({ ok: true, sources, reason: '' });
const bad = reason => ({ ok: false, sources: [], reason });
const api = readLibrary => ({ readLibrary, available: () => true, acceptAttribute: () => '.txt', listSources: vi.fn(() => { throw Error('Legacy read should not be used'); }) });
const textButton = (container, value) => [...container.querySelectorAll('button')].find(button => button.textContent === value);
const click = element => flushSync(() => element.click());
const pressEnter = container => flushSync(() => container.querySelector('#allo-source-topic').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
function importFile(container, id = '#ownSourcesImport') {
  const input = container.querySelector(id);
  Object.defineProperty(input, 'files', { value: [new File(['cloud notes'], 'clouds.txt')], configurable: true });
  flushSync(() => input.dispatchEvent(new Event('change', { bubbles: true })));
}

describe('source panel library recovery', () => {
  it.each([{ initialIds: [] }, { initialIds: ['a'] }])('keeps selection $initialIds on failed load and Retry, while web generation stays available', async ({ initialIds }) => {
    const read = vi.fn().mockResolvedValueOnce(bad('storage-read')).mockResolvedValueOnce(good(rows));
    window.AlloOwnSources = api(read);
    const panel = mount(Harness, { initialIds });
    await until(() => !!textButton(panel.container, 'Retry loading documents'));
    expect(panel.container.firstChild.dataset.ids).toBe(JSON.stringify(initialIds));
    expect(panel.container.firstChild.dataset.use).toBe('true');
    expect(panel.container.textContent).not.toContain('input.my_sources_empty');
    expect(panel.container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(false);
    expect(panel.container.querySelector('#includeCitations').checked).toBe(true);
    click(textButton(panel.container, 'Retry loading documents'));
    await until(() => panel.container.textContent.includes('Cloud notes'));
    expect(panel.container.firstChild.dataset.ids).toBe(JSON.stringify(initialIds));
    expect(window.AlloOwnSources.listSources).not.toHaveBeenCalled();
  });

  it('keeps the last good list through corruption and blocks only strict generation until Retry succeeds', async () => {
    let finishRead;
    const read = vi.fn().mockResolvedValueOnce(good(rows)).mockResolvedValueOnce(bad('corrupt')).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    window.AlloOwnSources = api(read);
    const panel = mount(Harness, { strict: true });
    await until(() => panel.container.textContent.includes('Cloud notes'));
    panel.render({ strict: true, visible: false }); panel.render({ strict: true, visible: true });
    await until(() => !!textButton(panel.container, 'Retry loading documents'));
    expect(panel.container.textContent).toContain('Cloud notes');
    expect(panel.container.textContent).toContain('Showing the last successfully loaded document list.');
    expect(panel.container.firstChild.dataset.ids).toBe('["a"]');
    expect(panel.container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(true);
    click(textButton(panel.container, 'Retry loading documents'));
    await until(() => !!finishRead);
    expect(panel.container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(true);
    finishRead(good(rows));
    await until(() => !panel.container.querySelector('[data-help-key="source_generate_button"]').disabled);
    expect(panel.container.querySelector('#documentsOnly').checked).toBe(true);
  });

  it('keeps the first import enabled while its new library snapshot is delayed', async () => {
    let finishRead;
    const read = vi.fn().mockResolvedValueOnce(good([])).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
    window.AlloOwnSources = { ...api(read), importFiles: async () => ({ ok: true, imported: 1, results: [{ ok: true, sourceId: 'a', action: 'added' }] }) };
    const generate = vi.fn();
    const panel = mount(Harness, { initialIds: [], use: false, generate });
    await until(() => !!panel.container.querySelector('#ownSourcesImport'));
    importFile(panel.container);
    await until(() => !!finishRead);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(panel.container.firstChild.dataset.use).toBe('true');
    expect(panel.container.firstChild.dataset.ids).toBe('["a"]');
    pressEnter(panel.container);
    expect(generate).not.toHaveBeenCalled();
    finishRead(good(rows));
    await until(() => !!panel.container.querySelector('#useOwnSources') && !panel.container.querySelector('#ownSourcesImport').disabled);
    expect(panel.container.querySelector('#useOwnSources').checked).toBe(true);
    pressEnter(panel.container);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('blocks keyboard generation after strict read failure but permits independent web research', async () => {
    window.AlloOwnSources = api(async () => bad('storage-read'));
    const generate = vi.fn();
    const panel = mount(Harness, { strict: true, generate });
    await until(() => !!textButton(panel.container, 'Retry loading documents'));
    pressEnter(panel.container);
    expect(generate).not.toHaveBeenCalled();
    click(panel.container.querySelector('#includeCitations'));
    expect(panel.container.querySelector('#documentsOnly').checked).toBe(false);
    pressEnter(panel.container);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('ignores an old removal response after reopening with a newer library and releases busy controls', async () => {
    let finishRemove;
    const newerRows = [{ id: 'b', title: 'Water notes', active: true, allowAI: true }];
    const read = vi.fn().mockResolvedValueOnce(good(rows)).mockResolvedValueOnce(good(newerRows));
    window.AlloOwnSources = { ...api(read), removeSource: () => new Promise(resolve => { finishRemove = resolve; }) };
    const panel = mount(Harness, { initialIds: ['a', 'b'] });
    await until(() => !!textButton(panel.container, 'input.my_sources_remove'));
    click(textButton(panel.container, 'input.my_sources_remove'));
    const removeButtons = [...panel.container.querySelectorAll('button')].filter(button => button.textContent === 'input.my_sources_remove');
    click(removeButtons[1]);
    await until(() => !!finishRemove);
    panel.render({ initialIds: ['a', 'b'], visible: false }); panel.render({ initialIds: ['a', 'b'], visible: true });
    await until(() => panel.container.textContent.includes('Water notes'));
    expect(textButton(panel.container, 'input.my_sources_exclude').disabled).toBe(false);
    finishRemove({ ok: true, sources: [], count: 0 });
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(panel.container.textContent).toContain('Water notes');
    expect(panel.container.textContent).not.toContain('input.my_sources_empty');
    expect(panel.container.firstChild.dataset.ids).toBe('["a","b"]');
  });
});

describe('truthful import results in both controls', () => {
  it.each(['panel', 'wizard'])('ignores a rejected old post-import refresh after reopening in %s', async mode => {
    let failRefresh;
    const read = vi.fn().mockResolvedValueOnce(good(rows))
      .mockImplementationOnce(() => new Promise((_, reject) => { failRefresh = reject; }))
      .mockResolvedValueOnce(good(rows));
    window.AlloOwnSources = { ...api(read), importFiles: async () => ({ ok: true, imported: 1, results: [{ ok: true, action: 'replaced', sourceId: 'a' }] }) };
    const item = mode === 'panel' ? mount() : mount(Wizard, wizardProps);
    const selector = mode === 'panel' ? '#ownSourcesImport' : '#wiz-own-sources-import';
    await until(() => !!item.container.querySelector(selector) && !item.container.querySelector(selector).disabled);
    importFile(item.container, selector);
    await until(() => !!failRefresh);
    item.render(mode === 'panel' ? { visible: false } : { ...wizardProps, isOpen: false });
    item.render(mode === 'panel' ? { visible: true } : wizardProps);
    await until(() => !!item.container.querySelector(selector) && !item.container.querySelector(selector).disabled);
    failRefresh(Error('Old refresh failed'));
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(item.container.textContent).not.toContain('Saved 1 document(s)');
    expect(item.container.textContent).not.toContain('Retry loading documents');
    expect(item.container.textContent).toContain('Cloud notes');
  });

  it.each(['panel', 'wizard'])('only describes web search as off when documents-only is selected in %s', async mode => {
    window.AlloOwnSources = api(async () => good(rows));
    const item = mode === 'panel' ? mount() : mount(Wizard, wizardProps);
    await until(() => item.container.textContent.includes('Cloud notes'));
    const useSelector = mode === 'panel' ? '#useOwnSources' : '#wiz-own-sources';
    const useInput = item.container.querySelector(useSelector);
    if (useInput && !useInput.checked) click(useInput);
    expect(item.container.textContent).not.toContain('Web search is off.');
    const modeSelector = mode === 'panel' ? '#documentsOnly' : '#wiz-documents-only';
    click(item.container.querySelector(modeSelector));
    expect(item.container.textContent).toContain('Web search is off.');
  });

  it.each(['panel', 'wizard'])('shows saved, replaced, skipped and failed counts after a partial failure in %s', async mode => {
    window.AlloOwnSources = { ...api(async () => good(rows)), importFiles: async () => ({ ok: false, reason: 'storage', imported: 1, skipped: 1, failed: 1, results: [
      { ok: true, action: 'replaced', sourceId: 'a', name: 'clouds.txt' },
      { ok: true, action: 'skipped', sourceId: 'b', name: 'duplicate.txt' },
      { ok: false, action: 'skipped', reason: 'storage', name: 'large.txt', message: 'This document could not be saved.' },
    ] }) };
    const item = mode === 'panel' ? mount() : mount(Wizard, wizardProps);
    const selector = mode === 'panel' ? '#ownSourcesImport' : '#wiz-own-sources-import';
    await until(() => !!item.container.querySelector(selector) && !item.container.querySelector(selector).disabled);
    importFile(item.container, selector);
    await until(() => item.container.textContent.includes('Saved 1 document(s), including 1 replacement(s). Skipped 1; failed 1.'));
    expect(item.container.textContent).toContain('large.txt');
    expect(item.container.textContent).not.toContain('input.my_sources_storage_failed');
    expect(item.container.textContent).not.toContain('input.my_sources_none_added');
  });
});

describe('Quick Start loading recovery', () => {
  it('offers document import when the library is confirmed empty', async () => {
    window.AlloOwnSources = api(async () => good([]));
    const wizard = mount(Wizard, wizardProps);
    await until(() => wizard.container.textContent.includes('input.my_sources_empty'));
    expect(wizard.container.querySelector('#wiz-own-sources-import').disabled).toBe(false);
  });

  it('offers Retry on initial failure without claiming an empty library', async () => {
    window.AlloOwnSources = api(vi.fn().mockResolvedValueOnce(bad('unavailable')).mockResolvedValueOnce(good(rows)));
    const wizard = mount(Wizard, wizardProps);
    await until(() => !!textButton(wizard.container, 'Retry loading documents'));
    expect(wizard.container.textContent).not.toContain('input.my_sources_empty');
    expect(wizard.container.querySelector('#wiz-verify').disabled).toBe(false);
    click(textButton(wizard.container, 'Retry loading documents'));
    await until(() => wizard.container.textContent.includes('Cloud notes'));
    expect(wizard.container.textContent).toContain('input.my_sources_included:1');
  });

  it('preserves explicit none and last-good rows across a failed reopen and successful Retry', async () => {
    window.AlloOwnSources = api(vi.fn().mockResolvedValueOnce(good(rows)).mockResolvedValueOnce(bad('corrupt')).mockResolvedValueOnce(good(rows)));
    const wizard = mount(Wizard, wizardProps);
    await until(() => !!textButton(wizard.container, 'input.my_sources_exclude'));
    click(textButton(wizard.container, 'input.my_sources_exclude'));
    wizard.render({ ...wizardProps, isOpen: false }); wizard.render(wizardProps);
    await until(() => !!textButton(wizard.container, 'Retry loading documents'));
    expect(wizard.container.textContent).toContain('Cloud notes');
    expect(wizard.container.textContent).not.toContain('input.my_sources_empty');
    expect(textButton(wizard.container, 'input.my_sources_include')).toBeTruthy();
    click(textButton(wizard.container, 'Retry loading documents'));
    await until(() => !textButton(wizard.container, 'Retry loading documents'));
    expect(wizard.container.textContent).toContain('input.my_sources_included:0');
  });
});
