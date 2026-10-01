// Fewer controls above the text: a Display (Aa) panel, a teacher drawer, and
// the skip link first.
//
// WHY (2026-09-24, Aaron approved): after the Novak work a student met 13-16
// controls before the first line of the reading, and a teacher about 20; on a
// phone the text started 643 px down an 844 px screen. Immersive Reader, the
// reading theme and the reading width now share one Display panel, the teacher
// actions and "Review & adjust text" share the Teacher tools drawer, and the
// "Skip reading controls" link, which sat below every toolbar, comes first.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase, api;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
beforeEach(() => { try { localStorage.clear(); } catch (_) {} });
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; });

function pair() {
  const snapshot = api.createSourceSnapshot('The heath was quiet. Three figures met there.', { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
  const original = api.createSupportedReading(snapshot, { id: 'orig' });
  const adapted = { id: 'adapted', type: 'simplified', data: 'The open land was quiet. Three people met there.', sourceSnapshot: snapshot, instructionalText: { role: 'supplemental', form: 'adapted' }, config: { language: 'English', grade: '5' } };
  return { original, adapted };
}
function mount(extra = {}) {
  const { original, adapted } = pair();
  const props = { ComplexityGauge: () => null, t: k => k, generatedContent: adapted, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: false, interactionMode: 'read', history: [original, adapted], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (x, c) => phase.formatInteractiveText(x, c, false, { highlightGlossaryTerms: y => y, latestGlossary: [], MathSymbol: () => null }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: y => y, latestGlossary: [], setFocusedParagraphIndex: () => {}, onReadOriginal: () => {}, onOpenReadingArtifact: () => {}, onFocusViewChange: vi.fn(), setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(), handleToggleIsTeacherToolbarExpanded: vi.fn(), ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const panel = () => host.querySelector('[data-reader-display-panel]');
const toggle = () => host.querySelector('[data-reader-display]');
const shown = el => !el.closest('[hidden]') && !/\bsr-only\b/.test(el.className || '');

describe('karaoke access after generating reading supports', () => {
  it.each(['original', 'adapted'])('opens karaoke from Display on the %s reading', form => {
    const reading = pair()[form];
    const quote = form === 'original' ? 'heath' : 'land';
    const start = reading.data.indexOf(quote);
    const entry = { id: 'generated-help', start, end: start + quote.length, quote, text: 'A wide outdoor place.', priority: 'helpful', origin: 'generated', kind: 'gloss' };
    if (form === 'original') reading.readingSupports = api.validateReadingSupports(reading, [entry]);
    else reading.adaptedReadingSupports = api.setAdaptedReadingSupportsShown(reading, api.upsertAdaptedReadingSupport(reading, undefined, entry), true);
    expect((reading.readingSupports || reading.adaptedReadingSupports).annotations).toHaveLength(1);
    reading.immersiveData = reading.data.split(/\s+/).map((text, index) => ({ id: index, text, pos: 'none', syllables: [text] }));
    reading.immersiveSource = reading.data;
    const render = () => root.render(React.createElement(View, props));
    const karaoke = vi.fn(({ isOpen, text }) => isOpen ? React.createElement('div', { 'data-karaoke-open': true }, text) : null);
    const props = mount({
      generatedContent: reading, isTeacherMode: true, isImmersiveReaderActive: false, isKaraokeOverlayActive: false,
      immersiveSettings: { textSize: 20, lineFocus: false }, lineHeight: 1.5, letterSpacing: 0,
      ImmersiveToolbar: window.AlloModules.ImmersiveToolbar, ImmersiveWord: () => null,
      FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null, KaraokeReaderOverlay: karaoke,
      ErrorBoundary: ({ children }) => children,
      setIsImmersiveReaderActive: vi.fn(value => { props.isImmersiveReaderActive = value; render(); }),
      setIsKaraokeOverlayActive: vi.fn(value => { props.isKaraokeOverlayActive = value; render(); }),
      handleAnalyzePOS: vi.fn(), handleSpeak: vi.fn(), callTTS: vi.fn(), setImmersiveSettings: vi.fn()
    });
    act(() => toggle().click());
    const immersive = panel().querySelector('[data-help-key="simplified_immersive_reader"]');
    expect(immersive.disabled).toBe(false);
    act(() => immersive.click());
    expect(props.setIsImmersiveReaderActive).toHaveBeenCalledWith(true);
    expect(props.handleAnalyzePOS).not.toHaveBeenCalled();
    const focusReader = host.querySelector('[data-help-key="immersive_karaoke_overlay"]');
    expect(focusReader).not.toBeNull();
    expect(focusReader.disabled).toBe(false);
    act(() => focusReader.click());
    expect(props.setIsKaraokeOverlayActive).toHaveBeenCalledWith(true);
    expect(host.querySelector('[data-karaoke-open]').textContent).toBe(reading.data);
    const activeProps = karaoke.mock.calls.at(-1)[0];
    expect(activeProps.sentenceList.join(' ')).toBe(reading.data);
    expect(typeof activeProps.getAudioUrl).toBe('function');
  });
});

describe('the Display (Aa) panel', () => {
  it('holds Immersive Reader, the reading theme and the reading width, closed at first', () => {
    mount();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe(panel().id);
    expect(panel().hidden).toBe(true);
    expect(panel().style.display).toBe('none');
    expect(panel().querySelector('[data-help-key="simplified_immersive_reader"]')).not.toBeNull();
    expect(panel().querySelector('[data-adapted-theme-picker]')).not.toBeNull();
    expect(panel().querySelector('input[aria-label="Reading width"]')).not.toBeNull();
    act(() => toggle().click());
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
    expect(panel().hidden).toBe(false);
  });
  it('remembers being left open', () => {
    mount();
    act(() => toggle().click());
    act(() => root.unmount()); host.remove(); root = null;
    mount();
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });
  it('closes with Escape and returns focus to its button', () => {
    mount();
    act(() => toggle().click());
    const picker = panel().querySelector('[data-adapted-theme-picker]');
    act(() => picker.focus());
    act(() => picker.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(panel().hidden).toBe(true);
    expect(document.activeElement).toBe(toggle());
  });
  it('leaves Focus view outside, always in reach', () => {
    mount();
    const focus = host.querySelector('[data-reader-focus-view]');
    expect(focus).not.toBeNull();
    expect(panel().contains(focus)).toBe(false);
  });
});

describe('the skip link', () => {
  it('is the first control in the reader and jumps to the passage', () => {
    mount();
    const card = host.querySelector('[data-reading-card]');
    const first = card.querySelector('button, select, input, a[href], [role=button], summary');
    expect(first.hasAttribute('data-reader-skip')).toBe(true);
    act(() => first.click());
    expect(document.activeElement).toBe(host.querySelector('[data-reading-passage]'));
  });
  it('reaches the passage in the original reader and in Both', () => {
    mount({ generatedContent: pair().original });
    act(() => host.querySelector('[data-reader-skip]').click());
    expect(document.activeElement).toBe(host.querySelector('[data-reading-passage]'));
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isCompareMode: true });
    act(() => host.querySelector('[data-reader-skip]').click());
    expect(document.activeElement).toBe(host.querySelector('[data-reading-comparison]'));
  });
});

describe('the teacher drawer', () => {
  it.each(['[data-help-key="simplified_edit"]', '[data-review-action="edit"]'])('opens and focuses the adapted editor from Both using %s', selector => {
    const render = () => root.render(React.createElement(View, props));
    const changeText = vi.fn();
    const props = mount({
      isTeacherMode: true, isCompareMode: true, isEditingLeveledText: false,
      handleSimplifiedTextChange: changeText, stopPlayback: vi.fn(),
      setIsCompareMode: vi.fn(value => { props.isCompareMode = value; render(); }),
      setIsFluencyMode: vi.fn(value => { props.isFluencyMode = value; render(); }),
      setInteractionMode: vi.fn(value => { props.interactionMode = value; render(); }),
      handleToggleIsEditingLeveledText: vi.fn(() => { props.isEditingLeveledText = !props.isEditingLeveledText; render(); })
    });
    expect(host.querySelector('[data-reading-comparison]')).not.toBeNull();
    act(() => host.querySelector(selector).click());
    const editor = host.querySelector('textarea[data-allo-textundo="simplified"]');
    expect(host.querySelector('[data-reading-comparison]')).toBeNull();
    expect(editor.value).toBe(props.generatedContent.data);
    expect(document.activeElement).toBe(editor);
    expect(props.setIsCompareMode).toHaveBeenCalledWith(false);
    expect(props.stopPlayback).toHaveBeenCalledOnce();
    expect(changeText).not.toHaveBeenCalled();
    act(() => host.querySelector(selector).click());
    expect(host.querySelector('textarea[data-allo-textundo="simplified"]')).toBeNull();
    expect(host.querySelector('[data-reading-passage]')).not.toBeNull();
    expect(props.isCompareMode).toBe(false);
  });
  it('holds the teacher actions and Review & adjust, and opens as one', () => {
    mount({ isTeacherMode: true });
    const drawer = host.querySelector('[id^="simplified-teacher-tools-panel-"]');
    expect(drawer.hidden).toBe(true);
    expect(drawer.querySelector('details[data-teacher-reading-review]')).not.toBeNull();
    expect(drawer.querySelector('[data-help-key="simplified_check_level"]')).not.toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isTeacherMode: true, isTeacherToolbarExpanded: true });
    expect(host.querySelector('[id^="simplified-teacher-tools-panel-"]').hidden).toBe(false);
  });
  it('keeps Edit in reach outside the drawer', () => {
    mount({ isTeacherMode: true });
    const edit = host.querySelector('[data-help-key="simplified_edit"]');
    expect(edit).not.toBeNull();
    expect(host.querySelector('[id^="simplified-teacher-tools-panel-"]').contains(edit)).toBe(false);
  });
  it('is not there for students', () => {
    mount();
    expect(host.querySelector('[id^="simplified-teacher-tools-panel-"]')).toBeNull();
    expect(host.querySelector('details[data-teacher-reading-review]')).toBeNull();
  });
});

describe('controls a student meets before the text', () => {
  it('are at most 11', () => {
    mount();
    const passage = host.querySelector('[data-reading-passage]');
    const before = [...host.querySelectorAll('button, select, input, a[href], [role=button], summary')]
      .filter(el => shown(el) && !passage.contains(el) && (el.compareDocumentPosition(passage) & Node.DOCUMENT_POSITION_FOLLOWING));
    expect(before.length).toBeLessThanOrEqual(11);
  });
});
