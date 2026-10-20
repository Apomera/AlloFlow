// Glossary word rows (lane A2): one Tab stop per row with arrow-key toolbars,
// translation status chips with a per-term retry, and reordering in Edit.
// The view runs from its built module; the host handlers are sliced from ANTI.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';
import { loadAlloModule } from './setup.js';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const BASE_MODULE = DIR + '/basebuild/view_glossary_module.js';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require(REPO + '/tests/helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let BaseView = null;
beforeAll(() => {
  window.React = React;
  if (existsSync(BASE_MODULE)) {
    delete window.AlloModules.GlossaryView;
    new Function(readFileSync(BASE_MODULE, 'utf8'))();
    BaseView = window.AlloModules.GlossaryView;
  }
  delete window.AlloModules.GlossaryView;
  new Function(readFileSync(DIR + '/view_glossary_module.js', 'utf8'))();
  loadAlloModule('glossary_helpers_module.js');
  loadAlloModule('phase_k_helpers_module.js');
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.restoreAllMocks();
  delete window.__alloStudentAiDisabled;
});

const LANGS = ['Spanish', 'Arabic', 'French'];
const words = (count = 50) => Array.from({ length: count }, (_, i) => ({
  entryId: 'w' + i, term: 'Word ' + i, def: 'Meaning of word ' + i + '.', tier: i % 2 ? 'Academic' : 'Domain-Specific',
  translations: { Spanish: 'Palabra ' + i + ': significado', Arabic: 'كلمة ' + i + ': معنى', French: 'Mot ' + i + ': sens' },
}));
const rowsOf = (data) => data.map((item, i) => ({ ...item, _originalIdx: i }));
function baseProps(data, extra = {}) {
  return glossaryMediaProps({
    generatedContent: { id: 'g', type: 'glossary', data }, filteredGlossaryData: rowsOf(data),
    displayLanguages: LANGS, selectedLanguages: LANGS, isRtlLang: (lang) => lang === 'Arabic',
    handlePhonicsClick: () => {}, ...extra,
  });
}
function mount(element, container = document.createElement('div')) {
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(element));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
  return { container, rerender: (next) => act(() => root.render(next)) };
}
const view = (props, Component = window.AlloModules.GlossaryView) => React.createElement(Component, props);
const list = (container) => container.querySelector('[data-glossary-word-list]');
const rowOf = (container, id) => container.querySelector('tr[data-glossary-entry-key="entry:' + id + '"]');
const status = (container) => container.querySelector('[data-glossary-undo-status]').textContent;
const byLabel = (root, label) => [...root.querySelectorAll('[aria-label]')].find((el) => el.getAttribute('aria-label') === label);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const click = (el) => act(async () => { el.click(); await settle(); });
const press = (el, key, extra = {}) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra })); });

// What the browser would put in the Tab order: focusable, not disabled, not
// tabindex -1, and rendered (not hidden, not inside a closed <details>).
function tabStops(root) {
  return [...root.querySelectorAll('a[href], button, input, select, textarea, summary, [tabindex]')].filter((el) => {
    if (el.disabled || el.matches('input[type="hidden"], input[type="file"].hidden')) return false;
    if (el.tagName === 'SUMMARY' && el.parentElement?.tagName !== 'DETAILS') return false;
    const attr = el.getAttribute('tabindex');
    if (attr != null ? Number(attr) < 0 : !el.matches('a[href], button, input, select, textarea, summary')) return false;
    if (el.closest('[hidden]')) return false;
    for (let node = el; node && node !== root.parentElement; node = node.parentElement) {
      if (node.style && node.style.display === 'none') return false;
      if (node.tagName === 'DETAILS' && !node.open && !(el.tagName === 'SUMMARY' && el.parentElement === node)) return false;
    }
    return true;
  });
}
const rowStops = (row) => tabStops(row).filter((el) => !el.matches('input, select, textarea'));

