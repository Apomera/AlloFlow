import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

// Where the reader is (2026-09-28). "Bookmark this spot" and "Read & reflect"
// sit above the passage: reaching them moves focus to the button and the view
// to the top, so both saved paragraph 0 in a real browser, and Read & reflect
// overwrote the saved place. The older tests clicked with synthetic events that
// never move focus, in a layout where every rectangle is zero.
const require = createRequire(import.meta.url);
let React, createRoot, act, contract, View, pure, phase, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('text_pipeline_helpers_module.js'); loadAlloModule('generation_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext; pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers;
});
beforeEach(() => {
  localStorage.clear();
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js', 'utf8'))();
  View = window.AlloModules.SimplifiedView;
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } } });
  Element.prototype.scrollIntoView = () => {};
});
afterEach(() => { unmount(); vi.restoreAllMocks(); delete navigator.locks; });
function unmount() { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; }

const LONG = '## Herons\n\nThe heron walked slowly in the shallow water.\n\n## Food\n\nIt waited for a fish near the reeds. Then it struck fast.\n\n## Nests\n\nHerons build nests high in trees.\n\nThey return every spring.';
function item(data = LONG) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }), { id: 'orig', sourceFamilyId: 'heron' });
  return { id: 'adapted-1', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'heron', config: { language: 'English' } };
}
function mount(content, extra = {}) {
  const noop = () => {};
  const props = { ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(), t: k => k, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner|Blue Fox', ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return { props, rerender: next => act(() => root.render(React.createElement(View, { ...props, ...next }))) };
}
const $ = selector => host.querySelector(selector);
const byText = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim().startsWith(text));
const paragraph = index => $(`[data-reading-passage] [data-reading-paragraph="${index}"]`);
// A real click: focus moves to the button first, as it does in a browser.
const press = async node => { await act(async () => { node.focus(); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const focusParagraph = index => act(() => { const node = paragraph(index); node.setAttribute('tabindex', '-1'); node.focus(); });
// Layout: paragraph i is 100px below paragraph i-1; `top` is where paragraph 0 starts.
function layout(top) {
  host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]').forEach(node => {
    const i = Number(node.getAttribute('data-reading-paragraph'));
    node.getBoundingClientRect = () => ({ top: top + i * 100, bottom: top + i * 100 + 90, left: 0, right: 600, width: 600, height: 90 });
  });
}
const restAt = async top => { layout(top); await act(async () => { document.dispatchEvent(new Event('scroll')); await new Promise(done => setTimeout(done, 900)); }); };
// A reader stays on a paragraph; focus passing through does not count.
const dwell = () => act(async () => { await new Promise(done => setTimeout(done, 1600)); });
const savedPlace = () => Object.values(JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}'))[0] || null;
const READ_TO_5 = -500; // paragraph 0 scrolled away; paragraph 5 is the first one showing
const AT_CONTROLS = 500; // the passage starts below the controls

describe('the bookmark goes where the reader is', () => {
  it('keeps the paragraph a keyboard reader was on when focus moves to the button', async () => {
    mount(item());
    layout(0); // the whole short passage is on screen
    focusParagraph(3);
    await dwell();
    await press($('[data-reading-outline-toggle]'));
    await press($('[data-reading-bookmark]'));
    expect($('[data-reading-place-notice]').textContent).toBe('Bookmark saved at: It waited for a fish near the reeds. Then it…');
    expect(savedPlace().bookmark.paragraph).toBe(3);
  });

  it('keeps where a mouse reader rested, not the top they scrolled back to', async () => {
    mount(item());
    await restAt(READ_TO_5);
    expect(savedPlace().paragraph).toBe(5);
    await act(async () => { document.activeElement?.blur?.(); });
    await restAt(AT_CONTROLS);
    expect(savedPlace().paragraph).toBe(5); // a stop at the controls is not a place
    await press($('[data-reading-outline-toggle]'));
    await press($('[data-reading-bookmark]'));
    expect(savedPlace().bookmark).toEqual({ paragraph: 5, snippet: 'Herons build nests high in trees.' });
  });

  it('offers to continue from the place read, after a visit ends at the top', async () => {
    mount(item());
    await restAt(READ_TO_5);
    await restAt(AT_CONTROLS);
    unmount();
    mount(item());
    expect($('[data-reading-continue]').textContent).toContain('Continue where you left off: Herons build nests high in trees.');
  });
});

