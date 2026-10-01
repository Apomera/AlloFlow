import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = key => key.split('.').reduce((value, part) => value?.[part], strings) || key;
let React, createRoot, act, View, contract, pure, phase, root, host;
const viewportDescriptor = Object.getOwnPropertyDescriptor(window, 'visualViewport');
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const file of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'view_simplified_module.js']) loadAlloModule(file);
  View = window.AlloModules.SimplifiedView;
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});
beforeEach(() => localStorage.clear());
afterEach(() => {
  if (root) act(() => root.unmount()); host?.remove(); root = null; vi.restoreAllMocks();
  if (viewportDescriptor) Object.defineProperty(window, 'visualViewport', viewportDescriptor);
  else delete window.visualViewport;
});
const adapted = text => ({ id: 'adapted', type: 'simplified', data: text, config: { language: 'English', grade: '5' }, instructionalText: { form: 'adapted', role: 'supplemental' } });
function mount(extra = {}) {
  const noop = () => {};
  let props = {
    t, generatedContent: adapted('Plants grow. Bees visit flowers.'), inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], history: [],
    isTeacherMode: false, isZenMode: true, isCompareMode: false, isEditingLeveledText: false, isProcessing: false, isPlaying: false, interactionMode: 'read',
    textEditorRef: React.createRef(), playbackState: { currentIdx: -1 }, cursorStyles: {}, latestGlossary: [],
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    getContentDirection: () => 'ltr', isRtlLang: () => false, highlightGlossaryTerms: text => text,
    renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, ComplexityGauge: () => null,
    handleSpeak: vi.fn(), handleWordClick: vi.fn(), handlePhonicsClick: vi.fn(), handleTextMouseUp: vi.fn(), handleQuickAddGlossary: vi.fn(),
    closeDefinition: noop, closePhonics: noop, closeRevision: noop, stopPlayback: noop, setFocusedParagraphIndex: noop,
    setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop,
    setInteractionMode: noop, setIsCompareMode: noop, setIsFluencyMode: noop, handleToggleIsTeacherToolbarExpanded: noop,
    handleToggleIsEditingLeveledText: noop, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop,
    ...extra,
  };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  const render = next => { props = { ...props, ...next }; root.render(React.createElement(View, props)); };
  act(() => render({}));
  return { props, update: next => act(() => render(next)) };
}
const $ = selector => host.querySelector(selector);
const click = async node => act(async () => { node.focus(); node.click(); });
const key = (node, value, shiftKey = false) => act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true, cancelable: true })));
const tick = () => act(async () => { await new Promise(done => setTimeout(done, 5)); });

describe('popup visual viewport changes', () => {
  it.each(['definition', 'phonics', 'revision', 'selection'])('%s stays in the visible viewport without moving focus or keeping listeners after close', kind => {
    const viewport = Object.assign(new EventTarget(), { width: 320, height: 640, offsetTop: 0, offsetLeft: 0 });
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
    const frames = new Map(); let nextFrame = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++nextFrame, callback); return nextFrame; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
    const property = kind === 'selection' ? 'selectionMenu' : kind + 'Data';
    const data = { x: 315, y: 620, word: 'plant', text: 'Plants grow.', result: 'Plants grow.', type: 'explain', isLoading: true };
    const view = mount({ [property]: data, interactionMode: 'explain' });
    const dialog = $('[role=dialog][aria-modal=true]');
    const control = dialog.querySelector('button'); act(() => control.focus());
    Object.assign(viewport, { width: 280, height: 200, offsetLeft: 20, offsetTop: 70 });
    viewport.dispatchEvent(new Event('resize')); viewport.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(1);
    for (const callback of frames.values()) callback(0); frames.clear();
    const left = parseFloat(dialog.style.left), top = parseFloat(dialog.style.top);
    expect(left).toBeGreaterThanOrEqual(28);
    expect(left + parseFloat(dialog.style.width)).toBeLessThanOrEqual(292);
    expect(top).toBeGreaterThanOrEqual(78);
    expect(top + parseFloat(dialog.style.maxHeight)).toBeLessThanOrEqual(262);
    expect(document.activeElement).toBe(control);
    viewport.dispatchEvent(new Event('resize')); expect(frames.size).toBe(1);
    view.update({ [property]: null });
    expect(frames.size).toBe(0);
    viewport.dispatchEvent(new Event('resize')); viewport.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
  });
  it('uses window dimensions when VisualViewport is unavailable', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
    mount({ definitionData: { word: 'plant', text: 'Plants grow.', x: 100000, y: 100000 } });
    const dialog = $('[role=dialog][aria-modal=true]');
    expect(parseFloat(dialog.style.left) + parseFloat(dialog.style.width)).toBeLessThanOrEqual(window.innerWidth - 8);
    expect(parseFloat(dialog.style.top) + parseFloat(dialog.style.maxHeight)).toBeLessThanOrEqual(window.innerHeight - 8);
  });
});

