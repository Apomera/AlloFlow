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
const t = (key, vars) => vars && 'count' in vars ? `${key}:${vars.count}` : key;
let Panel, Wizard;
const mounted = [];
beforeAll(() => {
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t });
  loadAlloModule('view_misc_panels_module.js');
  loadAlloModule('quickstart_module.js');
  Panel = window.AlloModules.SourceGenPanel;
  Wizard = window.AlloModules.QuickStartWizard;
});
afterEach(() => {
  for (const item of mounted.splice(0)) { flushSync(() => item.root.unmount()); item.container.remove(); }
  delete window.AlloOwnSources;
  vi.restoreAllMocks();
});
const rows = [
  { id: 'a', title: 'Cloud notes', active: true, allowAI: true },
  { id: 'b', title: 'Water notes', active: false, allowAI: true },
  { id: 'private', title: 'Private notes', active: true, allowAI: false },
];
function api(extra = {}) {
  return { available: () => true, countSources: async () => 1, listSources: async () => rows,
    acceptAttribute: () => '.txt', setSourceActive: vi.fn(), ...extra };
}
const panelProps = {
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
function PanelHarness({ visible = true, initialIds = null }) {
  const [selectedOwnSourceIds, setSelectedOwnSourceIds] = React.useState(initialIds);
  const [documentsOnly, setDocumentsOnly] = React.useState(false);
  const [useOwnSources, setUseOwnSources] = React.useState(true);
  const [includeSourceCitations, setIncludeSourceCitations] = React.useState(true);
  return React.createElement('div', { 'data-selected': JSON.stringify(selectedOwnSourceIds) },
    React.createElement(Panel, { ...panelProps, showSourceGen: visible, selectedOwnSourceIds, setSelectedOwnSourceIds,
      documentsOnly, setDocumentsOnly, useOwnSources, setUseOwnSources, includeSourceCitations, setIncludeSourceCitations }));
}
function mount(Component = PanelHarness, props = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container);
  const render = (next) => flushSync(() => root.render(React.createElement(Component, next)));
  render(props);
  const item = { root, container, render }; mounted.push(item); return item;
}
async function until(check, timeout = 3000) {
  const start = Date.now();
  while (!check() && Date.now() - start < timeout) await new Promise((resolve) => setTimeout(resolve, 15));
  expect(!!check()).toBe(true);
}
function byText(container, text) { return [...container.querySelectorAll('button')].find((button) => button.textContent === text); }
function sourceButton(container, title) { return [...container.querySelectorAll('li')].find((li) => li.textContent.includes(title))?.querySelector('button'); }
function inputById(container, id) { return [...container.querySelectorAll('input')].find((input) => input.id === id); }
function click(button) { expect(button).toBeTruthy(); flushSync(() => button.click()); }
function importFile(container, id = '#ownSourcesImport') {
  const input = container.querySelector(id);
  Object.defineProperty(input, 'files', { configurable: true, value: [new File(['new contents'], 'notes.txt', { type: 'text/plain' })] });
  flushSync(() => input.dispatchEvent(new Event('change', { bubbles: true })));
}
const duplicateInfo = { existing: { id: 'a', title: 'notes.txt' }, incoming: { title: 'notes.txt' }, identical: false };

