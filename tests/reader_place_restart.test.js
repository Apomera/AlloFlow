import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TEXT = '## Water\n\nRain collects on the ground.\n\n## Rivers\n\nWater flows through rivers.\n\n## Lakes\n\nLakes hold fresh water.\n\nWater returns to the air.';
const TABLE_TEXT = '| Place | Water |\n| --- | --- |\n| Lake | Fresh |\n\n' + TEXT;
let React, createRoot, act, contract, pure, phase, View;
const readers = new Set();

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

function item(form, data = TEXT) {
  const original = contract.createSupportedReading(contract.createSourceSnapshot(data, { sourceArtifactId: 'source-restart', language: 'English' }), { id: 'original-restart', sourceFamilyId: 'water-restart', language: 'English' });
  return form === 'original' ? original : {
    id: 'adapted-restart', type: 'simplified', data,
    instructionalText: { form: 'adapted', role: 'supplemental' },
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: 'water-restart', config: { language: 'English' }
  };
}

function mount(content, strict) {
  const noop = () => {};
  const paragraphStarts = [0, ...Array.from(content.data.matchAll(/\n{2,}/g), match => match.index + match[0].length)];
  const paragraphNumber = node => {
    const number = node.getAttribute('data-reading-paragraph');
    if (/^\d+$/.test(number || '')) return Number(number);
    const offset = Number(node.getAttribute('data-reading-offset-start'));
    return paragraphStarts.findLastIndex(start => start <= offset);
  };
  const props = {
    ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(),
    t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English', studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => React.createElement('div', null, text), formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: value => value, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner-restart'
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(View, props))));
  const reader = {
    host,
    query: selector => host.querySelector(selector),
    paragraph: index => [...host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')].find(node => paragraphNumber(node) === index) || null,
    saved: () => {
      const rows = JSON.parse(localStorage.getItem('alloflow_reading_places_v1') || '{}');
      return Object.entries(rows).find(([key]) => key.startsWith(`${props.readingLearnerKey}|${content.id}|`))?.[1] || null;
    },
    layout(top) {
      host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]').forEach(node => {
        const index = paragraphNumber(node);
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
const press = node => act(async () => {
  expect(node).not.toBeNull();
  node.focus();
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
const pointAt = (reader, index) => act(() => { reader.paragraph(index).dispatchEvent(new Event('pointerdown', { bubbles: true })); });
const focus = (reader, index) => act(() => {
  const node = reader.paragraph(index);
  node.setAttribute('tabindex', '-1');
  node.focus();
});
async function change(node, value) {
  await act(async () => {
    node.focus();
    const proto = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function bookmark(reader) {
  if (!reader.query('[data-reading-bookmark]')) await press(reader.query('[data-reading-outline-toggle]'));
  await press(reader.query('[data-reading-bookmark]'));
}
async function savePosition(reader, index = 5) {
  reader.layout(-index * 100);
  act(() => document.dispatchEvent(new Event('scroll')));
  await advance(800);
  expect(reader.saved()).toMatchObject({ paragraph: index, resume: false });
}
async function returningReader(content, strict) {
  const previous = mount(content, strict);
  await savePosition(previous);
  previous.unmount();
  const reader = mount(content, strict);
  reader.layout(0);
  expect(reader.query('[data-reading-continue]')).not.toBeNull();
  return reader;
}

for (const strict of [false, true]) {
  for (const form of ['adapted', 'original']) {
    describe(`restart ${form} reading${strict ? ' in StrictMode' : ''}`, () => {
      it('moves focus, scrolling, bookmarks, and questions to the beginning after reading farther with an offer pending', async () => {
        const reader = await returningReader(item(form), strict);
        pointAt(reader, 5);
        expect(reader.query('[data-reading-continue]')).not.toBeNull();
        const start = reader.paragraph(0);
        const offersAtScroll = [];
        const scrollToStart = vi.spyOn(start, 'scrollIntoView').mockImplementation(() => {
          offersAtScroll.push(!!reader.query('[data-reading-continue]'));
        });
        await press(reader.query('[data-reading-continue-restart]'));
        expect(reader.query('[data-reading-continue]')).toBeNull();
        expect(document.activeElement === start).toBe(true);
        expect(scrollToStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
        expect(offersAtScroll).toEqual([false]);
        expect(reader.saved()).toMatchObject({ paragraph: 0, resume: false });
        reader.layout(500);
        await bookmark(reader);
        expect(reader.saved().bookmark.paragraph).toBe(0);
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('0');
      });

      it('preserves authored section answers and the existing bookmark when starting over', async () => {
        const content = item(form);
        const previous = mount(content, strict);
        previous.layout(0);
        pointAt(previous, 5);
        await bookmark(previous);
        await press(previous.query('[data-section-prompts-toggle]'));
        expect(previous.query('[data-section-prompts-section]').value).toBe('2');
        await change(previous.query('[data-section-prompt="mainIdea"]'), 'Lakes retain fresh water.');
        await savePosition(previous);
        const authored = previous.saved();
        expect(authored.bookmark.paragraph).toBe(5);
        expect(JSON.stringify(authored.responses)).toContain('Lakes retain fresh water.');
        previous.unmount();
        const reader = mount(content, strict);
        reader.layout(0);
        await press(reader.query('[data-reading-continue-restart]'));
        expect(reader.saved()).toMatchObject({ paragraph: 0, resume: false, bookmark: authored.bookmark, responses: authored.responses });
        await press(reader.query('[data-section-prompts-toggle]'));
        await change(reader.query('[data-section-prompts-section]'), '2');
        expect(reader.query('[data-section-prompt="mainIdea"]').value).toBe('Lakes retain fresh water.');
        await press(reader.query('[data-reading-outline-toggle]'));
        await press(reader.query('[data-reading-bookmark-open]'));
        expect(document.activeElement === reader.paragraph(5)).toBe(true);
      });

      it('does not restore the old position when restarting just before a keyboard dwell finishes', async () => {
        const reader = await returningReader(item(form), strict);
        pointAt(reader, 5);
        focus(reader, 5);
        await advance(1490);
        await press(reader.query('[data-reading-continue-restart]'));
        await advance(20);
        expect(document.activeElement === reader.paragraph(0)).toBe(true);
        reader.layout(500);
        await bookmark(reader);
        expect(reader.saved()).toMatchObject({ paragraph: 0, resume: false, bookmark: { paragraph: 0 } });
        await advance(1600);
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('0');
      });

      it('still continues to the saved paragraph when Continue is chosen instead', async () => {
        const reader = await returningReader(item(form), strict);
        pointAt(reader, 3);
        const target = reader.paragraph(5);
        const offersAtScroll = [];
        const scrollToSaved = vi.spyOn(target, 'scrollIntoView').mockImplementation(() => {
          offersAtScroll.push(!!reader.query('[data-reading-continue]'));
        });
        await press(reader.query('[data-reading-continue-go]'));
        expect(reader.query('[data-reading-continue]')).toBeNull();
        expect(document.activeElement === target).toBe(true);
        expect(scrollToSaved).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
        expect(offersAtScroll).toEqual([false]);
        reader.layout(500);
        await bookmark(reader);
        expect(reader.saved()).toMatchObject({ paragraph: 5, bookmark: { paragraph: 5 } });
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('2');
      });
    });
  }

  it(`navigates from an offer activation that does not focus its button${strict ? ' in StrictMode' : ''}`, async () => {
    for (const action of ['restart', 'go']) {
      const reader = await returningReader(item('adapted'), strict);
      focus(reader, 3);
      const target = reader.paragraph(action === 'restart' ? 0 : 5);
      const scrollToTarget = vi.spyOn(target, 'scrollIntoView');
      await act(async () => {
        reader.query(`[data-reading-continue-${action}]`).click();
      });
      expect(reader.query('[data-reading-continue]')).toBeNull();
      expect(document.activeElement === target).toBe(true);
      expect(scrollToTarget).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
      reader.unmount();
    }
  });

  it(`does not reclaim focus or scroll when another control is focused before an offer action commits${strict ? ' in StrictMode' : ''}`, async () => {
    for (const action of ['restart', 'go']) {
      const reader = await returningReader(item('adapted'), strict);
      const outside = document.createElement('button');
      outside.textContent = 'Outside the reader';
      reader.host.append(outside);
      const target = reader.paragraph(action === 'restart' ? 0 : 5);
      const scrollToTarget = vi.spyOn(target, 'scrollIntoView');
      const button = reader.query(`[data-reading-continue-${action}]`);
      await act(async () => {
        button.focus();
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        outside.focus();
      });
      expect(reader.query('[data-reading-continue]')).toBeNull();
      expect(document.activeElement === outside).toBe(true);
      expect(scrollToTarget).not.toHaveBeenCalled();
      if (action === 'restart') expect(reader.saved()).toMatchObject({ paragraph: 0, resume: false });
      reader.unmount();
    }
  });

  it(`restarts and reopens a beginning bookmark when the adapted reading starts with a table${strict ? ' in StrictMode' : ''}`, async () => {
    const reader = await returningReader(item('adapted', TABLE_TEXT), strict);
    expect(reader.paragraph(0)?.getAttribute('data-reading-table')).toBe('true');
    pointAt(reader, 5);
    const start = reader.paragraph(0);
    const offersAtScroll = [];
    const scrollToStart = vi.spyOn(start, 'scrollIntoView').mockImplementation(() => {
      offersAtScroll.push(!!reader.query('[data-reading-continue]'));
    });
    await press(reader.query('[data-reading-continue-restart]'));
    expect(document.activeElement === start).toBe(true);
    expect(scrollToStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
    expect(offersAtScroll).toEqual([false]);
    expect(reader.saved()).toMatchObject({ paragraph: 0, resume: false });
    reader.layout(500);
    await bookmark(reader);
    expect(reader.saved().bookmark.paragraph).toBe(0);
    await press(reader.query('[data-reading-bookmark-open]'));
    expect(document.activeElement === start).toBe(true);
    expect(scrollToStart).toHaveBeenCalledTimes(2);
    await press(reader.query('[data-section-prompts-toggle]'));
    expect(reader.query('[data-section-prompts-section]').value).toBe('0');
  });
}