describe('Original and Both Explain routes', () => {
  it.each(['original', 'both'])('%s keeps headings, links and gloss edits outside Explain buttons', async route => {
    const text = '# Plants\n\nSee [the guide](https://example.org/guide) for details.';
    const original = contract.createSupportedReading(text, { id: 'original' });
    const start = text.indexOf('details');
    original.readingSupports = contract.validateReadingSupports(original.sourceSnapshot, [{ id: 'details', start, end: start + 7, quote: 'details', text: 'More information.' }]);
    const other = { ...adapted('Read the guide for details.'), sourceSnapshot: original.sourceSnapshot };
    const view = mount({ generatedContent: route === 'original' ? original : other, history: [original, other], isCompareMode: route === 'both', isTeacherMode: true, interactionMode: 'explain', onUpdateReadingSupports: vi.fn() });
    const scope = route === 'original' ? $('[data-original-source]') : $('[data-compare-version="source"]');
    expect(scope.querySelector('h2').getAttribute('role')).toBeNull();
    expect(scope.querySelectorAll('[role="button"] a, [role="button"] button, button a, button button')).toHaveLength(0);
    const link = scope.querySelector('a');
    link.addEventListener('click', event => event.preventDefault());
    key(link, 'Enter');
    await click(link);
    expect(view.props.setSelectionMenu).not.toHaveBeenCalled();
    const edit = scope.querySelector('[data-reading-gloss] button');
    expect(edit).not.toBeNull();
    key(edit, ' ');
    await click(edit);
    expect(view.props.setSelectionMenu).not.toHaveBeenCalled();
    const explain = [...scope.querySelectorAll('[data-exact-explain]')].find(button => button.getAttribute('aria-label').includes('See the guide'));
    await click(explain);
    expect(view.props.setSelectionMenu).toHaveBeenCalledWith(expect.objectContaining({ text: 'See the guide for details.' }));
  });
});

describe('adaptation preview focus recovery', () => {
  it.each(['discard', 'apply', 'stale'])('keeps focus on a surviving destination after %s', async outcome => {
    const item = adapted('Plants need sunlight.');
    const preview = { status: 'preview', data: 'Plants need light.', resourceId: item.id, baseData: item.data };
    let view;
    const handler = vi.fn(async plan => {
      if (plan.preview) return preview;
      if (outcome === 'stale') return { status: 'stale' };
      view.update({ generatedContent: { ...item, data: preview.data } });
      return { status: 'applied', previousId: item.id, newId: item.id, data: preview.data };
    });
    view = mount({ generatedContent: item, isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true, complexityLevel: 3, handleComplexityAdjustment: handler });
    const opener = $('[data-apply-complexity]');
    await click(opener);
    expect(document.activeElement).toBe($('[data-adaptation-preview]'));
    await click($('[data-adaptation-' + (outcome === 'discard' ? 'discard' : 'apply') + ']'));
    expect($('[data-adaptation-preview]')).toBeNull();
    expect(document.activeElement).toBe(outcome === 'apply' ? $('[data-adaptation-undo]') : opener);
    if (outcome === 'apply') {
      await click($('[data-adaptation-undo]'));
      expect(document.activeElement).toBe(opener);
    }
  });
  it('recovers focus when a different version removes an open preview', async () => {
    const item = adapted('Plants need sunlight.');
    const view = mount({ generatedContent: item, isTeacherMode: true, isZenMode: false, isTeacherToolbarExpanded: true, complexityLevel: 3,
      handleComplexityAdjustment: async () => ({ status: 'preview', data: 'Plants need light.', resourceId: item.id, baseData: item.data }) });
    await click($('[data-apply-complexity]'));
    expect(document.activeElement).toBe($('[data-adaptation-preview]'));
    view.update({ generatedContent: { ...item, data: 'Plants changed.' } });
    expect($('[data-adaptation-preview]')).toBeNull();
    expect(document.activeElement).toBe($('[data-apply-complexity]'));
  });
});

