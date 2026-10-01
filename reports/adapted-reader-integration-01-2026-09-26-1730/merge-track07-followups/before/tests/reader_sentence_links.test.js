// Links in the reading are real links, not hidden inside sentence buttons.
//
// WHY (2026-09-24 audit): each sentence is a click-to-read button, and links
// were drawn inside it. A button's content is hidden from screen readers, so a
// citation or a link in a sentence could not be heard or opened with one, and a
// link inside a button is nested interactive content.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, View, root, host, pure, phase;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; window.getSelection()?.removeAllRanges(); });

function mount(data, extra = {}) {
  const props = { ComplexityGauge: () => null, t: k => k, generatedContent: { id: 'a', type: 'simplified', data, config: { language: 'English' } }, leveledTextLanguage: 'English', isTeacherMode: false, isZenMode: true, interactionMode: 'read', history: [], textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), handleTextMouseUp: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: text => text, formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: x => x, latestGlossary: [], setFocusedParagraphIndex: () => {}, ...extra };
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const body = () => host.querySelector('[data-simplified-reading-body]');
const click = (el, detail = 1) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail })));
const key = (el, value) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })));
// Grounding writes a marker with a space before it (text_pipeline applyGlobalCitations).
const TEXT = 'Plants grow. [⁽¹⁾](https://example.org/plants) See [the rain guide](https://example.org/rain) for more.';

describe('links in sentences', () => {
  it('are never inside a sentence button', () => {
    mount(TEXT);
    expect(body().querySelectorAll('a')).toHaveLength(2);
    expect(body().querySelectorAll('[role=button] a, [role=button] button, button a')).toHaveLength(0);
  });
  it('a citation at the end follows its sentence button, which is named without it', () => {
    mount(TEXT);
    const sentence = body().querySelector('[data-reading-sentence="0"]');
    expect(sentence.getAttribute('role')).toBe('button');
    expect(sentence.getAttribute('aria-label')).toMatch(/: Plants grow\.$/); // no citation marker in the name
    expect(sentence.nextElementSibling.tagName).toBe('A');
    expect(sentence.nextElementSibling.getAttribute('href')).toBe('https://example.org/plants');
  });
  it('a sentence with a link inside stays text with a working link, and its own read button', () => {
    const props = mount(TEXT);
    const sentence = body().querySelector('[data-reading-sentence="1"]');
    expect(sentence.getAttribute('role')).toBeNull();
    expect(sentence.querySelector('a').textContent).toBe('the rain guide');
    const read = sentence.querySelector('button[data-sentence-read]');
    expect(read.getAttribute('aria-label')).toMatch(/: See the rain guide for more\.$/);
    click(sentence.querySelector('a'));
    expect(props.handleSpeak).not.toHaveBeenCalled();
    click(read, 0);
    expect(props.handleSpeak).toHaveBeenCalledTimes(1);
    expect(props.handleSpeak.mock.calls[0][2]).toBe(1);
    click(sentence); // the words themselves still read for a mouse user
    expect(props.handleSpeak).toHaveBeenCalledTimes(2);
  });
  it('arrow keys move between the sentence button and the read button', () => {
    mount(TEXT);
    const stops = [...body().querySelectorAll('[data-sentence-stop]')];
    expect(stops.map(s => s.tabIndex)).toEqual([0, -1]);
    act(() => stops[0].focus()); key(stops[0], 'ArrowRight');
    expect(document.activeElement).toBe(stops[1]);
  });
  it('Revise from the read button selects the sentence, not the button', () => {
    const props = mount(TEXT, { isTeacherMode: true, interactionMode: 'revise' });
    const read = body().querySelector('[data-reading-sentence="1"] button[data-sentence-read]');
    click(read, 0);
    expect(window.getSelection().toString().trim()).toBe('See the rain guide for more.');
    expect(props.handleTextMouseUp).toHaveBeenCalledTimes(1);
  });
  it('a paragraph that is only a citation shows the link and no empty button', () => {
    mount('Plants grow.\n\n[⁽²⁾](https://example.org/two)');
    expect(body().querySelectorAll('[role=button]')).toHaveLength(1);
    expect(body().querySelector('a').getAttribute('href')).toBe('https://example.org/two');
    expect([...body().querySelectorAll('[data-sentence-stop]')].every(s => s.textContent.trim())).toBe(true);
  });
});
