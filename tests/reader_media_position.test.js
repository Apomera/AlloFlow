import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TABLE = '| Place | Water |\n| --- | --- |\n| Lake | Fresh |';
const CHART = '[[CHART: {"type":"bar","title":"Water stores","labels":["Lake"],"data":[10]}]]';
const TEXT = ['## Rain', 'Rain falls from clouds.', TABLE, '## Rivers', 'Rivers flow downhill.', CHART, '## Lakes', 'Lakes hold fresh water.', TABLE, CHART].join('\n\n');
const STORAGE_KEY = 'alloflow_reading_places_v1';
let React, createRoot, act, contract, pure, phase, View;
const readers = new Set();

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  for (const filename of ['instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js', 'generation_helpers_module.js']) loadAlloModule(filename);
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

function item(data = TEXT, language = 'English') {
  const sourceSnapshot = contract.createSourceSnapshot(data, { sourceArtifactId: 'source-media', language });
  return { id: 'adapted-media', type: 'simplified', data, instructionalText: { form: 'adapted', role: 'supplemental' }, sourceSnapshot, sourceFamilyId: 'water-media', config: { language } };
}

function mount(content, strict, extra = {}) {
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, setComplexityLevel: vi.fn(), setSaveOriginalOnAdjust: vi.fn(), setReadingTheme: vi.fn(), setSelectionMenu: vi.fn(), setIsCustomReviseOpen: vi.fn(), setInteractionMode: vi.fn(), setIsCompareMode: vi.fn(), setIsFluencyMode: vi.fn(), stopPlayback: vi.fn(), closeDefinition: vi.fn(), closePhonics: vi.fn(), closeRevision: vi.fn(), handleToggleIsEditingLeveledText: vi.fn(),
    t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: content.config.language, studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, isTeacherMode: false, isEditingLeveledText: false, isImmersiveReaderActive: false, isCompareMode: false, isSideBySide: false, isZenMode: true, isProcessing: false, isPlaying: false, interactionMode: 'read', history: [content], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null, handleFormatText: noop, handleSimplifiedTextChange: vi.fn(), callTTS: noop, handleSpeak: vi.fn(), handleWordClick: vi.fn(), handleQuickAddGlossary: vi.fn(), handlePhonicsClick: vi.fn(), isLineFocusMode: false, focusedParagraphIndex: null, setFocusedParagraphIndex: noop, cursorStyles: {}, getContentDirection: language => language === 'Arabic' ? 'rtl' : 'ltr', isRtlLang: language => language === 'Arabic',
    renderFormattedText: text => /^\[\[CHART:/.test(text.trim())
      ? React.createElement('div', { role: 'img', 'aria-label': 'Water stores' }, React.createElement('span', null, 'Lake: 10'))
      : React.createElement('table', null, React.createElement('tbody', null, React.createElement('tr', null, React.createElement('td', null, 'Fresh water')))),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop, highlightGlossaryTerms: value => value, latestGlossary: [], generatedContent: content, readingLearnerKey: 'learner-media', ...extra
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(View, props))));
  const reader = {
    host, props,
    query: selector => host.querySelector(selector),
    paragraph: index => host.querySelector(`[data-reading-passage] [data-reading-paragraph="${index}"]`),
    saved: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[`${props.readingLearnerKey}|${content.id}|${contract.fingerprintSourceText(content.data)}`] || null,
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
const press = node => act(async () => {
  expect(node).not.toBeNull();
  node.focus();
  node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
const pointAt = node => act(() => {
  expect(node).not.toBeNull();
  node.dispatchEvent(new Event('pointerdown', { bubbles: true }));
});
async function bookmark(reader) {
  if (!reader.query('[data-reading-bookmark]')) await press(reader.query('[data-reading-outline-toggle]'));
  await press(reader.query('[data-reading-bookmark]'));
}
async function savePosition(reader, index) {
  reader.layout(-index * 100);
  act(() => document.dispatchEvent(new Event('scroll')));
  await advance(800);
  expect(reader.saved()).toMatchObject({ paragraph: index, resume: false });
}

for (const strict of [false, true]) {
  describe(`adapted media reading positions${strict ? ' in StrictMode' : ''}`, () => {
    for (const [kind, index, child] of [['table', 8, 'td'], ['chart', 9, '[role="img"] span']]) {
      it(`bookmarks a pointer-selected ${kind} and reopens the exact media after remount`, async () => {
        const content = item(), previous = mount(content, strict);
        previous.layout(500);
        pointAt([...previous.host.querySelectorAll(`[data-reading-${kind}] ${child}`)].at(-1));
        await bookmark(previous);
        expect(previous.saved().bookmark.paragraph).toBe(index);
        const saved = previous.saved().bookmark;
        const label = kind === 'table' ? 'Reading table' : 'Reading chart';
        expect(previous.query('[data-reading-place-notice]').textContent).toContain(label);
        expect(previous.query('[data-reading-place-notice]').textContent).not.toMatch(/CHART:|\|/);
        expect(saved.snippet).not.toBe(label);
        previous.unmount();
        const reader = mount(content, strict), target = reader.paragraph(index);
        expect(target?.getAttribute(`data-reading-${kind}`)).toBe('true');
        reader.layout(500);
        const scroll = vi.spyOn(target, 'scrollIntoView');
        await press(reader.query('[data-reading-outline-toggle]'));
        await press(reader.query('[data-reading-bookmark-open]'));
        expect(document.activeElement === target).toBe(true);
        expect(scroll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
        expect(reader.saved().bookmark).toEqual(saved);
        expect(target.getAttribute('tabindex')).toBe(kind === 'table' ? '0' : '-1');
      });

      it(`offers Continue at a saved ${kind} and focuses it after removing the offer`, async () => {
        const content = item(), previous = mount(content, strict);
        await savePosition(previous, index);
        const saved = previous.saved();
        previous.unmount();
        const reader = mount(content, strict), target = reader.paragraph(index), offersAtScroll = [];
        expect(reader.query('[data-reading-continue]')).not.toBeNull();
        expect(reader.query('[data-reading-continue]').textContent).toContain(kind === 'table' ? 'Reading table' : 'Reading chart');
        expect(reader.query('[data-reading-continue]').textContent).not.toMatch(/CHART:|\|/);
        expect(target).not.toBeNull();
        const scroll = vi.spyOn(target, 'scrollIntoView').mockImplementation(() => offersAtScroll.push(!!reader.query('[data-reading-continue]')));
        await press(reader.query('[data-reading-continue-go]'));
        expect(document.activeElement === target).toBe(true);
        expect(scroll).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ block: 'start' }));
        expect(offersAtScroll).toEqual([false]);
        expect(reader.saved().paragraph).toBe(index);
        expect(reader.saved().snippet).toBe(saved.snippet);
      });

      it(`keeps a trailing ${kind} attached to the last section's questions and outline location`, async () => {
        const reader = mount(item(), strict);
        reader.layout(-index * 100);
        const target = reader.paragraph(index);
        pointAt(target);
        await savePosition(reader, index);
        await press(reader.query('[data-reading-outline-toggle]'));
        expect(reader.query('[data-reading-outline] [aria-current="location"]').textContent).toContain('Lakes');
        await press(reader.query('[data-section-prompts-toggle]'));
        expect(reader.query('[data-section-prompts-section]').value).toBe('2');
        expect(reader.query('[data-section-prompt="mainIdea"]').value).toBe('');
      });
    }

    it('remembers a keyboard dwell on a table without requiring a pointer action', async () => {
      const reader = mount(item(), strict), target = reader.query('[data-reading-table]');
      reader.layout(0);
      expect(target.tabIndex).toBe(0);
      act(() => target.focus());
      await advance(1500);
      reader.layout(500);
      await bookmark(reader);
      expect(reader.saved().bookmark.paragraph).toBe(2);
      await press(reader.query('[data-reading-bookmark-open]'));
      expect(document.activeElement === target).toBe(true);
      expect(target.tabIndex).toBe(0);
    });

    it('selects the preceding middle section for media before the next heading', async () => {
      const reader = mount(item(), strict);
      reader.layout(500);
      pointAt(reader.query('[data-reading-chart] [role="img"] span'));
      await press(reader.query('[data-section-prompts-toggle]'));
      expect(reader.query('[data-section-prompts-section]').value).toBe('1');
    });

    it('keeps a caption readable and associates its following table with that caption section', async () => {
      const content = item(['Rain falls.', 'Rivers flow.', 'Water stores.\n' + TABLE, 'Lakes retain water.'].join('\n\n'));
      const reader = mount(content, strict);
      reader.layout(500);
      pointAt(reader.query('[data-reading-table] td'));
      await press(reader.query('[data-reading-outline-toggle]'));
      const destinations = [...reader.host.querySelectorAll('[data-reading-outline] ol button')];
      expect(destinations.map(node => node.textContent)).toEqual(['Rain falls.', 'Rivers flow.', 'Water stores.', 'Lakes retain water.']);
      await press(reader.query('[data-section-prompts-toggle]'));
      expect(reader.query('[data-section-prompts-section]').value).toBe('2');
      for (const [order, index] of [[0, 0], [1, 1], [2, 2], [3, 4]]) {
        await press(destinations[order]);
        expect(document.activeElement === reader.paragraph(index)).toBe(true);
      }
    });

    it('tracks and continues a media-only reading without inventing question sections', async () => {
      const content = item(TABLE + '\n\n' + CHART), previous = mount(content, strict);
      expect(previous.query('[data-section-prompts-toggle]')).toBeNull();
      expect(previous.query('[data-reading-outline-toggle]')).toBeNull();
      await savePosition(previous, 1);
      previous.unmount();
      const reader = mount(content, strict);
      await press(reader.query('[data-reading-continue-go]'));
      expect(document.activeElement === reader.paragraph(1)).toBe(true);
      expect(reader.query('[data-section-prompts-toggle]')).toBeNull();
    });

    it('leaves adjacent prose sentence numbering and read-aloud targets unchanged', async () => {
      const content = item(['Rain falls.', TABLE, 'Rivers flow. Lakes fill.', CHART, 'Water returns.'].join('\n\n'));
      const reader = mount(content, strict);
      const sentences = [...reader.host.querySelectorAll('[data-reading-sentence]')];
      expect(sentences.map(node => [node.getAttribute('data-reading-sentence'), node.textContent.trim()])).toEqual([
        ['0', 'Rain falls.'], ['1', 'Rivers flow.'], ['2', 'Lakes fill.'], ['3', 'Water returns.']
      ]);
      expect(reader.query('[data-reading-table] [data-sentence-stop]')).toBeNull();
      expect(reader.query('[data-reading-chart] [data-sentence-stop]')).toBeNull();
      await press(sentences[3]);
      expect(reader.props.handleSpeak.mock.calls[0][2]).toBe(3);
    });

    it('gives bilingual media unique source and target paragraph identities and language metadata', () => {
      const content = item(TABLE + '\n\n' + CHART, 'Arabic');
      const reader = mount(content, strict, { getSideBySideContent: () => ({ source: [TABLE, CHART], target: [TABLE, CHART] }), isSideBySide: true });
      for (const [pane, language, tag, direction] of [['src', 'Arabic', 'ar', 'rtl'], ['tgt', 'English', 'en', 'ltr']]) {
        for (const [index, kind] of [[0, 'table'], [1, 'chart']]) {
          const node = reader.paragraph(`${pane}-${index}`);
          expect(node?.getAttribute(`data-reading-${kind}`)).toBe('true');
          expect(node.getAttribute('data-reading-language')).toBe(language);
          expect(node.getAttribute('lang')).toBe(tag);
          expect(node.getAttribute('dir')).toBe(direction);
          expect(node.tabIndex).toBe(kind === 'table' ? 0 : -1);
        }
      }
      expect(reader.host.querySelectorAll('[data-reading-passage] [data-reading-paragraph]')).toHaveLength(4);
    });
  });
}
