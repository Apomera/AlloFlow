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
const panel = () => host.querySelector('#simplified-display-panel');
const toggle = () => host.querySelector('[data-reader-display]');
const shown = el => !el.closest('[hidden]') && !/\bsr-only\b/.test(el.className || '');

describe('the Display (Aa) panel', () => {
  it('holds Immersive Reader, the reading theme and the reading width, closed at first', () => {
    mount();
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().getAttribute('aria-controls')).toBe('simplified-display-panel');
    expect(panel().hidden).toBe(true);
    expect(panel().style.display).toBe('none');
    expect(panel().querySelector('[data-help-key="simplified_immersive_reader"]')).not.toBeNull();
    expect(panel().querySelector('[data-adapted-theme-picker]')).not.toBeNull();
    expect(panel().querySelector('select[aria-label="Reading width"]')).not.toBeNull();
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
  it('holds the teacher actions and Review & adjust, and opens as one', () => {
    mount({ isTeacherMode: true });
    const drawer = host.querySelector('#simplified-teacher-tools-panel');
    expect(drawer.hidden).toBe(true);
    expect(drawer.querySelector('details[data-teacher-reading-review]')).not.toBeNull();
    expect(drawer.querySelector('[data-help-key="simplified_check_level"]')).not.toBeNull();
    act(() => root.unmount()); host.remove(); root = null;
    mount({ isTeacherMode: true, isTeacherToolbarExpanded: true });
    expect(host.querySelector('#simplified-teacher-tools-panel').hidden).toBe(false);
  });
  it('keeps Edit in reach outside the drawer', () => {
    mount({ isTeacherMode: true });
    const edit = host.querySelector('[data-help-key="simplified_edit"]');
    expect(edit).not.toBeNull();
    expect(host.querySelector('#simplified-teacher-tools-panel').contains(edit)).toBe(false);
  });
  it('is not there for students', () => {
    mount();
    expect(host.querySelector('#simplified-teacher-tools-panel')).toBeNull();
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
