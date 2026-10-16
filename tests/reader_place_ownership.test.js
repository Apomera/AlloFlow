import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, contract, pure, phase, View;
const readers = new Set();
const TEXT = '## Water\n\nRain collects on the ground.\n\n## Rivers\n\nWater flows through rivers.\n\n## Lakes\n\nLakes hold fresh water.\n\nWater returns to the air.';

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const filename of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js']) {
    loadAlloModule(filename);
  }
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js', 'utf8'))();
  View = window.AlloModules.SimplifiedView;
  let queue = Promise.resolve();
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request(_key, callback) { const next = queue.then(callback); queue = next.catch(() => {}); return next; } }
  });
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  for (const reader of [...readers].reverse()) reader.unmount();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete navigator.locks;
});

function mount(id, strict) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot('Water moves through the landscape.', { sourceArtifactId: `source-${id}` }), { id: `original-${id}`, sourceFamilyId: `water-${id}` });
  const content = { id: `adapted-${id}`, type: 'simplified', data: TEXT, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot: original.sourceSnapshot, sourceFamilyId: `water-${id}`, config: { language: 'English' } };
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(),
    t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: value => value, latestGlossary: [], generatedContent: content, readingLearnerKey: `learner-${id}`
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(View, props))));
  const reader = {
    host,
    query: selector => host.querySelector(selector),
    paragraph: index => host.querySelector(`[data-reading-passage] [data-reading-paragraph="${index}"]`),
    saved: () => {
      const rows = JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}');
      return Object.entries(rows).find(([key]) => key.startsWith(`${props.readingLearnerKey}|${content.id}|`))?.[1] || null;
    },
    layout(top) {
      host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]').forEach(node => {
        const index = Number(node.getAttribute('data-reading-paragraph'));
        node.getBoundingClientRect = () => ({ top: top + index * 100, bottom: top + index * 100 + 90, left: 0, right: 600, width: 600, height: 90 });
      });
    },
    unmount() {
      if (!readers.delete(reader)) return;
      act(() => root.unmount());
      host.remove();
    }
  };
  readers.add(reader);
  return reader;
}

const advance = milliseconds => act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
const scroll = () => act(() => { document.dispatchEvent(new Event('scroll')); });
const pointAt = (reader, index) => act(() => { reader.paragraph(index).dispatchEvent(new Event('pointerdown', { bubbles: true })); });
const focus = (reader, index) => act(() => {
  const node = reader.paragraph(index);
  node.setAttribute('tabindex', '-1');
  node.focus();
});
const press = node => act(async () => { node.focus(); node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
async function bookmark(reader) {
  if (!reader.query('[data-reading-bookmark]')) await press(reader.query('[data-reading-outline-toggle]'));
  await press(reader.query('[data-reading-bookmark]'));
}

for (const strict of [false, true]) {
  describe(`reading position belongs to its reader${strict ? ' in StrictMode' : ''}`, () => {
    it('does not invent a reading position at the controls from a focused sibling', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(500);
      second.layout(0);
      focus(second, 3);
      scroll();
      await advance(800);
      expect(first.saved()).toBeNull();
      expect(second.saved()).toMatchObject({ paragraph: 3, snippet: 'Water flows through rivers.' });
    });

    it('uses its own visible paragraph while another reader has paragraph focus', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(-500);
      second.layout(0);
      focus(second, 3);
      scroll();
      await advance(800);
      expect(first.saved()).toMatchObject({ paragraph: 5, snippet: 'Lakes hold fresh water.' });
      expect(second.saved()).toMatchObject({ paragraph: 3, snippet: 'Water flows through rivers.' });
    });

    it('keeps bookmarks and questions aligned with its own place after visiting the controls', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(-500);
      second.layout(0);
      focus(second, 3);
      scroll();
      await advance(800);
      first.layout(500);
      await bookmark(first);
      expect(first.saved().bookmark).toEqual({ paragraph: 5, snippet: 'Lakes hold fresh water.' });
      await press(first.query('[data-section-prompts-toggle]'));
      expect(first.query('[data-section-prompts-section]').value).toBe('2');
      expect(second.saved()).toMatchObject({ paragraph: 3 });
      expect(second.saved().bookmark).toBeUndefined();
    });

    it('retains its own pointer position when focus moves to a sibling', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(0);
      second.layout(0);
      pointAt(first, 5);
      first.layout(500);
      focus(second, 3);
      scroll();
      await advance(1600);
      await bookmark(first);
      expect(first.saved().bookmark.paragraph).toBe(5);
      await bookmark(second);
      expect(second.saved().bookmark.paragraph).toBe(3);
    });

    it('keeps keyboard dwell and scroll tracking active when a sibling is removed', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(0);
      second.layout(0);
      focus(first, 3);
      await advance(500);
      second.unmount();
      await advance(1000);
      await bookmark(first);
      expect(first.saved().bookmark.paragraph).toBe(3);
      first.layout(-500);
      scroll();
      await advance(800);
      expect(first.saved().paragraph).toBe(5);
      await bookmark(first);
      expect(first.saved().bookmark.paragraph).toBe(5);
    });

    it('ignores paragraphs and bubbling events from a defensively embedded independent reader', async () => {
      const first = mount('first', strict), second = mount('second', strict);
      first.layout(-1000);
      second.layout(-200);
      // The built-in preview is a sibling; an embedding host may nest independent roots.
      first.query('[data-adapted-reader]').append(second.host);
      await bookmark(first);
      const fallback = first.saved().bookmark.paragraph;
      pointAt(second, 3);
      focus(second, 3);
      await advance(1600);
      await bookmark(first);
      const afterNestedEvents = first.saved().bookmark.paragraph;
      await press(first.query('[data-section-prompts-toggle]'));
      const section = first.query('[data-section-prompts-section]').value;
      await bookmark(second);
      expect({ fallback, afterNestedEvents, section, nestedBookmark: second.saved().bookmark.paragraph }).toEqual({
        fallback: 0, afterNestedEvents: 0, section: '0', nestedBookmark: 3
      });
    });
  });
}