describe('what counts as reading', () => {
  it('Shift+Tab back through earlier paragraphs to reach a button does not move the place', async () => {
    const onReadReflect = vi.fn();
    mount(item(), { onReadReflect });
    layout(0);
    focusParagraph(5);
    await dwell();
    for (const index of [4, 3, 2, 1, 0]) { focusParagraph(index); await act(async () => { await new Promise(done => setTimeout(done, 60)); }); }
    await press(byText('Read & reflect'));
    expect(savedPlace()).toMatchObject({ paragraph: 5, resume: true });
  });

  it('a word clicked earlier does not pull the place back after the reader scrolls on', async () => {
    mount(item());
    focusParagraph(3); // e.g. a word opened in Word meaning; focus stays there
    await restAt(READ_TO_5); // paragraph 3 is now above the view
    await restAt(AT_CONTROLS);
    await dwell();
    await press($('[data-reading-outline-toggle]'));
    await press($('[data-reading-bookmark]'));
    expect(savedPlace().bookmark.paragraph).toBe(5);
  });

  it('a click in the text counts at once', async () => {
    mount(item());
    await act(async () => { paragraph(4).dispatchEvent(new Event('pointerdown', { bubbles: true })); });
    await press($('[data-reading-outline-toggle]'));
    await press($('[data-reading-bookmark]'));
    expect(savedPlace().bookmark.paragraph).toBe(4);
  });
});

describe('Read & reflect keeps the place', () => {
  it('returns to the paragraph read, not the top where the button is', async () => {
    const onReadReflect = vi.fn();
    mount(item(), { onReadReflect });
    await restAt(READ_TO_5);
    await restAt(AT_CONTROLS);
    await press(byText('Read & reflect'));
    expect(onReadReflect).toHaveBeenCalledTimes(1);
    expect(savedPlace()).toMatchObject({ paragraph: 5, resume: true });
    unmount();
    mount(item(), { onReadReflect });
    await act(async () => { await new Promise(done => setTimeout(done, 0)); });
    expect(document.activeElement).toBe(paragraph(5));
    expect($('[data-reading-place-notice]').textContent).toBe('Back where you were reading.');
  });
});