describe('one Tab stop per word row', () => {
  it('50 terms in 3 languages: read mode drops to one stop per row, edit mode keeps its text fields plus one', () => {
    const data = words();
    const read = mount(view(baseProps(data)));
    const readStops = tabStops(list(read.container)).length;
    const edit = mount(view(baseProps(data, { isEditingGlossary: true })));
    const editStops = tabStops(list(edit.container));
    const editFields = editStops.filter((el) => el.matches('input, select, textarea')).length;
    // One stop per row (the list region itself is outside this count).
    expect(readStops).toBe(50);
    expect(editStops.length - editFields).toBe(50);
    for (const row of list(read.container).querySelectorAll('tr[data-glossary-entry-key]')) expect(rowStops(row)).toHaveLength(1);
    for (const row of list(edit.container).querySelectorAll('tr[data-glossary-entry-key]')) expect(rowStops(row)).toHaveLength(1);
    if (BaseView) {
      const before = mount(view(baseProps(data), BaseView));
      const beforeEdit = mount(view(baseProps(data, { isEditingGlossary: true }), BaseView));
      const beforeRead = tabStops(list(before.container)).length;
      const beforeEditCount = tabStops(list(beforeEdit.container)).length;
      console.info(`[A2] Tab stops in the word list, 50 terms x 3 languages: read ${beforeRead} -> ${readStops}; edit ${beforeEditCount} -> ${editStops.length}`);
      expect(beforeRead).toBeGreaterThan(500);
      expect(editStops.length).toBeLessThan(beforeEditCount / 2);
    }
  });

  it('each row has labelled toolbars, every button keeps its name and stays reachable by arrows', () => {
    const { container } = mount(view(baseProps(words(3))));
    const row = rowOf(container, 'w1');
    const toolbars = [...row.querySelectorAll('[role="toolbar"]')];
    expect(toolbars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Actions for Word 1', 'Definition actions for Word 1', 'Spanish actions for Word 1', 'Arabic actions for Word 1', 'French actions for Word 1']);
    const buttons = [...row.querySelectorAll('button')];
    expect(buttons.length).toBe(11);
    for (const button of buttons) expect((button.getAttribute('aria-label') || button.textContent).trim(), button.outerHTML.slice(0, 80)).not.toBe('');
    const reached = new Set();
    const first = rowStops(row)[0];
    first.focus(); reached.add(document.activeElement);
    for (let i = 0; i < 20; i++) { press(document.activeElement, 'ArrowRight'); reached.add(document.activeElement); }
    expect(buttons.every((b) => reached.has(b)), 'every row button is reachable with the arrow keys').toBe(true);
  });

  it('ArrowRight/ArrowLeft move within the row, Home and End jump to the ends, and the ends stop', () => {
    const { container } = mount(view(baseProps(words(3))));
    const row = rowOf(container, 'w0');
    const items = [...row.querySelectorAll('button')];
    const stop = rowStops(row)[0];
    expect(stop).toBe(items[0]);
    stop.focus();
    press(stop, 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);
    expect(items[1].getAttribute('tabindex')).toBe('0');
    expect(items[0].getAttribute('tabindex')).toBe('-1');
    press(items[1], 'End');
    expect(document.activeElement).toBe(items.at(-1));
    press(items.at(-1), 'ArrowRight');
    expect(document.activeElement, 'stays at the last button').toBe(items.at(-1));
    press(items.at(-1), 'Home');
    expect(document.activeElement).toBe(items[0]);
    press(items[0], 'ArrowLeft');
    expect(document.activeElement, 'stays at the first button').toBe(items[0]);
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true, ctrlKey: true });
    act(() => { items[0].dispatchEvent(event); });
    expect(event.defaultPrevented, 'modified arrows are left alone').toBe(false);
  });

  it('the arrows swap when the nearest direction is right to left', () => {
    const rtl = document.createElement('div'); rtl.setAttribute('dir', 'rtl');
    const { container } = mount(view(baseProps(words(2))), rtl);
    const row = rowOf(container, 'w0');
    const items = [...row.querySelectorAll('button')];
    items[0].focus();
    press(items[0], 'ArrowLeft');
    expect(document.activeElement).toBe(items[1]);
    press(items[1], 'ArrowRight');
    expect(document.activeElement).toBe(items[0]);
  });

  it('remembers the last focused button in each row', () => {
    const { container, rerender } = mount(view(baseProps(words(3))));
    const row = rowOf(container, 'w0');
    const items = [...row.querySelectorAll('button')];
    items[0].focus();
    press(items[0], 'ArrowRight'); press(items[1], 'ArrowRight');
    rowStops(rowOf(container, 'w2'))[0].focus();
    expect(rowStops(row)).toEqual([items[2]]);
    rerender(view(baseProps(words(3))));
    expect(rowStops(row), 'kept after a re-render too').toEqual([items[2]]);
  });

  it('text fields keep their own Tab order and arrow keys inside them are not taken over', () => {
    const { container } = mount(view(baseProps(words(2), { isEditingGlossary: true })));
    const row = rowOf(container, 'w0');
    const fields = [...row.querySelectorAll('textarea, select, input')];
    expect(fields.length).toBeGreaterThanOrEqual(5);
    for (const field of fields) expect(field.getAttribute('tabindex')).toBeNull();
    const textarea = row.querySelector('textarea');
    textarea.focus();
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    act(() => { textarea.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(textarea);
  });
});

describe('translation status chips for teachers', () => {
  const fingerprint = (item) => window.AlloModules.GlossaryView.translationFingerprint(item);
  const cell = (row, lang) => [...row.querySelectorAll('td')].find((td) => td.querySelector('[data-glossary-mobile-label]')?.textContent === lang);
  function data() {
    const list = words(4);
    list[0].translations = { Spanish: '', Arabic: 'كلمة: معنى', French: 'Translation not available' };
    list[1].translationSource = { Spanish: fingerprint({ term: 'Old word', def: 'Old meaning.' }), French: fingerprint(list[1]) };
    delete list[2].translations.French;
    return list;
  }
  it('Missing for empty, absent and "Translation not available"; May be out of date when the English changed', () => {
    const { container } = mount(view(baseProps(data())));
    const statusOf = (id, lang) => cell(rowOf(container, id), lang).querySelector('[data-glossary-translation-status]')?.getAttribute('data-glossary-translation-status') || '';
    expect(statusOf('w0', 'Spanish')).toBe('missing');
    expect(statusOf('w0', 'French')).toBe('missing');
    expect(statusOf('w0', 'Arabic')).toBe('');
    expect(statusOf('w2', 'French')).toBe('missing');
    expect(statusOf('w1', 'Spanish')).toBe('outdated');
    expect(statusOf('w1', 'French'), 'a matching fingerprint is current').toBe('');
    expect(statusOf('w3', 'Spanish'), 'never edited: nothing').toBe('');
    expect(cell(rowOf(container, 'w0'), 'Spanish').textContent).toContain('Missing');
    expect(cell(rowOf(container, 'w1'), 'Spanish').textContent).toContain('May be out of date');
  });
  it('students keep today\'s text and see no chips or retry buttons', () => {
    const { container } = mount(view(baseProps(data(), { isTeacherMode: false, handleRetryGlossaryTranslation: vi.fn() })));
    expect(container.querySelector('[data-glossary-translation-status]')).toBeNull();
    expect(container.querySelector('[data-glossary-retry-translation]')).toBeNull();
    expect(cell(rowOf(container, 'w0'), 'French').textContent).toContain('Translation not available');
  });
  it('no retry button when the host has no retry handler (older app shell)', () => {
    const { container } = mount(view(baseProps(data())));
    expect(container.querySelector('[data-glossary-translation-status]')).toBeTruthy();
    expect(container.querySelector('[data-glossary-retry-translation]')).toBeNull();
  });
});

describe('Translate again', () => {
  function deferred() { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; }
  function setup(retry, filtered) {
    const list = words(5);
    list[3].translations.Spanish = '';
    list[3].translations.French = '';
    const props = baseProps(list, { handleRetryGlossaryTranslation: retry });
    if (filtered) props.filteredGlossaryData = props.filteredGlossaryData.filter((item) => item.entryId === 'w3');
    return mount(view(props));
  }
  it('calls the host with the original index and language, with a busy state on that cell only', async () => {
    const pending = deferred();
    const retry = vi.fn(() => pending.promise);
    const { container } = setup(retry, true);
    const button = byLabel(container, 'Translate Word 3 into Spanish again');
    expect(button).toBeTruthy();
    await click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenCalledWith(3, 'Spanish');
    const spanish = button.closest('td');
    expect(spanish.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(spanish.textContent).toContain('Translating…');
    const french = byLabel(container, 'Translate Word 3 into French again');
    expect(french.closest('td').getAttribute('aria-busy')).toBeNull();
    expect(french.getAttribute('aria-disabled')).toBeNull();
    await click(button);
    expect(retry, 'a second click while busy does nothing').toHaveBeenCalledTimes(1);
    await act(async () => { pending.resolve({ ok: true }); await pending.promise; });
    expect(status(container)).toBe('Translated Word 3 into Spanish.');
    expect(spanish.getAttribute('aria-busy')).toBeNull();
  });
  it('failure is announced and shown in the cell, and the button works again', async () => {
    const retry = vi.fn(async () => ({ ok: false, reason: 'failed' }));
    const { container } = setup(retry);
    const button = byLabel(container, 'Translate Word 3 into French again');
    await click(button);
    expect(status(container)).toBe('Could not translate Word 3 into French. Try again.');
    expect(button.closest('td').textContent).toContain('Could not translate Word 3 into French. Try again.');
    expect(button.getAttribute('aria-disabled')).toBeNull();
    await click(button);
    expect(retry).toHaveBeenCalledTimes(2);
  });
  it('AI turned off or unavailable says so', async () => {
    const retry = vi.fn(async () => ({ ok: false, reason: 'ai-disabled' }));
    const { container } = setup(retry);
    await click(byLabel(container, 'Translate Word 3 into Spanish again'));
    expect(status(container)).toContain('AI translation is turned off');
    retry.mockImplementation(async () => ({ ok: false, reason: 'ai-unavailable' }));
    await click(byLabel(container, 'Translate Word 3 into Spanish again'));
    expect(status(container)).toContain('not available right now');
  });
  it('the retry button is part of the row toolbar', () => {
    const { container } = setup(vi.fn());
    const button = byLabel(container, 'Translate Word 3 into Spanish again');
    expect(button.closest('[role="toolbar"]').getAttribute('aria-label')).toBe('Spanish actions for Word 3');
    expect(rowStops(rowOf(container, 'w3'))).toHaveLength(1);
  });
});

// Slice the host handlers out of the lane's ANTI copy and run them with stubs.
const ANTI = readFileSync(DIR + '/AlloFlowANTI.txt', 'utf8');
const HOST_SOURCE = sliceBetween(ANTI, '  const handleGlossaryChange = (index, field, value, lang = null) => {', '  const handleGlossarySelectionChange = ', { file: 'AlloFlowANTI.txt', label: 'glossary row handlers' });
const HOST_NAMES = ['generatedContent', 'isTeacherMode', 'setGeneratedContent', 'setHistory', '_alloHostHandlers', 'callGemini', 'aiCapability', '_alloAwaitModules', '_alloBeginGlossaryTask', 'translateResourceItem', 'warnLog'];
const hostFactory = new Function(...HOST_NAMES, HOST_SOURCE + '\nreturn { handleGlossaryChange, handleRetryGlossaryTranslation, handleMoveGlossaryItem };');
const createHostHandlers = new Function(readFileSync(REPO + '/host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
const cleanJson = (text) => String(text).replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

// A store that applies plain and functional updates in order, as React does.
function hostStore(data, extra = {}) {
  const resource = { id: 'g', type: 'glossary', data };
  const s = { resource, history: [resource, { id: 'other', type: 'quiz', data: {} }], registry: new Map(), gemini: vi.fn() };
  s.setGeneratedContent = (v) => { s.resource = typeof v === 'function' ? v(s.resource) : v; };
  s.setHistory = (v) => { s.history = typeof v === 'function' ? v(s.history) : v; };
  s.host = () => {
    const generatedContent = s.resource;
    const deps = {
      generatedContent, isTeacherMode: true, setGeneratedContent: s.setGeneratedContent, setHistory: s.setHistory,
      callGemini: s.gemini, aiCapability: { text: true }, warnLog: () => {},
      _alloAwaitModules: async () => {},
      _alloHostHandlers: () => createHostHandlers({ get generatedContent() { return generatedContent; }, setGeneratedContent: s.setGeneratedContent, setHistory: s.setHistory }),
      _alloBeginGlossaryTask: (index, fields, channel) => window.AlloModules.GlossaryHelpers.beginGlossaryTask({
        generatedContent, setGeneratedContent: s.setGeneratedContent, setHistory: s.setHistory,
        getGlossaryLive: () => ({ resource: s.resource, history: s.history, activeView: 'glossary' }), glossaryTaskRegistry: s.registry,
      }, index, fields, channel),
      translateResourceItem: (item, lang) => window.AlloModules.PhaseKHelpers.translateResourceItem(item, lang, { callGemini: s.gemini, cleanJson, warnLog: () => {} }),
      ...extra,
    };
    return hostFactory(...HOST_NAMES.map((name) => deps[name]));
  };
  return s;
}
const fp = (item) => window.AlloModules.GlossaryView.translationFingerprint(item);
const leaf = () => ({ entryId: 'leaf', term: 'Leaf', def: 'A plant part.', translations: { Spanish: 'hoja: parte', French: 'feuille: partie' } });

describe('host: the fingerprint is recorded lazily in the edit path', () => {
  it('a term or definition edit stamps the text from before the edit, once', () => {
    const s = hostStore([leaf(), { entryId: 'bare', term: 'Bare', def: 'No translations.' }]);
    const original = fp(s.resource.data[0]);
    s.host().handleGlossaryChange(0, 'term', 'Leaves');
    expect(s.resource.data[0].term).toBe('Leaves');
    expect(s.resource.data[0].translationSource).toEqual({ Spanish: original, French: original });
    expect(s.history[0]).toEqual(s.resource);
    s.host().handleGlossaryChange(0, 'def', 'Green plant parts.');
    expect(s.resource.data[0].translationSource, 'a later edit keeps the first fingerprint').toEqual({ Spanish: original, French: original });
    s.host().handleGlossaryChange(1, 'def', 'Still none.');
    expect(s.resource.data[1].translationSource, 'nothing to stamp without translations').toBeUndefined();
    s.host().handleGlossaryChange(0, 'tier', 'Academic');
    expect(s.resource.data[0].tier).toBe('Academic');
  });
  it('typing a translation marks it current for today\'s English', () => {
    const s = hostStore([leaf()]);
    s.host().handleGlossaryChange(0, 'term', 'Leaves');
    s.host().handleGlossaryChange(0, 'translations', 'hojas: partes', 'Spanish');
    expect(s.resource.data[0].translations.Spanish).toBe('hojas: partes');
    expect(s.resource.data[0].translationSource.Spanish).toBe(fp(s.resource.data[0]));
    expect(s.resource.data[0].translationSource.French).not.toBe(fp(s.resource.data[0]));
  });
});

describe('host: handleRetryGlossaryTranslation', () => {
  const reply = (value) => JSON.stringify([{ term: 'Leaf', def: 'A plant part.', translations: { Spanish: value } }]);
  it('reuses the glossary translation prompt, saves the translation and refreshes the fingerprint', async () => {
    const s = hostStore([{ ...leaf(), term: 'Leaves', translationSource: { Spanish: 'fp-old' } }]);
    s.gemini.mockResolvedValue(reply('hojas: partes de una planta'));
    const result = await s.host().handleRetryGlossaryTranslation(0, 'Spanish');
    expect(result).toEqual({ ok: true });
    expect(s.gemini).toHaveBeenCalledTimes(1);
    const [prompt, json] = s.gemini.mock.calls[0];
    expect(prompt.includes('Translate the terms and definitions in this glossary JSON into Spanish.'), prompt).toBe(true);
    expect(prompt.includes('"term":"Leaves"'), prompt).toBe(true);
    expect(json).toBe(true);
    expect(s.resource.data[0].translations).toEqual({ Spanish: 'hojas: partes de una planta', French: 'feuille: partie' });
    expect(s.resource.data[0].translationSource.Spanish).toBe(fp(s.resource.data[0]));
    expect(s.history[0].data[0].translations.Spanish).toBe('hojas: partes de una planta');
  });
  it('respects AI off, QR-blocked and unavailable AI without calling the model', async () => {
    const s = hostStore([leaf()]);
    window.__alloStudentAiDisabled = true;
    expect(await s.host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'ai-disabled' });
    delete window.__alloStudentAiDisabled;
    const blocked = Object.assign(vi.fn(), { _alloQrBlocked: true });
    expect(await hostStore([leaf()], { callGemini: blocked }).host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'ai-disabled' });
    expect(await hostStore([leaf()], { aiCapability: { text: false } }).host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'ai-unavailable' });
    expect(await hostStore([leaf()], { callGemini: null }).host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'ai-unavailable' });
    expect(await hostStore([leaf()], { isTeacherMode: false }).host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'unavailable' });
    expect(s.gemini).not.toHaveBeenCalled();
    expect(blocked).not.toHaveBeenCalled();
  });
  it('drops the reply when the term changed meanwhile, and fails on an empty reply', async () => {
    const s = hostStore([leaf()]);
    let release;
    s.gemini.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    const running = s.host().handleRetryGlossaryTranslation(0, 'Spanish');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    s.host().handleGlossaryChange(0, 'term', 'Leaves');
    release(reply('hoja nueva'));
    expect(await running).toEqual({ ok: false, reason: 'changed' });
    expect(s.resource.data[0].translations.Spanish).toBe('hoja: parte');
    s.gemini.mockResolvedValue(JSON.stringify([{ term: 'Leaves', def: 'A plant part.', translations: { Spanish: '  ' } }]));
    expect(await s.host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'failed' });
    s.gemini.mockRejectedValue(new Error('network'));
    expect(await s.host().handleRetryGlossaryTranslation(0, 'Spanish')).toEqual({ ok: false, reason: 'failed' });
  });
});