describe('lesson source selection', () => {
  it('announces the current generation stage and uses writing only as a fallback', () => {
    window.AlloOwnSources = api();
    const props = { ...panelProps, useOwnSources: false, setUseOwnSources: noop, includeSourceCitations: true, setIncludeSourceCitations: noop, isGeneratingSource: true, generationStep: 'Searching the web for reliable sources…' };
    const panel = mount(Panel, props);
    const button = () => panel.container.querySelector('[data-help-key="source_generate_button"]');
    expect(button().textContent).toBe(props.generationStep);
    expect(button().querySelector('[role="status"]').getAttribute('aria-live')).toBe('polite');
    panel.render({ ...props, generationStep: 'Reading selected documents…' });
    expect(button().textContent).toBe('Reading selected documents…');
    panel.render({ ...props, generationStep: '' });
    expect(button().textContent).toBe('input.writing');
  });

  it('keeps selections isolated and respects explicit none and AI permission', async () => {
    const os = api(); window.AlloOwnSources = os;
    const first = mount(); const second = mount(); const none = mount(PanelHarness, { initialIds: [] });
    await until(() => first.container.textContent.includes('input.my_sources_stored:3'));
    await until(() => second.container.textContent.includes('input.my_sources_included:1'));
    await until(() => none.container.textContent.includes('input.my_sources_included:0'));
    expect(sourceButton(first.container, 'Private notes').disabled).toBe(true);
    click(sourceButton(first.container, 'Cloud notes'));
    expect(first.container.textContent).toContain('input.my_sources_included:0');
    expect(second.container.textContent).toContain('input.my_sources_included:1');
    expect(os.setSourceActive).not.toHaveBeenCalled();
    first.render({ visible: false }); first.render({ visible: true });
    await until(() => first.container.textContent.includes('input.my_sources_stored:3'));
    expect(first.container.textContent).toContain('input.my_sources_included:0');
  });

  it('makes documents only and web search mutually exclusive and blocks strict generation with no selection', async () => {
    window.AlloOwnSources = api(); const { container } = mount();
    await until(() => !!sourceButton(container, 'Cloud notes'));
    click(container.querySelector('#documentsOnly'));
    expect(container.querySelector('#documentsOnly').checked).toBe(true);
    expect(container.querySelector('#includeCitations').checked).toBe(false);
    click(container.querySelector('#includeCitations'));
    expect(container.querySelector('#documentsOnly').checked).toBe(false);
    click(container.querySelector('#documentsOnly'));
    click(sourceButton(container, 'Cloud notes'));
    expect(container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(true);
    expect(container.textContent).toContain('Select at least one available document');
  });

  it('ignores a delayed library snapshot after a lesson selection changes', async () => {
    let completeRead;
    window.AlloOwnSources = api({ listSources: vi.fn().mockResolvedValueOnce(rows).mockImplementationOnce(() => new Promise((resolve) => { completeRead = resolve; })) });
    const panel = mount();
    await until(() => !!sourceButton(panel.container, 'Cloud notes'));
    panel.render({ visible: false }); panel.render({ visible: true });
    await until(() => !!completeRead);
    click(sourceButton(panel.container, 'Cloud notes'));
    completeRead(rows);
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(panel.container.textContent).toContain('input.my_sources_included:0');
    expect(panel.container.firstChild.dataset.selected).toBe('[]');
  });
});

describe('duplicate import choices', () => {
  it('waits for an explicit choice, focuses Keep both, and selects the newly added document', async () => {
    let decision; let imported = false;
    window.AlloOwnSources = api({
      listSources: async () => imported ? [...rows, { id: 'c', title: 'notes (2).txt', allowAI: true }] : rows,
      importFiles: vi.fn(async (_files, options) => {
        decision = await options.resolveDuplicate(duplicateInfo); imported = true;
        return { ok: true, imported: 1, results: [{ ok: true, action: 'added', sourceId: 'c' }] };
      }),
    });
    const { container } = mount();
    await until(() => !!container.querySelector('#ownSourcesImport'));
    importFile(container);
    await until(() => !!byText(container, 'Keep both'));
    expect(document.activeElement).toBe(byText(container, 'Keep both'));
    expect(decision).toBeUndefined();
    expect(container.querySelector('[data-help-key="source_generate_button"]').disabled).toBe(true);
    click(byText(container, 'Keep both'));
    await until(() => container.textContent.includes('notes (2).txt'));
    expect(decision).toBe('keep-both');
    expect(JSON.parse(container.firstChild.dataset.selected)).toEqual(['a', 'c']);
    expect(container.textContent).toContain('input.my_sources_included:2');
  });

  it.each(['close', 'unmount', 'escape'])('resolves a pending duplicate as skip on %s', async (action) => {
    let decision;
    window.AlloOwnSources = api({ importFiles: async (_files, options) => {
      decision = await options.resolveDuplicate(duplicateInfo);
      return { imported: 0, results: [{ ok: true, action: 'skipped', sourceId: 'a' }] };
    } });
    const panel = mount();
    await until(() => !!panel.container.querySelector('#ownSourcesImport'));
    importFile(panel.container);
    await until(() => !!byText(panel.container, 'Keep both'));
    if (action === 'close') panel.render({ visible: false });
    else if (action === 'unmount') { flushSync(() => panel.root.unmount()); mounted.splice(mounted.indexOf(panel), 1); panel.container.remove(); }
    else flushSync(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await until(() => decision === 'skip');
  });

  it('does not select a skipped duplicate from an explicitly empty lesson selection', async () => {
    window.AlloOwnSources = api({ importFiles: async (_files, options) => {
      await options.resolveDuplicate({ ...duplicateInfo, identical: true });
      return { imported: 0, skipped: 1, results: [{ ok: true, action: 'skipped', sourceId: 'a' }] };
    } });
    const { container } = mount(PanelHarness, { initialIds: [] });
    await until(() => !!container.querySelector('#ownSourcesImport'));
    importFile(container);
    await until(() => !!byText(container, 'Skip this file'));
    click(byText(container, 'Skip this file'));
    await until(() => !container.querySelector('#ownSourcesImport').disabled);
    expect(container.firstChild.dataset.selected).toBe('[]');
    expect(container.textContent).toContain('input.my_sources_included:0');
  });
});

const wizardProps = { isOpen: true, onClose: noop, onComplete: noop, onUpload: noop, onLookupStandards: noop,
  onCallGemini: noop, onWebSearch: noop, addToast: noop, isParentMode: false, isIndependentMode: false,
  isHelpMode: false, setIsHelpMode: noop, initialSourceMode: 'generate', onInitialModeConsumed: noop };
describe('Quick Start source controls', () => {
  it('keeps choices local and switches strictly between web and documents-only modes', async () => {
    const os = api(); window.AlloOwnSources = os;
    const first = mount(Wizard, wizardProps); const second = mount(Wizard, wizardProps);
    await until(() => !!inputById(first.container, 'wiz-own-sources'));
    await until(() => !!inputById(second.container, 'wiz-own-sources'));
    click(inputById(first.container, 'wiz-own-sources'));
    click(inputById(first.container, 'wiz-documents-only'));
    expect(inputById(first.container, 'wiz-verify').checked).toBe(false);
    click(inputById(first.container, 'wiz-verify'));
    expect(inputById(first.container, 'wiz-documents-only').checked).toBe(false);
    click(sourceButton(first.container, 'Cloud notes'));
    expect(first.container.textContent).toContain('input.my_sources_included:0');
    expect(second.container.textContent).toContain('input.my_sources_included:1');
    expect(os.setSourceActive).not.toHaveBeenCalled();
  });

  it('skips a pending duplicate when the wizard closes', async () => {
    let decision;
    window.AlloOwnSources = api({ importFiles: async (_files, options) => {
      decision = await options.resolveDuplicate(duplicateInfo);
      return { imported: 0, results: [{ ok: true, action: 'skipped', sourceId: 'a' }] };
    } });
    const wizard = mount(Wizard, wizardProps);
    await until(() => !!wizard.container.querySelector('#wiz-own-sources-import'));
    importFile(wizard.container, '#wiz-own-sources-import');
    await until(() => !!byText(wizard.container, 'Keep both'));
    expect(byText(wizard.container, ' common.back').disabled).toBe(true);
    wizard.render({ ...wizardProps, isOpen: false });
    await until(() => decision === 'skip');
  });
});