it('student preview has unique IDs and disclosure targets inside its own reader', async () => {
  mount({ isTeacherMode: true, isZenMode: false });
  await click($('[data-student-preview-open]'));
  const preview = $('[data-student-preview]');
  const ids = [...host.querySelectorAll('[id]')].map(node => node.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const button of preview.querySelectorAll('[aria-controls]')) {
    const target = document.getElementById(button.getAttribute('aria-controls'));
    expect(target, button.outerHTML).not.toBeNull();
    expect(preview.contains(target)).toBe(true);
  }
});

it('the selection dialog always offers Close and Escape from Custom closes only that subview', async () => {
  const view = mount({ isTeacherMode: true, interactionMode: 'revise', selectionMenu: { text: 'Plants grow.', x: 200, y: 200 }, customReviseInstruction: '', handleReviseSelection: vi.fn(), handleSetIsCustomReviseOpenToFalse: vi.fn() });
  await click($('[data-selection-close]'));
  expect(view.props.setSelectionMenu).toHaveBeenCalledWith(null);
  view.update({ isCustomReviseOpen: true });
  view.props.setSelectionMenu.mockClear();
  const input = $('input[autofocus]') || $('input[type="text"]');
  key(input, 'Escape');
  expect(view.props.setIsCustomReviseOpen).toHaveBeenCalledWith(false);
  expect(view.props.setSelectionMenu).not.toHaveBeenCalled();
  expect(document.activeElement).toBe($('[data-selection-close]'));
  await click($('button[aria-label="' + t('common.close_revision_panel') + '"]'));
  expect(view.props.handleSetIsCustomReviseOpenToFalse).toHaveBeenCalledOnce();
  expect(document.activeElement).toBe($('[data-selection-close]'));
});

describe('popup names, focus loops and persistent statuses', () => {
  it.each(['definition', 'phonics', 'revision'])('%s status node survives loading and completion', async kind => {
    const pending = kind === 'definition' ? { word: 'plants', text: null } : kind === 'phonics' ? { word: 'plants', isLoading: true } : { type: 'explain', result: null };
    const ready = kind === 'definition' ? { ...pending, text: 'Living things.' } : kind === 'phonics' ? { ...pending, isLoading: false, data: { syllables: ['plants'] } } : { ...pending, result: 'Plants are living things.' };
    const view = mount({ [kind + 'Data']: { ...pending, x: 200, y: 200 } });
    const status = $('[data-reader-popup-status]');
    expect(status.textContent).toBe('');
    await tick();
    expect(status.textContent).not.toBe('');
    view.update({ [kind + 'Data']: { ...ready, x: 200, y: 200 } });
    await tick();
    expect($('[data-reader-popup-status]')).toBe(status);
    expect(status.textContent).toBe('Ready');
    const dialog = $('[role="dialog"][aria-modal="true"]');
    const buttons = [...dialog.querySelectorAll('button')];
    act(() => buttons[buttons.length - 1].focus());
    key(document.activeElement, 'Tab');
    expect(document.activeElement).toBe(buttons[0]);
    key(document.activeElement, 'Tab', true);
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
  });
  it('Listen remains in its accessible name before and during playback', () => {
    const view = mount({ definitionData: { word: 'plant', text: 'A living thing.', x: 100, y: 100 } });
    const speaker = $('[data-simplified-popup-speaker]');
    expect(speaker.getAttribute('aria-label')).toBe(speaker.textContent.trim());
    expect(speaker.textContent.trim()).toBe('Listen');
    view.update({ isPlaying: true, playingContentId: 'simplified-define-popup' });
    expect(speaker.getAttribute('aria-label')).toBe(speaker.textContent.trim());
    expect(speaker.textContent.trim()).toBe('Stop');
  });
});