describe('host: handleMoveGlossaryItem', () => {
  it('moves the entry itself in both stores and refuses moves past the ends', () => {
    const s = hostStore([leaf(), { entryId: 'root', term: 'Root', def: 'Under ground.' }, { entryId: 'stem', term: 'Stem', def: 'Holds it up.' }]);
    const [a, b, c] = s.resource.data;
    expect(s.host().handleMoveGlossaryItem(2, -1)).toBe(true);
    expect(s.resource.data).toEqual([a, c, b]);
    expect(s.resource.data[1]).toBe(c);
    expect(s.history[0]).toEqual(s.resource);
    expect(s.history[1].id).toBe('other');
    expect(s.host().handleMoveGlossaryItem(0, -1)).toBe(false);
    expect(s.host().handleMoveGlossaryItem(2, 1)).toBe(false);
    expect(s.host().handleMoveGlossaryItem(0, 1)).toBe(true);
    expect(s.resource.data.map((item) => item.term)).toEqual(['Stem', 'Leaf', 'Root']);
    expect(hostStore([leaf(), leaf()], { isTeacherMode: false }).host().handleMoveGlossaryItem(0, 1)).toBe(false);
  });
});

describe('reorder in edit mode', () => {
  function App({ extra = {}, spy, onApi }) {
    const initial = React.useMemo(() => ({ id: 'g', type: 'glossary', data: [leaf(), { entryId: 'root', term: 'Root', def: 'Under ground.', translations: {} }, { entryId: 'stem', term: 'Stem', def: 'Holds it up.', translations: {} }] }), []);
    const [resource, setResource] = React.useState(initial);
    const [, setHistory] = React.useState([initial]);
    const host = hostFactory(...HOST_NAMES.map((name) => ({ generatedContent: resource, isTeacherMode: true, setGeneratedContent: setResource, setHistory })[name]));
    // A browser drops focus when React moves the focused row's node; jsdom
    // does not, so blur here to make the view's focus restore observable.
    const move = (index, delta) => { spy(index, delta); document.activeElement?.blur(); return host.handleMoveGlossaryItem(index, delta); };
    onApi({ resource });
    return view(baseProps(resource.data, { isEditingGlossary: true, displayLanguages: ['Spanish'], handleMoveGlossaryItem: move, ...extra }));
  }
  function setup(extra) {
    const api = { move: vi.fn() };
    const mounted = mount(React.createElement(App, { extra, spy: api.move, onApi: (next) => Object.assign(api, next) }));
    return { ...mounted, api };
  }
  it('Move up reorders through the host, keeps focus on the moved row\'s control and announces the position', async () => {
    const { container, api } = setup();
    const up = byLabel(container, 'Move Stem up');
    up.focus();
    await click(up);
    expect(api.resource.data.map((item) => item.term)).toEqual(['Leaf', 'Stem', 'Root']);
    expect(document.activeElement).toBe(byLabel(container, 'Move Stem up'));
    expect(status(container)).toBe('Stem moved to position 2 of 3.');
    const down = byLabel(container, 'Move Leaf down');
    down.focus();
    await click(down);
    expect(api.resource.data.map((item) => item.term)).toEqual(['Stem', 'Leaf', 'Root']);
    expect(document.activeElement).toBe(byLabel(container, 'Move Leaf down'));
    expect(status(container)).toBe('Leaf moved to position 2 of 3.');
    expect(rowStops(rowOf(container, 'leaf'))).toEqual([byLabel(container, 'Move Leaf down')]);
  });
  it('the ends are unavailable but stay focusable', async () => {
    const { container, api } = setup();
    const first = byLabel(container, 'Move Leaf up');
    expect(first.getAttribute('aria-disabled')).toBe('true');
    expect(first.disabled).toBe(false);
    await click(first);
    expect(api.move).not.toHaveBeenCalled();
    expect(byLabel(container, 'Move Stem down').getAttribute('aria-disabled')).toBe('true');
    expect(byLabel(container, 'Move Root down').getAttribute('aria-disabled')).toBeNull();
  });
  it.each([
    ['a search', { glossarySearchTerm: 'le' }],
    ['a vocabulary filter', { glossaryFilter: 'academic' }],
    ['an A-Z sort', { glossarySort: 'az' }],
  ])('unavailable with the reason in the description while %s is active', async (_name, extra) => {
    const { container, api } = setup(extra);
    const down = byLabel(container, 'Move Root down');
    expect(down.getAttribute('aria-disabled')).toBe('true');
    const help = container.querySelector('[id="' + down.getAttribute('aria-describedby') + '"]');
    expect(help?.textContent).toBe('To move words, clear the search and filters and sort in lesson order.');
    await click(down);
    expect(api.move).not.toHaveBeenCalled();
  });
  it('lesson order (or no sort prop yet) allows moving, and read mode has no move buttons', () => {
    const { container } = setup({ glossarySort: 'lesson' });
    expect(byLabel(container, 'Move Root down').getAttribute('aria-disabled')).toBeNull();
    expect(container.querySelector('[id="glossary-reorder-help"]')).toBeNull();
    const read = mount(view(baseProps([leaf()], { handleMoveGlossaryItem: vi.fn() })));
    expect(read.container.querySelector('[data-glossary-move]')).toBeNull();
  });
});