describe('section prompts', () => {
  it('open on the section read, not the one on screen when the button is reached', async () => {
    mount(item());
    await restAt(-300); // reading "Food" (paragraph 3 first showing)
    await restAt(-1000); // scrolled past the end to the prompts button
    await press($('[data-section-prompts-toggle]'));
    expect($('[data-section-prompts-section]').value).toBe('1'); // Food
  });

  it('a new version while answering moves focus to the notice, not the page', async () => {
    const view = mount(item());
    focusParagraph(3);
    await press($('[data-section-prompts-toggle]'));
    const box = $('[data-section-prompt="mainIdea"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(box, 'Herons wait');
      box.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { box.focus(); await new Promise(done => setTimeout(done, 0)); });
    view.rerender({ generatedContent: item(LONG.replace('near the reeds', 'by the tall reeds')) });
    await act(async () => { await new Promise(done => setTimeout(done, 0)); });
    expect($('[data-section-prompts]')).toBe(null);
    const notice = $('[data-reading-revised]');
    expect(notice.getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(notice);
  });
});

describe('anonymous reading position ownership', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { unmount(); vi.useRealTimers(); });

  const advance = milliseconds => act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
  const pointAt = index => act(() => { paragraph(index).dispatchEvent(new Event('pointerdown', { bubbles: true })); });
  const anonymous = session => ({ readingLearnerKey: '', readingLearnerSession: session });
  const openBookmark = async () => {
    if (!$('[data-reading-bookmark]')) await press($('[data-reading-outline-toggle]'));
    await press($('[data-reading-bookmark]'));
  };
  async function nextSession(view, boundary) {
    if (boundary === 'session change') {
      view.rerender(anonymous('second'));
      return;
    }
    await openBookmark();
    await press($('[data-reading-clear]'));
    await press($('[data-reading-clear-yes]'));
    expect($('[data-reading-place-notice]').textContent).toBe('Your reading work was cleared from this page.');
  }

  for (const boundary of ['session change', 'Clear my work']) {
    it(`bookmarks a fresh pointer position after ${boundary}`, async () => {
      const view = mount(item(), anonymous('first'));
      layout(0);
      pointAt(1);
      await nextSession(view, boundary);
      pointAt(4);
      layout(AT_CONTROLS);
      await openBookmark();
      expect($('[data-reading-place-notice]').textContent).toBe('Bookmark kept for this visit at: Nests');
      expect(localStorage.getItem('alloflow_reading_places_v1')).toBeNull();
    });

    it(`opens questions for the freshly selected section after ${boundary}`, async () => {
      const view = mount(item(), anonymous('first'));
      layout(0);
      pointAt(1);
      await nextSession(view, boundary);
      pointAt(4);
      layout(AT_CONTROLS);
      await press($('[data-section-prompts-toggle]'));
      expect($('[data-section-prompts-section]').value).toBe('2');
    });

    it(`tracks a keyboard reading pause after ${boundary}`, async () => {
      const view = mount(item(), anonymous('first'));
      layout(0);
      pointAt(1);
      await nextSession(view, boundary);
      focusParagraph(3);
      await advance(1500);
      layout(AT_CONTROLS);
      await openBookmark();
      expect($('[data-reading-place-notice]').textContent).toBe('Bookmark kept for this visit at: It waited for a fish near the reeds. Then it…');
    });

    it(`tracks a new scroll pause after ${boundary}`, async () => {
      const view = mount(item(), anonymous('first'));
      layout(0);
      pointAt(1);
      await nextSession(view, boundary);
      layout(READ_TO_5);
      act(() => { document.dispatchEvent(new Event('scroll')); });
      await advance(800);
      layout(AT_CONTROLS);
      await openBookmark();
      expect($('[data-reading-place-notice]').textContent).toBe('Bookmark kept for this visit at: Herons build nests high in trees.');
    });
  }

  it('does not save the previous session pending scroll into the new session', async () => {
    const content = item();
    const view = mount(content, anonymous('first'));
    layout(READ_TO_5);
    act(() => { document.dispatchEvent(new Event('scroll')); });
    await advance(400);
    view.rerender(anonymous('second'));
    await advance(400);
    unmount();
    mount(content, anonymous('second'));
    expect($('[data-reading-continue]')).toBeNull();
  });

  it('cancels pending focus and scroll timers when the anonymous session changes', () => {
    const view = mount(item(), anonymous('first'));
    const schedule = vi.spyOn(globalThis, 'setTimeout');
    const cancel = vi.spyOn(globalThis, 'clearTimeout');
    layout(0);
    focusParagraph(3);
    act(() => { document.dispatchEvent(new Event('scroll')); });
    const positionTimers = schedule.mock.calls.flatMap((args, index) =>
      [800, 1500].includes(args[1]) ? [schedule.mock.results[index].value] : []);
    expect(positionTimers).toHaveLength(2);
    view.rerender(anonymous('second'));
    for (const timer of positionTimers) expect(cancel).toHaveBeenCalledWith(timer);
  });

  it('keeps the remembered pointer position across an ordinary same-session rerender', async () => {
    const view = mount(item(), anonymous('first'));
    layout(0);
    pointAt(4);
    view.rerender({ selectedVoice: 'Puck' });
    layout(AT_CONTROLS);
    await openBookmark();
    expect($('[data-reading-place-notice]').textContent).toBe('Bookmark kept for this visit at: Nests');
  });

  it('keeps a pending focus pause across an ordinary same-session rerender', async () => {
    const view = mount(item(), anonymous('first'));
    layout(0);
    focusParagraph(3);
    await advance(750);
    view.rerender({ selectedVoice: 'Puck' });
    await advance(750);
    layout(AT_CONTROLS);
    await openBookmark();
    expect($('[data-reading-place-notice]').textContent).toBe('Bookmark kept for this visit at: It waited for a fish near the reeds. Then it…');
  });
});
